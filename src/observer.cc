/* Copyright (c) 2017-2019 Rolf Timmermans */
#include "observer.h"
#include "context.h"
#include "module.h"
#include "socket.h"

#include "incoming_msg.h"
#include "util/async_scope.h"

#include <array>

namespace zmq {
template <typename T, typename... N>
auto constexpr make_array(N&&... args) -> std::array<T, sizeof...(args)> {
    return {{std::forward<N>(args)...}};
}

/* Events must be in order corresponding to the value of the #define value. */
static auto events = make_array<const char*>(
    /* ZMQ_EVENT_CONNECTED */
    "connect",

    /* EVENT_CONNECT_DELAYED */
    "connect:delay",

    /* EVENT_CONNECT_RETRIED */
    "connect:retry",

    /* EVENT_LISTENING */
    "bind",

    /* EVENT_BIND_FAILED */
    "bind:error",

    /* EVENT_ACCEPTED */
    "accept",

    /* EVENT_ACCEPT_FAILED */
    "accept:error",

    /* EVENT_CLOSED */
    "close",

    /* EVENT_CLOSE_FAILED */
    "close:error",

    /* EVENT_DISCONNECTED */
    "disconnect",

    /* EVENT_MONITOR_STOPPED */
    "end",

    /* EVENT_HANDSHAKE_FAILED_NO_DETAIL */
    "handshake:error:other",

    /* EVENT_HANDSHAKE_SUCCEEDED */
    "handshake",

    /* EVENT_HANDSHAKE_FAILED_PROTOCOL */
    "handshake:error:protocol",

    /* EVENT_HANDSHAKE_FAILED_AUTH */
    "handshake:error:auth",

    /* <---- Insert new events here. */

    /* Fallback if the event was unknown. */
    "unknown");

/* https://stackoverflow.com/questions/757059/position-of-least-significant-bit-that-is-set
 */
static inline const char* EventName(uint32_t val) {
    static const int multiply[32] = {0, 1, 28, 2, 29, 14, 24, 3, 30, 22, 20, 15, 25, 17,
        4, 8, 31, 27, 13, 23, 21, 19, 16, 7, 26, 12, 18, 6, 11, 5, 10, 9};

    uint32_t ffs = multiply[((uint32_t)((val & -val) * 0x077CB531U)) >> 27];

    if (ffs >= events.size()) return events.back();
    return events[ffs];
}

#ifdef ZMQ_EVENT_HANDSHAKE_FAILED_AUTH
static inline const char* AuthError(uint32_t val) {
    switch (val) {
    case 300:
        return "Temporary error";
    case 400:
        return "Authentication failure";
    case 500:
        return "Internal error";
    default:
        return "Unknown error";
    }
}
#endif

#ifdef ZMQ_EVENT_HANDSHAKE_FAILED_PROTOCOL
static inline std::pair<const char*, const char*> ProtoError(uint32_t val) {
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
        return std::make_pair("Unknown error", "ERR_UNKNOWN");
    }
}
#endif

