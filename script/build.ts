import {dirname} from "path"
import {existsSync, writeFileSync} from "fs"
import {mkdir, cd, exec, find, mv} from "shelljs"

const root = dirname(__dirname)

function main() {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions
  const zmq_version = process.env.ZMQ_VERSION || "4.3.4"
  const src_url = `https://github.com/zeromq/libzmq/releases/download/v${zmq_version}/zeromq-${zmq_version}.tar.gz`

  const libzmq_build_prefix = `${root}/build/libzmq-staging`
  const libzmq_install_prefix = `${root}/build/libzmq`

  const artifact = `${libzmq_build_prefix}/lib/libzmq.${
    process.platform === "win32" ? ".lib" : ".a"
  }`

  const src_dir = `zeromq-${zmq_version}`
  const tarball = `zeromq-${zmq_version}.tar.gz`

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions
  const CMAKE_BUILD_TYPE = process.env.CMAKE_BUILD_TYPE || "Release"

  let build_options: string = ""

  // https://cmake.org/cmake/help/latest/variable/CMAKE_MSVC_RUNTIME_LIBRARY.html
  if (process.platform === "win32") {
    if (CMAKE_BUILD_TYPE !== "Debug") {
      build_options += " -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreadedDLL"
    } else {
      build_options += " -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreadedDebugDLL"
    }
  }

  build_options += archCMakeOptions()

  if (process.platform === "darwin") {
    const MACOSX_DEPLOYMENT_TARGET = "10.15"
    process.env.MACOSX_DEPLOYMENT_TARGET = MACOSX_DEPLOYMENT_TARGET
    build_options += ` -DCMAKE_OSX_DEPLOYMENT_TARGET=${MACOSX_DEPLOYMENT_TARGET}`
  }

  mkdir("-p", libzmq_build_prefix)
  cd(libzmq_build_prefix)

  if (existsSync(artifact)) {
    console.log("Found previously built libzmq; skipping rebuild...")
    return
  }

  if (existsSync(tarball)) {
    console.log("Found libzmq source; skipping download...")
  } else {
    console.log(`Downloading libzmq source from ${src_url}`)
    exec(`curl "${src_url}" -fsSL -o "${tarball}"`)
  }

  if (!existsSync(src_dir)) {
    exec(`tar xzf "${tarball}"`)
  }

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions
  if (process.env.ZMQ_DRAFT) {
    console.log("Enabling draft support")
    build_options += " -DENABLE_DRAFTS=ON"
  }

  console.log(`Building libzmq ${CMAKE_BUILD_TYPE}`)

  // ClangFormat include causes issues but is not required to build.
  const clang_format_file = `${src_dir}/builds/cmake/Modules/ClangFormat.cmake`
  if (existsSync(clang_format_file)) {
    writeFileSync(clang_format_file, "")
  }

  const cmake_configure = `cmake -S "${src_dir}" -B ./build ${build_options} -DCMAKE_BUILD_TYPE=${CMAKE_BUILD_TYPE} -DCMAKE_INSTALL_PREFIX="${libzmq_install_prefix}" -DCMAKE_INSTALL_LIBDIR=lib -DBUILD_STATIC=ON -DBUILD_TESTS=OFF -DBUILD_SHARED=OFF -DWITH_DOCS=OFF`
  console.log(cmake_configure)
  exec(cmake_configure)

  const cmake_build = `cmake --build ./build --config ${CMAKE_BUILD_TYPE} --target install`
  console.log(cmake_build)
  exec(cmake_build)

  if (process.platform === "win32") {
    // rename libzmq-v143-mt-s-4_3_4.lib to libzmq.lib
    const build_file = find(`${libzmq_install_prefix}/lib/*.lib`)[0]
    mv(build_file, `${libzmq_install_prefix}/lib/libzmq.lib`)
  }
}

main()

function archCMakeOptions() {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions
  const arch = (process.env.ARCH || process.arch).toLowerCase()

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
