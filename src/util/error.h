#pragma once

#include <napi.h>

#include <cerrno>
#include <string>

#include "../zmq_inc.h"

namespace zmq {
constexpr const char* ErrnoMessage(int32_t errorno);
constexpr const char* ErrnoCode(int32_t errorno);

/* Generates a process warning message. */
inline void Warn(const Napi::Env& env, const std::string& msg) {
    auto global = env.Global();
    auto emitWarning =
        global.Get("process").As<Napi::Object>().Get("emitWarning").As<Napi::Function>();
    emitWarning.Call({Napi::String::New(env, msg)});
}

inline Napi::Error StatusException(
    const Napi::Env& env, const std::string& msg, uint32_t status) {
    Napi::HandleScope const scope(env);
    auto exception = Napi::Error::New(env, msg);
    exception.Set("status", Napi::Number::New(env, status));
    return exception;
}

inline Napi::Error CodedException(
    const Napi::Env& env, const std::string& msg, const std::string& code) {
    Napi::HandleScope const scope(env);
    auto exception = Napi::Error::New(env, msg);
    exception.Set("code", Napi::String::New(env, code));
    return exception;
}

/* This mostly duplicates node::ErrnoException, but it is not public. */
inline Napi::Error ErrnoException(
    const Napi::Env& env, int32_t error, const char* message = nullptr) {
    Napi::HandleScope const scope(env);
    auto exception =
        Napi::Error::New(env, (message != nullptr) ? message : ErrnoMessage(error));
    exception.Set("errno", Napi::Number::New(env, error));
    exception.Set("code", Napi::String::New(env, ErrnoCode(error)));
    return exception;
}

inline Napi::Error ErrnoException(
    const Napi::Env& env, int32_t error, const std::string& address) {
    auto exception = ErrnoException(env, error, nullptr);
    exception.Set("address", Napi::String::New(env, address));
    return exception;
}

/* Convert errno to human readable error message. */
constexpr const char* ErrnoMessage(int32_t errorno) {
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
constexpr const char* ErrnoCode(int32_t errorno) {
    switch (errorno) {
/* ZMQ specific codes. */
#ifdef EFSM
    case EFSM:
        return "EFSM";
#endif

#ifdef ENOCOMPATPROTO
    case ENOCOMPATPROTO:
        return "ENOCOMPATPROTO";
#endif

#ifdef ETERM
    case ETERM:
        return "ETERM";
#endif

#ifdef EMTHREAD
    case EMTHREAD:
        return "EMTHREAD";
#endif

/* Generic codes. */
#ifdef EACCES
    case EACCES:
        return "EACCES";
#endif

#ifdef EADDRINUSE
    case EADDRINUSE:
        return "EADDRINUSE";
#endif

#ifdef EADDRNOTAVAIL
    case EADDRNOTAVAIL:
        return "EADDRNOTAVAIL";
#endif

#ifdef EAFNOSUPPORT
    case EAFNOSUPPORT:
        return "EAFNOSUPPORT";
#endif

#ifdef EAGAIN
    case EAGAIN:
        return "EAGAIN";
#endif

#ifdef EWOULDBLOCK
#if EAGAIN != EWOULDBLOCK
    case EWOULDBLOCK:
        return "EWOULDBLOCK";
#endif
#endif

#ifdef EALREADY
    case EALREADY:
        return "EALREADY";
#endif

#ifdef EBADF
    case EBADF:
        return "EBADF";
#endif

#ifdef EBADMSG
    case EBADMSG:
        return "EBADMSG";
#endif

#ifdef EBUSY
    case EBUSY:
        return "EBUSY";
#endif

#ifdef ECANCELED
    case ECANCELED:
        return "ECANCELED";
#endif

#ifdef ECHILD
    case ECHILD:
        return "ECHILD";
#endif

#ifdef ECONNABORTED
    case ECONNABORTED:
        return "ECONNABORTED";
#endif

#ifdef ECONNREFUSED
    case ECONNREFUSED:
        return "ECONNREFUSED";
#endif

#ifdef ECONNRESET
    case ECONNRESET:
        return "ECONNRESET";
#endif

#ifdef EDEADLK
    case EDEADLK:
        return "EDEADLK";
#endif

#ifdef EDESTADDRREQ
    case EDESTADDRREQ:
        return "EDESTADDRREQ";
#endif

#ifdef EDOM
    case EDOM:
        return "EDOM";
#endif

#ifdef EDQUOT
    case EDQUOT:
        return "EDQUOT";
#endif

#ifdef EEXIST
    case EEXIST:
        return "EEXIST";
#endif

#ifdef EFAULT
    case EFAULT:
        return "EFAULT";
#endif

#ifdef EFBIG
    case EFBIG:
        return "EFBIG";
#endif

#ifdef EHOSTUNREACH
    case EHOSTUNREACH:
        return "EHOSTUNREACH";
#endif

#ifdef EIDRM
    case EIDRM:
        return "EIDRM";
#endif

#ifdef EILSEQ
    case EILSEQ:
        return "EILSEQ";
#endif

#ifdef EINPROGRESS
    case EINPROGRESS:
        return "EINPROGRESS";
#endif

#ifdef EINTR
    case EINTR:
        return "EINTR";
#endif

#ifdef EINVAL
    case EINVAL:
        return "EINVAL";
#endif

#ifdef EIO
    case EIO:
        return "EIO";
#endif

#ifdef EISCONN
    case EISCONN:
        return "EISCONN";
#endif

#ifdef EISDIR
    case EISDIR:
        return "EISDIR";
#endif

#ifdef ELOOP
    case ELOOP:
        return "ELOOP";
#endif

#ifdef EMFILE
    case EMFILE:
        return "EMFILE";
#endif

#ifdef EMLINK
    case EMLINK:
        return "EMLINK";
#endif

#ifdef EMSGSIZE
    case EMSGSIZE:
        return "EMSGSIZE";
#endif

#ifdef EMULTIHOP
    case EMULTIHOP:
        return "EMULTIHOP";
#endif

#ifdef ENAMETOOLONG
    case ENAMETOOLONG:
        return "ENAMETOOLONG";
#endif

#ifdef ENETDOWN
    case ENETDOWN:
        return "ENETDOWN";
#endif

#ifdef ENETRESET
    case ENETRESET:
        return "ENETRESET";
#endif

#ifdef ENETUNREACH
    case ENETUNREACH:
        return "ENETUNREACH";
#endif

#ifdef ENFILE
    case ENFILE:
        return "ENFILE";
#endif

#ifdef ENOBUFS
    case ENOBUFS:
        return "ENOBUFS";
#endif

#ifdef ENODATA
    case ENODATA:
        return "ENODATA";
#endif

#ifdef ENODEV
    case ENODEV:
        return "ENODEV";
#endif

#ifdef ENOENT
    case ENOENT:
        return "ENOENT";
#endif

#ifdef ENOEXEC
    case ENOEXEC:
        return "ENOEXEC";
#endif

#ifdef ENOLINK
    case ENOLINK:
        return "ENOLINK";
#endif

#ifdef ENOLCK
#if ENOLINK != ENOLCK
    case ENOLCK:
        return "ENOLCK";
#endif
#endif

#ifdef ENOMEM
    case ENOMEM:
        return "ENOMEM";
#endif

#ifdef ENOMSG
    case ENOMSG:
        return "ENOMSG";
#endif

#ifdef ENOPROTOOPT
    case ENOPROTOOPT:
        return "ENOPROTOOPT";
#endif

#ifdef ENOSPC
    case ENOSPC:
        return "ENOSPC";
#endif

#ifdef ENOSR
    case ENOSR:
        return "ENOSR";
#endif

#ifdef ENOSTR
    case ENOSTR:
        return "ENOSTR";
#endif

#ifdef ENOSYS
    case ENOSYS:
        return "ENOSYS";
#endif

#ifdef ENOTCONN
    case ENOTCONN:
        return "ENOTCONN";
#endif

#ifdef ENOTDIR
    case ENOTDIR:
        return "ENOTDIR";
#endif

#ifdef ENOTEMPTY
#if ENOTEMPTY != EEXIST
    case ENOTEMPTY:
        return "ENOTEMPTY";
#endif
#endif

#ifdef ENOTSOCK
    case ENOTSOCK:
        return "ENOTSOCK";
#endif

#ifdef ENOTSUP
    case ENOTSUP:
        return "ENOTSUP";
#else
#ifdef EOPNOTSUPP
    case EOPNOTSUPP:
        return "EOPNOTSUPP";
#endif
#endif

#ifdef ENOTTY
    case ENOTTY:
        return "ENOTTY";
#endif

#ifdef ENXIO
    case ENXIO:
        return "ENXIO";
#endif

#ifdef EOVERFLOW
    case EOVERFLOW:
        return "EOVERFLOW";
#endif

#ifdef EPERM
    case EPERM:
        return "EPERM";
#endif

#ifdef EPIPE
    case EPIPE:
        return "EPIPE";
#endif

#ifdef EPROTO
    case EPROTO:
        return "EPROTO";
#endif

#ifdef EPROTONOSUPPORT
    case EPROTONOSUPPORT:
        return "EPROTONOSUPPORT";
#endif

#ifdef EPROTOTYPE
    case EPROTOTYPE:
        return "EPROTOTYPE";
#endif

#ifdef ERANGE
    case ERANGE:
        return "ERANGE";
#endif

#ifdef EROFS
    case EROFS:
        return "EROFS";
#endif

#ifdef ESPIPE
    case ESPIPE:
        return "ESPIPE";
#endif

#ifdef ESRCH
    case ESRCH:
        return "ESRCH";
#endif

#ifdef ESTALE
    case ESTALE:
        return "ESTALE";
#endif

#ifdef ETIME
    case ETIME:
        return "ETIME";
#endif

#ifdef ETIMEDOUT
    case ETIMEDOUT:
        return "ETIMEDOUT";
#endif

#ifdef ETXTBSY
    case ETXTBSY:
        return "ETXTBSY";
#endif

#ifdef EXDEV
    case EXDEV:
        return "EXDEV";
#endif

    default:
        return "";
    }
}
}  // namespace zmq
