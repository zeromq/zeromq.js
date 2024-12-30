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
        auto* loop = UvLoop(env);
        [[maybe_unused]] int32_t err = 0;

        check->data = this;
        err = uv_check_init(loop, check.get());
        assert(err == 0);

        idle->data = this;
        err = uv_idle_init(loop, idle.get());
        assert(err == 0);
    }

    void Schedule() {
        [[maybe_unused]] int32_t err = 0;

        /* Idle handle is needed to stop the event loop from blocking in poll. */
        err = uv_idle_start(idle.get(), []([[maybe_unused]] uv_idle_t* idle) {});
        assert(err == 0);

        err = uv_check_start(check.get(), [](uv_check_t* check) {
            auto& immediate = *static_cast<UvDelayed*>(check->data);
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
inline void UvScheduleDelayed(const Napi::Env& env, C callback) {
    auto immediate = new UvDelayed<C>(env, std::move(callback));
    return immediate->Schedule();
}
}  // namespace zmq
