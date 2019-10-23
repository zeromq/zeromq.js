/* Copyright (c) 2017-2019 Rolf Timmermans */
#include "module.h"
#include "context.h"
#include "observer.h"
#include "outgoing_msg.h"
#include "proxy.h"
#include "socket.h"

namespace zmq {
static inline Napi::String Version(const Napi::Env& env) {
    int32_t major, minor, patch;
    zmq_version(&major, &minor, &patch);

    return Napi::String::New(
        env, to_string(major) + "." + to_string(minor) + "." + to_string(patch));
}

static inline Napi::Object Capabilities(const Napi::Env& env) {
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

Module::Global::Global() {
    SharedContext = zmq_ctx_new();
    assert(SharedContext != nullptr);

    ContextTerminator.Add(SharedContext);
}

Module::Global::Shared Module::Global::Instance() {
    /* Return a context reaper instance that is shared between threads, if
       possible. If no instance exists because there are no threads yet/anymore,
       a new reaper instance will be created. */
    static std::mutex lock;
    static std::weak_ptr<Global> shared;

    std::lock_guard<std::mutex> guard(lock);

    /* Get an existing instance from the weak reference, if possible. */
    if (auto instance = shared.lock()) {
        return instance;
    }

    /* Create a new instance and keep a weak reference. */
    auto instance = std::make_shared<Global>();
    shared = instance;
    return instance;
}

Module::Module(Napi::Object exports) : MsgTrash(exports.Env()) {
    exports.Set("version", zmq::Version(exports.Env()));
    exports.Set("capability", zmq::Capabilities(exports.Env()));
    exports.Set("curveKeyPair", Napi::Function::New(exports.Env(), zmq::CurveKeyPair));

    Context::Initialize(*this, exports);
    Socket::Initialize(*this, exports);
    Observer::Initialize(*this, exports);

#ifdef ZMQ_HAS_STEERABLE_PROXY
    Proxy::Initialize(*this, exports);
#endif
}
}

/* This initializer can be called in multiple contexts, like worker threads. */
NAPI_MODULE_INIT(/* env, exports */) {
    auto module = new zmq::Module(Napi::Object(env, exports));
    auto terminate = [](void* data) { delete reinterpret_cast<zmq::Module*>(data); };

    /* Tear down the module class when the env/agent/thread is closed.*/
    auto status = napi_add_env_cleanup_hook(env, terminate, module);
    assert(status == napi_ok);
    return exports;
}
