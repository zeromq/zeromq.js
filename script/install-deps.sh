#!/bin/sh

set -x

VCPKG_COMMIT="7012bf7bc3dec4b9020a83b1a8a2d365be4bc214"

# Install Node
## Windows
choco=$(command -v choco || true)
winget=$(command -v winget || true)
if [ -n "$choco" ]; then
        if [ -z "$(command -v npx || true)" ]; then
                choco install -y nodejs-lts
        fi
elif [ -n "$winget" ]; then
        if [ -z "$(command -v npx || true)" ]; then
                winget install -e --id OpenJS.NodeJS.LTS
        fi
fi

## MacOS
brew=$(command -v brew || true)
if [ -n "$brew" ]; then
        if [ -z "$(command -v npx || true)" ]; then
                brew install nodejs
        fi
fi
## Ubuntu/Debian
apt=$(command -v apt-get || true)
if [ -n "$apt" ]; then
        apt-get update -q -y

        if [ -z "$(command -v npx || true)" ]; then
                apt-get install --no-install-recommends -y \
                        bash \
                        gnupg \
                        ca-certificates \
                        curl

                # install nodejs 22
                mkdir -p /etc/apt/keyrings
                curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
                echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
                apt-get update -qq
                apt-get install -y --no-install-recommends nodejs
        fi
fi
## Alpine Linux
apk=$(command -v apk || true)
if [ -n "$apk" ]; then
        apk update
        if [ -z "$(command -v npx || true)" ]; then
                apk add --no-cache bash nodejs
        fi
fi
## Fedora/RHEL
dnf=$(command -v dnf || true)
if [ -n "$dnf" ]; then
        dnf update -q -y

        if [ -z "$(command -v npx || true)" ]; then
                dnf install -y \
                        bash \
                        nodejs
        fi
fi

# Install deps via setup-cpp
npx -y setup-cpp --compiler gcc --python true --cmake true --ninja true --make true --autoreconf true --vcpkg $VCPKG_COMMIT

## Newer cmake on Alpine
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
fi

# zeromq
cd ~/vcpkg || exit 1
git checkout "$VCPKG_COMMIT" --force
~/vcpkg/vcpkg install 'zeromq[draft,curve,sodium]' || (cd - || exit 1)
cd - || exit 1

# pnpm
npm i -g pnpm
