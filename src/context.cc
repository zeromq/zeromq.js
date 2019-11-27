/* Copyright (c) 2017-2019 Rolf Timmermans */
#include "context.h"
#include "module.h"
#include "socket.h"

#include "util/uvwork.h"

namespace zmq {
Context::Context(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<Context>(info), module(*reinterpret_cast<Module*>(info.Data())) {
    /* If this module has no global context, then create one with a process
       wide context pointer that is shared between threads/agents. */
    if (module.GlobalContext.IsEmpty()) {
        if (Arg::Validator{}.ThrowIfInvalid(info)) return;

        /* Just use the same shared global context pointer. Contexts are
           threadsafe anyway. */
        context = module.Global().SharedContext;
    } else {
        Arg::Validator args{
            Arg::Optional<Arg::Object>("Options must be an object"),
        };

        if (args.ThrowIfInvalid(info)) return;

        context = zmq_ctx_new();
    }

    if (context == nullptr) {
        ErrnoException(Env(), EINVAL).ThrowAsJavaScriptException();
        return;
    }

    /* Initialization was successful, register the context for cleanup. */
    module.ObjectReaper.Add(this);

    /* Sealing causes setting/getting invalid options to throw an error.
       Otherwise they would fail silently, which is very confusing. */
    Seal(info.This().As<Napi::Object>());

    if (info[0].IsObject()) {
        Assign(info.This().As<Napi::Object>(), info[0].As<Napi::Object>());
    }
}

Context::~Context() {
    Close();
}

void Context::Close() {
    /* A context will not be explicitly closed unless the current agent/thread
       is terminated. This method will only be called by a reaper, if the
       context object has not been GC'ed. */
    if (context != nullptr) {
        module.ObjectReaper.Remove(this);

        /* Do not shut down the globally shared context. */
        if (context != module.Global().SharedContext) {
            /* Request ZMQ context shutdown but do not terminate yet because
               termination may block depending on ZMQ_BLOCKY/ZMQ_LINGER. This
               should definitely be avoided during GC and may only be acceptable
               at process exit. */
            auto err = zmq_ctx_shutdown(context);
            assert(err == 0);

            /* Pass the ZMQ context on to terminator for cleanup at exit. */
            module.Global().ContextTerminator.Add(context);
        }

        /* Reset pointer to avoid double close. */
        context = nullptr;
    }
}

template <>
Napi::Value Context::GetCtxOpt<bool>(const Napi::CallbackInfo& info) {
    Arg::Validator args{
        Arg::Required<Arg::Number>("Identifier must be a number"),
    };

    if (args.ThrowIfInvalid(info)) return Env().Undefined();

    uint32_t option = info[0].As<Napi::Number>();

    int32_t value = zmq_ctx_get(context, option);
    if (value < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    return Napi::Boolean::New(Env(), value);
}

template <>
void Context::SetCtxOpt<bool>(const Napi::CallbackInfo& info) {
    Arg::Validator args{
        Arg::Required<Arg::Number>("Identifier must be a number"),
        Arg::Required<Arg::Boolean>("Option value must be a boolean"),
    };

    if (args.ThrowIfInvalid(info)) return;

    uint32_t option = info[0].As<Napi::Number>();

    int32_t value = info[1].As<Napi::Boolean>();
    if (zmq_ctx_set(context, option, value) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }
}

template <typename T>
Napi::Value Context::GetCtxOpt(const Napi::CallbackInfo& info) {
    Arg::Validator args{
        Arg::Required<Arg::Number>("Identifier must be a number"),
    };

    if (args.ThrowIfInvalid(info)) return Env().Undefined();

    uint32_t option = info[0].As<Napi::Number>();

    T value = zmq_ctx_get(context, option);
    if (value < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    return Napi::Number::New(Env(), value);
}

template <typename T>
void Context::SetCtxOpt(const Napi::CallbackInfo& info) {
    Arg::Validator args{
        Arg::Required<Arg::Number>("Identifier must be a number"),
        Arg::Required<Arg::Number>("Option value must be a number"),
    };

    if (args.ThrowIfInvalid(info)) return;

    uint32_t option = info[0].As<Napi::Number>();

    T value = info[1].As<Napi::Number>();
    if (zmq_ctx_set(context, option, value) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }
}

void Context::Initialize(Module& module, Napi::Object& exports) {
    auto proto = {
        InstanceMethod<&Context::GetCtxOpt<bool>>("getBoolOption"),
        InstanceMethod<&Context::SetCtxOpt<bool>>("setBoolOption"),
        InstanceMethod<&Context::GetCtxOpt<int32_t>>("getInt32Option"),
        InstanceMethod<&Context::SetCtxOpt<int32_t>>("setInt32Option"),
    };

    auto constructor = DefineClass(exports.Env(), "Context", proto, &module);

    /* Create global context that is closed on process exit. */
    auto context = constructor.New({});
    module.GlobalContext = Napi::Persistent(context);
    exports.Set("context", context);

    module.Context = Napi::Persistent(constructor);
    exports.Set("Context", constructor);
}
}
