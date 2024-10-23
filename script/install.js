function cmakeTs() {
  const cp = require("child_process")

  // Run the build script to generate the addon.node file
  console.log(
    "Building addon node via cmake-ts (requires cmake, ninja, and the vcpkg dependencies)",
  )
  const cmakeTsPath = require.resolve("@aminya/cmake-ts/build/main.js")

  cp.execFileSync(process.execPath, [cmakeTsPath, "nativeonly"], {
    stdio: "inherit",
  })
}

function devWarn(message) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(message)
  }
}

function main() {
  if (process.env.npm_config_build_from_source === "true") {
    cmakeTs()
  } else {
    try {
      require("../lib/load-addon.js")
    } catch (error) {
      devWarn(error)
      cmakeTs()
    }
  }
}

main()