Observer::Observer(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<Observer>(info), async_context(Env(), "Observer"), poller(*this),
      module(*reinterpret_cast<Module*>(info.Data())) {
    auto args = {
        Argument{"Socket must be a socket object", &Napi::Value::IsObject},
    };

    if (!ValidateArguments(info, args)) return;

    auto target = Socket::Unwrap(info[0].As<Napi::Object>());
    if (Env().IsExceptionPending()) return;

    /* Use `this` pointer as unique identifier for monitoring socket. */
    auto address = std::string("inproc://zmq.monitor.")
        + to_string(reinterpret_cast<uintptr_t>(this));

    if (zmq_socket_monitor(target->socket, address.c_str(), ZMQ_EVENT_ALL) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    auto context = Context::Unwrap(target->context_ref.Value());
    socket = zmq_socket(context->context, ZMQ_PAIR);
    if (socket == nullptr) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    uv_os_sock_t fd;
    size_t length = sizeof(fd);

    if (zmq_connect(socket, address.c_str()) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        goto error;
    }

    if (zmq_getsockopt(socket, ZMQ_FD, &fd, &length) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        goto error;
    }

    if (poller.Initialize(Env(), fd) < 0) {
        ErrnoException(Env(), errno).ThrowAsJavaScriptException();
        goto error;
    }

    /* Initialization was successful, register the observer for cleanup. */
    module.ObjectReaper.Add(this);

    return;

error:
    auto err = zmq_close(socket);
    assert(err == 0);

    socket = nullptr;
    return;
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
    int32_t events;
    size_t events_size = sizeof(events);

    while (zmq_getsockopt(socket, ZMQ_EVENTS, &events, &events_size) < 0) {
        /* Ignore errors. */
        if (zmq_errno() != EINTR) return 0;
    }

    return events & ZMQ_POLLIN;
}

void Observer::Close() {
    if (socket != nullptr) {
        module.ObjectReaper.Remove(this);

        Napi::HandleScope scope(Env());

        /* Close succeeds unless socket is invalid. */
        auto err = zmq_close(socket);
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

    auto data1 = static_cast<uint8_t*>(zmq_msg_data(&msg1));
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

    auto data2 = reinterpret_cast<char*>(zmq_msg_data(&msg2));
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
    case ZMQ_EVENT_HANDSHAKE_FAILED_NO_DETAIL: {
        event["error"] = ErrnoException(Env(), value).Value();
        break;
    }
#endif

#ifdef ZMQ_EVENT_HANDSHAKE_FAILED_PROTOCOL
    case ZMQ_EVENT_HANDSHAKE_FAILED_PROTOCOL: {
        auto desc = ProtoError(value);
        event["error"] = CodedException(Env(), desc.first, desc.second).Value();
        break;
    }
#endif

#ifdef ZMQ_EVENT_HANDSHAKE_FAILED_AUTH
    case ZMQ_EVENT_HANDSHAKE_FAILED_AUTH: {
        event["error"] = StatusException(Env(), AuthError(value), value).Value();
        break;
    }
#endif

    case ZMQ_EVENT_MONITOR_STOPPED: {
        /* Also close the monitoring socket. */
        Close();
        break;
    }
    }

    res.Resolve(event);
}

void Observer::Close(const Napi::CallbackInfo& info) {
    if (!ValidateArguments(info, {})) return;

    Close();
}

Napi::Value Observer::Receive(const Napi::CallbackInfo& info) {
    if (!ValidateArguments(info, {})) return Env().Undefined();
    if (!ValidateOpen()) return Env().Undefined();

    if (HasEvents()) {
        /* We can read from the socket immediately. This is a separate code
           path so we can avoid creating a lambda. */
        auto res = Napi::Promise::Deferred::New(Env());
        Receive(res);
        return res.Promise();
    } else {
        /* Check if we are already polling for reads. Only one promise may
           receive the next message, so we must ensure that receive
           operations are in sequence. */
        if (poller.PollingReadable()) {
            ErrnoException(Env(), EAGAIN).ThrowAsJavaScriptException();
            return Env().Undefined();
        }

        return poller.ReadPromise();
    }
}

Napi::Value Observer::GetClosed(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(Env(), socket == nullptr);
}

void Observer::Initialize(Module& module, Napi::Object& exports) {
    auto proto = {
        InstanceMethod("close", &Observer::Close),
        InstanceMethod("receive", &Observer::Receive),
        InstanceAccessor("closed", &Observer::GetClosed, nullptr),
    };

    auto constructor = DefineClass(exports.Env(), "Observer", proto, &module);
    module.Observer = Napi::Persistent(constructor);
    exports.Set("Observer", constructor);
}

void Observer::Poller::ReadableCallback() {
    AsyncScope scope(read_deferred.Env(), socket.async_context);
    socket.Receive(read_deferred);
}

Napi::Value Observer::Poller::ReadPromise() {
    read_deferred = Napi::Promise::Deferred(read_deferred.Env());
    zmq::Poller<Poller>::PollReadable(0);
    return read_deferred.Promise();
}
}
