/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

namespace zmq {
/* Provide an alternative, simplified std::to_string implementation for
   integers to work around https://bugs.alpinelinux.org/issues/8626. */
static inline std::string to_string(int64_t val) {
    if (val == 0) return "0";
    std::string str;

    while (val > 0) {
        str.insert(0, 1, val % 10 + 48);
        val /= 10;
    }

    return str;
}
}
