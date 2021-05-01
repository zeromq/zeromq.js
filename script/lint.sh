#!/bin/sh
if [ -z "$CI" ]; then
  if command -v clang-format >/dev/null; then
    echo "Clang-format..."
    clang-format -i -style=file src/*.{cc,h} src/*/*.h
  fi

  if command -v node_modules/.bin/eslint >/dev/null; then
    echo "Eslint..."
    node_modules/.bin/eslint --fix .
  fi
else
  if command -v node_modules/.bin/eslint >/dev/null; then
    echo "Eslint..."
    node_modules/.bin/eslint --fix .
  fi
fi
