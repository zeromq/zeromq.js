#!/bin/sh

set -x

VCPKG_COMMIT="608d1dbcd6969679f82b1ca6b89d58939c9b228e"

# Ubuntu/Debian
apt=$(command -v apt-get || true)
if [ -n "$apt" ]; then
    apt-get update -q -y

    # if setup-cpp not installed
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

        npx -y setup-cpp --compiler gcc --python true --cmake true --ninja true --make true --vcpkg $VCPKG_COMMIT
    fi

    apt-get install --no-install-recommends -y \
        automake \
        autoconf \
        libtool
fi

# Alpine Linux
apk=$(command -v apk || true)
if [ -n "$apk" ]; then
    apk update

    if [ -z "$(command -v setup-cpp || true)" ]; then
        apk add --no-cache bash build-base curl git g++ make ninja-build pkgconfig unzip zip python3 tar cmake musl-dev nodejs npm
        cp /usr/lib/ninja-build/bin/ninja /usr/bin/ninja

        # vcpkg
        export VCPKG_FORCE_SYSTEM_BINARIES=1
        git clone https://github.com/microsoft/vcpkg.git ~/vcpkg
        cd ~/vcpkg || exit 1
        git checkout "$VCPKG_COMMIT"
        ~/vcpkg/bootstrap-vcpkg.sh
        cd - || exit 1
    fi

    apk add --no-cache automake autoconf libtool
fi

# Fedora/RHEL
dnf=$(command -v dnf || true)
if [ -n "$dnf" ]; then
    dnf update -q -y

    # if setup-cpp not installed
    if [ -z "$(command -v setup-cpp || true)" ]; then
        dnf install -y \
            bash \
            nodejs

        npx -y setup-cpp --compiler gcc --python true --cmake true --ninja true --make true --vcpkg $VCPKG_COMMIT --git true
    fi

    dnf install -y \
        automake \
        autoconf \
        libtool
fi

# zeromq
cd ~/vcpkg || exit 1
git checkout "$VCPKG_COMMIT" --force
~/vcpkg/vcpkg install 'zeromq[draft,curve,sodium]' || (cd - || exit 1)
cd - || exit 1

# pnpm
npm i -g pnpm
