import {describe, it, beforeEach, afterEach, before, after} from "mocha"
import {assert} from "chai"

import * as semver from "semver"

import * as zmq from "../../src"
import type {Proto} from "./helpers"
import {cleanSocket, uniqAddress} from "./helpers"
import {workerData} from "worker_threads"

async function testProxyRouterDealer(proto: Proto) {
  /* ZMQ < 4.0.5 has no steerable proxy support. */
  if (semver.satisfies(zmq.version, "< 4.0.5")) {
    return
  }

  const proxy = new zmq.Proxy(new zmq.Router(), new zmq.Dealer())

  const frontAddress = await uniqAddress(proto)
  const backAddress = await uniqAddress(proto)

  const req = new zmq.Request()
  const rep = new zmq.Reply()

  try {
    /* REQ  -> foo ->  ROUTER <-> DEALER  -> foo ->  REP
          <- foo <-                     <- foo <-
          -> bar ->                     -> bar ->
          <- bar <-                     <- bar <-
                           pause
                           resume
          -> baz ->                     -> baz ->
          <- baz <-                     <- baz <-
          -> qux ->                     -> qux ->
          <- qux <-                     <- qux <-
   */
    await proxy.frontEnd.bind(frontAddress)
    await proxy.backEnd.bind(backAddress)

    const done = proxy.run()

    const messages = ["foo", "bar", "baz", "qux"]
    const received: string[] = []

    await req.connect(frontAddress)
    await rep.connect(backAddress)

    const echo = async () => {
      for await (const msg of rep) {
        await rep.send(msg)
      }
    }

    const send = async () => {
      for (const msg of messages) {
        if (received.length === 2) {
          proxy.pause()
          proxy.resume()
        }

        await req.send(Buffer.from(msg))

        const [res] = await req.receive()
        received.push(res.toString())
        if (received.length === messages.length) {
          break
        }
      }

      rep.close()
    }

    console.log(`waiting for messages for proxy with ${proto} router/dealer...`)

    await Promise.all([echo(), send()])
    assert.deepEqual(received, messages)

    proxy.terminate()
    await done
    console.log(`Done proxying with ${proto} router/dealer`)
  } catch (err) {
    /* Closing proxy sockets is only necessary if run() fails. */
    proxy.frontEnd.close()
    proxy.backEnd.close()
    throw err
  } finally {
    req.close()
    rep.close()
    global.gc?.()
    await Promise.all([cleanSocket(frontAddress), cleanSocket(backAddress)])
  }
}

// Receive the proto from the main thread
testProxyRouterDealer(workerData.proto as Proto).catch(err => {
  console.error(
    `Error testing proxy with ${workerData.proto} router/dealer:`,
    err,
  )
  process.exit(1)
})
