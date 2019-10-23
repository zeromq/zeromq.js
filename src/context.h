/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "prefix.h"

namespace zmq {
class Module;

class Context : public Napi::ObjectWrap<Context>, public Closable {
public:
    static void Initialize(Module& module, Napi::Object& exports);

    explicit Context(const Napi::CallbackInfo& info);
    virtual ~Context();

    Context(Context&&) = delete;
    Context& operator=(Context&&) = delete;

    void Close() override;

protected:
    template <typename T>
    inline Napi::Value GetCtxOpt(const Napi::CallbackInfo& info);

    template <typename T>
    inline void SetCtxOpt(const Napi::CallbackInfo& info);

private:
    Module& module;
    void* context = nullptr;

    friend class Socket;
    friend class Observer;
    friend class Proxy;
};
}

static_assert(!std::is_copy_constructible<zmq::Context>::value, "not copyable");
static_assert(!std::is_move_constructible<zmq::Context>::value, "not movable");
