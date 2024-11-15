#include "./socket.h"

#include <array>
#include <cmath>
#include <cstdint>
#include <limits>
#include <unordered_set>

#include "./context.h"
#include "./incoming_msg.h"
#include "./module.h"
#include "./observer.h"
#include "util/arguments.h"
#include "util/async_scope.h"
#include "util/error.h"
#include "util/object.h"
#include "util/take.h"
#include "util/uvdelayed.h"
#include "util/uvwork.h"

namespace zmq {
/* The maximum number of sync I/O operations that are allowed before the I/O
   methods will force the returned promise to be resolved in the next tick. */
[[maybe_unused]] auto constexpr max_sync_operations = 1U << 9U;

/* Ordinary static cast for all available numeric types. */
template <typename T>
T NumberCast(const Napi::Number& num) {
    return static_cast<T>(num);
}

/* Specialization for uint64_t; check for out of bounds and warn on values
   that cannot be represented accurately. TODO: Use native JS BigInt. */
template <>
uint64_t NumberCast<uint64_t>(const Napi::Number& num) {
    auto value = num.DoubleValue();

    if (std::nextafter(value, -0.0) < 0) {
        return 0;
    }

    static constexpr auto max_safe_integer = static_cast<double>((1ULL << 53U) - 1);
    if (value > max_safe_integer) {
        Warn(num.Env(),
            "Value is larger than Number.MAX_SAFE_INTEGER and may have been rounded "
            "inaccurately.");
    }

    /* If the next representable value of the double is beyond the maximum
       integer, then assume the maximum integer. */
    static constexpr auto max_uint64_as_double =
        static_cast<double>(std::numeric_limits<uint64_t>::max());
    if (std::nextafter(value, std::numeric_limits<double>::infinity())
        > max_uint64_as_double) {
        return std::numeric_limits<uint64_t>::max();
    }

    return static_cast<uint64_t>(value);
}

struct AddressContext {
    std::string address;
    uint32_t error = 0;

    explicit AddressContext(std::string&& address) : address(std::move(address)) {}
};

Socket::Socket(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<Socket>(info), async_context(Env(), "Socket"), poller(*this),
      module(*reinterpret_cast<Module*>(info.Data())) {
    Arg::Validator const args{
        Arg::Required<Arg::Number>("Socket type must be a number"),
        Arg::Optional<Arg::Object>("Options must be an object"),
    };

    if (args.ThrowIfInvalid(info)) {
        return;
    }

    type = info[0].As<Napi::Number>().Int32Value();

    if (info[1].IsObject()) {
        auto options = info[1].As<Napi::Object>();
        if (options.Has("context")) {
            context_ref.Reset(options.Get("context").As<Napi::Object>(), 1);
            options.Delete("context");
        } else {
            context_ref.Reset(module.GlobalContext.Value(), 1);
        }
    } else {
        context_ref.Reset(module.GlobalContext.Value(), 1);
    }

    auto* context = Context::Unwrap(context_ref.Value());
    if (Env().IsExceptionPending()) {
        return;
    }

    socket = zmq_socket(context->context, type);
    if (socket == nullptr) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    uv_os_sock_t file_descriptor = 0;
    std::function<void()> const finalize = nullptr;

    const auto error = [this]() {
        [[maybe_unused]] auto err = zmq_close(socket);
        assert(err == 0);

        socket = nullptr;
    };

#ifdef ZMQ_THREAD_SAFE
    {
        int value = 0;
        size_t length = sizeof(value);
        if (zmq_getsockopt(socket, ZMQ_THREAD_SAFE, &value, &length) < 0) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            error();
        }

        thread_safe = (value != 0);
    }
#endif

    /* Currently only some DRAFT sockets are threadsafe. */
    if (thread_safe) {
#ifdef ZMQ_HAS_POLLABLE_THREAD_SAFE
        /* Threadsafe sockets do not expose an FD we can integrate into the
           event loop, so we have to construct one by creating a zmq_poller. */
        auto poll = zmq_poller_new();
        if (poll == nullptr) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            error();
        }

        /* Callback to free the underlying poller. Move the poller to transfer
           ownership after the constructor has completed. */
        finalize = [=]() mutable {
            [[maybe_unused]] auto err = zmq_poller_destroy(&poll);
            assert(err == 0);
        };

        if (zmq_poller_add(poll, socket, nullptr, ZMQ_POLLIN | ZMQ_POLLOUT) < 0) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            finalize();
            error();
        }

