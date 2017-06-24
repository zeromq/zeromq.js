#!/bin/bash

ARCH=arm-linux-gnueabihf
export CC="arm-linux-gnueabihf-gcc-4.8"
export CXX="arm-linux-gnueabihf-g++-4.8"

echo "Build zeromq.js for ${ARCH}"

export ZMQ_BUILD_OPTIONS="--host=${ARCH}"
npm install "--arch=${ARCH}"
