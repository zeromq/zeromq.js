#!/bin/sh
set -e

if [ -n "${ALPINE_CHROOT}" ]; then
  /alpine/enter-chroot yarn test
else
  yarn test
fi
