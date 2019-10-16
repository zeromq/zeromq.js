/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

namespace zmq {
class AsyncScope {
    Napi::HandleScope handle_scope;
    Napi::CallbackScope callback_scope;

public:
    inline explicit AsyncScope(Napi::Env env, const Napi::AsyncContext& context)
        : handle_scope(env), callback_scope(env, context) {}
};
}
