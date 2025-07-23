import {Environment, napi} from "napi-wasm"

async function getWasm() {
  if (typeof window === "undefined") {
    // Nodejs
    const fs = await import("fs/promises")
    const path = await import("path")
    const url = await import("url")

    const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

    return (await fs.readFile(path.join(__dirname, "addon.wasm")))
  }

  // Browser
  const response = await fetch("./addon.wasm")
  if (!response.ok) {
    throw new Error(`Failed to fetch wasm: ${response.statusText}`)
  }
  return await response.arrayBuffer()
}

async function main() {
  const wasm = await getWasm()

  const {instance} = await WebAssembly.instantiate(wasm, {
    napi: napi,
    env: {} // The env imports will be provided by napi-wasm
  })

  // Create an environment.
  let env = new Environment(instance)
  let exports = env.exports

  console.log(exports)
}

main().catch(err => {
  throw err
})
