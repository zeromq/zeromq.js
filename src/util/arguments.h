#pragma once

#include <napi.h>

#include <optional>

namespace zmq::Arg {

using ValueMethod = bool (Napi::Value::*)() const;

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
    /* const */ std::string_view msg;

public:
    constexpr explicit Verify(std::string_view msg) noexcept : msg(msg) {}

    std::optional<Napi::Error> operator()(
        uint32_t /*unused*/, const Napi::Value& value) const {
        auto valid = ((F()(value)) || ...);
        if (valid) {
            return {};
        }
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
    static constexpr size_t NumArgs = sizeof...(F);
    std::tuple<F...> validators;

public:
    constexpr explicit Validator(F&&... validators) noexcept
        : validators(std::forward<F>(validators)...) {}

    [[nodiscard]] bool ThrowIfInvalid(const Napi::CallbackInfo& info) const {
        if (auto err = Validate(info)) {
            err->ThrowAsJavaScriptException();
            return true;
        }

        return false;
    }

    [[nodiscard]] std::optional<Napi::Error> Validate(
        const Napi::CallbackInfo& info) const {
        return eval(info);
    }

private:
    template <size_t I = 0>
    [[nodiscard]] std::optional<Napi::Error> eval(const Napi::CallbackInfo& info) const {
        if constexpr (I == NumArgs) {
            if (info.Length() > NumArgs) {
                auto msg = "Expected " + std::to_string(NumArgs) + " argument"
                    + (NumArgs != 1 ? "s" : "") + " but received "
                    + std::to_string(info.Length());
                return Napi::TypeError::New(info.Env(), msg);
            }

            return {};
        } else {
            if (auto err = std::get<I>(validators)(I, info[I])) {
                return err;
            }
            return eval<I + 1>(info);
        }
    }
};
}  // namespace zmq::Arg
   // namespace zmq
