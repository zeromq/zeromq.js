#!/bin/sh

mv build zmq-prebuilt/build
mv node_modules zmq-prebuilt/node_modules
cd zmq-prebuilt
./build_libzmq.sh
npm install
mv build ../build
mv node_modules ../node_modules
cd ..
