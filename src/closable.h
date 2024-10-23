#pragma once

/* A thing that can be closed. Simple interface to allow us to correctly clean
   up ZMQ resources at agent exit. */
namespace zmq {
struct Closable {
    Closable() = default;
    Closable(const Closable&) = default;
    Closable(Closable&&) = default;
    Closable& operator=(const Closable&) = default;
    Closable& operator=(Closable&&) = default;
    virtual ~Closable() = default;

    virtual void Close() = 0;
};
}  // namespace zmq
