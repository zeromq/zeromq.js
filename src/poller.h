#pragma once

#include <cstdint>
#include <utility>

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

    uint32_t events{0};
    std::function<void()> finalize = nullptr;

public:
    /* Initialize the poller with the given file descriptor. FD should be
       ZMQ style edge-triggered, with READABLE state indicating that ANY
       event may be present on the corresponding ZMQ socket. */
    int32_t Initialize(Napi::Env env, uv_os_sock_t& file_descriptor,
        std::function<void()> finalizer = nullptr) {
        auto* loop = UvLoop(env);

        poll->data = this;
        if (auto err = uv_poll_init_socket(loop, poll.get(), file_descriptor); err != 0) {
            return err;
        }

        readable_timer->data = this;
        if (auto err = uv_timer_init(loop, readable_timer.get()); err != 0) {
            return err;
        }

        writable_timer->data = this;
        if (auto err = uv_timer_init(loop, writable_timer.get()); err != 0) {
            return err;
        }

        finalize = std::move(finalizer);
        return 0;
    }

    /* Safely close and release all handles. This can be called before
       destruction to release resources early. */
    void Close() {
        /* Trigger watched events manually, which causes any pending operation
           to succeed or fail immediately. */
        Trigger(events);

        /* Pollers and timers are stopped automatically by uv_close() which is
           wrapped in UvHandle. */

        /* Release references to all UV handles. */
        poll.reset();
        readable_timer.reset();
        writable_timer.reset();

        if (finalize) {
            finalize();
        }
    }

    /* Start polling for readable state, with the given timeout. */
    void PollReadable(int64_t timeout) {
        assert((events & UV_READABLE) == 0);

        if (timeout > 0) {
            [[maybe_unused]] auto err = uv_timer_start(
                readable_timer.get(),
                [](uv_timer_t* timer) {
                    // NOLINTNEXTLINE(*-pro-type-reinterpret-cast)
                    auto& poller = *static_cast<Poller*>(timer->data);
                    poller.Trigger(UV_READABLE);
                },
                static_cast<uint64_t>(timeout), 0);

            assert(err == 0);
        }

        if (events == 0) {
            /* Only start polling if we were not polling already. */
            [[maybe_unused]] auto err = uv_poll_start(poll.get(), UV_READABLE, Callback);
            assert(err == 0);
        }

        events |= UV_READABLE;
    }

    void PollWritable(int64_t timeout) {
        assert((events & UV_WRITABLE) == 0);

        if (timeout > 0) {
            [[maybe_unused]] auto err = uv_timer_start(
                writable_timer.get(),
                [](uv_timer_t* timer) {
                    // NOLINTNEXTLINE(*-pro-type-reinterpret-cast)
                    auto& poller = *static_cast<Poller*>(timer->data);
                    poller.Trigger(UV_WRITABLE);
                },
                static_cast<uint64_t>(timeout), 0);

            assert(err == 0);
        }

        /* Note: We poll for READS only! "ZMQ shall signal ANY pending
           events on the socket in an edge-triggered fashion by making the
           file descriptor become ready for READING." */
        if (events == 0) {
            [[maybe_unused]] auto err = uv_poll_start(poll.get(), UV_READABLE, Callback);
            assert(err == 0);
        }

        events |= UV_WRITABLE;
    }

    /* Trigger any events that are ready. Use validation callbacks to see
       which events are actually available. */
    void TriggerReadable() {
        if ((events & UV_READABLE) != 0) {
            if (static_cast<T*>(this)->ValidateReadable()) {
                Trigger(UV_READABLE);
            }
        }
    }

    void TriggerWritable() {
        if ((events & UV_WRITABLE) != 0) {
            if (static_cast<T*>(this)->ValidateWritable()) {
                Trigger(UV_WRITABLE);
            }
        }
    }

private:
    /* Trigger one or more specific events manually. No validation is
       performed, which means these will cause EAGAIN errors if no events
       were actually available. */
    void Trigger(uint32_t triggered) {
        events &= ~triggered;
        if (events == 0) {
            [[maybe_unused]] auto err = uv_poll_stop(poll.get());
            assert(err == 0);
        }

        if ((triggered & UV_READABLE) != 0) {
            [[maybe_unused]] auto err = uv_timer_stop(readable_timer.get());
            assert(err == 0);
            static_cast<T*>(this)->ReadableCallback();
        }

        if ((triggered & UV_WRITABLE) != 0) {
            [[maybe_unused]] auto err = uv_timer_stop(writable_timer.get());
            assert(err == 0);
            static_cast<T*>(this)->WritableCallback();
        }
    }

    /* Callback is called when FD is set to a readable state. This is an
       edge trigger that should allow us to check for read AND write events.
       There is no guarantee that any events are available. */
    static void Callback(uv_poll_t* poll, int32_t status, int32_t /*events*/) {
        if (status == 0) {
            // NOLINTNEXTLINE(*-pro-type-reinterpret-cast)
            auto& poller = *static_cast<Poller*>(poll->data);
            poller.TriggerReadable();
            poller.TriggerWritable();
        }
    }
};
}  // namespace zmq
