
#include "./observer.h"

#include <cstdint>

#include "./context.h"
#include "./module.h"
#include "./socket.h"
#include "util/arguments.h"
#include "util/async_scope.h"
#include "util/error.h"
#include "util/take.h"

namespace zmq {
constexpr const char* EventName(uint32_t val) {
    switch (val) {
    case ZMQ_EVENT_CONNECTED:
        return "connect";

    case ZMQ_EVENT_CONNECT_DELAYED:
        return "connect:delay";

    case ZMQ_EVENT_CONNECT_RETRIED:
        return "connect:retry";

    case ZMQ_EVENT_LISTENING:
        return "bind";

    case ZMQ_EVENT_BIND_FAILED:
        return "bind:error";

    case ZMQ_EVENT_ACCEPTED:
        return "accept";

    case ZMQ_EVENT_ACCEPT_FAILED:
        return "accept:error";

    case ZMQ_EVENT_CLOSED:
        return "close";

    case ZMQ_EVENT_CLOSE_FAILED:
        return "close:error";

    case ZMQ_EVENT_DISCONNECTED:
        return "disconnect";

    case ZMQ_EVENT_MONITOR_STOPPED:
        return "end";

#ifdef ZMQ_EVENT_HANDSHAKE_FAILED_NO_DETAIL
    case ZMQ_EVENT_HANDSHAKE_FAILED_NO_DETAIL:
        return "handshake:error:other";
#endif

#ifdef ZMQ_EVENT_HANDSHAKE_SUCCEEDED
    case ZMQ_EVENT_HANDSHAKE_SUCCEEDED:
        return "handshake";
#endif

#ifdef ZMQ_EVENT_HANDSHAKE_FAILED_PROTOCOL
    case ZMQ_EVENT_HANDSHAKE_FAILED_PROTOCOL:
        return "handshake:error:protocol";
#endif

#ifdef ZMQ_EVENT_HANDSHAKE_FAILED_AUTH
    case ZMQ_EVENT_HANDSHAKE_FAILED_AUTH:
        return "handshake:error:auth";
#endif

        /* <---- Insert new events here. */

    default:
        /* Fallback if the event was unknown, which should not happen. */
        return "unknown";
    }
}

#ifdef ZMQ_EVENT_HANDSHAKE_FAILED_AUTH
constexpr const char* AuthError(uint32_t val) {
    // NOLINTBEGIN(*-magic-numbers)
    switch (val) {
    case 300:
        return "Temporary error";
    case 400:
        return "Authentication failure";
    case 500:
        return "Internal error";
    default:
        /* Fallback if the auth error was unknown, which should not happen. */
        return "Unknown error";
    }
    // NOLINTEND(*-magic-numbers)
}
#endif

#ifdef ZMQ_EVENT_HANDSHAKE_FAILED_PROTOCOL
std::pair<const char*, const char*> ProtoError(uint32_t val) {
// NOLINTNEXTLINE(*-macro-usage)
#define PROTO_ERROR_CASE(_prefix, _err)                                                  \
    case ZMQ_PROTOCOL_ERROR_##_prefix##_##_err:                                          \
        return std::make_pair(#_prefix " protocol error", "ERR_" #_prefix "_" #_err);

    switch (val) {
        PROTO_ERROR_CASE(ZMTP, UNSPECIFIED);
        PROTO_ERROR_CASE(ZMTP, UNEXPECTED_COMMAND);
        PROTO_ERROR_CASE(ZMTP, INVALID_SEQUENCE);
        PROTO_ERROR_CASE(ZMTP, KEY_EXCHANGE);
        PROTO_ERROR_CASE(ZMTP, MALFORMED_COMMAND_UNSPECIFIED);
        PROTO_ERROR_CASE(ZMTP, MALFORMED_COMMAND_MESSAGE);
        PROTO_ERROR_CASE(ZMTP, MALFORMED_COMMAND_HELLO);
        PROTO_ERROR_CASE(ZMTP, MALFORMED_COMMAND_INITIATE);
        PROTO_ERROR_CASE(ZMTP, MALFORMED_COMMAND_ERROR);
        PROTO_ERROR_CASE(ZMTP, MALFORMED_COMMAND_READY);
        PROTO_ERROR_CASE(ZMTP, MALFORMED_COMMAND_WELCOME);
        PROTO_ERROR_CASE(ZMTP, INVALID_METADATA);
        PROTO_ERROR_CASE(ZMTP, CRYPTOGRAPHIC);
        PROTO_ERROR_CASE(ZMTP, MECHANISM_MISMATCH);
        PROTO_ERROR_CASE(ZAP, UNSPECIFIED);
        PROTO_ERROR_CASE(ZAP, MALFORMED_REPLY);
        PROTO_ERROR_CASE(ZAP, BAD_REQUEST_ID);
        PROTO_ERROR_CASE(ZAP, BAD_VERSION);
        PROTO_ERROR_CASE(ZAP, INVALID_STATUS_CODE);
        PROTO_ERROR_CASE(ZAP, INVALID_METADATA);
    default:
        /* Fallback if the proto error was unknown, which should not happen. */
        return std::make_pair("Unknown error", "ERR_UNKNOWN");
    }
}
#endif

Observer::Observer(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<Observer>(info), async_context(Env(), "Observer"), poller(*this),
      module(*reinterpret_cast<Module*>(info.Data())) {
    Arg::Validator const args{
        Arg::Required<Arg::Object>("Socket must be a socket object"),
    };

    if (args.ThrowIfInvalid(info)) {
        return;
    }

    auto* target = Socket::Unwrap(info[0].As<Napi::Object>());
    if (Env().IsExceptionPending()) {
        return;
    }

    /* Use `this` pointer as unique identifier for monitoring socket. */
    auto address = std::string("inproc://zmq.monitor.")
        + std::to_string(reinterpret_cast<uintptr_t>(this));

    if (zmq_socket_monitor(target->socket, address.c_str(), ZMQ_EVENT_ALL) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    auto* context = Context::Unwrap(target->context_ref.Value());
    socket = zmq_socket(context->context, ZMQ_PAIR);
    if (socket == nullptr) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    uv_os_sock_t file_descriptor = 0;
    size_t length = sizeof(file_descriptor);

    const auto error = [this]() {
        [[maybe_unused]] auto err = zmq_close(socket);
        assert(err == 0);

        socket = nullptr;
    };

    if (zmq_connect(socket, address.c_str()) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        error();
    }

    if (zmq_getsockopt(socket, ZMQ_FD, &file_descriptor, &length) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        error();
    }

    if (poller.Initialize(Env(), file_descriptor) < 0) {
        ErrnoException(Env(), errno).ThrowAsJavaScriptException();
        error();
    }

    /* Initialization was successful, register the observer for cleanup. */
    module.ObjectReaper.Add(this);
}

Observer::~Observer() {
    Close();
}

bool Observer::ValidateOpen() const {
    if (socket == nullptr) {
        ErrnoException(Env(), EBADF).ThrowAsJavaScriptException();
        return false;
    }

    return true;
}

bool Observer::HasEvents() const {
    uint32_t events = 0;
    size_t events_size = sizeof(events);

    while (zmq_getsockopt(socket, ZMQ_EVENTS, &events, &events_size) < 0) {
        /* Ignore errors. */
        if (zmq_errno() != EINTR) {
            return false;
        }
    }

    return (events & ZMQ_POLLIN) != 0;
}

void Observer::Close() {
    if (socket != nullptr) {
        module.ObjectReaper.Remove(this);

        Napi::HandleScope const scope(Env());

        /* Close succeeds unless socket is invalid. */
        [[maybe_unused]] auto err = zmq_close(socket);
        assert(err == 0);

        /* Reset pointer to avoid double close. */
        socket = nullptr;

        /* Stop all polling and release event handlers. Callling this after
           setting socket to null causes a pending receive promise to be
           resolved with undefined. */
        poller.Close();
    }
}

void Observer::Receive(const Napi::Promise::Deferred& res) {
    zmq_msg_t msg1;
    zmq_msg_t msg2;

    zmq_msg_init(&msg1);
    while (zmq_msg_recv(&msg1, socket, ZMQ_DONTWAIT) < 0) {
        if (zmq_errno() != EINTR) {
            res.Reject(ErrnoException(Env(), zmq_errno()).Value());
            zmq_msg_close(&msg1);
            return;
        }
    }

    auto* data1 = static_cast<uint8_t*>(zmq_msg_data(&msg1));
    auto event_id = *reinterpret_cast<uint16_t*>(data1);
    auto value = *reinterpret_cast<uint32_t*>(data1 + 2);
    zmq_msg_close(&msg1);

    zmq_msg_init(&msg2);
    while (zmq_msg_recv(&msg2, socket, ZMQ_DONTWAIT) < 0) {
        if (zmq_errno() != EINTR) {
            res.Reject(ErrnoException(Env(), zmq_errno()).Value());
            zmq_msg_close(&msg2);
            return;
        }
    }

    auto* data2 = reinterpret_cast<char*>(zmq_msg_data(&msg2));
    auto length = zmq_msg_size(&msg2);

    auto event = Napi::Object::New(Env());
    event["type"] = Napi::String::New(Env(), EventName(event_id));

    if (length > 0) {
        event["address"] = Napi::String::New(Env(), data2, length);
    }

    zmq_msg_close(&msg2);

    switch (event_id) {
    case ZMQ_EVENT_CONNECT_RETRIED: {
        event["interval"] = Napi::Number::New(Env(), value);
        break;
    }

    case ZMQ_EVENT_BIND_FAILED:
    case ZMQ_EVENT_ACCEPT_FAILED:
    case ZMQ_EVENT_CLOSE_FAILED:
#ifdef ZMQ_EVENT_HANDSHAKE_FAILED_NO_DETAIL
    case ZMQ_EVENT_HANDSHAKE_FAILED_NO_DETAIL:
#endif
        event["error"] = ErrnoException(Env(), static_cast<int32_t>(value)).Value();
        break;

#ifdef ZMQ_EVENT_HANDSHAKE_FAILED_PROTOCOL
    case ZMQ_EVENT_HANDSHAKE_FAILED_PROTOCOL: {
        auto desc = ProtoError(value);
        event["error"] = CodedException(Env(), desc.first, desc.second).Value();
        break;
    }
#endif

#ifdef ZMQ_EVENT_HANDSHAKE_FAILED_AUTH
    case ZMQ_EVENT_HANDSHAKE_FAILED_AUTH:
        event["error"] = StatusException(Env(), AuthError(value), value).Value();
        break;
#endif

    case ZMQ_EVENT_MONITOR_STOPPED: {
        /* Also close the monitoring socket. */
        Close();
        break;
    }
    default:
        break;
    }

    res.Resolve(event);
}

void Observer::Close(const Napi::CallbackInfo& info) {
    if (Arg::Validator{}.ThrowIfInvalid(info)) {
        return;
    }

    Close();
}

Napi::Value Observer::Receive(const Napi::CallbackInfo& info) {
    if (Arg::Validator{}.ThrowIfInvalid(info)) {
        return Env().Undefined();
    }

    if (!ValidateOpen()) {
        return Env().Undefined();
    }

    if (poller.Reading()) {
        ErrnoException(Env(), EBUSY,
            "Observer is busy reading; only one receive operation may be in progress at "
            "any time")
            .ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    if (HasEvents()) {
        /* We can read from the socket immediately. This is a fast path. */
        auto res = Napi::Promise::Deferred::New(Env());
        Receive(res);
        return res.Promise();
    }
    poller.PollReadable(0);
    return poller.ReadPromise();
}

Napi::Value Observer::GetClosed(const Napi::CallbackInfo& /*info*/) {
    return Napi::Boolean::New(Env(), socket == nullptr);
}

void Observer::Initialize(Module& module, Napi::Object& exports) {
    auto proto = {
        InstanceMethod<&Observer::Close>("close"),
        InstanceMethod<&Observer::Receive>("receive"),
        InstanceAccessor<&Observer::GetClosed>("closed"),
    };

    auto constructor = DefineClass(exports.Env(), "Observer", proto, &module);
    module.Observer = Napi::Persistent(constructor);
    exports.Set("Observer", constructor);
}

void Observer::Poller::ReadableCallback() {
    assert(read_deferred);

    AsyncScope const scope(socket.get().Env(), socket.get().async_context);
    socket.get().Receive(take(read_deferred));
}

Napi::Value Observer::Poller::ReadPromise() {
    assert(!read_deferred);

    read_deferred = Napi::Promise::Deferred(socket.get().Env());
    return read_deferred->Promise();
}
}  // namespace zmq
