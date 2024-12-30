
#include "./module.h"

#include <array>

#include "./context.h"
#include "./observer.h"
#include "./outgoing_msg.h"
#include "./proxy.h"
#include "./socket.h"
#include "./zmq_inc.h"
#include "util/error.h"

namespace zmq {
Napi::String Version(const Napi::Env& env) {
    int32_t major = 0;
    int32_t minor = 0;
    int32_t patch = 0;
    zmq_version(&major, &minor, &patch);

    return Napi::String::New(env,
        std::to_string(major) + "." + std::to_string(minor) + "."
            + std::to_string(patch));
}

Napi::Object Capabilities(const Napi::Env& env) {
    auto result = Napi::Object::New(env);

#ifdef ZMQ_HAS_CAPABILITIES
    static auto options = {"ipc", "pgm", "tipc", "norm", "curve", "gssapi", "draft"};
    for (const auto& option : options) {
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

Napi::Value CurveKeyPair(const Napi::CallbackInfo& info) {
    static constexpr auto max_key_length = 41;

    std::array<char, max_key_length> public_key{};
    std::array<char, max_key_length> secret_key{};

    if (zmq_curve_keypair(public_key.data(), secret_key.data()) < 0) {
        ErrnoException(info.Env(), zmq_errno()).ThrowAsJavaScriptException();
        return info.Env().Undefined();
    }

    auto result = Napi::Object::New(info.Env());
    result["publicKey"] = Napi::String::New(info.Env(), public_key.data());
    result["secretKey"] = Napi::String::New(info.Env(), secret_key.data());
    return result;
}

Module::Global::Global() : SharedContext(zmq_ctx_new()) {
    assert(SharedContext != nullptr);

    ContextTerminator.Add(SharedContext);
}

Module::Global::Shared Module::Global::Instance() {
    /* Return a context reaper instance that is shared between threads, if
       possible. If no instance exists because there are no threads yet/anymore,
       a new reaper instance will be created. */
    static std::mutex lock;
    static std::weak_ptr<Global> shared;

    std::lock_guard<std::mutex> const guard(lock);

    /* Get an existing instance from the weak reference, if possible. */
    if (auto instance = shared.lock()) {
        return instance;
    }

    /* Create a new instance and keep a weak reference. */
    auto instance = std::make_shared<Global>();
    shared = instance;
    return instance;
}

Module::Module(Napi::Env env, Napi::Object exports) : MsgTrash(env) {
    exports.Set("version", zmq::Version(env));
    exports.Set("capability", zmq::Capabilities(env));
    exports.Set("curveKeyPair", Napi::Function::New(env, zmq::CurveKeyPair));

    Context::Initialize(*this, exports);
    Socket::Initialize(*this, exports);
    Observer::Initialize(*this, exports);

#ifdef ZMQ_HAS_STEERABLE_PROXY
    Proxy::Initialize(*this, exports);
#endif
}
}  // namespace zmq

using Module = zmq::Module;
NODE_API_ADDON(Module)
