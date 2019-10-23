/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "prefix.h"

#ifdef ZMQ_HAS_STEERABLE_PROXY

namespace zmq {
class Module;

class Proxy : public Napi::ObjectWrap<Proxy>, public Closable {
public:
    static void Initialize(Module& module, Napi::Object& exports);

    explicit Proxy(const Napi::CallbackInfo& info);
    virtual ~Proxy();

    void Close() override;

protected:
    inline Napi::Value Run(const Napi::CallbackInfo& info);

    inline void Pause(const Napi::CallbackInfo& info);
    inline void Resume(const Napi::CallbackInfo& info);
    inline void Terminate(const Napi::CallbackInfo& info);

    inline Napi::Value GetFrontEnd(const Napi::CallbackInfo& info);
    inline Napi::Value GetBackEnd(const Napi::CallbackInfo& info);

private:
    inline void SendCommand(const char* command);

    Napi::AsyncContext async_context;
    Napi::ObjectReference front_ref;
    Napi::ObjectReference back_ref;
    Napi::ObjectReference capture_ref;

    Module& module;
    void* control_sub = nullptr;
    void* control_pub = nullptr;
};
}

static_assert(!std::is_copy_constructible<zmq::Proxy>::value, "not copyable");
static_assert(!std::is_move_constructible<zmq::Proxy>::value, "not movable");

#endif
