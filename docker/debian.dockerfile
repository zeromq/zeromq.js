FROM node:18 AS builder

WORKDIR /app
COPY ./ ./
ENV VCPKG_FORCE_SYSTEM_BINARIES=1
RUN \
    # system dependencies
    apt-get update -y && \
    apt-get install --no-install-recommends -y \
    bash \
    build-essential \
    curl \
    git \
    g++ \
    make \
    ninja-build \
    pkg-config \
    unzip \
    zip \
    python3 \
    tar \
    cmake \
    ninja-build \
    automake \
    autoconf \
    libtool && \
    # build
    npm i -g pnpm && \
    pnpm install && \
    pnpm run build

FROM node:18
WORKDIR /app

COPY ./ ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
