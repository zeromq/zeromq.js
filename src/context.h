#pragma once

#include <napi.h>

#include "closable.h"

namespace zmq {
class Module;

class Context : public Napi::ObjectWrap<Context>, public Closable {
public:
    static void Initialize(Module& module, Napi::Object& exports);

    explicit Context(const Napi::CallbackInfo& info);

    Context(const Context&) = delete;
    Context& operator=(const Context&) = delete;
    Context(Context&&) = delete;
    Context& operator=(Context&&) = delete;
    ~Context() override;

    void Close() override;

protected:
    template <typename T>
    inline Napi::Value GetCtxOpt(const Napi::CallbackInfo& info);

    template <typename T>
    inline void SetCtxOpt(const Napi::CallbackInfo& info);

private:
    Module& module;
    void* context = nullptr;

    friend class Socket;
    friend class Observer;
    friend class Proxy;
};
}  // namespace zmq

static_assert(!std::is_copy_constructible_v<zmq::Context>, "not copyable");
static_assert(!std::is_move_constructible_v<zmq::Context>, "not movable");
