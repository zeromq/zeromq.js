/* eslint-disable @typescript-eslint/camelcase */

import {spawnSync} from "child_process"

main().catch(e => {
  throw e
})

async function main() {
  console.log("Building distribution binary...")

  const prebuildArch = getNodearch(process.env.ARCH)

  if (process.env.TRIPLE) {
    const TRIPLE = process.env.TRIPLE

    const GCC = process.env.GCC
    process.env.CC = `${TRIPLE}-gcc-${GCC}`
    process.env.CXX = `${TRIPLE}-g++-${GCC}`

    const STRIP = `${TRIPLE}-strip`
    process.env.PREBUILD_STRIP_BIN = STRIP

    process.env.npm_config_arch = prebuildArch
    process.env.npm_config_target_arch = prebuildArch
    process.env.PREBUILD_arch = prebuildArch

    process.env.ZMQ_BUILD_OPTIONS = `--host=${TRIPLE}`
  }

  let prebuildScript = `prebuildify --napi --arch=${prebuildArch} -t 12.0.0 -t electron@9.4.4 --strip --tag-libc`

  if (process.env.ALPINE_CHROOT) {
    prebuildScript = `/alpine/enter-chroot ${prebuildScript}`
  }

  spawnSync(prebuildScript, {
    shell: true,
    stdio: "inherit",
    encoding: "utf8",
  })
}

function getNodearch(arch: string | undefined): string {
  if (!arch) {
    return process.arch
  }
  if (arch === "x86") {
    return "ia32"
  } else {
    return arch
  }
}
