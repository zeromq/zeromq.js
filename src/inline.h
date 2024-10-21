#pragma once

#if defined(_MSC_VER) && !defined(__clang__)
#define force_inline __forceinline
#else
#define force_inline inline __attribute__((always_inline))
#endif
