/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "binding.h"
#include "poller.h"

namespace zmq {
class Observer : public Napi::ObjectWrap<Observer> {
public:
    static Napi::FunctionReference Constructor;
    static void Initialize(Napi::Env& env, Napi::Object& exports);

    explicit Observer(const Napi::CallbackInfo& info);
    ~Observer();

protected:
    inline void Close(const Napi::CallbackInfo& info);
    inline Napi::Value Receive(const Napi::CallbackInfo& info);

    inline Napi::Value GetClosed(const Napi::CallbackInfo& info);

private:
    inline bool ValidateOpen() const;
    bool HasEvents() const;
    void Close();

    force_inline void Receive(const Napi::Promise::Deferred& res);

    class Poller : public zmq::Poller<Poller> {
        Observer& socket;
        Napi::Promise::Deferred read_deferred;

    public:
        explicit Poller(Observer& observer)
            : socket(observer), read_deferred(socket.Env()) {}

        Napi::Value ReadPromise();

        inline bool ValidateReadable() const {
            return socket.HasEvents();
        }

        inline bool ValidateWritable() const {
            return false;
        }

        void ReadableCallback();
        inline void WritableCallback() {}
    };

    Observer::Poller poller;
    void* socket = nullptr;

    friend class Socket;
};
}
