#pragma once

#include <cstddef>
#include <cstdint>
#include <cstdlib>

EXTERN_C_START
NAPI_MODULE_EXPORT uint8_t* napi_wasm_malloc(size_t size) {
    const size_t align = alignof(size_t);
    const size_t aligned_size = (size + align - 1) / align * align;

    if (size > 0) {
        void* ptr = std::aligned_alloc(align, aligned_size);
        if (ptr != nullptr) {
            return static_cast<uint8_t*>(ptr);
        }
    } else {
        return reinterpret_cast<uint8_t*>(align);
    }

    std::abort();
}
EXTERN_C_END
