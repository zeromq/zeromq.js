#!/usr/bin/bash
set -ev
set -o pipefail

echo "Pack zeromq.js if needed"
version=$(node -e 'console.log(require("./package.json").version)')
pack_name="zeromq-${version}.tgz"
test -f "${pack_name}" || npm pack

init_smoke_test() {
    local pm=$1
    echo "Init Smoke Test Project ${pm}"

    rm -rf "./smoke-test-${pm}"
    mkdir "./smoke-test-${pm}"
    cd "./smoke-test-${pm}"
    npm init -q --init-module "smoke-test-${pm}" -y
    npm pkg set dependencies.zeromq="file:../${pack_name}"
}

package_managers=(npm pnpm yarn)

for pm in "${package_managers[@]}"; do
    init_smoke_test "${pm}"

    echo "Install with ${pm}"
    ${pm} install

    ls -R ./node_modules/zeromq

    echo "Require zeromq"
    node -e "console.log(require('zeromq'))"

    cd ../
    rm -rf "./smoke-test-${pm}"
done

rm -f "${pack_name}"
