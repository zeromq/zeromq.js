#pragma once

#include <napi.h>

#include <cassert>
#include <utility>

namespace zmq {
/* The napi-wasm adapter runs async work completions on the host event loop.
   This is deliberately independent of uv_loop_t: the adapter does not expose
   a native libuv loop to WebAssembly. */
template <typename E, typename C>
class WasmWork {
    napi_env env;
    napi_async_work work{nullptr};
    E execute_callback;
    C complete_callback;

    static void Execute(napi_env /*env*/, void* data) {
        auto& work = *static_cast<WasmWork*>(data);
        work.execute_callback();
    }

    static void Complete(napi_env env, napi_status /*status*/, void* data) {
        auto* work = static_cast<WasmWork*>(data);
        work->complete_callback();
        if (work->work != nullptr) {
            [[maybe_unused]] auto status = napi_delete_async_work(env, work->work);
            assert(status == napi_ok);
        }
        delete work;
    }

public:
    WasmWork(napi_env env, E execute, C complete)
        : env(env), execute_callback(std::move(execute)), complete_callback(std::move(complete)) {}

    napi_status Schedule() {
        napi_value resource_name = nullptr;
        auto status = napi_create_string_latin1(
            env, "zeromq", NAPI_AUTO_LENGTH, &resource_name);
        if (status != napi_ok) {
            delete this;
            return status;
        }

        status = napi_create_async_work(env, nullptr, resource_name, Execute, Complete, this, &work);
        if (status != napi_ok) {
            delete this;
            return status;
        }

        status = napi_queue_async_work(env, work);
        if (status != napi_ok) {
            [[maybe_unused]] auto delete_status = napi_delete_async_work(env, work);
            assert(delete_status == napi_ok);
            delete this;
        }
        return status;
    }
};

template <typename E, typename C>
inline napi_status UvQueue(const Napi::Env& env, E execute, C complete) {
    auto* work = new WasmWork<E, C>(env, std::move(execute), std::move(complete));
    return work->Schedule();
}
}  // namespace zmq
