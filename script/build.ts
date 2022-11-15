import {dirname} from "path"
import {existsSync, writeFileSync} from "fs"
import {mkdir, cd, exec, find, mv} from "shelljs"

const root = dirname(__dirname)

function main() {
  const zmq_version = process.env.ZMQ_VERSION ?? "4.3.4"
  const src_url = `https://github.com/zeromq/libzmq/releases/download/v${zmq_version}/zeromq-${zmq_version}.tar.gz`
  const src_dir = `zeromq-${zmq_version}`
  const tarball = `zeromq-${zmq_version}.tar.gz`

  const CMAKE_BUILD_TYPE = process.argv[3] || "Release"

  let path_prefix: string
  let artifact: string
  let build_options: string = ""

  if (process.platform === "win32") {
    // Working directory is NAPI temporary build directory.
    path_prefix = `${root}/libzmq`
    artifact = `${path_prefix}/lib/libzmq.lib`

    // Handle x86 or x64 build
    if (process.arch === "ia32" || process.env.ARCH === "x86") {
      build_options += " -DCMAKE_GENERATOR_PLATFORM=x86"
    }
  } else {
    // Working directory is project root.
    path_prefix = `${root}/build/libzmq`
    artifact = `${path_prefix}/lib/libzmq.a`
    process.env.MACOSX_DEPLOYMENT_TARGET = "10.15"
  }

  mkdir("-p", path_prefix)
  cd(path_prefix)

  if (existsSync(artifact)) {
    console.log("Found previously built libzmq; skipping rebuild...")
  } else {
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
      console.log("Building libzmq (with draft support)...")
      build_options += " -DENABLE_DRAFTS=ON"
    } else {
      console.log("Building libzmq...")
    }

    // ClangFormat include causes issues but is not required to build.
    const clang_format_file = `${src_dir}/builds/cmake/Modules/ClangFormat.cmake`
    if (existsSync(clang_format_file)) {
      writeFileSync(clang_format_file, "")
    }

    exec(
      `cmake "${build_options}" -DCMAKE_INSTALL_PREFIX="${path_prefix}" -DCMAKE_INSTALL_LIBDIR=lib -DBUILD_STATIC=ON -DBUILD_TESTS=OFF -DBUILD_SHARED=OFF -DWITH_DOCS=OFF "${src_dir}"`,
    )

    if (process.platform === "win32") {
      exec(
        `cmake --build ./ --config ${CMAKE_BUILD_TYPE} --target install -- -verbosity:Minimal -maxcpucount`,
      )

      const build_file = find(`${path_prefix}/lib/*.lib`)[0]

      mv(build_file, `${path_prefix}/lib/libzmq.lib`)
    } else {
      exec(`cmake --build ./ --config ${CMAKE_BUILD_TYPE} --target install`)
    }
  }
}

main()
