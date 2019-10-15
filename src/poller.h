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
        int32_t err;
        auto loop = UvLoop(env);

        /* Initialize uv pollers and timers, but unreference them immediately.
           The poller will be referenced once the socket connects or binds.
           The timers are weak references and will never prevent an exit. */

        poll->data = this;
        err = uv_poll_init_socket(loop, poll, fd);
        if (err != 0) return err;
        uv_unref(poll);

        readable_timer->data = this;
        err = uv_timer_init(loop, readable_timer);
        if (err != 0) return err;
        uv_unref(readable_timer);

        writable_timer->data = this;
        err = uv_timer_init(loop, writable_timer);
        if (err != 0) return err;
        uv_unref(writable_timer);

        finalize = finalizer;
        return 0;
    }

    inline void Ref() {
        /* Avoid segfault if accidentally called after closing. */
        if (poll != nullptr) {
            uv_ref(poll);
        }
    }

    inline void Unref() {
        /* Avoid segfault if accidentally called after closing. */
        if (poll != nullptr) {
            uv_unref(poll);
        }
    }

    /* Safely close and release all handles. This can be called before
       destruction to release resources early. */
    inline void Close() {
        /* Trigger all watched events manually, which causes any pending
           operation to succeed or fail immediately. */
        if (events) Trigger(events);

        /* Pollers and timers are stopped automatically by uv_close() which is
           wrapped in UvHandle. */

        /* Release references to all UV handles. */
        poll.reset(nullptr);
        readable_timer.reset(nullptr);
        writable_timer.reset(nullptr);

        if (finalize) finalize();
    }

    inline bool PollingReadable() const {
        return events & UV_READABLE;
    }

    inline bool PollingWritable() const {
        return events & UV_WRITABLE;
    }

    /* Start polling for readable state, with the given timeout. */
    inline void PollReadable(int64_t timeout) {
        assert((events & UV_READABLE) == 0);

        if (timeout > 0) {
            auto result = uv_timer_start(readable_timer,
                [](uv_timer_t* timer) {
                    auto& poller = *reinterpret_cast<Poller*>(timer->data);
                    poller.Trigger(UV_READABLE);
                },
                timeout, 0);

            assert(result == 0);
        }

        if (!events) {
            /* Only start polling if we were not polling already. */
            auto result = uv_poll_start(poll, UV_READABLE, Callback);
            assert(result == 0);
        }

        events |= UV_READABLE;
    }

    inline void PollWritable(int64_t timeout) {
        assert((events & UV_WRITABLE) == 0);

        if (timeout > 0) {
            auto result = uv_timer_start(writable_timer,
                [](uv_timer_t* timer) {
                    auto& poller = *reinterpret_cast<Poller*>(timer->data);
                    poller.Trigger(UV_WRITABLE);
                },
                timeout, 0);

            assert(result == 0);
        }

        /* Note: We poll for READS only! "ZMQ shall signal ANY pending
           events on the socket in an edge-triggered fashion by making the
           file descriptor become ready for READING." */
        if (!events) {
            auto result = uv_poll_start(poll, UV_READABLE, Callback);
            assert(result == 0);
        }

        events |= UV_WRITABLE;
    }

    /* Trigger any events that are ready. Use validation callbacks to see
       which events are actually available. */
    inline void Trigger() {
        if (events & UV_READABLE) {
            if (static_cast<T*>(this)->ValidateReadable()) Trigger(UV_READABLE);
        }

        if (events & UV_WRITABLE) {
            if (static_cast<T*>(this)->ValidateWritable()) Trigger(UV_WRITABLE);
        }
    }

private:
    /* Trigger one or more specific events manually. No validation is
       performed, which means these will cause EAGAIN errors if no events
       were actually available. */
    inline void Trigger(int32_t triggered) {
        events &= ~triggered;
        if (!events) {
            auto result = uv_poll_stop(poll);
            assert(result == 0);
        }

        if (triggered & UV_READABLE) {
            auto result = uv_timer_stop(readable_timer);
            assert(result == 0);
            static_cast<T*>(this)->ReadableCallback();
        }

        if (triggered & UV_WRITABLE) {
            auto result = uv_timer_stop(writable_timer);
            assert(result == 0);
            static_cast<T*>(this)->WritableCallback();
        }
    }

    /* Callback is called when FD is set to a readable state. This is an
       edge trigger that should allow us to check for read AND write events.
       There is no guarantee that any events are available. */
    static void Callback(uv_poll_t* poll, int32_t status, int32_t events) {
        auto& poller = *reinterpret_cast<Poller*>(poll->data);
        if (status == 0) poller.Trigger();
    };
};
}
