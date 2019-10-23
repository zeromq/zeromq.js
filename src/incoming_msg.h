/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "prefix.h"

namespace zmq {
class IncomingMsg {
public:
    IncomingMsg();
    ~IncomingMsg();

    IncomingMsg(const IncomingMsg&) = delete;
    IncomingMsg& operator=(const IncomingMsg&) = delete;

    Napi::Value IntoBuffer(const Napi::Env& env);

    inline operator zmq_msg_t*() {
        return *ref;
    }

private:
    class Reference {
        zmq_msg_t msg;

    public:
        Reference();
        ~Reference();

        inline operator zmq_msg_t*() {
            return &msg;
        }
    };

    Reference* ref = nullptr;
    bool moved = false;
};
}

static_assert(!std::is_copy_constructible<zmq::IncomingMsg>::value, "not copyable");
static_assert(!std::is_move_constructible<zmq::IncomingMsg>::value, "not movable");