        if (zmq_poller_fd(poll, &fd) < 0) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            finalize();
            error();
        }
#else
        /* A thread safe socket was requested, but there is no support for
           retrieving a poller FD, so we cannot construct them. */
        ErrnoException(Env(), EINVAL).ThrowAsJavaScriptException();
        error();
#endif
    } else {
        size_t length = sizeof(file_descriptor);
        if (zmq_getsockopt(socket, ZMQ_FD, &file_descriptor, &length) < 0) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            error();
        }
    }

    if (poller.Initialize(Env(), file_descriptor, finalize) < 0) {
        ErrnoException(Env(), errno).ThrowAsJavaScriptException();
        error();
    }

    /* Initialization was successful, register the socket for cleanup. */
    module.ObjectReaper.Add(this);

    /* Sealing causes setting/getting invalid options to throw an error.
       Otherwise they would fail silently, which is very confusing. */
    Seal(info.This().As<Napi::Object>());

    /* Set any options after the socket has been successfully created. */
    if (info[1].IsObject()) {
        Assign(info.This().As<Napi::Object>(), info[1].As<Napi::Object>());
    }
}

Socket::~Socket() {
    Close();
}

/* Define all socket options that should not trigger a warning when set on
   a socket that is already bound/connected. */
void Socket::WarnUnlessImmediateOption(int32_t option) const {
    static const std::unordered_set<int32_t> immediate = {
        ZMQ_SUBSCRIBE,
        ZMQ_UNSUBSCRIBE,
        ZMQ_LINGER,
        ZMQ_ROUTER_MANDATORY,
        ZMQ_PROBE_ROUTER,
        ZMQ_XPUB_VERBOSE,
        ZMQ_REQ_CORRELATE,
        ZMQ_REQ_RELAXED,

#ifdef ZMQ_ROUTER_HANDOVER
        ZMQ_ROUTER_HANDOVER,
#endif

#ifdef ZMQ_XPUB_VERBOSER
        ZMQ_XPUB_VERBOSER,
#endif

#if ZMQ_VERSION >= ZMQ_MAKE_VERSION(4, 2, 0)
        /* As of 4.2.0 these options can take effect after bind/connect. */
        ZMQ_SNDHWM,
        ZMQ_RCVHWM,
#endif

        /* These take effect immediately due to our Node.js implementation. */
        ZMQ_SNDTIMEO,
        ZMQ_RCVTIMEO,
    };

    if (immediate.contains(option)) {
        return;
    }
    if (endpoints == 0 && state == State::Open) {
        return;
    }
    Warn(Env(), "Socket option will not take effect until next connect/bind.");
}

bool Socket::ValidateOpen() const {
    switch (state) {
    case State::Blocked:
        ErrnoException(Env(), EBUSY, "Socket is blocked by a bind or unbind operation")
            .ThrowAsJavaScriptException();
        return false;
    case State::Closed:
        ErrnoException(Env(), EBADF).ThrowAsJavaScriptException();
        return false;
    default:
        return true;
    }
}

bool Socket::HasEvents(uint32_t requested_events) const {
    uint32_t events = 0;
    size_t events_size = sizeof(events);

    while (zmq_getsockopt(socket, ZMQ_EVENTS, &events, &events_size) < 0) {
        /* Ignore errors. */
        if (zmq_errno() != EINTR) {
            return false;
        }
    }

    return (events & requested_events) != 0;
}

void Socket::Close() {
    if (socket != nullptr) {
        module.ObjectReaper.Remove(this);

        Napi::HandleScope const scope(Env());

        /* Clear endpoint count. */
        endpoints = 0;

        /* Stop all polling and release event handlers. */
        poller.Close();

        /* Close succeeds unless socket is invalid. */
        [[maybe_unused]] auto err = zmq_close(socket);
        assert(err == 0);

        /* Release reference to context and observer. */
        observer_ref.Reset();
        context_ref.Reset();

        state = State::Closed;

        /* Reset pointer to avoid double close. */
        socket = nullptr;
    }
}

