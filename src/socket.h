#pragma once

#include <functional>
#include <optional>

#include "./closable.h"
#include "./inline.h"
#include "./outgoing_msg.h"
#include "./poller.h"

namespace zmq {
class Module;

class Socket : public Napi::ObjectWrap<Socket>, public Closable {
public:
    static void Initialize(Module& module, Napi::Object& exports);

    explicit Socket(const Napi::CallbackInfo& info);

    Socket(const Socket&) = delete;
    Socket(Socket&&) = delete;
    Socket& operator=(const Socket&) = delete;
    Socket& operator=(Socket&&) = delete;
    ~Socket() override;

    void Close() override;

protected:
    enum class State : uint8_t {
        Open, /* Socket is open. */
        Closed, /* Socket is closed. */
        Blocked, /* Async operation in progress that disallows socket access. */
    };

    inline void Close(const Napi::CallbackInfo& info);

    inline Napi::Value Bind(const Napi::CallbackInfo& info);
    inline Napi::Value Unbind(const Napi::CallbackInfo& info);

    inline void Connect(const Napi::CallbackInfo& info);
    inline void Disconnect(const Napi::CallbackInfo& info);

    inline Napi::Value Send(const Napi::CallbackInfo& info);
    inline Napi::Value Receive(const Napi::CallbackInfo& info);

    inline void Join(const Napi::CallbackInfo& info);
    inline void Leave(const Napi::CallbackInfo& info);

    template <typename T>
    inline Napi::Value GetSockOpt(const Napi::CallbackInfo& info);

    template <typename T>
    inline void SetSockOpt(const Napi::CallbackInfo& info);

    inline Napi::Value GetEvents(const Napi::CallbackInfo& info);
    inline Napi::Value GetContext(const Napi::CallbackInfo& info);

    inline Napi::Value GetClosed(const Napi::CallbackInfo& info);
    inline Napi::Value GetReadable(const Napi::CallbackInfo& info);
    inline Napi::Value GetWritable(const Napi::CallbackInfo& info);

private:
    inline void WarnUnlessImmediateOption(int32_t option) const;
    [[nodiscard]] inline bool ValidateOpen() const;
    [[nodiscard]] bool HasEvents(uint32_t requested_events) const;

    /* Send/receive are usually in a hot path and will benefit slightly
       from being inlined. They are used in more than one location and are
       not necessarily automatically inlined by all compilers. */
    force_inline void Send(const Napi::Promise::Deferred& res, OutgoingMsg::Parts& parts);
    force_inline void Receive(const Napi::Promise::Deferred& res);

    class Poller : public zmq::Poller<Poller> {
        std::reference_wrapper<Socket> socket;
        std::optional<Napi::Promise::Deferred> read_deferred;
        std::optional<Napi::Promise::Deferred> write_deferred;
        OutgoingMsg::Parts write_value;

    public:
        explicit Poller(std::reference_wrapper<Socket> socket) : socket(socket) {}

        Napi::Value ReadPromise();
        Napi::Value WritePromise(OutgoingMsg::Parts&& parts);

        [[nodiscard]] bool Reading() const {
            return read_deferred.has_value();
        }

        [[nodiscard]] bool Writing() const {
            return write_deferred.has_value();
        }

        [[nodiscard]] bool ValidateReadable() const {
            return socket.get().HasEvents(ZMQ_POLLIN);
        }

        [[nodiscard]] bool ValidateWritable() const {
            return socket.get().HasEvents(ZMQ_POLLOUT);
        }

        void ReadableCallback();
        void WritableCallback();
    };

    Napi::AsyncContext async_context;
    Napi::ObjectReference context_ref;
    Napi::ObjectReference observer_ref;
    Socket::Poller poller;

    Module& module;
    void* socket = nullptr;

    int64_t send_timeout = -1;
    int64_t receive_timeout = -1;
    uint32_t sync_operations = 0;
    uint32_t endpoints = 0;

    State state = State::Open;
    bool request_close = false;
    bool thread_safe = false;
    int type = 0;

    friend class Observer;
    friend class Proxy;
};
}  // namespace zmq

static_assert(!std::is_copy_constructible_v<zmq::Socket>, "not copyable");
static_assert(!std::is_move_constructible_v<zmq::Socket>, "not movable");
