#!/bin/bash

ARCH=$1
GCC=$2

# Update dependencies
sudo apt-get -qq update
sudo apt-get install -y "gcc-${GCC}-${ARCH}" "g++-${GCC}-${ARCH}"

export CC="${ARCH}-gcc-${GCC}"
export CXX="${ARCH}-g++-${GCC}"
export ZMQ_BUILD_OPTIONS="--host=${ARCH}"

echo "Build zeromq.js for ${ARCH} with gcc ${GCC}"

npm install "--arch=${ARCH}"
