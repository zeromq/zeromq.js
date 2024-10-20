import path from "path"
import fs from "fs"

function findAddon(): any | undefined {
  try {
    const addonParentDir = path.join(
      __dirname,
      "..",
      "build",
      process.platform,
      process.arch,
      "node",
    )
    const addOnAbiDirs = fs.readdirSync(addonParentDir).sort((a, b) => {
      return Number.parseInt(b, 10) - Number.parseInt(a, 10)
    })

    // try each available addon ABI
    let addon: undefined | any
    for (const addOnAbiDir of addOnAbiDirs) {
      const addonPath = path.join(addonParentDir, addOnAbiDir, "addon.node")
      try {
        addon = require(addonPath)
        break
      } catch (err) {
        console.error(
          `Failed to load addon at ${addonPath}: ${err}\nTrying others...`,
        )
      }
    }

    if (addon === undefined) {
      throw new Error(
        `No compatible zeromq.js addon found in ${addonParentDir} folder`,
      )
    }

    return addon
  } catch (err) {
    throw new Error(`Failed to load zeromq.js addon.node: ${err}`)
  }
}

module.exports = findAddon()
