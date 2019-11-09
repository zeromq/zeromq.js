/* Copyright (c) 2017-2019 Rolf Timmermans */
#include "outgoing_msg.h"
#include "module.h"

#include "util/error.h"

namespace zmq {
OutgoingMsg::OutgoingMsg(Napi::Value value, Module& module) {
    static auto constexpr zero_copy_threshold = 1 << 7;

    auto buffer_send = [&](uint8_t* data, size_t length) {
        /* Zero-copy heuristic. There's an overhead in releasing the buffer with an
           async call to the main thread (v8 is not threadsafe), so copying small
           amounts of memory is faster than releasing the initial buffer
           asynchronously. */
        if (length > zero_copy_threshold) {
            /* Create a reference and a recycle lambda which is called when the
               message is sent by ZeroMQ on an *arbitrary* thread. It will add
               the reference to the global trash, which will schedule a callback
               on the main v8 thread in order to safely dispose of the reference. */
            auto ref = new Reference(value, module);
            auto recycle = [](void*, void* item) {
                static_cast<Reference*>(item)->Recycle();
            };

            if (zmq_msg_init_data(&msg, data, length, recycle, ref) < 0) {
                /* Initialisation failed, so the recycle callback is not called and we
                   have to clean up the reference manually. */
                delete ref;
                ErrnoException(value.Env(), zmq_errno()).ThrowAsJavaScriptException();
                return;
            }
        } else {
            if (zmq_msg_init_size(&msg, length) < 0) {
                ErrnoException(value.Env(), zmq_errno()).ThrowAsJavaScriptException();
                return;
            }

            std::copy(data, data + length, static_cast<uint8_t*>(zmq_msg_data(&msg)));
        }
    };

    /* String data should first be converted to UTF-8 before we can send it;
       but once converted we do not have to copy a second time. */
    auto string_send = [&](std::string* str) {
        auto length = str->size();
        auto data = const_cast<char*>(str->data());

        auto release = [](void*, void* str) {
            delete reinterpret_cast<std::string*>(str);
        };

        if (zmq_msg_init_data(&msg, data, length, release, str) < 0) {
            delete str;
            ErrnoException(value.Env(), zmq_errno()).ThrowAsJavaScriptException();
            return;
        }
    };

    /* It is likely that the message is either a buffer or a string. Don't test
       for other object types (such as array buffer), until we've established
       it is neither! */
    if (value.IsBuffer()) {
        auto buf = value.As<Napi::Buffer<uint8_t>>();
        buffer_send(buf.Data(), buf.Length());
    } else {
        switch (value.Type()) {
        case napi_null:
            zmq_msg_init(&msg);
            return;

        case napi_string:
            string_send(new std::string(value.As<Napi::String>()));
            return;

        case napi_object:
            if (value.IsArrayBuffer()) {
                auto buf = value.As<Napi::ArrayBuffer>();
                buffer_send(static_cast<uint8_t*>(buf.Data()), buf.ByteLength());
                return;
            }
            /* Fall through */

        default:
            string_send(new std::string(value.ToString()));
        }
    }
}

OutgoingMsg::~OutgoingMsg() {
    auto err = zmq_msg_close(&msg);
    assert(err == 0);
}

void OutgoingMsg::Reference::Recycle() {
    module.MsgTrash.Add(this);
}

OutgoingMsg::Parts::Parts(Napi::Value value, Module& module) {
    if (value.IsArray()) {
        /* Reverse insert parts into outgoing message list. */
        auto arr = value.As<Napi::Array>();
        for (auto i = arr.Length(); i--;) {
            parts.emplace_front(arr[i], module);
        }
    } else {
        parts.emplace_front(value, module);
    }
}

#ifdef ZMQ_HAS_POLLABLE_THREAD_SAFE
bool OutgoingMsg::Parts::SetGroup(Napi::Value value) {
    if (value.IsUndefined()) {
        ErrnoException(value.Env(), EINVAL).ThrowAsJavaScriptException();
        return false;
    }

    auto group = [&]() {
        if (value.IsString()) {
            return std::string(value.As<Napi::String>());
        } else if (value.IsBuffer()) {
            Napi::Object buf = value.As<Napi::Object>();
            auto length = buf.As<Napi::Buffer<char>>().Length();
            auto value = buf.As<Napi::Buffer<char>>().Data();
            return std::string(value, length);
        } else {
            return std::string();
        }
    }();

    for (auto& part : parts) {
        if (zmq_msg_set_group(part, group.c_str()) < 0) {
            ErrnoException(value.Env(), zmq_errno()).ThrowAsJavaScriptException();
            return false;
        }
    }

    return true;
}

bool OutgoingMsg::Parts::SetRoutingId(Napi::Value value) {
    if (value.IsUndefined()) {
        ErrnoException(value.Env(), EINVAL).ThrowAsJavaScriptException();
        return false;
    }

    auto id = value.As<Napi::Number>().Uint32Value();

    for (auto& part : parts) {
        if (zmq_msg_set_routing_id(part, id) < 0) {
            ErrnoException(value.Env(), zmq_errno()).ThrowAsJavaScriptException();
            return false;
        }
    }

    return true;
}
#endif

}
