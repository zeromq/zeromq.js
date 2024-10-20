import {dirname} from "path"
import {existsSync, writeFileSync} from "fs"
import {mkdir, cd, exec, find, mv} from "shelljs"
import {toBool, toString} from "./utils.js"

const root = dirname(__dirname)

type Options = {
  zmq_shared: boolean
  zmq_version: string
  zmq_draft: boolean
  zmq_build_type: string
  arch: string
  macosx_deployment_target?: string
}

function parseOptions(): Options {
  return {
    zmq_shared: toBool(process.env.npm_config_zmq_shared) ?? false,
    zmq_draft: toBool(process.env.npm_config_zmq_draft) ?? true,
    zmq_version:
      toString(process.env.npm_config_zmq_version) ??
      "5657b4586f24ec433930e8ece02ddba7afcf0fe0",
    zmq_build_type:
      toString(process.env.npm_config_zmq_build_type) ?? "Release",
    arch: toString(process.env.npm_config_arch) ?? process.arch,
    macosx_deployment_target:
      toString(process.env.npm_config_macosx_deployment_target) ?? "10.15",
  }
}

function main() {
  const opts = parseOptions()
  console.log("Building libzmq with options ", opts)

  if (opts.zmq_shared) {
    return
  }

  const src_url = `https://github.com/zeromq/libzmq/archive/${opts.zmq_version}.tar.gz`

  const libzmq_build_prefix = `${root}/build/libzmq-staging`
  const libzmq_install_prefix = `${root}/build/libzmq`

  const installed_artifact = `${libzmq_install_prefix}/lib/libzmq${
    process.platform === "win32" ? ".lib" : ".a"
  }`

  const src_dir = `libzmq-${opts.zmq_version}`
  const tarball = `libzmq-${opts.zmq_version}.tar.gz`

  let build_options: string = ""

  // https://cmake.org/cmake/help/latest/variable/CMAKE_MSVC_RUNTIME_LIBRARY.html
  if (process.platform === "win32") {
    if (opts.zmq_build_type !== "Debug") {
      build_options += " -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreadedDLL"
    } else {
      build_options += " -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreadedDebugDLL"
    }
  }

  build_options += archCMakeOptions(opts)

  if (process.platform === "darwin") {
    process.env.MACOSX_DEPLOYMENT_TARGET = opts.macosx_deployment_target
    build_options += ` -DCMAKE_OSX_DEPLOYMENT_TARGET=${opts.macosx_deployment_target}`
  }

  mkdir("-p", libzmq_build_prefix)
  cd(libzmq_build_prefix)

  if (existsSync(installed_artifact)) {
    console.log(
      `Skipping rebuild, found previously built libzmq at ${installed_artifact}`,
    )
    return
  }

  const execOptions = {fatal: true}

  if (existsSync(tarball)) {
    console.log("Found libzmq source; skipping download...")
  } else {
    console.log(`Downloading libzmq source from ${src_url}`)
    exec(`curl "${src_url}" -fsSL -o "${tarball}"`, execOptions)
  }

  if (!existsSync(src_dir)) {
    exec(`tar xzf "${tarball}"`, execOptions)
  }

  if (opts.zmq_draft) {
    console.log("Enabling draft support")
    build_options += " -DENABLE_DRAFTS=ON"
  }

  console.log(`Building libzmq ${opts.zmq_build_type}`)

  // ClangFormat include causes issues but is not required to build.
  const clang_format_file = `${src_dir}/builds/cmake/Modules/ClangFormat.cmake`
  if (existsSync(clang_format_file)) {
    writeFileSync(clang_format_file, "")
  }

  const cmake_configure = `cmake -S "${src_dir}" -B ./build ${build_options} -DCMAKE_BUILD_TYPE=${opts.zmq_build_type} -DCMAKE_INSTALL_PREFIX="${libzmq_install_prefix}" -DCMAKE_INSTALL_LIBDIR=lib -DBUILD_STATIC=ON -DBUILD_TESTS=OFF -DBUILD_SHARED=OFF -DWITH_DOCS=OFF -DWITH_LIBSODIUM=OFF`
  console.log(cmake_configure)
  exec(cmake_configure, execOptions)

  const cmake_build = `cmake --build ./build --config ${opts.zmq_build_type} --target install --parallel`
  console.log(cmake_build)
  exec(cmake_build, execOptions)

  if (process.platform === "win32") {
    // rename libzmq-v143-mt-s-4_3_4.lib to libzmq.lib
    const build_file = find(`${libzmq_install_prefix}/lib/*.lib`)[0]
    mv(build_file, `${libzmq_install_prefix}/lib/libzmq.lib`)
  }
}

main()

function archCMakeOptions(opts: Options) {
  const arch = opts.arch.toLowerCase()

  if (process.platform === "win32") {
    // CMAKE_GENERATOR_PLATFORM only supported on Windows
    // https://cmake.org/cmake/help/latest/variable/CMAKE_GENERATOR_PLATFORM.html

    switch (arch) {
      case "x86":
      case "ia32": {
        return " -DCMAKE_GENERATOR_PLATFORM=win32"
      }
      default: {
        return ` -DCMAKE_GENERATOR_PLATFORM=${arch.toUpperCase()}`
      }
    }
  }

  if (process.platform === "darwin") {
    // handle MacOS Arm
    switch (arch) {
      case "x64":
      case "x86_64": {
        return ""
      }
      case "arm64": {
        return ` -DCMAKE_OSX_ARCHITECTURES=${arch}`
      }
      default: {
        return ""
      }
    }
  }

  return ""
}
