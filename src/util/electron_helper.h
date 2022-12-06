#pragma once

#include <napi.h>
#include <string>

namespace zmq {
bool hasRun = false;
bool hasElectronMemoryCageCache = false;

static inline std::string first_component(std::string const& value) {
    std::string::size_type pos = value.find('.');
    return pos == value.npos ? value : value.substr(0, pos);
}

/* Check if runtime is Electron. */
static inline bool IsElectron(const Napi::Env& env) {
    auto global = env.Global();
    auto isElectron = global.Get("process")
                          .As<Napi::Object>()
                          .Get("versions")
                          .As<Napi::Object>()
                          .Has("electron");
    return isElectron;
}

static inline bool hasElectronMemoryCage(const Napi::Env& env) {
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
            int majorVer = stoi(first_component(electronVers));
            if (majorVer >= 21) {
                hasElectronMemoryCageCache = true;
            }
        }
        hasRun = true;
    }
    return hasElectronMemoryCageCache;
}
}
