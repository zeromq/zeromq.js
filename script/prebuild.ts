import {spawnSync} from "child_process"

main().catch(e => {
  throw e
})

async function main() {
  console.log("Building distribution binary...")

  const prebuildArch = getNodearch()

  if (typeof process.env.TRIPLE === "string") {
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

  // use the current node version to build the prebuild
  // If the distribution for that particular architecture is not available, updated your Node:
  // https://nodejs.org/dist/
  const nodeVersion = process.version.replace("v", "")

  let prebuildScript = `prebuildify --napi --arch=${prebuildArch} --strip --tag-libc -t ${nodeVersion}`

  if (typeof process.env.ALPINE_CHROOT === "string") {
    prebuildScript = `/alpine/enter-chroot ${prebuildScript}`
  }

  spawnSync(prebuildScript, {
    shell: true,
    stdio: "inherit",
    encoding: "utf8",
  })
}

function getNodearch(): string {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions
  const arch = process.env.ARCH || process.arch
  switch (arch) {
    case "x86": {
      return "ia32"
    }
    case "x86_64": {
      return "x64"
    }
    default: {
      return arch
    }
  }
}
