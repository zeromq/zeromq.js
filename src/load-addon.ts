import path from "path"
import fs from "fs"

const addonParentDir = path.join(
    __dirname,
    "..",
    "build",
    process.platform,
    process.arch,
    "node",
)
const addOnAbiDirs = fs.readdirSync(addonParentDir)
    .sort((a, b) => {
        return Number.parseInt(b, 10) - Number.parseInt(a, 10)
    })

let addon: undefined | any
// try each available addon ABI
for (const addOnAbiDir of addOnAbiDirs) {
    const addonPath = path.join(addonParentDir, addOnAbiDir, "addon.node")
    try {
        addon = require(addonPath)
    } catch (err) {
        console.error(`Failed to load addon at ${addonPath}: ${err}\nTrying others...`)
    }
}

if (addon === undefined) {
    throw new Error(`No compatible addon found in ${addonParentDir} folder. Please build addon with 'npm run build'`)
}

module.exports = addon
