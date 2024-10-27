#!/usr/bin/bash
set -ev
set -o pipefail

root="${PWD}"

echo "Pack zeromq.js if needed"
version=$(node -e 'console.log(require("./package.json").version)')
pack_name="zeromq-${version}.tgz"
test -f "./${pack_name}" || npm pack

package_managers=(npm pnpm yarn)

for pm in "${package_managers[@]}"; do
    dir="../zeromq-smoke-test-${pm}"

    echo "Init Smoke Test Project ${pm}"
    rm -rf "${dir}"
    mkdir "${dir}"
    cp "./${pack_name}" "${dir}"
    cd "${dir}"
    npm init -y
    npm pkg set dependencies.zeromq="file:./${pack_name}" || (jq ".dependencies.zeromq = \"file:./${pack_name}\"" package.json >temp.json && mv temp.json package.json)

    echo "Install with ${pm}"
    if [[ "${pm}" == "yarn" ]]; then
        yarn install --ignore-engines
    else
        ${pm} install
    fi

    echo "Require zeromq"
    node -e "console.log(require('zeromq'))"

    cd "${root}"
    rm -rf "../zeromq-smoke-test-${pm}"
done

rm -f "${pack_name}"
