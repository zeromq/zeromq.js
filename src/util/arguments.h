/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

#include "to_string.h"

#include <optional>

namespace zmq {
namespace Arg {
typedef bool (Napi::Value::*ValueMethod)() const;

template <ValueMethod M>
struct VerifyWithMethod {
    constexpr VerifyWithMethod() noexcept = default;

    constexpr bool operator()(const Napi::Value& value) const {
        return (value.*M)();
    }
};

template <typename F>
struct Not {
    constexpr Not() noexcept = default;

    constexpr bool operator()(const Napi::Value& value) const {
        return !F()(value);
    }
};

template <typename... F>
class Verify {
    const std::string_view msg;

public:
    constexpr Verify(std::string_view msg) noexcept : msg(msg) {}

    std::optional<Napi::Error> operator()(uint32_t, const Napi::Value& value) const {
        auto valid = ((F()(value)) || ...);
        if (valid) return {};
        return Napi::TypeError::New(value.Env(), std::string(msg));
    }
};

using Undefined = VerifyWithMethod<&Napi::Value::IsUndefined>;
using Null = VerifyWithMethod<&Napi::Value::IsNull>;
using Object = VerifyWithMethod<&Napi::Value::IsObject>;
using Number = VerifyWithMethod<&Napi::Value::IsNumber>;
using Boolean = VerifyWithMethod<&Napi::Value::IsBoolean>;
using String = VerifyWithMethod<&Napi::Value::IsString>;
using Buffer = VerifyWithMethod<&Napi::Value::IsBuffer>;

using NotUndefined = Not<Undefined>;

template <typename... F>
using Required = Verify<F...>;

template <typename... F>
using Optional = Verify<F..., Undefined>;

template <typename... F>
class Validator {
    static constexpr size_t N = sizeof...(F);
    std::tuple<F...> validators;

public:
    constexpr Validator(F&&... validators) noexcept
        : validators(std::forward<F>(validators)...) {}

    bool ThrowIfInvalid(const Napi::CallbackInfo& info) const {
        if (auto err = Validate(info)) {
            err->ThrowAsJavaScriptException();
            return true;
        }

        return false;
    }

    std::optional<Napi::Error> Validate(const Napi::CallbackInfo& info) const {
        return eval(info);
    }

private:
    template <size_t I = 0>
    std::optional<Napi::Error> eval(const Napi::CallbackInfo& info) const {
        if constexpr (I == N) {
            if (info.Length() > N) {
                auto msg = "Expected " + to_string(N) + " argument" + (N != 1 ? "s" : "");
                return Napi::TypeError::New(info.Env(), msg);
            }

            return {};
        } else {
            if (auto err = std::get<I>(validators)(I, info[I])) return err;
            return eval<I + 1>(info);
        }
    }
};
}
}
