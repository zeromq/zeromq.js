#!/bin/sh

set -x

# Ubuntu/Debian
apt=$(command -v apt-get || true)
if [ -n "$apt" ]; then
    apt-get update -q -y
    apt-get install --no-install-recommends -y \
        bash \
        build-essential \
        gnupg \
        ca-certificates \
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
        libtool

    # install latest nodejs
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    apt-get update -qq
    apt-get install -y --no-install-recommends nodejs
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

export VCPKG_FORCE_SYSTEM_BINARIES=1

# vcpkg
git clone https://github.com/microsoft/vcpkg.git ~/vcpkg
cd ~/vcpkg || exit 1
git checkout "608d1dbcd6969679f82b1ca6b89d58939c9b228e"
~/vcpkg/bootstrap-vcpkg.sh
cd - || exit 1

# zeromq
cd ~/vcpkg || exit 1
~/vcpkg/vcpkg install 'zeromq[draft,curve,sodium]' || (cd - || exit 1)
cd - || exit 1
