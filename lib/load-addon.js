"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const addonParentDir = path_1.default.join(__dirname, "..", "build", process.platform, process.arch, "node");
const addOnAbiDirs = fs_1.default.readdirSync(addonParentDir);
let addon;
// try each available addon ABI
for (const addOnAbiDir of addOnAbiDirs) {
    const addonPath = path_1.default.join(addonParentDir, addOnAbiDir, "addon.node");
    try {
        addon = require(addonPath);
    }
    catch (err) {
        console.error(`Failed to load addon at ${addonPath}: ${err}\nTrying others...`);
    }
}
if (addon === undefined) {
    throw new Error(`No compatible addon found in ${addonParentDir} folder. Please build addon with 'npm run build'`);
}
module.exports = addon;
//# sourceMappingURL=load-addon.js.map