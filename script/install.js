try {
    require("../lib/load-addon.js")
} catch (error) {
    const cp = require("child_process")

    console.error("Failed to load ZMQ addon:", error)

    // Run the build script to generate the addon.node file
    console.log("Building addon node via cmake-ts (requires cmake, ninja, and the vcpkg dependencies)")
    const cmakeTsPath = require.resolve("cmake-ts/build/main.js")

    cp.execFileSync(
        "node", [cmakeTsPath, "nativeonly"],
        { stdio: "inherit" },
    )
}
