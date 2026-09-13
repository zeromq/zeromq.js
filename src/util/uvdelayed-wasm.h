#pragma once

#include <cassert>
#include <utility>

#include "uvwork-wasm.h"

namespace zmq {
/* This is similar to JS setImmediate(). The no-op execute callback keeps all
   host scheduling in the napi-wasm adapter and the completion callback runs on
   the JavaScript thread. */
template <typename C>
inline void UvScheduleDelayed(const Napi::Env& env, C callback) {
    [[maybe_unused]] auto status = UvQueue(env, [] {}, std::move(callback));
    assert(status == napi_ok);
}
}  // namespace zmq
