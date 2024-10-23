
#include "./incoming_msg.h"

#include <cassert>
#include <cstdint>

#include "util/electron_helper.h"
#include "util/error.h"

namespace zmq {
IncomingMsg::IncomingMsg() : ref(new Reference()) {}

IncomingMsg::~IncomingMsg() {
    if (!moved && ref != nullptr) {
        delete ref;
        ref = nullptr;
    }
}

Napi::Value IncomingMsg::IntoBuffer(const Napi::Env& env) {
    static auto const noElectronMemoryCage = !hasElectronMemoryCage(env);
    if (noElectronMemoryCage) {
        if (moved) {
            /* If ownership has been transferred, do not attempt to read the buffer
               again in any case. This should not happen of course. */
            ErrnoException(env, EINVAL).ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }
    auto* data = reinterpret_cast<uint8_t*>(zmq_msg_data(ref->get()));
    auto length = zmq_msg_size(ref->get());

    if (noElectronMemoryCage) {
        static auto constexpr zero_copy_threshold = 1U << 7U;
        if (length > zero_copy_threshold) {
            /* Reuse existing buffer for external storage. This avoids copying but
               does include an overhead in having to call a finalizer when the
               buffer is GC'ed. For very small messages it is faster to copy. */
            moved = true;

            /* Put appropriate GC pressure according to the size of the buffer. */
            Napi::MemoryManagement::AdjustExternalMemory(
                env, static_cast<int64_t>(length));

            const auto release = [](const Napi::Env& env, uint8_t*, Reference* ref) {
                const auto length = static_cast<int64_t>(zmq_msg_size(ref->get()));
                Napi::MemoryManagement::AdjustExternalMemory(env, -length);
                delete ref;
            };

            return Napi::Buffer<uint8_t>::New(env, data, length, release, ref)
                .As<Napi::Value>();
        }
    }

    if (length > 0) {
        return Napi::Buffer<uint8_t>::Copy(env, data, length).As<Napi::Value>();
    }

    return Napi::Buffer<uint8_t>::New(env, 0).As<Napi::Value>();
}

IncomingMsg::Reference::Reference() {
    [[maybe_unused]] auto err = zmq_msg_init(&msg);
    assert(err == 0);
}

IncomingMsg::Reference::~Reference() {
    [[maybe_unused]] auto err = zmq_msg_close(&msg);
    assert(err == 0);
}
}  // namespace zmq
