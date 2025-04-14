cmake_minimum_required(VERSION 3.16)

include(FetchContent)

if(CMAKE_VERSION VERSION_GREATER_EQUAL "3.24.0")
  cmake_policy(SET CMP0135 NEW)
endif()

# Add project_options from https://github.com/aminya/project_options
set(PROJECT_OPTIONS_VERSION "v0.41.0")
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
  message(STATUS "building libsodium requires running `brew install autoconf automake libtool`")
endif()

option(ZMQ_WEBSOCKETS "Enable WebSocket transport" OFF)
set_option_from_env(ZMQ_WEBSOCKETS)

option(ZMQ_WEBSOCKETS_SECURE "Enable WebSocket transport with TSL (wss)" OFF)
set_option_from_env(ZMQ_WEBSOCKETS_SECURE)

option(ZMQ_NO_SYNC_RESOLVE "send/receive on the socket immediately" OFF)
set_option_from_env(ZMQ_NO_SYNC_RESOLVE)

# Add undefined behavior sanitizer if requested
option(ZMQ_ENABLE_SANITIZER_UNDEFINED "Enable undefined behavior sanitizer" OFF)
set_option_from_env(ZMQ_ENABLE_SANITIZER_UNDEFINED)

if(${ZMQ_ENABLE_SANITIZER_UNDEFINED})
  set(ENABLE_SANITIZER_UNDEFINED "ENABLE_SANITIZER_UNDEFINED")
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

run_vcpkg(VCPKG_URL "https://github.com/microsoft/vcpkg.git" VCPKG_REV
  "608d1dbcd6969679f82b1ca6b89d58939c9b228e")

# Name of the addon
project(addon LANGUAGES C CXX)

project_options(
  ENABLE_CACHE
  ENABLE_COMPILE_COMMANDS_SYMLINK
  ${ENABLE_SANITIZER_UNDEFINED}
)

file(GLOB_RECURSE SOURCES "./src/*.cc")
add_library(addon SHARED ${SOURCES})

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

# ZeroMQ
find_package(ZeroMQ CONFIG REQUIRED)
target_link_system_libraries(addon PRIVATE libzmq libzmq-static)

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
set_target_properties(addon PROPERTIES PREFIX "" SUFFIX ".node")

# Windows delay load node.exe
if(WIN32)
  set_property(TARGET addon PROPERTY LINK_FLAGS "-Xlinker /DELAYLOAD:NODE.EXE")
  target_link_libraries(addon PRIVATE "ShLwApi.lib" "delayimp.lib")
endif()
