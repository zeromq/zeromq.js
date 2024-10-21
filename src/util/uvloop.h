#pragma once

#include <napi.h>
#include <uv.h>

#include <cassert>

namespace zmq {
inline uv_loop_t* UvLoop(const Napi::Env& env) {
    uv_loop_t* loop = nullptr;
    [[maybe_unused]] auto status = napi_get_uv_event_loop(env, &loop);
    assert(status == napi_ok);
    return loop;
}
}
