#!/bin/sh
set -e

#! Install arm-brew on x86 MacOS Arm
#! Based on https://github.com/Homebrew/discussions/discussions/2843#discussioncomment-2243610

bottle_tag="arm64_big_sur" # Macos 11 is big sure
dependencies="libsodium gnutls"

mkdir -p ~/arm-target/bin
mkdir -p ~/arm-target/brew-cache
export PATH="$HOME/arm-target/bin:$PATH"

PREV_PWD="$PWD"
cd ~/arm-target

mkdir arm-homebrew
curl -L https://github.com/Homebrew/brew/tarball/master | tar xz --strip 1 -C arm-homebrew
ln -s ~/arm-target/arm-homebrew/bin/brew ~/arm-target/bin/arm-brew

export HOMEBREW_CACHE=~/arm-target/brew-cache
export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1

arm-brew fetch --deps --bottle-tag=$bottle_tag $dependencies |
    grep -E "(Downloaded to:|Already downloaded:)" |
    grep -v pkg-config |
    awk '{ print $3 }' |
    xargs -n 1 arm-brew install --force-bottle

# Install host version of pkg-config so we can call it in the build system
arm-brew install pkg-config
ln -s ~/arm-target/arm-homebrew/bin/pkg-config ~/arm-target/bin/arm-pkg-config

export PATH="$HOME/arm-target/arm-homebrew/bin/:$PATH"
export PATH="$HOME/arm-target/arm-homebrew/lib/:$PATH"

cd "$PREV_PWD"

# libsodium
export PATH="$HOME/arm-target/Cellar/libsodium/1.0.18_1/lib:$PATH"
export PKG_CONFIG_PATH="$HOME/arm-target/Cellar/libsodium/1.0.18_1/lib:$PKG_CONFIG_PATH"

# gnutils
export GUILE_TLS_CERTIFICATE_DIRECTORY=/Users/runner/arm-target/etc/gnutls/
export PATH="$HOME/arm-target/opt/gnu-sed/libexec/gnubin:$PATH"
export PATH="$HOME/arm-target/opt/m4/bin:$PATH"
export LDFLAGS="-L$HOME/arm-target/opt/readline/lib $LDFLAGS"
export CPPFLAGS="-I$HOME/arm-target/opt/readline/include $CPPFLAGS"
export PKG_CONFIG_PATH="$HOME/arm-target/opt/readline/lib/pkgconfig:$PKG_CONFIG_PATH"
export PKG_CONFIG_PATH="$HOME/arm-target/opt/openssl@1.1/lib/pkgconfig:$PKG_CONFIG_PATH"
export PKG_CONFIG_PATH="$HOME/arm-target/opt/readline/lib/pkgconfig:$PKG_CONFIG_PATH"
