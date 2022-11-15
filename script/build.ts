import {dirname} from "path"
import {existsSync, writeFileSync} from "fs"
import {mkdir, cd, exec, find, mv} from "shelljs"

const root = dirname(__dirname)

function main() {
  const zmq_version = process.env.ZMQ_VERSION ?? "4.3.4"
  const src_url = `https://github.com/zeromq/libzmq/releases/download/v${zmq_version}/zeromq-${zmq_version}.tar.gz`

  const libzmq_build_prefix = `${root}/build/libzmq-staging`
  const libzmq_install_prefix = `${root}/build/libzmq`

  const artifact = `${libzmq_build_prefix}/lib/libzmq.${
    process.platform === "win32" ? ".lib" : ".a"
  }`

  const src_dir = `zeromq-${zmq_version}`
  const tarball = `zeromq-${zmq_version}.tar.gz`

  const CMAKE_BUILD_TYPE = process.env.CMAKE_BUILD_TYPE ?? "Release"

  let build_options: string = ""

  // https://cmake.org/cmake/help/latest/variable/CMAKE_MSVC_RUNTIME_LIBRARY.html
  if (process.platform === "win32") {
    if (CMAKE_BUILD_TYPE !== "Debug") {
      build_options += " -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreadedDLL"
    } else {
      build_options += " -DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreadedDebugDLL"
    }
  }

  // Handle x86
  if (process.arch === "ia32" || process.env.ARCH === "x86") {
    build_options += " -DCMAKE_GENERATOR_PLATFORM=x86"
  }

  if (process.platform === "darwin") {
    process.env.MACOSX_DEPLOYMENT_TARGET = "10.15"
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
    console.log("Downloading libzmq source...")
    exec(`curl "${src_url}" -fsSL -o "${tarball}"`)
  }

  if (!existsSync(src_dir)) {
    exec(`tar xzf "${tarball}"`)
  }

  if (process.env.npm_config_zmq_draft === "true") {
    console.log("Enabling draft support")
    build_options += " -DENABLE_DRAFTS=ON"
  }

  console.log(`Building libzmq ${CMAKE_BUILD_TYPE}`)

  // ClangFormat include causes issues but is not required to build.
  const clang_format_file = `${src_dir}/builds/cmake/Modules/ClangFormat.cmake`
  if (existsSync(clang_format_file)) {
    writeFileSync(clang_format_file, "")
  }

  exec(
    `cmake -S "${src_dir}" -B ./build ${build_options} -DCMAKE_BUILD_TYPE=${CMAKE_BUILD_TYPE} -DCMAKE_INSTALL_PREFIX="${libzmq_install_prefix}" -DCMAKE_INSTALL_LIBDIR=lib -DBUILD_STATIC=ON -DBUILD_TESTS=OFF -DBUILD_SHARED=OFF -DWITH_DOCS=OFF`,
  )

  exec(`cmake --build ./build --config ${CMAKE_BUILD_TYPE} --target install`)

  if (process.platform === "win32") {
    // rename libzmq-v143-mt-s-4_3_4.lib to libzmq.lib
    const build_file = find(`${libzmq_install_prefix}/lib/*.lib`)[0]
    mv(build_file, `${libzmq_install_prefix}/lib/libzmq.lib`)
  }
}

main()
