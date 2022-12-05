#!/bin/sh
set -e

#! Install arm-brew on x86 MacOS Arm
#! Based on https://github.com/Homebrew/discussions/discussions/2843#discussioncomment-2243610

bottle_tag="arm64_big_sur" # Macos 11 is big sure
dependencies="libsodium"

mkdir -p ~/arm-target/bin
mkdir -p ~/arm-target/brew-cache
export PATH="$HOME/arm-target/bin:$PATH"

# Download Homebrew under ~/arm-target
PREV_PWD="$PWD"
cd ~/arm-target
mkdir -p arm-homebrew
curl -L https://github.com/Homebrew/brew/tarball/master | tar xz --strip 1 -C arm-homebrew
cd "$PREV_PWD"

# Add arm-brew binary
ln -sf ~/arm-target/arm-homebrew/bin/brew ~/arm-target/bin/arm-brew

# Homebrew env variables
export HOMEBREW_CACHE=~/arm-target/brew-cache
export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1

# Install the given dependencies for the given bottle_tag
arm-brew fetch --deps --bottle-tag=$bottle_tag $dependencies |
    grep -E "(Downloaded to:|Already downloaded:)" |
    grep -E ".tar.gz" |
    grep -v pkg-config |
    awk '{ print $3 }' |
    xargs -n 1 arm-brew install --force-bottle || true

# Install host version of pkg-config so we can call it in the build system
arm-brew install pkg-config || true

# Add the installed binaries/libraries to the path
export PATH="$HOME/arm-target/bin/:$PATH"
export PATH="$HOME/arm-target/lib/:$PATH"

# libsodium
SODIUM_PATH=$(~/arm-target/bin/pkg-config libsodium --libs-only-L | sed -e 's/-L//g') # print only -L and replace "-L" itself
export PATH="$SODIUM_PATH:$PATH"
export PKG_CONFIG_PATH="$SODIUM_PATH:$PKG_CONFIG_PATH"
export npm_config_target_arch=arm64
