/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "to_string.h"

namespace zmq {
class Argument {
    typedef bool (Napi::Value::*ArgValCb)() const;

    std::function<bool(const Napi::Value&)> fn = nullptr;
    const std::string msg;

public:
    inline Argument(const std::string& msg, std::function<bool(const Napi::Value&)> fn)
        : fn(fn), msg(msg) {}

    inline Argument(const std::string& msg, ArgValCb f1)
        : fn([=](const Napi::Value& value) { return (value.*f1)(); }), msg(msg) {}

    inline Argument(const std::string& msg, ArgValCb f1, ArgValCb f2)
        : fn([=](const Napi::Value& value) { return (value.*f1)() || (value.*f2)(); }),
          msg(msg) {}

    inline Argument(const std::string& msg, ArgValCb f1, ArgValCb f2, ArgValCb f3)
        : fn([=](const Napi::Value& value) {
              return (value.*f1)() || (value.*f2)() || (value.*f3)();
          }),
          msg(msg) {}

    inline const std::string& Message() const {
        return msg;
    }

    inline bool Valid(const Napi::Value& arg) const {
        return fn(arg);
    }
};

inline bool ValidateArguments(
    const Napi::CallbackInfo& info, const std::initializer_list<Argument>& args) {
    for (const auto& arg : args) {
        auto i = &arg - args.begin();

        if (!arg.Valid(info[i])) {
            Napi::TypeError::New(info.Env(), arg.Message()).ThrowAsJavaScriptException();
            return false;
        }
    }

    if (info.Length() > args.size()) {
        auto msg = "Expected " + to_string(args.size()) + " argument"
            + (args.size() != 1 ? "s" : "");
        Napi::TypeError::New(info.Env(), msg).ThrowAsJavaScriptException();
        return false;
    }

    return true;
}
}
