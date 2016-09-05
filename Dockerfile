# Usage
# docker build -t zmqprebuilt .
# docker run -it -e GITHUB_TOKEN=$GITHUB_TOKEN zmqprebuilt prebuild --all -u $GITHUB_TOKEN

FROM node:5.7.0-wheezy

RUN apt-get update -y
RUN apt-get install -y pkg-config
RUN npm install -g prebuild

ENV NODE_VERSION 5

ADD . /zmq-prebuilt
WORKDIR /zmq-prebuilt
RUN bash ./build_libzmq.sh

ENV PKG_CONFIG_PATH $ZMQ_PREFIX/lib/pkgconfig
RUN npm install

