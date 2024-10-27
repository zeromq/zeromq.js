#!/usr/bin/bash
set -ev
set -o pipefail

root="${PWD}"

echo "Pack zeromq.js if needed"
version=$(node -e 'console.log(require("./package.json").version)')
pack_path="${root}/zeromq-${version}.tgz"
test -f "${pack_path}" || npm pack


init_smoke_test() {
    local pm=$1
    echo "Init Smoke Test Project ${pm}"

    rm -rf "../zeromq-smoke-test-${pm}"
    mkdir "../zeromq-smoke-test-${pm}"
    cd "../zeromq-smoke-test-${pm}"
    npm init -y
    npm pkg set dependencies.zeromq="file:${pack_path}" || (jq ".dependencies.zeromq = \"file:${pack_path}\"" package.json >temp.json && mv temp.json package.json)
}

package_managers=(npm pnpm yarn)

for pm in "${package_managers[@]}"; do
    init_smoke_test "${pm}"

    echo "Install with ${pm}"
    ${pm} install

    echo "Require zeromq"
    node -e "console.log(require('zeromq'))"

    cd "${root}"
    rm -rf "../zeromq-smoke-test-${pm}"
done

rm -f "${pack_path}"
