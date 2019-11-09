/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "uvloop.h"

namespace zmq {
/* Starts a UV worker. */
template <typename E, typename C>
class UvWork {
    /* Simple unique pointer suffices, since uv_work_t does not require
       calling uv_close() on completion. */
    std::unique_ptr<uv_work_t> work{new uv_work_t};

    E execute_callback;
    C complete_callback;

public:
    inline UvWork(E execute, C complete)
        : execute_callback(std::move(execute)), complete_callback(std::move(complete)) {
        work->data = this;
    }

    inline int32_t Schedule(uv_loop_t* loop) {
        auto err = uv_queue_work(loop, work.get(),
            [](uv_work_t* req) {
                auto& work = *reinterpret_cast<UvWork*>(req->data);
                work.execute_callback();
            },
            [](uv_work_t* req, int status) {
                auto& work = *reinterpret_cast<UvWork*>(req->data);
                work.complete_callback();
                delete &work;
            });

        if (err != 0) delete this;

        return err;
    }
};

template <typename E, typename C>
static inline int32_t UvQueue(const Napi::Env& env, E execute, C complete) {
    auto loop = UvLoop(env);
    auto work = new UvWork<E, C>(std::move(execute), std::move(complete));
    return work->Schedule(loop);
}
}
