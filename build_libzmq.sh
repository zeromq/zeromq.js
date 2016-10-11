#!/bin/sh
set -e

test -d zmq || mkdir zmq

ZMQ=4.1.5
ZMQ_REPO=zeromq/zeromq4-1

realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}
export ZMQ_PREFIX="$(dirname $(realpath $0))/zmq"
export ZMQ_SRC_DIR=zeromq-$ZMQ
cd $ZMQ_PREFIX

export CFLAGS=-fPIC
export CXXFLAGS=-fPIC
export PKG_CONFIG_PATH=$ZMQ_PREFIX/lib/pkgconfig

test -f zeromq-$ZMQ.tar.gz || ZMQ=$ZMQ ZMQ_REPO=$ZMQ_REPO node "$(dirname $(realpath $0))/download-zmq.js"
test -d $ZMQ_SRC_DIR || tar xzf zeromq-$ZMQ.tar.gz
cd $ZMQ_SRC_DIR

test -f configure || ./autogen.sh
./configure --prefix=$ZMQ_PREFIX --with-relaxed --enable-static --disable-shared
V=1 make -j
make install
