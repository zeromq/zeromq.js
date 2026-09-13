import assert from "node:assert/strict"
import {createRequire} from "node:module"
import * as zmq from "../wasm.mjs"

const require = createRequire(import.meta.url)
assert.equal(
  require.cache[require.resolve("../lib/load-addon.js")],
  undefined,
  "the WASM entry must not load the native addon",
)

const {version, Pair} = zmq
assert.equal(typeof version, "string")
assert.equal(typeof Pair, "function")

const sockets = []
try {
  const address = `inproc://wasm-smoke-${process.pid}`
  const sender = new Pair()
  const receiver = new Pair()
  sockets.push(sender, receiver)

  await sender.bind(address)
  receiver.connect(address)

  const message = "zeromq wasm smoke"
  await sender.send(message)
  const [received] = await receiver.receive()
  assert.equal(new TextDecoder().decode(received), message)

  console.log(`wasm smoke passed: ${version}`)
} finally {
  for (const socket of sockets) {
    socket.close()
  }
}
