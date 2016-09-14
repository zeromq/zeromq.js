#!/bin/sh

cd zmq-prebuilt
ln -s -f ../package.json package.json
../scripts/build_libzmq.sh
npm install
cd ..
ln -s -f zmq-prebuilt/build build
ln -s -f zmq-prebuilt/node_modules node_modules
# If necessary the zmq folder could be symlinked as well.
