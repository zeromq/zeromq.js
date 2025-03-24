function cmakeTs() {
  const cp = require("child_process")

  // Run the build script to generate the addon.node file
  console.log(
    "Building addon node via cmake-ts (requires cmake, ninja, and the vcpkg dependencies)",
  )
  let cmakeTsPath = tryRequireResolve("cmake-ts/build/main.js")
  if (cmakeTsPath === undefined) {
    cmakeTsPath = tryRequireResolve("cmake-ts/build/main")
  }
  if (cmakeTsPath === undefined) {
    throw new Error(
      "Failed to find cmake-ts in cmake-ts/build/main.js or cmake-ts/build/main.js",
    )
  }

  // Default args
  let args = ["nativeonly"]

  if (process.arch !== process.env.npm_config_target_arch || process.env.cross_compiling === "true") {
    // cross-compilation
    if (process.platform === "win32") {
      if (process.env.npm_config_target_arch === "ia32") {
        args = ["named-configs", "windows-x86"]
      } else if (process.env.npm_config_target_arch === "arm64") {
        args = ["named-configs", "windows-arm64"]
      }
    }
  }

  cp.execFileSync(process.execPath, [cmakeTsPath, ...args], {
    stdio: "inherit",
  })
}

/**
 * Try to require resolve a path.
 * @param {string} path
 * @returns {string | undefined}
 */
function tryRequireResolve(path) {
  try {
    return require.resolve(path)
  } catch (error) {
    return undefined
  }
}

/**
 * Log a warning if the environment is not production.
 * @param {string} message
 */
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
