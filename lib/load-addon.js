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
        const buildDir = path_1.default.resolve(__dirname, "..", "build");
        const manifest = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(buildDir, "manifest.json"), "utf-8"));
        // compatible addons (abi -> addon path)
        const compatibleAddons = {};
        const configs = Object.keys(manifest);
        for (const configStr of configs) {
            const config = JSON.parse(configStr);
            // check if the config is compatible with the current runtime
            if (config.os !== process.platform || config.arch !== process.arch) {
                continue;
            }
            const libc = detectLibc();
            if (config.libc !== libc) {
                continue;
            }
            const addonRelativePath = manifest[configStr];
            compatibleAddons[config.abi ?? 0] = path_1.default.resolve(buildDir, addonRelativePath);
        }
        // sort the compatible abis in descending order
        const compatibleAbis = Object.keys(compatibleAddons).sort((a, b) => {
            return Number.parseInt(b, 10) - Number.parseInt(a, 10);
        });
        // try each available addon ABI
        for (const abi of compatibleAbis) {
            const addonPath = compatibleAddons[abi];
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
/**
 * Detect the libc used by the runtime (from cmake-ts)
 */
function detectLibc() {
    if (process.platform === "linux") {
        if (fs_1.default.existsSync("/etc/alpine-release")) {
            return "musl";
        }
        return "glibc";
    }
    else if (process.platform === "darwin") {
        return "libc";
    }
    else if (process.platform === "win32") {
        return "msvc";
    }
    return "unknown";
}
const addon = findAddon();
exports.default = addon;
//# sourceMappingURL=load-addon.js.map