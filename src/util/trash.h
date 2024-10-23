#pragma once

#include <deque>
#include <memory>
#include <mutex>

#include "./uvhandle.h"
#include "./uvloop.h"

namespace zmq {
/* Container for unused references to outgoing messages. Once an item is
   added to the trash it will be cleared on the main thread once UV decides
   to call the async callback. This is required because v8 objects cannot
   be released on other threads. */
template <typename T>
class Trash {
    std::deque<std::unique_ptr<T>> values;
    std::mutex lock;
    UvHandle<uv_async_t> async;

public:
    /* Construct trash with an associated asynchronous callback. */
    explicit Trash(const Napi::Env& env) {
        auto* loop = UvLoop(env);

        async->data = this;

        auto clear = [](uv_async_t* async) {
            reinterpret_cast<Trash*>(async->data)->Clear();
        };

        [[maybe_unused]] auto err = uv_async_init(loop, async.get(), clear);
        assert(err == 0);

        /* Immediately unreference this handle in order to prevent the async
           callback from preventing the Node.js process to exit. */
        uv_unref(this->async.get_handle());
    }

    /* Add given item to the trash, marking it for deletion next time the
       async callback is called by UV. */
    void Add(T* item) {
        std::lock_guard<std::mutex> guard(lock);
        values.emplace_back(item);

        /* Call to uv_async_send() should never return nonzero. UV ensures
           that calls are coalesced if they occur frequently. This is good
           news for us, since that means frequent additions do not cause
           unnecessary trash cycle operations. */
        [[maybe_unused]] auto err = uv_async_send(this->async.get());
        assert(err == 0);
    }

    /* Empty the trash. */
    void Clear() {
        std::lock_guard<std::mutex> guard(lock);
        values.clear();
    }
};
}  // namespace zmq
