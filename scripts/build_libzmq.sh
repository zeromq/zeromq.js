#!/bin/sh
set -e

if [ "$1" != "" ]; then
  ZMQ=$1
else
  echo "build_libzmq.sh: No ZMQ version given"
  exit 1
fi

if [ "$2" = "ia32" ]; then
  export CFLAGS="-fPIC -m32"
  export CXXFLAGS="-fPIC -m32"
else
  export CFLAGS=-fPIC
  export CXXFLAGS=-fPIC
fi

echo "build_libzmq.sh: Building version $1 for architecture $2"

export MACOSX_DEPLOYMENT_TARGET=10.9
export BASE=$(dirname "$0")

cd "${BASE}/../zmq"
export ZMQ_PREFIX=$(pwd -P)
export ZMQ_SRC_DIR=zeromq-$ZMQ

export PKG_CONFIG_PATH="${ZMQ_PREFIX}/lib/pkgconfig"

test -d "${ZMQ_SRC_DIR}" || tar xzf zeromq-$ZMQ.tar.gz
cd "${ZMQ_SRC_DIR}"

test -f configure || ./autogen.sh
if [ "$ZMQ" = "4.1.6" ]; then
  ./configure "--prefix=${ZMQ_PREFIX}" --with-relaxed --enable-static --disable-shared --without-documentation ${ZMQ_BUILD_OPTIONS}
else
  ./configure "--prefix=${ZMQ_PREFIX}" --disable-pedantic --enable-static --disable-shared --without-docs ${ZMQ_BUILD_OPTIONS}
fi
make -j 2
make install

cd "${ZMQ_PREFIX}"
rm -rf "${ZMQ_SRC_DIR}"
rm -f zeromq-$ZMQ.tar.gz
