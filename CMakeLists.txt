cmake_minimum_required(VERSION 3.16)

include(FetchContent)

if(CMAKE_VERSION VERSION_GREATER_EQUAL "3.24.0")
  cmake_policy(SET CMP0135 NEW)
endif()

# Add project_options from https://github.com/aminya/project_options
set(PROJECT_OPTIONS_VERSION "v0.42.0")
FetchContent_Declare(
  _project_options
  URL https://github.com/aminya/project_options/archive/refs/tags/${PROJECT_OPTIONS_VERSION}.zip
)
FetchContent_MakeAvailable(_project_options)
include(${_project_options_SOURCE_DIR}/Index.cmake)

# Detect ZeroMQ options from environment variables
macro(set_option_from_env OPTION_NAME)
  string(TOLOWER ${OPTION_NAME} OPTION_NAME_LOWER)

  if(DEFINED ENV{npm_config_${OPTION_NAME_LOWER}})
    if("$ENV{npm_config_${OPTION_NAME_LOWER}}" STREQUAL "true")
      set("${OPTION_NAME}"
        ON
        CACHE BOOL "npm_config_${OPTION_NAME_LOWER}" FORCE)
    elseif("$ENV{npm_config_${OPTION_NAME_LOWER}}" STREQUAL "false")
      set("${OPTION_NAME}"
        OFF
        CACHE BOOL "npm_config_${OPTION_NAME_LOWER}" FORCE)
    else()
      set("${OPTION_NAME}"
        "$ENV{npm_config_${OPTION_NAME_LOWER}}"
        CACHE STRING "npm_config_${OPTION_NAME_LOWER}" FORCE)
    endif()
  endif()

  if(${OPTION_NAME})
    string(REPLACE "zmq_" "" OPTION_NAME_LOWER "${OPTION_NAME_LOWER}")
    string(REPLACE "_" "-" OPTION_NAME_LOWER "${OPTION_NAME_LOWER}")
    list(APPEND VCPKG_MANIFEST_FEATURES ${OPTION_NAME_LOWER})
  endif()

  message(STATUS "${OPTION_NAME}: ${${OPTION_NAME}}")
endmacro()

option(ZMQ_DRAFT "Build and install draft APIs (e.g. `server-client`, `radio-dish`, `scatter-gather`)" ON)
set_option_from_env(ZMQ_DRAFT)

option(ZMQ_CURVE "Enable CURVE security" ON)
set_option_from_env(ZMQ_CURVE)

option(ZMQ_SODIUM "Using libsodium for CURVE security" ON)
set_option_from_env(ZMQ_SODIUM)

if(ZMQ_SODIUM AND APPLE)
  message(STATUS "building libsodium requires running `brew install autoconf automake libtool autoconf-archive`")
endif()

option(ZMQ_WEBSOCKETS "Enable WebSocket transport" ON)
set_option_from_env(ZMQ_WEBSOCKETS)

# gnutls build fails on Windows and MacOS, and on Linux newer copmilers are required for our Ubuntu 20 baseline
option(ZMQ_WEBSOCKETS_SECURE "Enable WebSocket transport with TSL (wss)" OFF)
set_option_from_env(ZMQ_WEBSOCKETS_SECURE)

option(ZMQ_NO_SYNC_RESOLVE "send/receive on the socket immediately" OFF)
set_option_from_env(ZMQ_NO_SYNC_RESOLVE)

# Add undefined behavior sanitizer if requested
option(ZMQ_ENABLE_SANITIZER_UNDEFINED "Enable undefined behavior sanitizer" OFF)
set_option_from_env(ZMQ_ENABLE_SANITIZER_UNDEFINED)

option(ZMQ_SHARED "Use a system-installed shared libzmq" OFF)
set_option_from_env(ZMQ_SHARED)

if(${ZMQ_ENABLE_SANITIZER_UNDEFINED})
  set(ENABLE_SANITIZER_UNDEFINED "ENABLE_SANITIZER_UNDEFINED")
endif()

option(ZMQ_WASM "Build for WebAssembly" OFF)
set_option_from_env(ZMQ_WASM)

