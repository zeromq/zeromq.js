#pragma once

/* A thing that can be closed. Simple interface to allow us to correctly clean
   up ZMQ resources at agent exit. */
namespace zmq {
struct Closable {
    virtual void Close() = 0;
};
}
