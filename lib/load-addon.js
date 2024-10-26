"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function errStr(error) {
    return error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack}`
        : String(error);
}
function devWarn(message) {
    if (process.env.NODE_ENV !== "production") {
        console.warn(message);
    }
}
function findAddon() {
    let addon = undefined;
    try {
        const addonParentDir = path_1.default.resolve(path_1.default.join(__dirname, "..", "build", process.platform, process.arch, "node"));
        const addOnAbiDirs = fs_1.default.readdirSync(addonParentDir).sort((a, b) => {
            return Number.parseInt(b, 10) - Number.parseInt(a, 10);
        });
        // try each available addon ABI
        for (const addOnAbiDir of addOnAbiDirs) {
            const addonPath = path_1.default.join(addonParentDir, addOnAbiDir, "addon.node");
            try {
                addon = require(addonPath);
                break;
            }
            catch (err) {
                if (fs_1.default.existsSync(addonPath)) {
                    devWarn(`Failed to load addon at ${addonPath}: ${errStr(err)}\nTrying others...`);
                }
                else {
                    devWarn(`No addon.node found in ${addonPath}\nTrying others...`);
                }
            }
        }
    }
    catch (err) {
        throw new Error(`Failed to load zeromq.js addon.node: ${errStr(err)}`);
    }
    if (addon === undefined) {
        throw new Error("No compatible zeromq.js addon found");
    }
    return addon;
}
const addon = findAddon();
exports.default = addon;
//# sourceMappingURL=load-addon.js.map