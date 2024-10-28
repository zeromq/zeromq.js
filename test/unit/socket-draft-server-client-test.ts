import * as zmq from "../../src/index.js"
import * as draft from "../../src/draft.js"

import {
  assert,
  describe,
  it,
  beforeEach,
  beforeAll,
  afterEach,
  afterAll,
} from "vitest"
import {testProtos, uniqAddress} from "./helpers.js"
import {isFullError} from "../../src/errors.js"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`draft socket with ${proto} server/client`, function () {
    if (zmq.capability.draft !== true) {
      if (process.env.ZMQ_DRAFT === "true") {
        throw new Error("Draft API requested but not available at runtime.")
      }
      return
    }

    let server: draft.Server
    let clientA: draft.Client
    let clientB: draft.Client

    beforeEach(function () {
      server = new draft.Server()
      clientA = new draft.Client()
      clientB = new draft.Client()
    })

    afterEach(function () {
      server.close()
      clientA.close()
      clientB.close()
      global.gc?.()
    })

    describe("send/receive", function () {
      it("should deliver messages", async function () {
        const address = await uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const receivedA: string[] = []
        const receivedB: string[] = []

        await server.bind(address)
        clientA.connect(address)
        clientB.connect(address)

        const echo = async () => {
          for await (const [msg, {routingId}] of server) {
            assert.typeOf(routingId, "number")
            await server.send(msg, {routingId})
          }
        }

        const send = async () => {
          for (const msg of messages) {
            await clientA.send(msg)
            await clientB.send(msg)
          }

          for await (const msg of clientA) {
            receivedA.push(msg.toString())
            if (receivedA.length === messages.length) {
              break
            }
          }

          for await (const msg of clientB) {
            receivedB.push(msg.toString())
            if (receivedB.length === messages.length) {
              break
            }
          }

          server.close()
        }

        await Promise.all([echo(), send()])
        assert.deepEqual(receivedA, messages)
        assert.deepEqual(receivedB, messages)
      })

      it("should fail with unroutable message", async function () {
        try {
          await server.send("foo", {routingId: 12345})
          assert.ok(false)
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }

          assert.equal(err.message, "Host unreachable")
          assert.equal(err.code, "EHOSTUNREACH")
          assert.typeOf(err.errno, "number")
        }
      })
    })
  })
}
