/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "binding.h"

namespace zmq {
class IncomingMsg {
public:
    IncomingMsg();
    ~IncomingMsg();

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
