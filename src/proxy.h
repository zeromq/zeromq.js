/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "binding.h"

#ifdef ZMQ_HAS_STEERABLE_PROXY

namespace zmq {
class Proxy : public Napi::ObjectWrap<Proxy> {
public:
    static Napi::FunctionReference Constructor;
    static void Initialize(Napi::Env& env, Napi::Object& exports);

    explicit Proxy(const Napi::CallbackInfo& info);
    ~Proxy();

protected:
    inline Napi::Value Run(const Napi::CallbackInfo& info);

    inline void Pause(const Napi::CallbackInfo& info);
    inline void Resume(const Napi::CallbackInfo& info);
    inline void Terminate(const Napi::CallbackInfo& info);

    inline Napi::Value GetFrontEnd(const Napi::CallbackInfo& info);
    inline Napi::Value GetBackEnd(const Napi::CallbackInfo& info);

private:
    inline void SendCommand(const char* command);

    Napi::ObjectReference front_ref;
    Napi::ObjectReference back_ref;
    Napi::ObjectReference capture_ref;

    void* control_sub = nullptr;
    void* control_pub = nullptr;
};
}

#endif
