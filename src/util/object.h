/* Copyright (c) 2017-2019 Rolf Timmermans */
#pragma once

namespace zmq {
/* Seals an object to prevent setting incorrect options. */
static inline void Seal(Napi::Object object) {
    auto global = object.Env().Global();
    auto seal = global.Get("Object").As<Napi::Object>().Get("seal").As<Napi::Function>();
    seal.Call({object});
}

/* Assign all properties in the given options object. */
static inline void Assign(Napi::Object object, Napi::Object options) {
    auto global = object.Env().Global();
    auto assign =
        global.Get("Object").As<Napi::Object>().Get("assign").As<Napi::Function>();
    assign.Call({object, options});
}
}
