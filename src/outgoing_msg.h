#pragma once

#include <napi.h>

#include <forward_list>
#include <functional>

#include "./zmq_inc.h"

namespace zmq {
class Module;

class OutgoingMsg {
public:
    class Parts;

    /* Avoid copying outgoing messages, since the destructor is not copy safe,
       nor should we have to copy messages with the right STL containers. */
    OutgoingMsg(const OutgoingMsg&) = delete;
    OutgoingMsg& operator=(const OutgoingMsg&) = delete;
    OutgoingMsg(OutgoingMsg&&) = delete;
    OutgoingMsg& operator=(OutgoingMsg&&) = delete;

    /* Outgoing message. Takes a string or buffer argument and releases
       the underlying V8 resources whenever the message is sent, or earlier
       if the message was copied (small buffers & strings). */
    explicit OutgoingMsg(Napi::Value value, std::reference_wrapper<Module> module);
    ~OutgoingMsg();

    zmq_msg_t* get() {
        return &msg;
    }

private:
    class Reference {
        Napi::Reference<Napi::Value> persistent;
        std::reference_wrapper<Module> module;

    public:
        explicit Reference(Napi::Value val, std::reference_wrapper<Module> module)
            : persistent(Napi::Persistent(val)), module(module) {}

        void Recycle();
    };

    zmq_msg_t msg{};

    friend class Module;
};

/* Simple list over outgoing messages. Will take a single v8 value or an array
   of values and keep references to these items as necessary. */
class OutgoingMsg::Parts {
    std::forward_list<OutgoingMsg> parts;

public:
    Parts() = default;
    explicit Parts(Napi::Value value, Module& module);

    std::forward_list<OutgoingMsg>::iterator begin() {
        return parts.begin();
    }

    std::forward_list<OutgoingMsg>::iterator end() {
        return parts.end();
    }

#ifdef ZMQ_HAS_POLLABLE_THREAD_SAFE
    bool SetGroup(Napi::Value value);
    bool SetRoutingId(Napi::Value value);
#endif

    void Clear() {
        parts.clear();
    }
};
}  // namespace zmq

static_assert(!std::is_copy_constructible_v<zmq::OutgoingMsg>, "not copyable");
static_assert(!std::is_move_constructible_v<zmq::OutgoingMsg>, "not movable");
