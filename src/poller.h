/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "util/uvhandle.h"
#include "util/uvloop.h"

namespace zmq {
/* Starts a UV poller with an attached timeout. The poller can be started
   and stopped multiple times. */
template <typename T>
class Poller {
    UvHandle<uv_poll_t> poll;

    UvHandle<uv_timer_t> readable_timer;
    UvHandle<uv_timer_t> writable_timer;

    int32_t events{0};
    std::function<void()> finalize = nullptr;

public:
    /* Initialize the poller with the given file descriptor. FD should be
       ZMQ style edge-triggered, with READABLE state indicating that ANY
       event may be present on the corresponding ZMQ socket. */
    inline int32_t Initialize(
        Napi::Env env, uv_os_sock_t& fd, std::function<void()> finalizer = nullptr) {
        auto loop = UvLoop(env);

        poll->data = this;
        if (auto err = uv_poll_init_socket(loop, poll, fd); err != 0) {
            return err;
        }

        readable_timer->data = this;
        if (auto err = uv_timer_init(loop, readable_timer); err != 0) {
            return err;
        }

        writable_timer->data = this;
        if (auto err = uv_timer_init(loop, writable_timer); err != 0) {
            return err;
        }

        finalize = finalizer;
        return 0;
    }

    /* Safely close and release all handles. This can be called before
       destruction to release resources early. */
    inline void Close() {
        /* Trigger watched events manually, which causes any pending operation
           to succeed or fail immediately. */
        Trigger(events);

        /* Pollers and timers are stopped automatically by uv_close() which is
           wrapped in UvHandle. */

        /* Release references to all UV handles. */
        poll.reset();
        readable_timer.reset();
        writable_timer.reset();

        if (finalize) finalize();
    }

    /* Start polling for readable state, with the given timeout. */
    inline void PollReadable(int64_t timeout) {
        assert((events & UV_READABLE) == 0);

        if (timeout > 0) {
            auto err = uv_timer_start(
                readable_timer,
                [](uv_timer_t* timer) {
                    auto& poller = *reinterpret_cast<Poller*>(timer->data);
                    poller.Trigger(UV_READABLE);
                },
                timeout, 0);

            assert(err == 0);
        }

        if (!events) {
            /* Only start polling if we were not polling already. */
            auto err = uv_poll_start(poll, UV_READABLE, Callback);
            assert(err == 0);
        }

        events |= UV_READABLE;
    }

    inline void PollWritable(int64_t timeout) {
        assert((events & UV_WRITABLE) == 0);

        if (timeout > 0) {
            auto err = uv_timer_start(
                writable_timer,
                [](uv_timer_t* timer) {
                    auto& poller = *reinterpret_cast<Poller*>(timer->data);
                    poller.Trigger(UV_WRITABLE);
                },
                timeout, 0);

            assert(err == 0);
        }

        /* Note: We poll for READS only! "ZMQ shall signal ANY pending
           events on the socket in an edge-triggered fashion by making the
           file descriptor become ready for READING." */
        if (!events) {
            auto err = uv_poll_start(poll, UV_READABLE, Callback);
            assert(err == 0);
        }

        events |= UV_WRITABLE;
    }

    /* Trigger any events that are ready. Use validation callbacks to see
       which events are actually available. */
    inline void TriggerReadable() {
        if (events & UV_READABLE) {
            if (static_cast<T*>(this)->ValidateReadable()) {
                Trigger(UV_READABLE);
            }
        }
    }

    inline void TriggerWritable() {
        if (events & UV_WRITABLE) {
            if (static_cast<T*>(this)->ValidateWritable()) {
                Trigger(UV_WRITABLE);
            }
        }
    }

private:
    /* Trigger one or more specific events manually. No validation is
       performed, which means these will cause EAGAIN errors if no events
       were actually available. */
    inline void Trigger(int32_t triggered) {
        events &= ~triggered;
        if (!events) {
            auto err = uv_poll_stop(poll);
            assert(err == 0);
        }

        if (triggered & UV_READABLE) {
            auto err = uv_timer_stop(readable_timer);
            assert(err == 0);
            static_cast<T*>(this)->ReadableCallback();
        }

        if (triggered & UV_WRITABLE) {
            auto err = uv_timer_stop(writable_timer);
            assert(err == 0);
            static_cast<T*>(this)->WritableCallback();
        }
    }

    /* Callback is called when FD is set to a readable state. This is an
       edge trigger that should allow us to check for read AND write events.
       There is no guarantee that any events are available. */
    static void Callback(uv_poll_t* poll, int32_t status, int32_t events) {
        if (status == 0) {
            auto& poller = *reinterpret_cast<Poller*>(poll->data);
            poller.TriggerReadable();
            poller.TriggerWritable();
        }
    }
};
}
