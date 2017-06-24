#!/bin/bash

TYPE=$1
GCC=$2
GH_TOKEN=$3

if [[ "${TYPE}" == "armv6" ]]; then
  ARCH="arm-linux-gnueabi"
elif [[ "${TYPE}" == "armv7" ]]; then
  ARCH="arm-linux-gnueabihf"
else
  exit 1
fi

# Update dependencies
sudo apt-get -qq update
sudo apt-get install -y "gcc-${GCC}-${ARCH}" "g++-${GCC}-${ARCH}"

export CC="${ARCH}-gcc-${GCC}"
export CXX="${ARCH}-g++-${GCC}"
export STRIP="${ARCH}-strip"
export ZMQ_BUILD_OPTIONS="--host=${ARCH}"

echo "Build zeromq.js for ${ARCH} with gcc ${GCC}"

if [[ -z $3 ]]; then
  npm install "--arch=${ARCH}"
else
  PREBUILD_OPTS="-u ${GH_TOKEN}"
fi

# Set architecture to arm because prebuild does not differ between arm versions at the moment
node_modules/prebuild/bin.js "--arch=arm" --all --strip "${PREBUILD_OPTS}"
