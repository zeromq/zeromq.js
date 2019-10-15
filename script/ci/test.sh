#!/bin/sh
set -e

if [ -n "${ALPINE_CHROOT}" ]; then
  /alpine/enter-chroot yarn dev:test
else
  yarn dev:test
fi
