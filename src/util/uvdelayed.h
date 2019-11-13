/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "uvhandle.h"
#include "uvloop.h"

namespace zmq {
template <typename C>
class UvDelayed {
    UvHandle<uv_check_t> check;
    UvHandle<uv_idle_t> idle;
    C delayed_callback;

public:
    UvDelayed(const Napi::Env& env, C&& callback)
        : delayed_callback(std::move(callback)) {
        auto loop = UvLoop(env);
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
            auto& immediate = *reinterpret_cast<UvDelayed*>(check->data);
            immediate.check.reset();
            immediate.idle.reset();
            immediate.delayed_callback();
            delete &immediate;
        });

        assert(err == 0);
    }
};

/* This is similar to JS setImmediate(). */
template <typename C>
static inline void UvScheduleDelayed(const Napi::Env& env, C callback) {
    auto immediate = new UvDelayed<C>(env, std::move(callback));
    return immediate->Schedule();
}
}
