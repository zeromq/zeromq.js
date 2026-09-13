#pragma once

#include <napi.h>

#include <cassert>
#include <deque>
#include <memory>
#include <mutex>
#include <utility>

#include "./uvwork-wasm.h"

namespace zmq {
/* Container for references that must be released on the JavaScript thread.
   The adapter-backed work item replaces the native uv_async_t notification. */
template <typename T>
class Trash {
    struct State {
        Trash* owner = nullptr;
        bool scheduled = false;
        std::mutex lock;
    };

    std::deque<std::unique_ptr<T>> values;
    std::mutex lock;
    napi_env env{nullptr};
    std::shared_ptr<State> state{std::make_shared<State>()};

public:
    explicit Trash(const Napi::Env& next_env) : env(next_env) {
        state->owner = this;
    }

    ~Trash() {
        {
            std::lock_guard<std::mutex> guard(state->lock);
            state->owner = nullptr;
        }
        Clear();
    }

    void Add(T* item) {
        bool schedule = false;
        {
            std::lock_guard<std::mutex> guard(lock);
            values.emplace_back(item);
        }
        {
            std::lock_guard<std::mutex> guard(state->lock);
            if (!state->scheduled) {
                state->scheduled = true;
                schedule = true;
            }
        }

        if (schedule) {
            auto scheduled_state = state;
            [[maybe_unused]] auto status = UvQueue(Napi::Env(env), [] {}, [scheduled_state] {
                Trash* owner = nullptr;
                {
                    std::lock_guard<std::mutex> guard(scheduled_state->lock);
                    scheduled_state->scheduled = false;
                    owner = scheduled_state->owner;
                }
                if (owner != nullptr) {
                    owner->Clear();
                }
            });
            assert(status == napi_ok);
        }
    }

    void Clear() {
        std::lock_guard<std::mutex> guard(lock);
        values.clear();
    }
};
}  // namespace zmq
