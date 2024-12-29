FROM node:18-alpine

WORKDIR /app
COPY ./ ./
ENV VCPKG_FORCE_SYSTEM_BINARIES=1
RUN apk add --no-cache \
    bash \ 
    build-base \
    curl \ 
    git \
    g++ \ 
    make \ 
    ninja-build \
    pkgconfig \
    unzip \
    zip \
    python3 \
    tar \
    cmake \ 
    ninja \
    musl-dev \
    automake \
    autoconf \
    libtool && \
    cp /usr/lib/ninja-build/bin/ninja /usr/bin/ninja && \ 
    npm i -g pnpm && \
    pnpm install && \
    pnpm run build
