#!/bin/sh
set -e

echo "Building distribution binary..."

if [ -n "${TRIPLE}" ]; then
  export CC="${TRIPLE}-gcc-${GCC}"
  export CXX="${TRIPLE}-g++-${GCC}"
  export STRIP="${TRIPLE}-strip"
  export ZMQ_BUILD_OPTIONS="--host=${TRIPLE}"

  export npm_config_arch=${ARCH}
  export npm_config_target_arch=${ARCH}

  export PREBUILD_ARCH="${ARCH}"
  export PREBUILD_STRIP_BIN="${STRIP}"
fi

if [ -n "${ALPINE_CHROOT}" ]; then
  /alpine/enter-chroot yarn ci:prebuild --tag-libc
else
  if [ "${TRAVIS_OS_NAME}" = "linux" ]; then
    yarn ci:prebuild --tag-libc
  else
    yarn ci:prebuild
  fi
fi

ARCHIVE_NAME="${TRAVIS_TAG:-latest}-${TRAVIS_OS_NAME}${ARCHIVE_SUFFIX}.tar.gz"
tar -zcvf "${ARCHIVE_NAME}" -C "${TRAVIS_BUILD_DIR}" prebuilds
