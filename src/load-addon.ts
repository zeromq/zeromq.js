import path from "path"
import fs from "fs"

function errStr(error: unknown) {
  return error instanceof Error
    ? `${error.name}: ${error.message}\n${error.stack}`
    : String(error)
}

function devWarn(message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(message)
  }
}

function findAddon(): any | undefined {
  let addon: undefined | any = undefined
  try {
    const buildDir = path.resolve(__dirname, "..", "build")

    const manifest = JSON.parse(
      fs.readFileSync(path.resolve(buildDir, "manifest.json"), "utf-8"),
    ) as Record<string, string>

    // compatible addons (abi -> addon path)
    const compatibleAddons: Record<string, string> = {}

    const configs = Object.keys(manifest)
    for (const configStr of configs) {
      const config = JSON.parse(configStr) as BuildConfiguration

      // check if the config is compatible with the current runtime
      if (config.os !== process.platform || config.arch !== process.arch) {
        continue
      }
      const libc = detectLibc()
      if (config.libc !== libc) {
        continue
      }

      const addonRelativePath = manifest[configStr]
      compatibleAddons[config.abi ?? 0] = path.resolve(
        buildDir,
        addonRelativePath,
      )
    }

    // sort the compatible abis in descending order
    const compatibleAbis = Object.keys(compatibleAddons).sort((a, b) => {
      return Number.parseInt(b, 10) - Number.parseInt(a, 10)
    })

    // try each available addon ABI
    for (const abi of compatibleAbis) {
      const addonPath = compatibleAddons[abi]
      try {
        addon = require(addonPath)
        break
      } catch (err) {
        if (fs.existsSync(addonPath)) {
          devWarn(
            `Failed to load addon at ${addonPath}: ${errStr(err)}\nTrying others...`,
          )
        } else {
          devWarn(`No addon.node found in ${addonPath}\nTrying others...`)
        }
      }
    }
  } catch (err) {
    throw new Error(`Failed to load zeromq.js addon.node: ${errStr(err)}`)
  }

  if (addon === undefined) {
    throw new Error("No compatible zeromq.js addon found")
  }

  return addon
}

/**
 * Build configuration (from cmake-ts)
 */
type BuildConfiguration = {
  name: string
  dev: boolean
  os: typeof process.platform
  arch: typeof process.arch
  runtime: string
  runtimeVersion: string
  toolchainFile: string | null
  CMakeOptions?: {name: string; value: string}[]
  addonSubdirectory: string
  // list of additional definitions to fixup node quirks for some specific versions
  additionalDefines: string[]
  /** The ABI number that is used by the runtime. */
  abi?: number
  /** The libc that is used by the runtime. */
  libc?: string
}

/**
 * Detect the libc used by the runtime (from cmake-ts)
 */
function detectLibc() {
  if (process.platform === "linux") {
    if (fs.existsSync("/etc/alpine-release")) {
      return "musl"
    }
    return "glibc"
  } else if (process.platform === "darwin") {
    return "libc"
  } else if (process.platform === "win32") {
    return "msvc"
  }
  return "unknown"
}

const addon = findAddon()
export default addon
