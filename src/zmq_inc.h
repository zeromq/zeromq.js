#pragma once

#include <zmq.h>  // IWYU pragma: export

#if ZMQ_VERSION < ZMQ_MAKE_VERSION(4, 1, 0)
#include <zmq_utils.h>  // IWYU pragma: export
#endif

#ifdef _MSC_VER
#pragma warning(disable : 4146)
#ifndef _CRT_SECURE_CPP_OVERLOAD_STANDARD_NAMES
#define _CRT_SECURE_CPP_OVERLOAD_STANDARD_NAMES 1
#endif
#endif

/* Fix errors with numeric_limits<T>::max. */
#ifdef max
#undef max
#endif

#if ZMQ_VERSION >= ZMQ_MAKE_VERSION(4, 0, 5)
#define ZMQ_HAS_STEERABLE_PROXY 1
#endif

/* Threadsafe sockets can only be used if zmq_poller_fd() is available. */
#if ZMQ_VERSION >= ZMQ_MAKE_VERSION(4, 3, 2)
#ifdef ZMQ_BUILD_DRAFT_API
#define ZMQ_HAS_POLLABLE_THREAD_SAFE 1
#endif
#endif
