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

  cp.execFileSync(process.execPath, [cmakeTsPath, "build"], {
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
