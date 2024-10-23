#pragma once

#include <napi.h>

#include "./zmq_inc.h"

namespace zmq {
class IncomingMsg {
public:
    IncomingMsg();
    ~IncomingMsg();

    IncomingMsg(const IncomingMsg&) = delete;
    IncomingMsg& operator=(const IncomingMsg&) = delete;
    IncomingMsg(IncomingMsg&&) = delete;
    IncomingMsg& operator=(IncomingMsg&&) = delete;

    Napi::Value IntoBuffer(const Napi::Env& env);

    zmq_msg_t* get() {
        return ref->get();
    }

private:
    class Reference {
        zmq_msg_t msg{};

    public:
        Reference();
        Reference(const Reference&) = delete;
        Reference(Reference&&) = delete;
        Reference& operator=(const Reference&) = delete;
        Reference& operator=(Reference&&) = delete;
        ~Reference();

        zmq_msg_t* get() {
            return &msg;
        }
    };

    Reference* ref = nullptr;
    bool moved = false;
};
}  // namespace zmq

static_assert(!std::is_copy_constructible_v<zmq::IncomingMsg>, "not copyable");
static_assert(!std::is_move_constructible_v<zmq::IncomingMsg>, "not movable");
