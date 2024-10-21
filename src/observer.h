#pragma once

#include <napi.h>

#include <optional>

#include "./closable.h"
#include "./inline.h"
#include "./poller.h"

namespace zmq {
class Module;

class Observer : public Napi::ObjectWrap<Observer>, public Closable {
public:
    static void Initialize(Module& module, Napi::Object& exports);

    explicit Observer(const Napi::CallbackInfo& info);
    ~Observer() override;

    void Close() override;

protected:
    inline void Close(const Napi::CallbackInfo& info);
    inline Napi::Value Receive(const Napi::CallbackInfo& info);

    inline Napi::Value GetClosed(const Napi::CallbackInfo& info);

private:
    [[nodiscard]] inline bool ValidateOpen() const;
    [[nodiscard]] bool HasEvents() const;

    force_inline void Receive(const Napi::Promise::Deferred& res);

    class Poller : public zmq::Poller<Poller> {
        Observer& socket;
        std::optional<Napi::Promise::Deferred> read_deferred;

    public:
        explicit Poller(Observer& observer) : socket(observer) {}

        Napi::Value ReadPromise();

        [[nodiscard]] bool Reading() const {
            return read_deferred.has_value();
        }

        [[nodiscard]] bool ValidateReadable() const {
            return socket.HasEvents();
        }

        [[nodiscard]] static bool ValidateWritable() {
            return false;
        }

        void ReadableCallback();
        void WritableCallback() {}
    };

    Napi::AsyncContext async_context;
    Observer::Poller poller;

    Module& module;
    void* socket = nullptr;

    friend class Socket;
};
}  // namespace zmq

static_assert(!std::is_copy_constructible_v<zmq::Observer>, "not copyable");
static_assert(!std::is_move_constructible_v<zmq::Observer>, "not movable");
