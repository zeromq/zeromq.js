/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include <errno.h>

namespace zmq {
static inline constexpr const char* ErrnoMessage(int32_t errorno);
static inline constexpr const char* ErrnoCode(int32_t errorno);

/* Generates a process warning message. */
static inline void Warn(const Napi::Env& env, const std::string& msg) {
    auto global = env.Global();
    auto fn =
        global.Get("process").As<Napi::Object>().Get("emitWarning").As<Napi::Function>();
    fn.Call({Napi::String::New(env, msg)});
}

static inline Napi::Error StatusException(
    const Napi::Env& env, const std::string& msg, uint32_t status) {
    Napi::HandleScope scope(env);
    auto exception = Napi::Error::New(env, msg);
    exception.Set("status", Napi::Number::New(env, status));
    return exception;
}

static inline Napi::Error CodedException(
    const Napi::Env& env, const std::string& msg, const std::string& code) {
    Napi::HandleScope scope(env);
    auto exception = Napi::Error::New(env, msg);
    exception.Set("code", Napi::String::New(env, code));
    return exception;
}

/* This mostly duplicates node::ErrnoException, but it is not public. */
static inline Napi::Error ErrnoException(
    const Napi::Env& env, int32_t error, const char* message = nullptr) {
    Napi::HandleScope scope(env);
    auto exception = Napi::Error::New(env, message ? message : ErrnoMessage(error));
    exception.Set("errno", Napi::Number::New(env, error));
    exception.Set("code", Napi::String::New(env, ErrnoCode(error)));
    return exception;
}

static inline Napi::Error ErrnoException(
    const Napi::Env& env, int32_t error, const std::string& address) {
    auto exception = ErrnoException(env, error);
    exception.Set("address", Napi::String::New(env, address));
    return exception;
}

/* Convert errno to human readable error message. */
static inline constexpr const char* ErrnoMessage(int32_t errorno) {
    /* Clarify a few confusing default messages; otherwise rely on zmq. */
    switch (errorno) {
    case EFAULT:
        return "Context is closed";
    case EAGAIN:
        return "Operation was not possible or timed out";
    case EMFILE:
        return "Too many open file descriptors";
    case ENOENT:
        return "No such endpoint";
    case EBUSY:
        return "Socket is busy";
    case EBADF:
        return "Socket is closed";
    case EADDRINUSE:
        /* Make sure this description is the same on all platforms. */
        return "Address already in use";
    default:
        return zmq_strerror(errorno);
    }
}

/* This is copied from Node.js; the mapping is not in a public API. */
/* Copyright Node.js contributors. All rights reserved. */
static inline constexpr const char* ErrnoCode(int32_t errorno) {
#define ERRNO_CASE(e)                                                                    \
    case e:                                                                              \
        return #e;

    switch (errorno) {
/* ZMQ specific codes. */
#ifdef EFSM
        ERRNO_CASE(EFSM);
#endif

#ifdef ENOCOMPATPROTO
        ERRNO_CASE(ENOCOMPATPROTO);
#endif

#ifdef ETERM
        ERRNO_CASE(ETERM);
#endif

#ifdef EMTHREAD
        ERRNO_CASE(EMTHREAD);
#endif

/* Generic codes. */
#ifdef EACCES
        ERRNO_CASE(EACCES);
#endif

#ifdef EADDRINUSE
        ERRNO_CASE(EADDRINUSE);
#endif

#ifdef EADDRNOTAVAIL
        ERRNO_CASE(EADDRNOTAVAIL);
#endif

#ifdef EAFNOSUPPORT
        ERRNO_CASE(EAFNOSUPPORT);
#endif

#ifdef EAGAIN
        ERRNO_CASE(EAGAIN);
#endif

#ifdef EWOULDBLOCK
#if EAGAIN != EWOULDBLOCK
        ERRNO_CASE(EWOULDBLOCK);
#endif
#endif

#ifdef EALREADY
        ERRNO_CASE(EALREADY);
#endif

#ifdef EBADF
        ERRNO_CASE(EBADF);
#endif

#ifdef EBADMSG
        ERRNO_CASE(EBADMSG);
#endif

#ifdef EBUSY
        ERRNO_CASE(EBUSY);
#endif

#ifdef ECANCELED
        ERRNO_CASE(ECANCELED);
#endif

#ifdef ECHILD
        ERRNO_CASE(ECHILD);
#endif

#ifdef ECONNABORTED
        ERRNO_CASE(ECONNABORTED);
#endif

#ifdef ECONNREFUSED
        ERRNO_CASE(ECONNREFUSED);
#endif

#ifdef ECONNRESET
        ERRNO_CASE(ECONNRESET);
#endif

#ifdef EDEADLK
        ERRNO_CASE(EDEADLK);
#endif

#ifdef EDESTADDRREQ
        ERRNO_CASE(EDESTADDRREQ);
#endif

#ifdef EDOM
        ERRNO_CASE(EDOM);
#endif

#ifdef EDQUOT
        ERRNO_CASE(EDQUOT);
#endif

#ifdef EEXIST
        ERRNO_CASE(EEXIST);
#endif

#ifdef EFAULT
        ERRNO_CASE(EFAULT);
#endif

#ifdef EFBIG
        ERRNO_CASE(EFBIG);
#endif

#ifdef EHOSTUNREACH
        ERRNO_CASE(EHOSTUNREACH);
#endif

#ifdef EIDRM
        ERRNO_CASE(EIDRM);
#endif

#ifdef EILSEQ
        ERRNO_CASE(EILSEQ);
#endif

#ifdef EINPROGRESS
        ERRNO_CASE(EINPROGRESS);
#endif

#ifdef EINTR
        ERRNO_CASE(EINTR);
#endif

#ifdef EINVAL
        ERRNO_CASE(EINVAL);
#endif

#ifdef EIO
        ERRNO_CASE(EIO);
#endif

#ifdef EISCONN
        ERRNO_CASE(EISCONN);
#endif

#ifdef EISDIR
        ERRNO_CASE(EISDIR);
#endif

#ifdef ELOOP
        ERRNO_CASE(ELOOP);
#endif

#ifdef EMFILE
        ERRNO_CASE(EMFILE);
#endif

#ifdef EMLINK
        ERRNO_CASE(EMLINK);
#endif

#ifdef EMSGSIZE
        ERRNO_CASE(EMSGSIZE);
#endif

#ifdef EMULTIHOP
        ERRNO_CASE(EMULTIHOP);
#endif

#ifdef ENAMETOOLONG
        ERRNO_CASE(ENAMETOOLONG);
#endif

#ifdef ENETDOWN
        ERRNO_CASE(ENETDOWN);
#endif

#ifdef ENETRESET
        ERRNO_CASE(ENETRESET);
#endif

#ifdef ENETUNREACH
        ERRNO_CASE(ENETUNREACH);
#endif

#ifdef ENFILE
        ERRNO_CASE(ENFILE);
#endif

#ifdef ENOBUFS
        ERRNO_CASE(ENOBUFS);
#endif

#ifdef ENODATA
        ERRNO_CASE(ENODATA);
#endif

#ifdef ENODEV
        ERRNO_CASE(ENODEV);
#endif

#ifdef ENOENT
        ERRNO_CASE(ENOENT);
#endif

#ifdef ENOEXEC
        ERRNO_CASE(ENOEXEC);
#endif

#ifdef ENOLINK
        ERRNO_CASE(ENOLINK);
#endif

#ifdef ENOLCK
#if ENOLINK != ENOLCK
        ERRNO_CASE(ENOLCK);
#endif
#endif

#ifdef ENOMEM
        ERRNO_CASE(ENOMEM);
#endif

#ifdef ENOMSG
        ERRNO_CASE(ENOMSG);
#endif

#ifdef ENOPROTOOPT
        ERRNO_CASE(ENOPROTOOPT);
#endif

#ifdef ENOSPC
        ERRNO_CASE(ENOSPC);
#endif

#ifdef ENOSR
        ERRNO_CASE(ENOSR);
#endif

#ifdef ENOSTR
        ERRNO_CASE(ENOSTR);
#endif

#ifdef ENOSYS
        ERRNO_CASE(ENOSYS);
#endif

#ifdef ENOTCONN
        ERRNO_CASE(ENOTCONN);
#endif

#ifdef ENOTDIR
        ERRNO_CASE(ENOTDIR);
#endif

#ifdef ENOTEMPTY
#if ENOTEMPTY != EEXIST
        ERRNO_CASE(ENOTEMPTY);
#endif
#endif

#ifdef ENOTSOCK
        ERRNO_CASE(ENOTSOCK);
#endif

#ifdef ENOTSUP
        ERRNO_CASE(ENOTSUP);
#else
#ifdef EOPNOTSUPP
        ERRNO_CASE(EOPNOTSUPP);
#endif
#endif

#ifdef ENOTTY
        ERRNO_CASE(ENOTTY);
#endif

#ifdef ENXIO
        ERRNO_CASE(ENXIO);
#endif

#ifdef EOVERFLOW
        ERRNO_CASE(EOVERFLOW);
#endif

#ifdef EPERM
        ERRNO_CASE(EPERM);
#endif

#ifdef EPIPE
        ERRNO_CASE(EPIPE);
#endif

#ifdef EPROTO
        ERRNO_CASE(EPROTO);
#endif

#ifdef EPROTONOSUPPORT
        ERRNO_CASE(EPROTONOSUPPORT);
#endif

#ifdef EPROTOTYPE
        ERRNO_CASE(EPROTOTYPE);
#endif

#ifdef ERANGE
        ERRNO_CASE(ERANGE);
#endif

#ifdef EROFS
        ERRNO_CASE(EROFS);
#endif

#ifdef ESPIPE
        ERRNO_CASE(ESPIPE);
#endif

#ifdef ESRCH
        ERRNO_CASE(ESRCH);
#endif

#ifdef ESTALE
        ERRNO_CASE(ESTALE);
#endif

#ifdef ETIME
        ERRNO_CASE(ETIME);
#endif

#ifdef ETIMEDOUT
        ERRNO_CASE(ETIMEDOUT);
#endif

#ifdef ETXTBSY
        ERRNO_CASE(ETXTBSY);
#endif

#ifdef EXDEV
        ERRNO_CASE(EXDEV);
#endif

    default:
        return "";
    }
}
}
