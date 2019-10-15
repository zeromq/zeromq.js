/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

namespace zmq {
inline uv_loop_t* UvLoop(Napi::Env env) {
    uv_loop_t* loop = nullptr;
    napi_get_uv_event_loop(env, &loop);
    return loop;
}
}
