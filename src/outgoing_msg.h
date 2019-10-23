/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "prefix.h"

#include <forward_list>

namespace zmq {
class Module;

class OutgoingMsg {
public:
    class Parts;

    /* Avoid copying outgoing messages, since the destructor is not copy safe,
       nor should we have to copy messages with the right STL containers. */
    OutgoingMsg(const OutgoingMsg&) = delete;
    OutgoingMsg& operator=(const OutgoingMsg&) = delete;

    /* Outgoing message. Takes a string or buffer argument and releases
       the underlying V8 resources whenever the message is sent, or earlier
       if the message was copied (small buffers & strings). */
    explicit OutgoingMsg(Napi::Value value, Module& module);
    ~OutgoingMsg();

    inline operator zmq_msg_t*() {
        return &msg;
    }

private:
    class Reference {
        Napi::Reference<Napi::Value> persistent;
        Module& module;

    public:
        inline explicit Reference(Napi::Value val, Module& module)
            : persistent(Napi::Persistent(val)), module(module) {}

        void Recycle();
    };

    zmq_msg_t msg;

    friend class Module;
};

/* Simple list over outgoing messages. Will take a single v8 value or an array
   of values and keep references to these items as necessary. */
class OutgoingMsg::Parts {
    std::forward_list<OutgoingMsg> parts;

public:
    inline Parts() {}
    explicit Parts(Napi::Value value, Module& module);

    inline std::forward_list<OutgoingMsg>::iterator begin() {
        return parts.begin();
    }

    inline std::forward_list<OutgoingMsg>::iterator end() {
        return parts.end();
    }

#ifdef ZMQ_HAS_POLLABLE_THREAD_SAFE
    bool SetGroup(Napi::Value value);
    bool SetRoutingId(Napi::Value value);
#endif

    inline void Clear() {
        parts.clear();
    }
};
}

static_assert(!std::is_copy_constructible<zmq::OutgoingMsg>::value, "not copyable");
static_assert(!std::is_move_constructible<zmq::OutgoingMsg>::value, "not movable");
