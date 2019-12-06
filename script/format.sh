#!/bin/sh
if [ -z "$CI" ]; then
  if command -v clang-format >/dev/null; then
    echo "Formatting C++ source files..."
    clang-format -i -style=file src/*.{cc,h} src/*/*.h
  fi

  if command -v node_modules/.bin/eslint >/dev/null; then
    echo "Formatting TS source files..."
    node_modules/.bin/eslint --fix src/**/*.ts test/**/*.ts examples/**/*.ts
  fi
else
  if command -v node_modules/.bin/eslint >/dev/null; then
    node_modules/.bin/eslint src/**/*.ts test/**/*.ts examples/**/*.ts
  fi
fi
