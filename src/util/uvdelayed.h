#pragma once

#ifdef ZMQ_WASM
#include "uvdelayed-wasm.h"
#else
#include "uvdelayed-native.h"
#endif
