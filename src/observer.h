/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "prefix.h"

#include "poller.h"

#include <optional>

namespace zmq {
class Module;

class Observer : public Napi::ObjectWrap<Observer>, public Closable {
public:
    static void Initialize(Module& module, Napi::Object& exports);

    explicit Observer(const Napi::CallbackInfo& info);
    virtual ~Observer();

    void Close() override;

protected:
    inline void Close(const Napi::CallbackInfo& info);
    inline Napi::Value Receive(const Napi::CallbackInfo& info);

    inline Napi::Value GetClosed(const Napi::CallbackInfo& info);

private:
    inline bool ValidateOpen() const;
    bool HasEvents() const;

    force_inline void Receive(const Napi::Promise::Deferred& res);

    class Poller : public zmq::Poller<Poller> {
        Observer& socket;
        std::optional<Napi::Promise::Deferred> read_deferred;

    public:
        explicit Poller(Observer& observer) : socket(observer) {}

        Napi::Value ReadPromise();

        inline bool Reading() const {
            return read_deferred.has_value();
        }

        inline bool ValidateReadable() const {
            return socket.HasEvents();
        }

        inline bool ValidateWritable() const {
            return false;
        }

        void ReadableCallback();
        inline void WritableCallback() {}
    };

    Napi::AsyncContext async_context;
    Observer::Poller poller;

    Module& module;
    void* socket = nullptr;

    friend class Socket;
};
}

static_assert(!std::is_copy_constructible<zmq::Observer>::value, "not copyable");
static_assert(!std::is_move_constructible<zmq::Observer>::value, "not movable");
