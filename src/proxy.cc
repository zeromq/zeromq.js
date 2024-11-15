
#include "./proxy.h"

#include <cstdint>

#include "./context.h"
#include "./module.h"
#include "./socket.h"
#include "util/arguments.h"
#include "util/async_scope.h"
#include "util/error.h"
#include "util/uvwork.h"

#ifdef ZMQ_HAS_STEERABLE_PROXY

namespace zmq {
struct ProxyContext {
    std::string address;
    uint32_t error = 0;

    explicit ProxyContext(std::string&& address) : address(std::move(address)) {}
};

Proxy::Proxy(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<Proxy>(info), async_context(Env(), "Proxy"),
      module(*reinterpret_cast<Module*>(info.Data())) {
    Arg::Validator const args{
        Arg::Required<Arg::Object>("Front-end must be a socket object"),
        Arg::Required<Arg::Object>("Back-end must be a socket object"),
    };

    if (args.ThrowIfInvalid(info)) {
        return;
    }

    front_ref.Reset(info[0].As<Napi::Object>(), 1);
    Socket::Unwrap(front_ref.Value());
    if (Env().IsExceptionPending()) {
        return;
    }

    back_ref.Reset(info[1].As<Napi::Object>(), 1);
    Socket::Unwrap(back_ref.Value());
    if (Env().IsExceptionPending()) {
        return;
    }
}

Proxy::~Proxy() = default;

void Proxy::Close() {}

Napi::Value Proxy::Run(const Napi::CallbackInfo& info) {
    if (Arg::Validator{}.ThrowIfInvalid(info)) {
        return Env().Undefined();
    }

    auto* front = Socket::Unwrap(front_ref.Value());
    if (Env().IsExceptionPending()) {
        return Env().Undefined();
    }

    auto* back = Socket::Unwrap(back_ref.Value());
    if (Env().IsExceptionPending()) {
        return Env().Undefined();
    }

    if (front->endpoints == 0) {
        ErrnoException(Env(), EINVAL, "Front-end socket must be bound or connected")
            .ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    if (back->endpoints == 0) {
        ErrnoException(Env(), EINVAL, "Back-end socket must be bound or connected")
            .ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    auto* context = Context::Unwrap(front->context_ref.Value());
    if (Env().IsExceptionPending()) {
        return Env().Undefined();
    }

    control_sub = zmq_socket(context->context, ZMQ_DEALER);
    if (control_sub == nullptr) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    control_pub = zmq_socket(context->context, ZMQ_DEALER);
    if (control_pub == nullptr) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    /* Use `this` pointer as unique identifier for control socket. */
    auto address = std::string("inproc://zmq.proxycontrol.")
        + std::to_string(reinterpret_cast<uintptr_t>(this));

    /* Connect publisher so we can start queueing control messages. */
    if (zmq_connect(control_pub, address.c_str()) < 0) {
        ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    front->state = Socket::State::Blocked;
    back->state = Socket::State::Blocked;

    auto res = Napi::Promise::Deferred::New(Env());
    auto run_ctx = std::make_shared<ProxyContext>(std::move(address));

    auto* front_ptr = front->socket;
    auto* back_ptr = back->socket;

    auto status = UvQueue(
        Env(),
        [this, run_ctx, front_ptr, back_ptr]() {
            /* Don't access V8 internals here! Executed in worker thread. */
            if (zmq_bind(control_sub, run_ctx->address.c_str()) < 0) {
                run_ctx->error = static_cast<uint32_t>(zmq_errno());
                return;
            }

            if (zmq_proxy_steerable(front_ptr, back_ptr, nullptr, control_sub) < 0) {
                run_ctx->error = static_cast<uint32_t>(zmq_errno());
                return;
            }
        },
        [this, front, back, run_ctx, res]() {
            AsyncScope const scope(Env(), async_context);

            front->Close();
            back->Close();

            [[maybe_unused]] auto err1 = zmq_close(control_pub);
            assert(err1 == 0);

            [[maybe_unused]] auto err2 = zmq_close(control_sub);
            assert(err2 == 0);

            control_pub = nullptr;
            control_sub = nullptr;

            if (run_ctx->error != 0) {
                res.Reject(
                    ErrnoException(Env(), static_cast<int32_t>(run_ctx->error)).Value());
                return;
            }

            res.Resolve(Env().Undefined());
        });

    if (status < 0) {
        ErrnoException(Env(), EBADF).ThrowAsJavaScriptException();
        return Env().Undefined();
    }

    return res.Promise();
}

void Proxy::SendCommand(const char* command) {
    /* Don't send commands if the proxy has terminated. */
    if (control_pub == nullptr) {
        ErrnoException(Env(), EBADF).ThrowAsJavaScriptException();
        return;
    }

    while (zmq_send_const(control_pub, command, strlen(command), ZMQ_DONTWAIT) < 0) {
        if (zmq_errno() != EINTR) {
            ErrnoException(Env(), zmq_errno()).ThrowAsJavaScriptException();
            return;
        }
    }
}

void Proxy::Pause(const Napi::CallbackInfo& info) {
    if (Arg::Validator{}.ThrowIfInvalid(info)) {
        return;
    }

    SendCommand("PAUSE");
}

void Proxy::Resume(const Napi::CallbackInfo& info) {
    if (Arg::Validator{}.ThrowIfInvalid(info)) {
        return;
    }

    SendCommand("RESUME");
}

void Proxy::Terminate(const Napi::CallbackInfo& info) {
    if (Arg::Validator{}.ThrowIfInvalid(info)) {
        return;
    }

    SendCommand("TERMINATE");
}

Napi::Value Proxy::GetFrontEnd(const Napi::CallbackInfo& /*info*/) {
    return front_ref.Value();
}

Napi::Value Proxy::GetBackEnd(const Napi::CallbackInfo& /*info*/) {
    return back_ref.Value();
}

void Proxy::Initialize(Module& module, Napi::Object& exports) {
    auto proto = {
        InstanceMethod<&Proxy::Run>("run"),
        InstanceMethod<&Proxy::Pause>("pause"),
        InstanceMethod<&Proxy::Resume>("resume"),
        InstanceMethod<&Proxy::Terminate>("terminate"),

        InstanceAccessor<&Proxy::GetFrontEnd>("frontEnd"),
        InstanceAccessor<&Proxy::GetBackEnd>("backEnd"),
    };

    auto constructor = DefineClass(exports.Env(), "Proxy", proto, &module);
    module.Proxy = Napi::Persistent(constructor);
    exports.Set("Proxy", constructor);
}
}  // namespace zmq

#endif
