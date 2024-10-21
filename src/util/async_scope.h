#pragma once

#include <napi.h>

namespace zmq {
class AsyncScope {
    Napi::HandleScope handle_scope;
    Napi::CallbackScope callback_scope;

public:
    explicit AsyncScope(Napi::Env env, const Napi::AsyncContext& context)
        : handle_scope(env), callback_scope(env, context) {}
};
}
