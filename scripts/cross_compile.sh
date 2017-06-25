#!/bin/bash

ARCH=$1
GH_TOKEN=$2

# Only support armv7 for now
if [[ "${ARCH}" == "armv7" ]]; then
  TRIPLE="arm-linux-gnueabihf"
  GCC="4.8"
  PACKAGES="gcc-${GCC}-${TRIPLE} g++-${GCC}-${TRIPLE}"
  export CC="${TRIPLE}-gcc-${GCC}"
  export CXX="${TRIPLE}-g++-${GCC}"
  export STRIP="${TRIPLE}-strip"
else
  exit 1
fi

# Update dependencies
sudo apt-get -qq update
sudo apt-get install -y ${PACKAGES}

export ZMQ_BUILD_OPTIONS="--host=${TRIPLE}"

echo "Building zeromq.js for ${ARCH}"

if [[ -z $2 ]]; then
  npm install "--arch=${TRIPLE}"
else
  ./node_modules/prebuild/bin.js "--arch=${ARCH}" --all --strip -u "${GH_TOKEN}"
fi