if(ZMQ_WASM OR CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
  set(ZMQ_WASM TRUE)

  # Compile for WebAssembly. Keep vcpkg's host triplet native so build tools
  # run on the host while target libraries are built for Emscripten.
  set(VCPKG_TARGET_TRIPLET wasm32-emscripten)

  if ("$ENV{EMSCRIPTEN_ROOT}" STREQUAL "")
    find_program(EMCC emcc REQUIRED)
    get_filename_component(EMSCRIPTEN_ROOT "${EMCC}" DIRECTORY)
  else()
    set(EMSCRIPTEN_ROOT "$ENV{EMSCRIPTEN_ROOT}")
  endif()

  set(EMSCRIPTEN_PLATFORM_FILE "${EMSCRIPTEN_ROOT}/cmake/Modules/Platform/Emscripten.cmake")
  if(NOT EXISTS "${EMSCRIPTEN_PLATFORM_FILE}")
    message(FATAL_ERROR
      "Could not find the Emscripten CMake platform module at ${EMSCRIPTEN_PLATFORM_FILE}")
  endif()

  # vcpkg's autotools ports honor CC/CXX from the environment before their
  # generated target-triplet settings. Ensure target libraries, especially
  # libsodium, are compiled by Emscripten rather than an inherited host clang.
  set(ENV{CC} "${EMSCRIPTEN_ROOT}/emcc")
  set(ENV{CXX} "${EMSCRIPTEN_ROOT}/em++")
  set(ENV{AR} "${EMSCRIPTEN_ROOT}/emar")
  set(ENV{RANLIB} "${EMSCRIPTEN_ROOT}/emranlib")
  set(ENV{NM} "${EMSCRIPTEN_ROOT}/emnm")
  set(ENV{STRIP} "${EMSCRIPTEN_ROOT}/emstrip")
  set(ENV{VCPKG_BINARY_SOURCES} "clear")

  # vcpkg includes this chainload exactly once when its toolchain is loaded.
  set(VCPKG_CHAINLOAD_TOOLCHAIN_FILE "${EMSCRIPTEN_PLATFORM_FILE}"
    CACHE FILEPATH "Emscripten toolchain chainloaded by vcpkg" FORCE)

  # Use the repository's Emscripten-specific ZeroMQ port overlay. The overlay
  # patches libzmq's signaler to use a pipe because Emscripten does not provide
  # an anonymous socketpair in its Node socket backend.
  set(VCPKG_OVERLAY_PORTS "${CMAKE_SOURCE_DIR}/cmake/vcpkg-overlays"
    CACHE STRING "vcpkg overlay ports for the WebAssembly target" FORCE)

  add_compile_definitions("-D__wasm__" "-D__EMSCRIPTEN__")

  # export an indirect function table for napi-wasm
  add_link_options("--export-table")

  # Add WebAssembly-specific exports for napi-wasm
  add_link_options("SHELL:-s EXPORTED_FUNCTIONS=['_malloc','_free','_napi_wasm_malloc','_napi_register_wasm_v1']")
  add_link_options("SHELL:-s EXPORTED_RUNTIME_METHODS=['ccall','cwrap']")
  add_link_options("SHELL:-s ALLOW_MEMORY_GROWTH=1")
  add_link_options("SHELL:-s ENVIRONMENT='node'")
  # Keep the signaler's pipe inside the module. The standalone Emscripten
  # output otherwise leaves pipe2 as a host import, while Node's WASI adapter
  # only provides the standard WASI descriptors.
  add_link_options("SHELL:-s WASMFS=1")
  add_link_options("SHELL:-Wl,--undefined=__syscall_pipe2")
  # Emscripten's --allow-undefined-file does not allow Node-API imports in
  # this em++ invocation. Permit unresolved symbols at link time, then expose
  # the exact module:symbol contract for the post-link audit.
  add_link_options("SHELL:-s ERROR_ON_UNDEFINED_SYMBOLS=0")
  add_link_options("SHELL:-s WARN_ON_UNDEFINED_SYMBOLS=1")
  set(ZMQ_WASM_IMPORT_CONTRACT
    "napi:napi_add_finalizer"
    "napi:napi_adjust_external_memory"
    "napi:napi_async_destroy"
    "napi:napi_async_init"
    "napi:napi_call_function"
    "napi:napi_close_callback_scope"
    "napi:napi_close_escapable_handle_scope"
    "napi:napi_close_handle_scope"
    "napi:napi_coerce_to_object"
    "napi:napi_coerce_to_string"
    "napi:napi_create_array_with_length"
    "napi:napi_create_async_work"
    "napi:napi_create_buffer"
    "napi:napi_create_buffer_copy"
    "napi:napi_create_double"
    "napi:napi_create_error"
    "napi:napi_create_external_buffer"
    "napi:napi_create_function"
    "napi:napi_create_object"
    "napi:napi_create_promise"
    "napi:napi_create_reference"
    "napi:napi_create_string_latin1"
    "napi:napi_create_string_utf8"
    "napi:napi_create_type_error"
    "napi:napi_define_class"
    "napi:napi_define_properties"
    "napi:napi_delete_async_work"
    "napi:napi_delete_property"
    "napi:napi_delete_reference"
    "napi:napi_escape_handle"
    "napi:napi_fatal_error"
    "napi:napi_get_and_clear_last_exception"
    "napi:napi_get_array_length"
    "napi:napi_get_arraybuffer_info"
    "napi:napi_get_boolean"
    "napi:napi_get_cb_info"
    "napi:napi_get_element"
    "napi:napi_get_global"
    "napi:napi_get_last_error_info"
    "napi:napi_get_named_property"
    "napi:napi_get_new_target"
    "napi:napi_get_null"
    "napi:napi_get_property"
    "napi:napi_get_reference_value"
    "napi:napi_get_typedarray_info"
    "napi:napi_get_undefined"
    "napi:napi_get_value_bool"
    "napi:napi_get_value_double"
    "napi:napi_get_value_int32"
    "napi:napi_get_value_int64"
    "napi:napi_get_value_string_utf8"
    "napi:napi_get_value_uint32"
    "napi:napi_has_named_property"
    "napi:napi_has_property"
    "napi:napi_is_array"
    "napi:napi_is_arraybuffer"
    "napi:napi_is_buffer"
    "napi:napi_is_exception_pending"
    "napi:napi_new_instance"
    "napi:napi_open_callback_scope"
    "napi:napi_open_escapable_handle_scope"
    "napi:napi_open_handle_scope"
    "napi:napi_queue_async_work"
    "napi:napi_reject_deferred"
    "napi:napi_remove_wrap"
    "napi:napi_resolve_deferred"
    "napi:napi_set_element"
    "napi:napi_set_instance_data"
    "napi:napi_set_named_property"
    "napi:napi_throw"
    "napi:napi_typeof"
    "napi:napi_unwrap"
    "napi:napi_wrap"
    "env:__syscall_accept4"
    "env:__syscall_bind"
    "env:__syscall_connect"
    "env:__syscall_getpeername"
    "env:__syscall_getsockname"
    "env:__syscall_getsockopt"
    "env:__syscall_listen"
    "env:__syscall_recvfrom"
    "env:__syscall_rmdir"
    "env:__syscall_sendto"
    "env:__syscall_setsockopt"
    "env:__syscall_socket"
    "env:__syscall_unlinkat"
    "env:emscripten_asm_const_int"
    "env:emscripten_notify_memory_growth"
    "env:napi_wasm_cancel"
    "env:napi_wasm_schedule"
    "env:getaddrinfo"
    "env:getnameinfo"
    "env:pthread_setschedparam"
    "wasi_snapshot_preview1:clock_time_get"
    "wasi_snapshot_preview1:environ_get"
    "wasi_snapshot_preview1:environ_sizes_get"
    "wasi_snapshot_preview1:fd_close"
    "wasi_snapshot_preview1:fd_read"
    "wasi_snapshot_preview1:fd_seek"
    "wasi_snapshot_preview1:fd_write"
    "wasi_snapshot_preview1:proc_exit"
    "wasi_snapshot_preview1:random_get"
  )
  set(ZMQ_WASM_IMPORT_ALLOWLIST
    "${CMAKE_CURRENT_BINARY_DIR}/zeromq-wasm-intentional-imports.txt")
  set(ZMQ_WASM_IMPORT_CONTRACT_FILE
    "${CMAKE_CURRENT_BINARY_DIR}/zeromq-wasm-import-contract.txt")
  file(WRITE "${ZMQ_WASM_IMPORT_ALLOWLIST}" "")
  file(WRITE "${ZMQ_WASM_IMPORT_CONTRACT_FILE}" "")
  foreach(import_contract IN LISTS ZMQ_WASM_IMPORT_CONTRACT)
    string(REPLACE ":" ";" import_parts "${import_contract}")
    list(GET import_parts 1 import_name)
    file(APPEND "${ZMQ_WASM_IMPORT_ALLOWLIST}" "${import_name}\n")
    file(APPEND "${ZMQ_WASM_IMPORT_CONTRACT_FILE}" "${import_contract}\n")
  endforeach()
  add_link_options("SHELL:--allow-undefined-file=${ZMQ_WASM_IMPORT_ALLOWLIST}")
  add_link_options("SHELL:-s DISABLE_EXCEPTION_CATCHING=1")
  add_link_options("--no-entry")

  # The build script stages one current addon, while previous failed builds
  # can leave copies in versioned cmake-ts output directories. Remove only
  # those generated addon artifacts so the wildcard copy is deterministic.
  file(GLOB ZMQ_WASM_STALE_ARTIFACTS
    "${CMAKE_SOURCE_DIR}/build/wasm32/unknown/node/*/addon.wasm")
  if(ZMQ_WASM_STALE_ARTIFACTS)
    file(REMOVE ${ZMQ_WASM_STALE_ARTIFACTS})
  endif()
endif()

# Set MacOS deployment target
if(APPLE)
  option(MACOSX_DEPLOYMENT_TARGET "MacOS deployment target" "10.15")
  set_option_from_env(MACOSX_DEPLOYMENT_TARGET)
  set(CMAKE_OSX_DEPLOYMENT_TARGET ${MACOSX_DEPLOYMENT_TARGET})
endif()

# Set position independent code on all platforms
set(CMAKE_POSITION_INDEPENDENT_CODE TRUE)

# Set static runtime on Windows
if(WIN32)
  if("${CMAKE_SYSTEM_PROCESSOR}" STREQUAL "")
    detect_compiler()
    string(TOLOWER "${DETECTED_CMAKE_HOST_SYSTEM_PROCESSOR}" CMAKE_SYSTEM_PROCESSOR_LOWER)
  else()
    string(TOLOWER "${CMAKE_SYSTEM_PROCESSOR}" CMAKE_SYSTEM_PROCESSOR_LOWER)
  endif()

  # set vcpkg triplet to static runtime
  if("${CMAKE_SYSTEM_PROCESSOR_LOWER}" STREQUAL "amd64" OR "${CMAKE_SYSTEM_PROCESSOR_LOWER}" STREQUAL "x64")
    set(VCPKG_TARGET_TRIPLET "x64-windows-static")
  elseif("${CMAKE_SYSTEM_PROCESSOR_LOWER}" STREQUAL "arm64" OR "${CMAKE_SYSTEM_PROCESSOR_LOWER}" STREQUAL "aarch64")
    set(VCPKG_TARGET_TRIPLET "arm64-windows-static")
  elseif("${CMAKE_SYSTEM_PROCESSOR_LOWER}" STREQUAL "x86")
    set(VCPKG_TARGET_TRIPLET "x86-windows-static")
  else()
    message(STATUS "Not setting VCPKG_TARGET_TRIPLET for ${CMAKE_SYSTEM_PROCESSOR}")
  endif()

  # use static runtime library
  set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
endif()

# Defer undefined symbol resolution to runtime on MacOS
if(APPLE)
  set(CMAKE_SHARED_LINKER_FLAGS
    "${CMAKE_SHARED_LINKER_FLAGS} -undefined dynamic_lookup")
endif()

if(NOT ZMQ_SHARED)
  if(ZMQ_WASM)
    # Rebuild only the generated WASM target prefix after correcting its
    # compiler environment; native host tools remain in the host prefix.
    file(REMOVE_RECURSE
      "${CMAKE_CURRENT_BINARY_DIR}/vcpkg_installed/wasm32-emscripten")
  endif()
  run_vcpkg(VCPKG_URL "https://github.com/microsoft/vcpkg.git" VCPKG_REV
    "7012bf7bc3dec4b9020a83b1a8a2d365be4bc214")
endif()

# Name of the addon
project(addon LANGUAGES C CXX)

project_options(
  ENABLE_CACHE
  ENABLE_COMPILE_COMMANDS_SYMLINK
  ${ENABLE_SANITIZER_UNDEFINED}
  ENABLE_INTERPROCEDURAL_OPTIMIZATION
)

file(GLOB_RECURSE SOURCES "./src/*.cc" "./src/*.cpp")

if(ZMQ_WASM)
  # For WebAssembly, create an executable instead of a shared library
  add_executable(addon ${SOURCES})
else()
  add_library(addon SHARED ${SOURCES})
endif()

if(CMAKE_CXX_COMPILER_ID STREQUAL GNU
  OR CMAKE_CXX_COMPILER_ID STREQUAL Clang
  OR CMAKE_CXX_COMPILER_ID STREQUAL AppleClang)
  target_compile_options(project_warnings INTERFACE "-Wno-shadow")
endif()

target_link_libraries(addon PRIVATE project_options project_warnings)

if(ZMQ_DRAFT)
  target_compile_definitions(addon PRIVATE ZMQ_BUILD_DRAFT_API)
endif()

if(ZMQ_NO_SYNC_RESOLVE)
  target_compile_definitions(addon PRIVATE ZMQ_NO_SYNC_RESOLVE)
endif()

if(ZMQ_WASM)
  target_compile_definitions(addon PRIVATE ZMQ_WASM)
endif()

# ZeroMQ
if(ZMQ_SHARED)
  find_package(PkgConfig REQUIRED)
  pkg_check_modules(ZeroMQ REQUIRED IMPORTED_TARGET libzmq)
  target_link_system_libraries(addon PRIVATE PkgConfig::ZeroMQ)
else()
  find_package(ZeroMQ CONFIG REQUIRED)
  target_link_system_libraries(addon PRIVATE libzmq libzmq-static)
endif()

# Node specific
target_include_system_directories(addon PRIVATE ${CMAKE_JS_INC})
target_link_system_libraries(addon PRIVATE ${CMAKE_JS_LIB})

# Node flags
target_compile_definitions(addon PRIVATE V8_COMPRESS_POINTERS)
target_compile_definitions(addon PRIVATE V8_31BIT_SMIS_ON_64BIT_ARCH)
target_compile_definitions(addon PRIVATE V8_REVERSE_JSARGS)
target_compile_definitions(addon PRIVATE BUILDING_NODE_EXTENSION)
target_compile_definitions(addon PRIVATE NAPI_CPP_EXCEPTIONS)

# Windows definitions
if(WIN32)
  target_compile_definitions(addon PRIVATE "NOMINMAX")
  target_compile_definitions(addon PRIVATE "NOGDI")
  target_compile_definitions(addon PRIVATE "WIN32_LEAN_AND_MEAN")
endif()

# Use `.node` for the library without any "lib" prefix
if(ZMQ_WASM)
  set_target_properties(addon PROPERTIES PREFIX "" SUFFIX ".wasm")
else()
  set_target_properties(addon PROPERTIES PREFIX "" SUFFIX ".node")
endif()

# Windows delay load node.exe
if(WIN32)
  set_property(TARGET addon PROPERTY LINK_FLAGS "-Xlinker /DELAYLOAD:NODE.EXE")
  target_link_libraries(addon PRIVATE "ShLwApi.lib" "delayimp.lib")
endif()
