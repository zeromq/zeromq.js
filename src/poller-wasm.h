#pragma once

#include <napi.h>

#include <cassert>
#include <chrono>
#include <cstdint>
#include <functional>
#include <memory>
#include <utility>

#include "./zmq_inc.h"
#include "util/uvwork-wasm.h"

namespace zmq {
using PollerFd = zmq_fd_t;

/* WASM pollers have no native file descriptor. They use adapter-backed async
   work to revisit ZeroMQ's edge-triggered readiness state. */
template <typename T>
class Poller {
    static constexpr uint32_t readable_event = 1U;
    static constexpr uint32_t writable_event = 2U;

    struct State {
        Poller* owner = nullptr;
        bool scheduled = false;
    };

    napi_env env{nullptr};
    std::shared_ptr<State> wasm_state{std::make_shared<State>()};
    uint32_t events{0};
    bool initialized{false};
    bool readable_deadline_set{false};
    bool writable_deadline_set{false};
    std::chrono::steady_clock::time_point readable_deadline{};
    std::chrono::steady_clock::time_point writable_deadline{};
    std::function<void()> finalize = nullptr;

public:
    ~Poller() {
        Close();
    }

    int32_t Initialize(Napi::Env next_env, PollerFd& /*file_descriptor*/,
        std::function<void()> finalizer = nullptr) {
        env = next_env;
        finalize = std::move(finalizer);
        initialized = true;
        wasm_state->owner = this;
        return 0;
    }

    void Close() {
        /* Match the native poller: pending operations are completed before
           the owner is detached from an already queued adapter callback. */
        Trigger(events);
        events = 0;
        readable_deadline_set = false;
        writable_deadline_set = false;
        initialized = false;
        wasm_state->owner = nullptr;

        if (finalize) {
            auto callback = std::move(finalize);
            callback();
        }
    }

    void PollReadable(int64_t timeout) {
        assert((events & readable_event) == 0);
        SetDeadline(timeout, readable_deadline, readable_deadline_set);
        events |= readable_event;
        ScheduleCheck();
    }

    void PollWritable(int64_t timeout) {
        assert((events & writable_event) == 0);
        SetDeadline(timeout, writable_deadline, writable_deadline_set);
        events |= writable_event;
        ScheduleCheck();
    }

    void TriggerReadable() {
        if ((events & readable_event) != 0 && static_cast<T*>(this)->ValidateReadable()) {
            Trigger(readable_event);
        }
    }

    void TriggerWritable() {
        if ((events & writable_event) != 0 && static_cast<T*>(this)->ValidateWritable()) {
            Trigger(writable_event);
        }
    }

private:
    static void SetDeadline(int64_t timeout,
        std::chrono::steady_clock::time_point& deadline, bool& deadline_set) {
        if (timeout > 0) {
            deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(timeout);
            deadline_set = true;
        } else {
            deadline_set = false;
        }
    }

    void ScheduleCheck() {
        if (!initialized || events == 0 || wasm_state->scheduled) {
            return;
        }

        wasm_state->scheduled = true;
        auto state = wasm_state;
        [[maybe_unused]] auto status = UvQueue(Napi::Env(env), [] {}, [state] {
            state->scheduled = false;
            if (state->owner != nullptr) {
                state->owner->Check();
            }
        });
        assert(status == napi_ok);
    }

    void Check() {
        if (!initialized || events == 0) {
            return;
        }

        const auto now = std::chrono::steady_clock::now();
        uint32_t triggered = 0;
        if ((events & readable_event) != 0
            && (static_cast<T*>(this)->ValidateReadable()
                || (readable_deadline_set && now >= readable_deadline))) {
            triggered |= readable_event;
        }
        if ((events & writable_event) != 0
            && (static_cast<T*>(this)->ValidateWritable()
                || (writable_deadline_set && now >= writable_deadline))) {
            triggered |= writable_event;
        }

        Trigger(triggered);
        ScheduleCheck();
    }

    void Trigger(uint32_t triggered) {
        events &= ~triggered;
        if ((triggered & readable_event) != 0) {
            readable_deadline_set = false;
            static_cast<T*>(this)->ReadableCallback();
        }
        if ((triggered & writable_event) != 0) {
            writable_deadline_set = false;
            static_cast<T*>(this)->WritableCallback();
        }
    }
};
}  // namespace zmq
