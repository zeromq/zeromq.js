#!/bin/sh
set -e

ZMQ_VERSION=${ZMQ_VERSION:-"4.3.4"}

SRC_URL="https://github.com/zeromq/libzmq/releases/download/v${ZMQ_VERSION}/zeromq-${ZMQ_VERSION}.tar.gz"
SRC_DIR="zeromq-${ZMQ_VERSION}"
TARBALL="zeromq-${ZMQ_VERSION}.tar.gz"
BUILD_OPTIONS=""

if [ -n "${WINDIR}" ]; then
  # Working directory is NAPI temporary build directory.
  PATH_PREFIX="${PWD}/libzmq"
  ARTIFACT="${PATH_PREFIX}/lib/libzmq.lib"
else
  # Working directory is project root.
  PATH_PREFIX="${PWD}/build/libzmq"
  ARTIFACT="${PATH_PREFIX}/lib/libzmq.a"
  export MACOSX_DEPLOYMENT_TARGET=10.9
fi

mkdir -p "${PATH_PREFIX}" && cd "${PATH_PREFIX}"

if [ -f "${ARTIFACT}" ]; then
  echo "Found previously built libzmq; skipping rebuild..."
else
  if [ -f "${TARBALL}" ]; then
    echo "Found libzmq source; skipping download..."
  else
    echo "Downloading libzmq source..."
    curl "${SRC_URL}" -fsSL -o "${TARBALL}"
  fi

  test -d "${SRC_DIR}" || tar xzf "${TARBALL}"

  if [ "${npm_config_zmq_draft}" = "true" ]; then
    echo "Building libzmq (with draft support)..."
    BUILD_OPTIONS="-DENABLE_DRAFTS=ON ${BUILD_OPTIONS}"
  else
    echo "Building libzmq..."
  fi

  # ClangFormat include causes issues but is not required to build.
  if [ -f "${SRC_DIR}/builds/cmake/Modules/ClangFormat.cmake" ]; then
    echo > "${SRC_DIR}/builds/cmake/Modules/ClangFormat.cmake"
  fi

  cmake \
    "${BUILD_OPTIONS}" \
    -DCMAKE_INSTALL_PREFIX="${PATH_PREFIX}" \
    -DCMAKE_INSTALL_LIBDIR=lib \
    -DBUILD_STATIC=ON \
    -DBUILD_TESTS=OFF \
    -DBUILD_SHARED=OFF \
    -DWITH_DOCS=OFF \
    "${SRC_DIR}"

  if [ -n "${WINDIR}" ]; then
    cmake \
      --build . \
      --config Release \
      --target install \
      -- -verbosity:Minimal -maxcpucount

    BuilFile=$(find $PATH_PREFIX/lib/*.lib -type f)
    mv "$BuilFile" "${PATH_PREFIX}/lib/libzmq.lib"

  else
    cmake \
      --build .\
      --config Release \
      --target install \
      -- -j5
  fi
fi
