#pragma once

#include <napi.h>

#include <string>

namespace zmq {
static bool hasRun = false;
static bool hasElectronMemoryCageCache = false;

inline std::string first_component(std::string const& value) {
    std::string::size_type const pos = value.find('.');
    return pos == std::string::npos ? value : value.substr(0, pos);
}

/* Check if runtime is Electron. */
inline bool IsElectron(const Napi::Env& env) {
    auto global = env.Global();
    auto isElectron = global.Get("process")
                          .As<Napi::Object>()
                          .Get("versions")
                          .As<Napi::Object>()
                          .Has("electron");
    return isElectron;
}

inline bool hasElectronMemoryCage(const Napi::Env& env) {
    if (!hasRun) {
        if (IsElectron(env)) {
            auto electronVers = env.Global()
                                    .Get("process")
                                    .ToObject()
                                    .Get("versions")
                                    .ToObject()
                                    .Get("electron")
                                    .ToString()
                                    .Utf8Value();
            int const majorVer = stoi(first_component(electronVers));
            static constexpr auto electron_memory_cage_version = 21;
            if (majorVer >= electron_memory_cage_version) {
                hasElectronMemoryCageCache = true;
            }
        }
        hasRun = true;
    }
    return hasElectronMemoryCageCache;
}
}  // namespace zmq
