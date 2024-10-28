import * as zmq from "../../src/index.js"

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

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} push/pull`, function () {
    let push: zmq.Push
    let pull: zmq.Pull

    beforeEach(function () {
      push = new zmq.Push()
      pull = new zmq.Pull()
    })

    afterEach(function () {
      push.close()
      pull.close()
      global.gc?.()
    })

    describe("send/receive", function () {
      it("should deliver messages", async function () {
        /* PUSH  -> foo ->  PULL
                 -> bar ->
                 -> baz ->
                 -> qux ->
         */

        const address = await uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const received: string[] = []

        await pull.bind(address)
        await push.connect(address)

        for (const msg of messages) {
          await push.send(msg)
        }

        for await (const [msg] of pull) {
          assert.instanceOf(msg, Buffer)
          received.push(msg.toString())
          if (received.length === messages.length) {
            break
          }
        }

        assert.deepEqual(received, messages)
      })

      if (proto !== "inproc") {
        it("should deliver messages with immediate", async function () {
          const address = await uniqAddress(proto)
          const messages = ["foo", "bar", "baz", "qux"]
          const received: string[] = []

          await pull.bind(address)

          push.immediate = true
          await push.connect(address)

          /* Never connected, without immediate: true it would cause lost msgs. */
          await push.connect(await uniqAddress(proto))

          for (const msg of messages) {
            await push.send(msg)
          }

          for await (const [msg] of pull) {
            assert.instanceOf(msg, Buffer)
            received.push(msg.toString())
            if (received.length === messages.length) {
              break
            }
          }

          assert.deepEqual(received, messages)
        })
      }
    })
  })
}
