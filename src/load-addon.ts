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
    const addonParentDir = path.resolve(
      path.join(
        __dirname,
        "..",
        "build",
        process.platform,
        process.arch,
        "node",
      ),
    )
    const addOnAbiDirs = fs.readdirSync(addonParentDir).sort((a, b) => {
      return Number.parseInt(b, 10) - Number.parseInt(a, 10)
    })

    // try each available addon ABI
    for (const addOnAbiDir of addOnAbiDirs) {
      const addonPath = path.join(addonParentDir, addOnAbiDir, "addon.node")
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

const addon = findAddon()
export default addon
