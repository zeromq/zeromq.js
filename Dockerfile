FROM node:5.7.0-wheezy

RUN apt-get update -y
RUN apt-get install -y pkg-config

# libzmq-4.1.5 prerelease for tweetnacl build fixes
ENV ZMQ b539733cee0f47f9bf1a70dc7cb7ff20410d3380
ENV NODE_VERSION 5

ADD . /zmq-prebuilt
WORKDIR /zmq-prebuilt
RUN ./build_libzmq.sh

ENV PKG_CONFIG_PATH $ZMQ_PREFIX/lib/pkgconfig
RUN npm install
