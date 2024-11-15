#ifdef _MSC_VER

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

// clang-format off
#include <windows.h>
#include <delayimp.h>
// clang-format on

static HMODULE NODE_DLL = nullptr;  // NOLINT(*-avoid-non-const-global-variables)
static HMODULE NW_DLL = nullptr;  // NOLINT(*-avoid-non-const-global-variables)

/**
 * @brief A hook function for handling delay-loaded DLL events.
 *
 * This function is called by the delay load helper for various events during the
 * delay loading process. It handles pre-loading of libraries, retrieving procedure
 * addresses, and initialization tasks.
 *
 * @param event The delay load event type. Possible values include:
 *              - dliNotePreGetProcAddress: Called before GetProcAddress is called
 *              - dliStartProcessing: Called when delay loading begins
 *              - dliNotePreLoadLibrary: Called before loading a delayed DLL
 * @param info A pointer to a DelayLoadInfo structure containing information about
 *             the DLL being loaded and the requested function.
 *
 * @return FARPROC A function pointer if the event was handled successfully,
 *         or nullptr if the event was not handled or an error occurred.
 */
static FARPROC WINAPI load_exe_hook(unsigned int event, DelayLoadInfo* info) {
    if (info == nullptr) {
        return nullptr;
    }

    switch (event) {
    // If pre-getting a procedure address.
    case dliNotePreGetProcAddress: {
        const char* procName = info->dlp.szProcName;
        if (procName == nullptr) {
            return nullptr;
        }
        FARPROC ret = GetProcAddress(NODE_DLL, procName);
        if (ret != nullptr) {
            return ret;
        }
        return GetProcAddress(NW_DLL, procName);
    }
    // If starting the delay loading process.
    case dliStartProcessing: {
        NODE_DLL = GetModuleHandleA("node.dll");
        NW_DLL = GetModuleHandleA("nw.dll");
        return nullptr;
    }
    // If pre-loading a delayed DLL.
    case dliNotePreLoadLibrary: {
        if (info->szDll == nullptr) {
            return nullptr;
        }
        if (_stricmp(info->szDll, "node.exe") != 0) {
            return nullptr;
        }
        if (NODE_DLL == nullptr) {
            NODE_DLL = GetModuleHandleA(nullptr);
        }
        // NOLINTNEXTLINE(*-pro-type-reinterpret-cast)
        return reinterpret_cast<FARPROC>(NODE_DLL);
    }
    // Othwese, return nullptr.
    default:
        return nullptr;
    }
}

// NOLINTNEXTLINE(*-avoid-non-const-global-variables,*-reserved-identifier,cert-dcl51-cpp,cert-dcl37-c)
decltype(__pfnDliNotifyHook2) __pfnDliNotifyHook2 = load_exe_hook;

#endif
