#pragma once

#ifdef ZMQ_WASM
#include "poller-wasm.h"
#else
#include "poller-native.h"
#endif
