#!/bin/sh

cd zmq-prebuilt
ln -s ../package.json package.json
./build_libzmq.sh
npm install
cd ..
ln -s zmq-prebuilt/build build
ln -s zmq-prebuilt/node_modules node_modules
# If necessary the zmq folder could be symlinked as well.
