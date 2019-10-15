/* Copyright (c) 2017-2019 Rolf Timmermans */
#include "context.h"
#include "socket.h"

#include "util/uvwork.h"

#include <unordered_set>

namespace zmq {
/* Create a reference to a single global context that is automatically
   closed on process exit. This is the default context. */
Napi::ObjectReference GlobalContext;

Napi::FunctionReference Context::Constructor;

std::unordered_set<void*> Context::ActivePtrs;

Context::Context(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Context>(info) {
    auto args = {
        Argument{"Options must be an object", &Napi::Value::IsObject,
            &Napi::Value::IsUndefined},
    };

    if (!ValidateArguments(info, args)) return;

    context = zmq_ctx_new();
    if (context != nullptr) {
        ActivePtrs.insert(context);
    } else {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }

    /* Sealing causes setting/getting invalid options to throw an error.
       Otherwise they would fail silently, which is very confusing. */
    Seal(info.This().As<Napi::Object>());

    if (info[0].IsObject()) {
        Assign(info.This().As<Napi::Object>(), info[0].As<Napi::Object>());
    }
}

Context::~Context() {
    if (context != nullptr) {
        /* Messages may still be in the pipeline, so we only shutdown
           and do not terminate the context just yet. */
        auto err = zmq_ctx_shutdown(context);
        assert(err == 0);

        context = nullptr;
    }
}

template <>
Napi::Value Context::GetCtxOpt<bool>(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
    };

    if (!ValidateArguments(info, args)) return Env().Undefined();

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
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
        Argument{"Option value must be a boolean", &Napi::Value::IsBoolean},
    };

    if (!ValidateArguments(info, args)) return;

    uint32_t option = info[0].As<Napi::Number>();

    int32_t value = info[1].As<Napi::Boolean>();
    if (zmq_ctx_set(context, option, value) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }
}

#ifdef ZMQ_BUILD_DRAFT_API

// template <>
// Napi::Value Context::GetCtxOpt<char*>(const Napi::CallbackInfo& info) {
//     auto args = {
//         Argument{"Identifier must be a number", &Napi::Value::IsNumber},
//     };
//
//     if (!ValidateArguments(info, args)) return Env().Undefined();
//
//     uint32_t option = info[0].As<Napi::Number>();
//
//     char value[1024];
//     size_t length = sizeof(value) - 1;
//     if (zmq_ctx_get_ext(context, option, value, &length) < 0) {
//         ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
//         return Env().Undefined();
//     }
//
//     if (length == 0 || (length == 1 && value[0] == 0)) {
//         return Env().Null();
//     } else {
//         value[length] = '\0';
//         return Napi::String::New(Env(), value);
//     }
// }
//
// template <>
// void Context::SetCtxOpt<char*>(const Napi::CallbackInfo& info) {
//     auto args = {
//         Argument{"Identifier must be a number", &Napi::Value::IsNumber},
//         Argument{"Option value must be a string or buffer", &Napi::Value::IsString,
//             &Napi::Value::IsBuffer, &Napi::Value::IsNull},
//     };
//
//     if (!ValidateArguments(info, args)) return;
//
//     int32_t option = info[0].As<Napi::Number>();
//     WarnUnlessImmediateOption(option);
//
//     int32_t err;
//     if (info[1].IsBuffer()) {
//         Napi::Object buf = info[1].As<Napi::Object>();
//         auto length = buf.As<Napi::Buffer<char>>().Length();
//         auto value = buf.As<Napi::Buffer<char>>().Data();
//         err = zmq_ctx_set_ext(context, option, value, length);
//     } else if (info[1].IsString()) {
//         std::string str = info[1].As<Napi::String>();
//         auto length = str.length();
//         auto value = str.data();
//         err = zmq_ctx_set_ext(context, option, value, length);
//     } else {
//         auto length = 0u;
//         auto value = nullptr;
//         err = zmq_ctx_set_ext(context, option, value, length);
//     }
//
//     if (err < 0) {
//         ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
//         return;
//     }
// }

#endif

template <typename T>
Napi::Value Context::GetCtxOpt(const Napi::CallbackInfo& info) {
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
    };

    if (!ValidateArguments(info, args)) return Env().Undefined();

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
    auto args = {
        Argument{"Identifier must be a number", &Napi::Value::IsNumber},
        Argument{"Option value must be a number", &Napi::Value::IsNumber},
    };

    if (!ValidateArguments(info, args)) return;

    uint32_t option = info[0].As<Napi::Number>();

    T value = info[1].As<Napi::Number>();
    if (zmq_ctx_set(context, option, value) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return;
    }
}

void TerminateAll(void*) {
    OutgoingMsg::Terminate();

    /* Close all currently open sockets. */
    for (auto socket : Socket::ActivePtrs) {
        auto err = zmq_close(socket);
        assert(err == 0);
    }

    /* Terminate all remaining contexts on process exit. */
    for (auto context : Context::ActivePtrs) {
        auto err = zmq_ctx_term(context);
        assert(err == 0);
    }
}

void Context::Initialize(Napi::Env& env, Napi::Object& exports) {
    auto proto = {
        InstanceMethod("getBoolOption", &Context::GetCtxOpt<bool>),
        InstanceMethod("setBoolOption", &Context::SetCtxOpt<bool>),
        InstanceMethod("getInt32Option", &Context::GetCtxOpt<int32_t>),
        InstanceMethod("setInt32Option", &Context::SetCtxOpt<int32_t>),
#ifdef ZMQ_BUILD_DRAFT_API
    // InstanceMethod("getStringOption", &Context::GetCtxOpt<char*>),
    // InstanceMethod("setStringOption", &Context::SetCtxOpt<char*>),
#endif
    };

    auto constructor = DefineClass(env, "Context", proto);

    /* Create global context that is closed on process exit. */
    auto context = constructor.New({});

    GlobalContext = Napi::Persistent(context);
    GlobalContext.SuppressDestruct();

    exports.Set("context", context);

    Constructor = Napi::Persistent(constructor);
    Constructor.SuppressDestruct();

    exports.Set("Context", constructor);

    auto status = napi_add_env_cleanup_hook(env, TerminateAll, nullptr);
    assert(status == napi_ok);
}
}