void Socket::Send(const Napi::Promise::Deferred& res, OutgoingMsg::Parts& parts) {
    auto iter = parts.begin();
    auto end = parts.end();

    while (iter != end) {
        auto& part = *iter;
        iter++;

        auto const flags = iter == end ? ZMQ_DONTWAIT : ZMQ_DONTWAIT | ZMQ_SNDMORE;
        while (zmq_msg_send(part.get(), socket, flags) < 0) {
            if (zmq_errno() != EINTR) {
                res.Reject(ErrnoException(Env(), zmq_errno()).Value());
                return;
            }
        }
    }

    res.Resolve(Env().Undefined());
}

void Socket::Receive(const Napi::Promise::Deferred& res) {
    /* Return an array of message parts, or an array with a single message
       followed by a metadata object. */
    auto list = Napi::Array::New(Env(), 1);

    uint32_t i_part = 0;
    while (true) {
        IncomingMsg part;
        while (zmq_msg_recv(part.get(), socket, ZMQ_DONTWAIT) < 0) {
            if (zmq_errno() != EINTR) {
                res.Reject(ErrnoException(Env(), zmq_errno()).Value());
                return;
            }
        }

        list[i_part++] = part.IntoBuffer(Env());

#ifdef ZMQ_HAS_POLLABLE_THREAD_SAFE
        switch (type) {
        case ZMQ_SERVER: {
            auto meta = Napi::Object::New(Env());
            meta.Set("routingId", zmq_msg_routing_id(part));
            list[i++] = meta;
            break;
        }

        case ZMQ_DISH: {
            auto meta = Napi::Object::New(Env());
            auto data = zmq_msg_group(part);
            auto length = strnlen(data, ZMQ_GROUP_MAX_LENGTH);
            meta.Set("group", Napi::Buffer<char>::Copy(Env(), data, length));
            list[i++] = meta;
            break;
        }
        }
#endif

        if (zmq_msg_more(part.get()) == 0) {
            break;
        }
    }

    res.Resolve(list);
}

