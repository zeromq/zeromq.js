import {Environment, createNodeEnv, napi} from "napi-wasm"

const ZMQ_PAIR = 0

export async function loadWasm() {
  if (typeof window !== "undefined") {
    throw new Error("loadWasm() is only available in Node.js")
  }

  const fs = await import("node:fs/promises")
  const path = await import("node:path")
  const processModule = await import("node:process")
  const url = await import("node:url")
  const {WASI} = await import("node:wasi")

  const addonPath = path.resolve(
    path.dirname(url.fileURLToPath(import.meta.url)),
    "addon.wasm",
  )
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
    return {environment: new Environment(instance), nodeEnv}
  } catch (error) {
    nodeEnv.dispose()
    throw error
  }
}

async function runNodeRoundTrip(exports) {
  const {Context, Socket, version} = exports
  if (
    typeof version !== "string" ||
    typeof Context !== "function" ||
    typeof Socket !== "function"
  ) {
    throw new Error("WASM addon exports are incomplete")
  }

  const context = new Context()
  const sockets = []
  try {
    const address = `inproc://wasm-example-${Date.now()}`
    const sender = new Socket(ZMQ_PAIR, {context})
    const receiver = new Socket(ZMQ_PAIR, {context})
    sockets.push(sender, receiver)

    await sender.bind(address)
    receiver.connect(address)

    const message = "zeromq wasm example"
    await sender.send(new TextEncoder().encode(message))
    const received = await receiver.receive()
    if (new TextDecoder().decode(received) !== message) {
      throw new Error("WASM addon round trip returned the wrong message")
    }

    console.log(`wasm example passed: ${version}`)
  } finally {
    for (const socket of sockets) {
      socket.close()
    }
  }
}

async function mainNode() {
  if (typeof window !== "undefined") {
    return
  }

  const {environment, nodeEnv} = await loadWasm()
  try {
    await runNodeRoundTrip(environment.exports)
  } finally {
    environment.destroy()
    nodeEnv.dispose()
  }
}

async function mainWeb() {
  if (typeof window === "undefined") {
    return
  }

  const response = await fetch("./addon.wasm")
  if (!response.ok) {
    throw new Error(`Failed to fetch wasm: ${response.statusText}`)
  }
  const wasm = await response.arrayBuffer()
  const {instance} = await WebAssembly.instantiate(wasm, {
    napi,
    env: {},
  })
  const environment = new Environment(instance)
  try {
    console.log(environment.exports)
  } finally {
    environment.destroy()
  }
}

mainNode().catch(error => {
  throw error
})

mainWeb().catch(error => {
  throw error
})
