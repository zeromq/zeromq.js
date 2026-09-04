#!/bin/sh

set -x

VCPKG_COMMIT="7012bf7bc3dec4b9020a83b1a8a2d365be4bc214"

# Ubuntu/Debian
apt=$(command -v apt-get || true)
if [ -n "$apt" ]; then
    apt-get update -q -y

    if [ -z "$(command -v setup-cpp || true)" ]; then
        apt-get install --no-install-recommends -y \
            bash \
            gnupg \
            ca-certificates \
            curl

        # install latest nodejs
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
        apt-get update -qq
        apt-get install -y --no-install-recommends nodejs

        npx -y setup-cpp --compiler gcc --python true --cmake true --ninja true --make true --autoreconf true --vcpkg $VCPKG_COMMIT
    fi
fi

# Alpine Linux
apk=$(command -v apk || true)
if [ -n "$apk" ]; then
    apk update

    apk add --no-cache curl
    cmake_apk=/tmp/cmake-4.3.4-r0.apk
    curl -fsSL \
        "https://dl-cdn.alpinelinux.org/alpine/edge/main/$(apk --print-arch)/cmake-4.3.4-r0.apk" \
        -o "$cmake_apk" || exit 1
    apk add --no-cache "$cmake_apk" || exit 1
    rm -f "$cmake_apk" || exit 1
    cmake --version || exit 1
    export VCPKG_FORCE_SYSTEM_BINARIES=1

    if [ -z "$(command -v setup-cpp || true)" ]; then
        apk add --no-cache bash build-base curl git g++ make ninja-build pkgconfig unzip zip python3 tar musl-dev nodejs npm automake autoconf autoconf-archive libtool
        cp /usr/lib/ninja-build/bin/ninja /usr/bin/ninja

        # vcpkg
        git clone https://github.com/microsoft/vcpkg.git ~/vcpkg
        cd ~/vcpkg || exit 1
        git checkout "$VCPKG_COMMIT"
        ~/vcpkg/bootstrap-vcpkg.sh
        cd - || exit 1
    fi
fi

# Fedora/RHEL
dnf=$(command -v dnf || true)
if [ -n "$dnf" ]; then
    dnf update -q -y

    if [ -z "$(command -v setup-cpp || true)" ]; then
        dnf install -y \
            bash \
            nodejs

        npx -y setup-cpp --compiler gcc --python true --cmake true --ninja true --make true --autoreconf true --vcpkg $VCPKG_COMMIT --git true
    fi

    dnf install -y \
        automake \
        autoconf \
        autoconf-archive \
        libtool
fi

# zeromq
cd ~/vcpkg || exit 1
git checkout "$VCPKG_COMMIT" --force
~/vcpkg/vcpkg install 'zeromq[draft,curve,sodium]' || (cd - || exit 1)
cd - || exit 1

# pnpm
npm i -g pnpm
