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

    Napi::Value IntoBuffer(const Napi::Env& env);

    // NOLINTNEXTLINE(*-explicit-*)
    inline operator zmq_msg_t*() {
        return *ref;
    }

private:
    class Reference {
        zmq_msg_t msg{};

    public:
        Reference();
        ~Reference();

        // NOLINTNEXTLINE(*-explicit-*)
        inline operator zmq_msg_t*() {
            return &msg;
        }
    };

    Reference* ref = nullptr;
    bool moved = false;
};
}  // namespace zmq

static_assert(!std::is_copy_constructible_v<zmq::IncomingMsg>, "not copyable");
static_assert(!std::is_move_constructible_v<zmq::IncomingMsg>, "not movable");
