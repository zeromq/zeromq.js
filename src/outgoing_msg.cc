
#include "./outgoing_msg.h"

#include <functional>

#include "./module.h"
#include "util/error.h"
#include "util/string_or_buffer.h"

namespace zmq {
OutgoingMsg::OutgoingMsg(Napi::Value value, std::reference_wrapper<Module> module) {
    /**
     * The threshold for zero-copy heuristic. Messages smaller than this threshold
     * are sent directly without copying the buffer.
     */
    static auto constexpr zero_copy_threshold = 1U << 7U;

    const auto buffer_send = [&](uint8_t* data, size_t length) {
        /* Zero-copy heuristic. There's an overhead in releasing the buffer with an
           async call to the main thread (v8 is not threadsafe), so copying small
           amounts of memory is faster than releasing the initial buffer
           asynchronously. */
        if (length > zero_copy_threshold) {
            /* Create a reference and a recycle lambda which is called when the
               message is sent by ZeroMQ on an *arbitrary* thread. It will add
               the reference to the global trash, which will schedule a callback
               on the main v8 thread in order to safely dispose of the reference. */
            auto* ref = new Reference(value, module);
            const auto release = [](void* /*data*/, void* item_ptr) {
                auto* item = static_cast<Reference*>(item_ptr);
                item->Recycle();
            };

            if (zmq_msg_init_data(&this->msg, data, length, release, ref) < 0) {
                /* Initialisation failed, so the recycle callback is not called and we
                   have to clean up the reference manually. */
                delete ref;
                ErrnoException(value.Env(), zmq_errno()).ThrowAsJavaScriptException();
                return;
            }
        } else {
            // Allocate a new buffer for the message.
            if (zmq_msg_init_size(&this->msg, length) < 0) {
                ErrnoException(value.Env(), zmq_errno()).ThrowAsJavaScriptException();
                return;
            }

            // copy the data directly.
            std::copy(
                data, data + length, static_cast<uint8_t*>(zmq_msg_data(&this->msg)));
        }
    };

    /* String data should first be converted to UTF-8 before we can send it;
       but once converted we do not have to copy a second time. */
    const auto string_send = [&](std::string* str) {
        auto length = str->size();
        auto* data = str->data();

        const auto release = [](void* /*data*/, void* str_ptr) {
            auto* str = static_cast<std::string*>(str_ptr);
            delete str;
        };

        if (zmq_msg_init_data(&this->msg, data, length, release, str) < 0) {
            // Initialisation failed, so delete the string manually.
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
        return;
    }
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

        [[fallthrough]];
    default:
        string_send(new std::string(value.ToString()));
    }
}

OutgoingMsg::~OutgoingMsg() {
    [[maybe_unused]] auto err = zmq_msg_close(&msg);
    assert(err == 0);
}

void OutgoingMsg::Reference::Recycle() {
    module.get().MsgTrash.Add(this);
}

OutgoingMsg::Parts::Parts(Napi::Value value, Module& module) {
    if (value.IsArray()) {
        /* Reverse insert parts into outgoing message list. */
        auto arr = value.As<Napi::Array>();
        for (auto i = arr.Length(); (i--) != 0U;) {
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

    const auto group = convert_string_or_buffer(value);

    for (auto& part : parts) {
        if (zmq_msg_set_group(part.get(), group.c_str()) < 0) {
            ErrnoException(value.Env(), zmq_errno()).ThrowAsJavaScriptException();
            return false;
        }
    }

    return true;
}

bool OutgoingMsg::Parts::SetRoutingId(Napi::Value value) {
    if (value.IsUndefined()) {
        // https://clang.llvm.org/extra/clang-tidy/checks/readability/identifier-length.html
        ErrnoException(value.Env(), EINVAL).ThrowAsJavaScriptException();
        return false;
    }

    auto routing_id = value.As<Napi::Number>().Uint32Value();

    for (auto& part : parts) {
        if (zmq_msg_set_routing_id(part.get(), routing_id) < 0) {
            ErrnoException(value.Env(), zmq_errno()).ThrowAsJavaScriptException();
            return false;
        }
    }

    return true;
}
#endif

}  // namespace zmq
