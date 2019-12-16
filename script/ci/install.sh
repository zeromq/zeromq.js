#!/bin/sh
set -e

echo "Installing dependencies..."

if [ -n "${TRIPLE}" ]; then
  export CC="${TRIPLE}-gcc-${GCC}"
  export CXX="${TRIPLE}-g++-${GCC}"
  export STRIP="${TRIPLE}-strip"
  export ZMQ_BUILD_OPTIONS="--host=${TRIPLE}"

  export npm_config_arch=${ARCH}
  export npm_config_target_arch=${ARCH}
fi

if [ -n "${ALPINE_CHROOT}" ]; then
  sudo script/ci/alpine-chroot-install.sh -b v${ALPINE_CHROOT} -p 'nodejs-dev yarn build-base git cmake curl python2 coreutils' -k 'CI TRAVIS_.* ZMQ_.* NODE_.* npm_.*'
fi

if [ -n "${ZMQ_SHARED}" ]; then
  export npm_config_zmq_shared=true
fi

if [ -n "${ZMQ_DRAFT}" ]; then
  export npm_config_zmq_draft=true
fi

if [ -n "${ZMQ_NO_SYNC_RESOLVE}" ]; then
  export npm_config_zmq_no_sync_resolve=true
fi

export npm_config_build_from_source=true

# Installing node-gyp globally facilitates calling it in various ways, not just
# via yarn but also via bin stubs in node_modules (even on Windows).
if [ -n "${ALPINE_CHROOT}" ]; then
  /alpine/enter-chroot yarn global add node-gyp

  if [ -n "${IGNORE_SCRIPTS}" ]; then
    /alpine/enter-chroot yarn install --ignore-engines --ignore-scripts
  else
    /alpine/enter-chroot yarn install --ignore-engines
  fi
else
  yarn global add node-gyp

  if [ -n "${IGNORE_SCRIPTS}" ]; then
    yarn install --ignore-engines --ignore-scripts
  else
    yarn install --ignore-engines
  fi
fi
