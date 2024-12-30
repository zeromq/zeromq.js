#pragma once

#include <napi.h>

#include <string>

namespace zmq {

inline std::string convert_string_or_buffer(const Napi::Value& value) {
    if (value.IsString()) {
        return std::string(value.As<Napi::String>());
    }
    if (value.IsBuffer()) {
        auto buf = value.As<Napi::Object>();
        auto length = buf.As<Napi::Buffer<char>>().Length();
        auto* value = buf.As<Napi::Buffer<char>>().Data();
        return {value, length};
    }
    throw Napi::TypeError::New(value.Env(), "Value must be a string or buffer");
}

}  // namespace zmq
