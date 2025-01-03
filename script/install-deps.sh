#!/bin/sh

set -x

# Ubuntu/Debian
apt=$(command -v apt-get || true)
if [ -n "$apt" ]; then
    apt-get update -q -y
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
        libtool \
        nodejs \
        npm
fi

# Alpine Linux
apk=$(command -v apk || true)
if [ -n "$apk" ]; then
    apk update
    apk add --no-cache bash build-base curl git g++ make ninja-build pkgconfig unzip zip python3 tar cmake musl-dev automake autoconf libtool nodejs npm
    cp /usr/lib/ninja-build/bin/ninja /usr/bin/ninja
fi

# Fedora/RHEL
dnf=$(command -v dnf || true)
if [ -n "$dnf" ]; then
    dnf update -q -y
    dnf install -y \
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
        libtool \
        nodejs
fi

# pnpm
npm i -g pnpm

# vcpkg
npx -y setup-cpp --vcpkg "ee2d2a100103e0f3613c60655dcf15be7d5157b8"

# zeromq
export VCPKG_FORCE_SYSTEM_BINARIES=1
cd ~/vcpkg || exit 1
~/vcpkg/vcpkg install 'zeromq[draft,curve,sodium]' || (cd - || exit 1)
cd - || exit 1
