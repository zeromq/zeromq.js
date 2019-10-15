/* Copyright (c) 2017-2019 Rolf Timmermans */
#include "context.h"
#include "observer.h"
#include "outgoing_msg.h"
#include "proxy.h"
#include "socket.h"

namespace zmq {
/* Global async context that is used to create async callbacks repeatedly.
   This is fairly useless. We don't play nicely with the async hooks feature.
   For more info see: https://nodejs.org/api/async_hooks.html
   The solution is to properly set up an async context for read/write polling
   (probably just one for all reading and one for all writing, on each socket)
   and for bind/unbind (one for each individual operation). */
napi_async_context AsyncContext;

static inline Napi::String Version(Napi::Env& env) {
    int32_t major, minor, patch;
    zmq_version(&major, &minor, &patch);

    return Napi::String::New(
        env, to_string(major) + "." + to_string(minor) + "." + to_string(patch));
}

static inline Napi::Object Capabilities(Napi::Env& env) {
    auto result = Napi::Object::New(env);

#ifdef ZMQ_HAS_CAPABILITIES
    static auto options = {"ipc", "pgm", "tipc", "norm", "curve", "gssapi", "draft"};
    for (auto& option : options) {
        result.Set(option, static_cast<bool>(zmq_has(option)));
    }

    /* Disable DRAFT sockets if there is no way to poll them (< 4.3.2), even
       if libzmq was built with DRAFT support. */
#ifndef ZMQ_HAS_POLLABLE_THREAD_SAFE
    result.Set("draft", false);
#endif

#else
#if !defined(ZMQ_HAVE_WINDOWS) && !defined(ZMQ_HAVE_OPENVMS)
    result.Set("ipc", true);
#endif
#if defined(ZMQ_HAVE_OPENPGM)
    result.Set("pgm", true);
#endif
#if defined(ZMQ_HAVE_TIPC)
    result.Set("tipc", true);
#endif
#if defined(ZMQ_HAVE_NORM)
    result.Set("norm", true);
#endif
#if defined(ZMQ_HAVE_CURVE)
    result.Set("curve", true);
#endif
#endif

    return result;
}

static inline Napi::Value CurveKeyPair(const Napi::CallbackInfo& info) {
    char public_key[41];
    char secret_key[41];
    if (zmq_curve_keypair(public_key, secret_key) < 0) {
        ErrnoException(info.Env(), zmq_errno()).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    auto result = Napi::Object::New(info.Env());
    result["publicKey"] = Napi::String::New(info.Env(), public_key);
    result["secretKey"] = Napi::String::New(info.Env(), secret_key);
    return result;
}
}

Napi::Object init(Napi::Env env, Napi::Object exports) {
    zmq::AsyncContext = Napi::AsyncContext(env, "zmq");

    exports.Set("version", zmq::Version(env));
    exports.Set("capability", zmq::Capabilities(env));
    exports.Set("curveKeyPair", Napi::Function::New(env, zmq::CurveKeyPair));

    zmq::OutgoingMsg::Initialize(env);

    zmq::Context::Initialize(env, exports);
    zmq::Socket::Initialize(env, exports);
    zmq::Observer::Initialize(env, exports);

#ifdef ZMQ_HAS_STEERABLE_PROXY
    zmq::Proxy::Initialize(env, exports);
#endif

    return exports;
}

NODE_API_MODULE(zmq, init)
