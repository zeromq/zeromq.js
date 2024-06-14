#pragma once

#ifdef _MSC_VER
#define force_inline inline __forceinline
#else
#define force_inline inline __attribute__((always_inline))
#endif
