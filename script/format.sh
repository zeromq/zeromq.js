#!/bin/sh
if [ -z "$CI" ]; then
  if command -v clang-format >/dev/null; then
    echo "Formatting source files..."
    clang-format -i -style=file src/*.{cc,h} src/*/*.h
  fi
else
  echo "Skipping source formatting..."
fi
