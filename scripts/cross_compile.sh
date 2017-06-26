#!/bin/bash

ARCH=$1
GH_TOKEN=$2

if [[ "${ARCH}" == "armv7" ]]; then
  TRIPLE="arm-linux-gnueabihf"
  GCC="4.8"
elif [[ "${ARCH}" == "armv8" ]]; then
  TRIPLE="aarch64-linux-gnu"
  GCC="4.8"
else
  exit 1
fi

PACKAGES="gcc-${GCC}-${TRIPLE} g++-${GCC}-${TRIPLE}"
export CC="${TRIPLE}-gcc-${GCC}"
export CXX="${TRIPLE}-g++-${GCC}"
export STRIP="${TRIPLE}-strip"
export ZMQ_BUILD_OPTIONS="--host=${TRIPLE}"

echo "Building zeromq.js for ${ARCH}"

if [[ -z $GH_TOKEN ]]; then
  sudo apt-get -qq update
  sudo apt-get install -y ${PACKAGES}
  npm install "--arch=${TRIPLE}"
else
  ./node_modules/prebuild/bin.js "--arch=${ARCH}" --all --strip -u "${GH_TOKEN}"
fi
