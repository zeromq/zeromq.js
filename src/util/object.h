#pragma once

#include <napi.h>

namespace zmq {
/* Seals an object to prevent setting incorrect options. */
inline void Seal(Napi::Object object) {
    auto global = object.Env().Global();
    auto seal = global.Get("Object").As<Napi::Object>().Get("seal").As<Napi::Function>();
    seal.Call({object});
}

/* Assign all properties in the given options object. */
inline void Assign(Napi::Object object, Napi::Object options) {
    auto global = object.Env().Global();
    auto assign =
        global.Get("Object").As<Napi::Object>().Get("assign").As<Napi::Function>();
    assign.Call({object, options});
}
}  // namespace zmq
