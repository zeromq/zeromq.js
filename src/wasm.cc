#ifdef ZMQ_WASM

#include <cstdint>
#include <cstdlib>

extern "C" uint8_t* napi_wasm_malloc(size_t size) {
    const size_t align = alignof(size_t);

    if (size > 0) {
        void* ptr = std::aligned_alloc(align, size);
        if (ptr != nullptr) {
            return static_cast<uint8_t*>(ptr);
        }
    } else {
        return reinterpret_cast<uint8_t*>(align);
    }

    std::abort();
}

#endif
