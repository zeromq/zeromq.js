cmake_minimum_required(VERSION 3.16)

include(FetchContent)
if(CMAKE_VERSION VERSION_GREATER_EQUAL "3.24.0")
  cmake_policy(SET CMP0135 NEW)
endif()

if(WIN32)
  if(DEFINED ENV{PROCESSOR_ARCHITEW6432})
    set(CMAKE_HOST_SYSTEM_PROCESSOR "$ENV{PROCESSOR_ARCHITEW6432}")
  else()
    set(CMAKE_HOST_SYSTEM_PROCESSOR "$ENV{PROCESSOR_ARCHITECTURE}")
  endif()
endif()

# Add project_options from https://github.com/aminya/project_options Change the
# version in the following URL to update the package (watch the releases of the
# repository for future updates)
set(PROJECT_OPTIONS_VERSION "v0.36.6")
FetchContent_Declare(
  _project_options
  URL https://github.com/aminya/project_options/archive/refs/tags/${PROJECT_OPTIONS_VERSION}.zip
)
FetchContent_MakeAvailable(_project_options)
include(${_project_options_SOURCE_DIR}/Index.cmake)

# MacOS flags that should be set prior to any project calls
if(DEFINED APPLE AND APPLE)
  set(CMAKE_SHARED_LINKER_FLAGS
      "${CMAKE_SHARED_LINKER_FLAGS} -undefined dynamic_lookup")
  set(CMAKE_OSX_DEPLOYMENT_TARGET
      "10.15"
      CACHE STRING "Minimum OS X deployment version")
  add_definitions(-DMAC_OS_X_VERSION_MIN_REQUIRED=101500)
endif()

run_vcpkg(VCPKG_URL "https://github.com/microsoft/vcpkg.git" VCPKG_REV
          "ee2d2a100103e0f3613c60655dcf15be7d5157b8")

# Name of the project (will be the name of the plugin)
project(addon LANGUAGES C CXX)

project_options(ENABLE_CACHE)

add_library(
  addon SHARED
  "src/context.cc"
  "src/incoming_msg.cc"
  "src/module.cc"
  "src/observer.cc"
  "src/outgoing_msg.cc"
  "src/proxy.cc"
  "src/socket.cc")

target_link_libraries(addon PRIVATE project_options project_warnings)

# ZeroMQ
find_package(ZeroMQ CONFIG REQUIRED)
target_link_system_libraries(addon PRIVATE libzmq libzmq-static)

# Node specific
target_include_system_directories(addon PRIVATE ${CMAKE_JS_INC})
target_link_system_libraries(addon ${CMAKE_JS_LIB})

target_compile_definitions(addon PRIVATE V8_COMPRESS_POINTERS)
target_compile_definitions(addon PRIVATE V8_31BIT_SMIS_ON_64BIT_ARCH)
target_compile_definitions(addon PRIVATE V8_REVERSE_JSARGS)
target_compile_definitions(addon PRIVATE BUILDING_NODE_EXTENSION)
target_compile_definitions(addon PRIVATE NAPI_CPP_EXCEPTIONS)

# Use `.node` for the library without any "lib" prefix
set_target_properties(addon PROPERTIES PREFIX "" SUFFIX ".node")

# Windows workaround
if(WIN32)
  set_property(TARGET addon PROPERTY LINK_FLAGS "-Xlinker /DELAYLOAD:NODE.EXE")
  target_link_libraries(addon "ShLwApi.lib" "delayimp.lib")
endif()