Napi::Value Socket::Bind(const Napi::CallbackInfo& info) {
    Arg::Validator const args{
        Arg::Required<Arg::String>("Address must be a string"),
    };

    if (args.ThrowIfInvalid(info)) {
        return Env().Undefined();
    }

    if (!ValidateOpen()) {
        return Env().Undefined();
    }

    state = Socket::State::Blocked;
    auto res = Napi::Promise::Deferred::New(Env());
    auto run_ctx = std::make_shared<AddressContext>(info[0].As<Napi::String>());

    auto status = UvQueue(
        Env(),
        [this, run_ctx]() {
            /* Don't access V8 internals here! Executed in worker thread. */
            while (zmq_bind(socket, run_ctx->address.c_str()) < 0) {
                if (zmq_errno() != EINTR) {
                    run_ctx->error = static_cast<uint32_t>(zmq_errno());
                    return;
                }
            }
        },
        [this, run_ctx, res]() {
            AsyncScope const scope(Env(), async_context);

            state = Socket::State::Open;
            endpoints++;

            if (request_close) {
                Close();
            }

            if (run_ctx->error != 0) {
                res.Reject(ErrnoException(
                    Env(), static_cast<int32_t>(run_ctx->error), run_ctx->address)
                               .Value());
                return;
            }

            res.Resolve(Env().Undefined());
        });

    if (status < 0) {
        ErrnoException(Env(), EBADF).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    return res.Promise();
}

Napi::Value Socket::Unbind(const Napi::CallbackInfo& info) {
    Arg::Validator const args{
        Arg::Required<Arg::String>("Address must be a string"),
    };

    if (args.ThrowIfInvalid(info)) {
        return Env().Undefined();
    }

    if (!ValidateOpen()) {
        return Env().Undefined();
    }

    state = Socket::State::Blocked;
    auto res = Napi::Promise::Deferred::New(Env());
    auto run_ctx = std::make_shared<AddressContext>(info[0].As<Napi::String>());

    auto status = UvQueue(
        Env(),
        [this, run_ctx]() {
            /* Don't access V8 internals here! Executed in worker thread. */
            while (zmq_unbind(socket, run_ctx->address.c_str()) < 0) {
                if (zmq_errno() != EINTR) {
                    run_ctx->error = static_cast<uint32_t>(zmq_errno());
                    return;
                }
            }
        },
        [this, run_ctx, res]() {
            AsyncScope const scope(Env(), async_context);

            state = Socket::State::Open;
            --endpoints;

            if (request_close) {
                Close();
            }

            if (run_ctx->error != 0) {
                res.Reject(ErrnoException(
                    Env(), static_cast<int32_t>(run_ctx->error), run_ctx->address)
                               .Value());
                return;
            }

            res.Resolve(Env().Undefined());
        });

    if (status < 0) {
        ErrnoException(Env(), EBADF).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    return res.Promise();
}

void Socket::Connect(const Napi::CallbackInfo& info) {
    Arg::Validator const args{
        Arg::Required<Arg::String>("Address must be a string"),
    };

    if (args.ThrowIfInvalid(info)) {
        return;
    }

    if (!ValidateOpen()) {
        return;
    }

    std::string const address = info[0].As<Napi::String>();
    if (zmq_connect(socket, address.c_str()) < 0) {
        ErrnoException(Env(), zmq_errno(), address).ThrowAsJavaScriptException();
        return;
    }

    endpoints++;
}

void Socket::Disconnect(const Napi::CallbackInfo& info) {
    Arg::Validator const args{
        Arg::Required<Arg::String>("Address must be a string"),
    };

    if (args.ThrowIfInvalid(info)) {
        return;
    }

    if (!ValidateOpen()) {
        return;
    }

    std::string const address = info[0].As<Napi::String>();
    if (zmq_disconnect(socket, address.c_str()) < 0) {
        ErrnoException(Env(), zmq_errno(), address).ThrowAsJavaScriptException();
        return;
    }

    --endpoints;
}

void Socket::Close(const Napi::CallbackInfo& info) {
    if (Arg::Validator{}.ThrowIfInvalid(info)) {
        return;
    }

    /* We can't access the socket when it is blocked, delay closing. */
    if (state == State::Blocked) {
        request_close = true;
    } else {
        request_close = false;
        Close();
    }
}

Napi::Value Socket::Send(const Napi::CallbackInfo& info) {
#ifdef _MSC_VER
#pragma warning(disable : 4065)
#endif
    switch (type) {
#ifdef ZMQ_HAS_POLLABLE_THREAD_SAFE
    case ZMQ_SERVER:
    case ZMQ_RADIO: {
        Arg::Validator args{
            Arg::Required<Arg::NotUndefined>("Message must be present"),
            Arg::Required<Arg::Object>("Options must be an object"),
        };

        if (args.ThrowIfInvalid(info)) return Env().Undefined();

        break;
    }

#endif
    default: {
        Arg::Validator const args{
            Arg::Required<Arg::NotUndefined>("Message must be present"),
        };

        if (args.ThrowIfInvalid(info)) {
            return Env().Undefined();
        }
    }
    }

    if (!ValidateOpen()) {
        return Env().Undefined();
    }

    if (poller.Writing()) {
        ErrnoException(Env(), EBUSY,
            "Socket is busy writing; only one send operation may be in progress "
            "at any time")
            .ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    OutgoingMsg::Parts parts(info[0], module);

#ifdef ZMQ_HAS_POLLABLE_THREAD_SAFE
    switch (type) {
    case ZMQ_SERVER: {
        if (!parts.SetRoutingId(info[1].As<Napi::Object>().Get("routingId"))) {
            return Env().Undefined();
        }
        break;
    }

    case ZMQ_RADIO: {
        if (!parts.SetGroup(info[1].As<Napi::Object>().Get("group"))) {
            return Env().Undefined();
        }
        break;
    }
    }
#endif

    if (send_timeout == 0 || HasEvents(ZMQ_POLLOUT)) {
        /* We can send on the socket immediately. This is a fast path. NOTE: We
           must make sure to not keep returning synchronously resolved promises,
           or we will starve the event loop. This can happen because ZMQ uses a
           background I/O thread, which could mean that the Node.js process is
           busy sending data to the I/O thread but is no longer able to respond
           to other events. */
#ifdef ZMQ_NO_SYNC_RESOLVE
        Warn(Env(), "Promise resolution by send() is delayed (ZMQ_NO_SYNC_RESOLVE).");
#else
        if (send_timeout == 0 || sync_operations++ < max_sync_operations) {
            auto res = Napi::Promise::Deferred::New(Env());
            Send(res, parts);

            /* This operation may have caused a state change, so we must also
               update the poller state manually! */
            poller.TriggerReadable();
            return res.Promise();
        }
#endif

        /* We can send on the socket immediately, but we don't, in order to
           avoid starving the event loop. Writes will be delayed. */
        UvScheduleDelayed(Env(), [&]() {
            poller.WritableCallback();
            if (socket == nullptr) {
                return;
            }
            poller.TriggerReadable();
        });
    } else {
        poller.PollWritable(send_timeout);
    }

    return poller.WritePromise(std::move(parts));
}

Napi::Value Socket::Receive(const Napi::CallbackInfo& info) {
    if (Arg::Validator{}.ThrowIfInvalid(info)) {
        return Env().Undefined();
    }

    if (!ValidateOpen()) {
        return Env().Undefined();
    }

    if (poller.Reading()) {
        ErrnoException(Env(), EBUSY,
            "Socket is busy reading; only one receive operation may be in "
            "progress at any time")
            .ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    if (receive_timeout == 0 || HasEvents(ZMQ_POLLIN)) {
        /* We can read from the socket immediately. This is a fast path.
           Also see the related comments in Send(). */
#ifdef ZMQ_NO_SYNC_RESOLVE
        Warn(Env(), "Promise resolution by receive() is delayed (ZMQ_NO_SYNC_RESOLVE).");
#else
        if (receive_timeout == 0 || sync_operations++ < max_sync_operations) {
            auto res = Napi::Promise::Deferred::New(Env());
            Receive(res);

            /* This operation may have caused a state change, so we must also
               update the poller state manually! */
            poller.TriggerWritable();
            return res.Promise();
        }
#endif

        /* We can read from the socket immediately, but we don't, in order to
           avoid starving the event loop. Reads will be delayed. */
        UvScheduleDelayed(Env(), [&]() {
            poller.ReadableCallback();
            if (socket == nullptr) {
                return;
            }
            poller.TriggerWritable();
        });
    } else {
        poller.PollReadable(receive_timeout);
    }

    return poller.ReadPromise();
}

void Socket::Join([[maybe_unused]] const Napi::CallbackInfo& info) {
#ifdef ZMQ_HAS_POLLABLE_THREAD_SAFE
    Arg::Validator args{
        Arg::Required<Arg::String, Arg::Buffer>("Group must be a string or buffer"),
    };

    if (args.ThrowIfInvalid(info)) return;

    if (!ValidateOpen()) return;

    auto str = [&]() {
        if (info[0].IsString()) {
            return std::string(info[0].As<Napi::String>());
        } else {
            Napi::Object buf = info[0].As<Napi::Object>();
            auto length = buf.As<Napi::Buffer<char>>().Length();
            auto value = buf.As<Napi::Buffer<char>>().Data();
            return std::string(value, length);
        }
    }();

    if (zmq_join(socket, str.c_str()) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }
#endif
}

void Socket::Leave([[maybe_unused]] const Napi::CallbackInfo& info) {
#ifdef ZMQ_HAS_POLLABLE_THREAD_SAFE
    Arg::Validator args{
        Arg::Required<Arg::String, Arg::Buffer>("Group must be a string or buffer"),
    };

    if (args.ThrowIfInvalid(info)) return;

    if (!ValidateOpen()) return;

    auto str = [&]() {
        if (info[0].IsString()) {
            return std::string(info[0].As<Napi::String>());
        } else {
            Napi::Object buf = info[0].As<Napi::Object>();
            auto length = buf.As<Napi::Buffer<char>>().Length();
            auto value = buf.As<Napi::Buffer<char>>().Data();
            return std::string(value, length);
        }
    }();

    if (zmq_leave(socket, str.c_str()) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }
#endif
}

template <>
Napi::Value Socket::GetSockOpt<bool>(const Napi::CallbackInfo& info) {
    Arg::Validator const args{
        Arg::Required<Arg::Number>("Identifier must be a number"),
    };

    if (args.ThrowIfInvalid(info)) {
        return Env().Undefined();
    }

    auto const option = info[0].As<Napi::Number>();

    int32_t value = 0;
    size_t length = sizeof(value);
    if (zmq_getsockopt(socket, option, &value, &length) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    return Napi::Boolean::New(Env(), value != 0);
}

template <>
void Socket::SetSockOpt<bool>(const Napi::CallbackInfo& info) {
    Arg::Validator const args{
        Arg::Required<Arg::Number>("Identifier must be a number"),
        Arg::Required<Arg::Boolean>("Option value must be a boolean"),
    };

    if (args.ThrowIfInvalid(info)) {
        return;
    }

    int32_t const option = info[0].As<Napi::Number>();
    WarnUnlessImmediateOption(option);

    int32_t value = static_cast<int32_t>(info[1].As<Napi::Boolean>());
    if (zmq_setsockopt(socket, option, &value, sizeof(value)) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }
}

template <>
Napi::Value Socket::GetSockOpt<char*>(const Napi::CallbackInfo& info) {
    Arg::Validator const args{
        Arg::Required<Arg::Number>("Identifier must be a number"),
    };

    if (args.ThrowIfInvalid(info)) {
        return Env().Undefined();
    }

    auto const option = info[0].As<Napi::Number>();

    static constexpr auto max_value_length = 1024;  //+
    auto value = std::array<char, max_value_length>();  //+
    size_t length = value.size();  //+
    if (zmq_getsockopt(socket, option, value.data(), &length) < 0) {  //+
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    if (length == 0 || (length == 1 && value[0] == 0)) {
        return Env().Null();
    }
    // NOLINTNEXTLINE(cppcoreguidelines-pro-bounds-constant-array-index)
    value[length] = '\0';
    return Napi::String::New(Env(), value.data());
}

template <>
void Socket::SetSockOpt<char*>(const Napi::CallbackInfo& info) {
    Arg::Validator const args{
        Arg::Required<Arg::Number>("Identifier must be a number"),
        Arg::Required<Arg::String, Arg::Buffer, Arg::Null>(
            "Option value must be a string or buffer"),
    };

    if (args.ThrowIfInvalid(info)) {
        return;
    }

    int32_t const option = info[0].As<Napi::Number>();
    WarnUnlessImmediateOption(option);

    int32_t err = 0;
    if (info[1].IsBuffer()) {
        auto const buf = info[1].As<Napi::Object>();
        auto length = buf.As<Napi::Buffer<char>>().Length();
        auto* value = buf.As<Napi::Buffer<char>>().Data();
        err = zmq_setsockopt(socket, option, value, length);
    } else if (info[1].IsString()) {
        std::string str = info[1].As<Napi::String>();
        auto length = str.length();
        auto* value = str.data();
        err = zmq_setsockopt(socket, option, value, length);
    } else {
        auto length = 0U;
        auto value = nullptr;
        err = zmq_setsockopt(socket, option, value, length);
    }

    if (err < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }
}

template <typename T>
Napi::Value Socket::GetSockOpt(const Napi::CallbackInfo& info) {
    Arg::Validator const args{
        Arg::Required<Arg::Number>("Identifier must be a number"),
    };

    if (args.ThrowIfInvalid(info)) {
        return Env().Undefined();
    }

    auto const option = info[0].As<Napi::Number>();

    T value = 0;
    size_t length = sizeof(value);
    if (zmq_getsockopt(socket, option, &value, &length) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    return Napi::Number::New(Env(), static_cast<double>(value));
}

template <typename T>
void Socket::SetSockOpt(const Napi::CallbackInfo& info) {
    Arg::Validator const args{
        Arg::Required<Arg::Number>("Identifier must be a number"),
        Arg::Required<Arg::Number>("Option value must be a number"),
    };

    if (args.ThrowIfInvalid(info)) {
        return;
    }

    int32_t const option = info[0].As<Napi::Number>();
    WarnUnlessImmediateOption(option);

    T value = NumberCast<T>(info[1].As<Napi::Number>());
    if (zmq_setsockopt(socket, option, &value, sizeof(value)) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    /* Mirror a few options that are used internally. */
    switch (option) {
    case ZMQ_SNDTIMEO:
        send_timeout = static_cast<int64_t>(value);
        break;
    case ZMQ_RCVTIMEO:
        receive_timeout = static_cast<int64_t>(value);
        break;
    default:
        break;
    }
}

Napi::Value Socket::GetEvents(const Napi::CallbackInfo& /*info*/) {
    /* Reuse the same observer object every time it is accessed. */
    if (observer_ref.IsEmpty()) {
        observer_ref.Reset(module.Observer.New({Value()}), 1);
    }

    return observer_ref.Value();
}

Napi::Value Socket::GetContext(const Napi::CallbackInfo& /*info*/) {
    return context_ref.Value();
}

Napi::Value Socket::GetClosed(const Napi::CallbackInfo& /*info*/) {
    return Napi::Boolean::New(Env(), state == State::Closed);
}

Napi::Value Socket::GetReadable(const Napi::CallbackInfo& /*info*/) {
    return Napi::Boolean::New(Env(), HasEvents(ZMQ_POLLIN));
}

Napi::Value Socket::GetWritable(const Napi::CallbackInfo& /*info*/) {
    return Napi::Boolean::New(Env(), HasEvents(ZMQ_POLLOUT));
}

void Socket::Initialize(Module& module, Napi::Object& exports) {
    auto proto = {
        InstanceMethod<&Socket::Bind>("bind"),
        InstanceMethod<&Socket::Unbind>("unbind"),
        InstanceMethod<&Socket::Connect>("connect"),
        InstanceMethod<&Socket::Disconnect>("disconnect"),
        InstanceMethod<&Socket::Close>("close"),

        /* Marked 'configurable' so they can be removed from the base Socket
           prototype and re-assigned to the sockets to which they apply. */
        InstanceMethod<&Socket::Send>("send", napi_configurable),
        InstanceMethod<&Socket::Receive>("receive", napi_configurable),
        InstanceMethod<&Socket::Join>("join", napi_configurable),
        InstanceMethod<&Socket::Leave>("leave", napi_configurable),

        InstanceMethod<&Socket::GetSockOpt<bool>>("getBoolOption"),
        InstanceMethod<&Socket::SetSockOpt<bool>>("setBoolOption"),
        InstanceMethod<&Socket::GetSockOpt<int32_t>>("getInt32Option"),
        InstanceMethod<&Socket::SetSockOpt<int32_t>>("setInt32Option"),
        InstanceMethod<&Socket::GetSockOpt<uint32_t>>("getUint32Option"),
        InstanceMethod<&Socket::SetSockOpt<uint32_t>>("setUint32Option"),
        InstanceMethod<&Socket::GetSockOpt<int64_t>>("getInt64Option"),
        InstanceMethod<&Socket::SetSockOpt<int64_t>>("setInt64Option"),
        InstanceMethod<&Socket::GetSockOpt<uint64_t>>("getUint64Option"),
        InstanceMethod<&Socket::SetSockOpt<uint64_t>>("setUint64Option"),
        InstanceMethod<&Socket::GetSockOpt<char*>>("getStringOption"),
        InstanceMethod<&Socket::SetSockOpt<char*>>("setStringOption"),

        InstanceAccessor<&Socket::GetEvents>("events"),
        InstanceAccessor<&Socket::GetContext>("context"),

        InstanceAccessor<&Socket::GetClosed>("closed"),
        InstanceAccessor<&Socket::GetReadable>("readable"),
        InstanceAccessor<&Socket::GetWritable>("writable"),
    };

    auto constructor = DefineClass(exports.Env(), "Socket", proto, &module);
    module.Socket = Napi::Persistent(constructor);
    exports.Set("Socket", constructor);
}

void Socket::Poller::ReadableCallback() {
    assert(read_deferred);
    socket.get().sync_operations = 0;

    AsyncScope const scope(socket.get().Env(), socket.get().async_context);
    socket.get().Receive(take(read_deferred));
}

void Socket::Poller::WritableCallback() {
    assert(write_deferred);
    socket.get().sync_operations = 0;

    AsyncScope const scope(socket.get().Env(), socket.get().async_context);
    socket.get().Send(take(write_deferred), write_value);
    write_value.Clear();
}

Napi::Value Socket::Poller::ReadPromise() {
    assert(!read_deferred);

    read_deferred = Napi::Promise::Deferred(socket.get().Env());
    return read_deferred->Promise();
}

Napi::Value Socket::Poller::WritePromise(OutgoingMsg::Parts&& parts) {
    assert(!write_deferred);

    write_value = std::move(parts);
    write_deferred = Napi::Promise::Deferred(socket.get().Env());
    return write_deferred->Promise();
}
}  // namespace zmq
