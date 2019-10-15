#!/bin/sh
set -e

# Prepare for packaging.
yarn ci:compile
node script/ci/download.js

# Generate & publish documentation.
yarn ci:doc
cd docs
git init
git add .
git commit -m "Deploy documentation for ${TRAVIS_TAG:-latest}."
git push --force --quiet "https://${GITHUB_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git" master:gh-pages
