#pragma once

#include <optional>

namespace zmq {
/* Takes a value out of an optional value. Assumes optional isn't nullopt. */
template <typename T>
inline T take(std::optional<T>& option) {
    auto value = *option;
    option.reset();
    return value;
}
}
