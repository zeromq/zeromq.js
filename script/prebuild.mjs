import { execaCommandSync } from "execa";
import * as buildUtils from "./utils.js";
const { toString } = buildUtils;
function parserOptions() {
    return {
        arch: toString(process.env.npm_config_arch) ?? process.arch,
    };
}
async function main() {
    const opts = parserOptions();
    console.log("Building distribution binary with options ", opts);
    const prebuildArch = getNodearch(opts);
    process.env.ARCH = prebuildArch;
    process.env.npm_config_arch = prebuildArch;
    process.env.npm_config_target_arch = prebuildArch;
    process.env.PREBUILD_arch = prebuildArch;
    // TODO test the triple feature
    if (typeof process.env.TRIPLE === "string") {
        const TRIPLE = process.env.TRIPLE;
        const GCC = process.env.GCC;
        process.env.CC = `${TRIPLE}-gcc-${GCC}`;
        process.env.CXX = `${TRIPLE}-g++-${GCC}`;
        const STRIP = `${TRIPLE}-strip`;
        process.env.PREBUILD_STRIP_BIN = STRIP;
        process.env.ZMQ_BUILD_OPTIONS = `--host=${TRIPLE}`;
    }
    // use the current node version to build the prebuild
    // If the distribution for that particular architecture is not available, updated your Node:
    // https://nodejs.org/dist/
    const nodeVersion = process.version.replace("v", "");
    let prebuildScript = `prebuildify --napi --arch=${prebuildArch} --strip --tag-libc -t ${nodeVersion}`;
    if (typeof process.env.ALPINE_CHROOT === "string") {
        prebuildScript = `/alpine/enter-chroot ${prebuildScript}`;
    }
    execaCommandSync(prebuildScript, {
        env: process.env,
        shell: true,
        windowsHide: true,
        stdio: "inherit",
        encoding: "utf8",
    });
}
main().catch(e => {
    throw e;
});
function getNodearch(opts) {
    switch (opts.arch) {
        case "x86": {
            return "ia32";
        }
        case "x86_64": {
            return "x64";
        }
        default: {
            return opts.arch;
        }
    }
}
//# sourceMappingURL=prebuild.mjs.map