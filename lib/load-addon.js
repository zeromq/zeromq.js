"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function findAddon() {
    try {
        const addonParentDir = path_1.default.join(__dirname, "..", "build", process.platform, process.arch, "node");
        const addOnAbiDirs = fs_1.default.readdirSync(addonParentDir).sort((a, b) => {
            return Number.parseInt(b, 10) - Number.parseInt(a, 10);
        });
        // try each available addon ABI
        let addon;
        for (const addOnAbiDir of addOnAbiDirs) {
            const addonPath = path_1.default.join(addonParentDir, addOnAbiDir, "addon.node");
            try {
                addon = require(addonPath);
                break;
            }
            catch (err) {
                console.error(`Failed to load addon at ${addonPath}: ${err}\nTrying others...`);
            }
        }
        if (addon === undefined) {
            throw new Error(`No compatible zeromq.js addon found in ${addonParentDir} folder`);
        }
        return addon;
    }
    catch (err) {
        throw new Error(`Failed to load zeromq.js addon.node: ${err}`);
    }
}
module.exports = findAddon();
//# sourceMappingURL=load-addon.js.map