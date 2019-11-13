/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include <memory>
#include <uv.h>

namespace zmq {
template <typename T>
struct UvDeleter {
    constexpr UvDeleter(){};

    inline void operator()(T* handle) {
        /* If uninitialized, simply delete the memory. We
           may not call uv_close() on uninitialized handles. */
        if (handle->type == 0) {
            delete reinterpret_cast<T*>(handle);
            return;
        }

        /* Otherwise close the UV handle and delete in the callback. */
        uv_close(reinterpret_cast<uv_handle_t*>(handle),
            [](uv_handle_t* handle) { delete reinterpret_cast<T*>(handle); });
    }
};

template <typename T>
using handle_ptr = std::unique_ptr<T, UvDeleter<T>>;

/* Smart UV handle that closes and releases itself on destruction. */
template <typename T>
class UvHandle : handle_ptr<T> {
public:
    inline UvHandle() : handle_ptr<T>{new T{}, UvDeleter<T>()} {};

    using handle_ptr<T>::reset;
    using handle_ptr<T>::operator->;

    inline operator bool() {
        return handle_ptr<T>::operator bool() && handle_ptr<T>::get()->type != 0;
    }

    inline operator T*() {
        return handle_ptr<T>::get();
    }

    inline operator uv_handle_t*() {
        return reinterpret_cast<uv_handle_t*>(handle_ptr<T>::get());
    }
};
}
