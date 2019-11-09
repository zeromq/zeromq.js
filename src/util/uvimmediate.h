/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "uvhandle.h"
#include "uvloop.h"

namespace zmq {
template <typename C>
class UvImmediate {
    UvHandle<uv_check_t> check;
    UvHandle<uv_idle_t> idle;
    C delayed_callback;

public:
    UvImmediate(uv_loop_t* loop, C&& callback) : delayed_callback(std::move(callback)) {
        int32_t err;

        check->data = this;
        err = uv_check_init(loop, check);
        assert(err == 0);

        idle->data = this;
        err = uv_idle_init(loop, idle);
        assert(err == 0);
    }

    inline void Schedule() {
        int32_t err;

        /* Idle handle is needed to stop the event loop from blocking in poll. */
        err = uv_idle_start(idle, [](uv_idle_t* idle) {});
        assert(err == 0);

        err = uv_check_start(check, [](uv_check_t* check) {
            auto& immediate = *reinterpret_cast<UvImmediate*>(check->data);
            immediate.delayed_callback();
            delete &immediate;
        });

        assert(err == 0);
    }
};

template <typename C>
static inline void SetImmediate(const Napi::Env& env, C callback) {
    auto immediate = new UvImmediate<C>(UvLoop(env), std::move(callback));
    return immediate->Schedule();
}
}
