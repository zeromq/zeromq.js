import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {Environment, createNodeEnv, napi} from "napi-wasm"

const ZMQ_PAIR = 0
const addonPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../examples/wasm/addon.wasm",
)

export async function loadWasm() {
  const processModule = await import("node:process")
  const {WASI} = await import("node:wasi")
  const wasm = await fs.readFile(addonPath)
  const wasi = new WASI({
    version: "preview1",
    args: processModule.argv,
    env: processModule.env,
  })
  const nodeEnv = createNodeEnv()
  try {
    const {instance} = await WebAssembly.instantiate(wasm, {
      ...wasi.getImportObject(),
      napi,
      env: nodeEnv,
    })
    nodeEnv.bind(instance)

    wasi.initialize(instance)
    const environment = new Environment(instance)
    return {environment, nodeEnv, wasi}
  } catch (error) {
    nodeEnv.dispose()
    throw error
  }
}

const {environment, nodeEnv} = await loadWasm()
const {version, Context, Socket} = environment.exports
assert.equal(typeof version, "string")
assert.equal(typeof Context, "function")
assert.equal(typeof Socket, "function")

const context = new Context()
const sockets = []
try {
  const address = `inproc://wasm-smoke-${process.pid}`
  const sender = new Socket(ZMQ_PAIR, {context})
  const receiver = new Socket(ZMQ_PAIR, {context})
  sockets.push(sender, receiver)

  await sender.bind(address)
  receiver.connect(address)

  const message = "zeromq wasm smoke"
  await sender.send(new TextEncoder().encode(message))
  const received = await receiver.receive()
  assert.equal(new TextDecoder().decode(received), message)

  console.log(`wasm smoke passed: ${version}`)
} finally {
  for (const socket of sockets) {
    socket.close()
  }
  environment.destroy()
  nodeEnv.dispose()
}
