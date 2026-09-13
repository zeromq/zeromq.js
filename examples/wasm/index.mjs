async function runNodeRoundTrip({Pair, version}) {
  if (typeof version !== "string" || typeof Pair !== "function") {
    throw new Error("WASM addon exports are incomplete")
  }

  const sockets = []
  try {
    const address = `inproc://wasm-example-${Date.now()}`
    const sender = new Pair()
    const receiver = new Pair()
    sockets.push(sender, receiver)

    await sender.bind(address)
    receiver.connect(address)

    const message = "zeromq wasm example"
    await sender.send(message)
    const [received] = await receiver.receive()
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

  await runNodeRoundTrip(await import("zeromq/wasm.mjs"))
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
  const {Environment, napi} = await import("napi-wasm")
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
