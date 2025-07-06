import {Environment, napi} from "napi-wasm"

async function main() {
  const response = await fetch("./addon.wasm")
  const bytes = await response.arrayBuffer()
  const {instance} = await WebAssembly.instantiate(
    bytes,
    {
      env: napi,
    },
  )

  // Create an environment.
  let env = new Environment(instance)
  let exports = env.exports

  console.log(exports)
}

main().catch(err => {
  throw err
})
