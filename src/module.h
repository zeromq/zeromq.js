#pragma once

#include <cstdio>
#include <future>

#include "./closable.h"
#include "./outgoing_msg.h"
#include "util/reaper.h"
#include "util/trash.h"

namespace zmq {
class Context;
class Socket;

struct Terminator {
    constexpr Terminator() noexcept = default;
    void operator()(void* context) {
        assert(context != nullptr);

#ifdef ZMQ_BLOCKY
        const bool blocky = zmq_ctx_get(context, ZMQ_BLOCKY) != 0;
#else
        /* If the option cannot be set, don't suggest to set it. */
        const bool blocky = false;
#endif

        /* Start termination asynchronously so we can detect if it takes long
           and should warn the user about this default blocking behaviour. */
        auto terminate = std::async(std::launch::async, [&] {
            [[maybe_unused]] auto err = zmq_ctx_term(context);
            assert(err == 0);
        });

        using namespace std::chrono_literals;
        const auto timeout = 500ms;
        if (terminate.wait_for(timeout) == std::future_status::timeout) {
            /* We can't use process.emitWarning, because the Node.js runtime
               has already shut down. So we mimic it instead. */
            (void)fprintf(stderr,
                "(node:%d) WARNING: Waiting for queued ZeroMQ messages to be "
                "delivered.%s\n",
                uv_os_getpid(),
                blocky ? " Set 'context.blocky = false' to change this behaviour." : "");
        }

        terminate.wait();
    }
};

class Module : public Napi::Addon<Module> {
    /* Contains shared global state that will be accessible by all
       agents/threads. */
    class Global {
        using Shared = std::shared_ptr<Global>;
        static Shared Instance();

    public:
        Global();

        /* ZMQ pointer to the global shared context which allows agents/threads
           to communicate over inproc://. */
        void* SharedContext;

        /* A list of ZMQ contexts that will be terminated on a clean exit. */
        ThreadSafeReaper<void, Terminator> ContextTerminator;

        friend class Module;
    };

public:
    explicit Module(Napi::Env env, Napi::Object exports);

    class Global& Global() {
        return *global;
    }

    /* The order of properties defines their destruction in reverse order and is
       very important to ensure a clean process exit. During the destruction of
       other objects buffers might be released, we must delete trash last. */
    Trash<OutgoingMsg::Reference> MsgTrash;

private:
    /* Second to last to be deleted is the global state, which also causes
       context termination (which might block). */
    Global::Shared global = Global::Instance();

public:
    /* Reaper that calls ->Close() on objects that have not been GC'ed so far.
       Some versions of Node will call destructors on environment shutdown,
       while others will *only* call destructors after GC. The reason we need to
       call ->Close() is to ensure proper ZMQ cleanup and releasing underlying
       resources. The versions of Node that do not call destructors *WILL* of
       course leak memory if worker threads are created (in a loop). */
    Reaper<Closable> ObjectReaper;

    /* A JS reference to the default global context. This is a unique object for
       each individual agent/thread, but is in fact a wrapper for the same
       global ZMQ context. */
    Napi::ObjectReference GlobalContext;

    /* JS constructor references. */
    Napi::FunctionReference Context;
    Napi::FunctionReference Socket;
    Napi::FunctionReference Observer;
    Napi::FunctionReference Proxy;
};
}  // namespace zmq

static_assert(!std::is_copy_constructible_v<zmq::Module>, "not copyable");
static_assert(!std::is_move_constructible_v<zmq::Module>, "not movable");
