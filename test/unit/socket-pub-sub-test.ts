import {describe, it, beforeEach, afterEach, before, after} from "mocha"
import {assert} from "chai"

import * as zmq from "../../src"

import {testProtos, uniqAddress} from "./helpers"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} pub/sub`, function () {
    let pub: zmq.Publisher
    let sub: zmq.Subscriber

    beforeEach(function () {
      pub = new zmq.Publisher()
      sub = new zmq.Subscriber()
    })

    afterEach(function () {
      pub.close()
      sub.close()
      global.gc?.()
    })

    describe("send/receive", function () {
      it("should deliver messages", async function () {
        /* PUB  -> foo ->  SUB
                -> bar ->  subscribed to all
                -> baz ->
                -> qux ->
         */

        const address = await uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const received: string[] = []

        /* Subscribe to all. */
        sub.subscribe()

        await sub.bind(address)
        await pub.connect(address)

        const send = async () => {
          /* Wait briefly before publishing to avoid slow joiner syndrome. */
          await new Promise(resolve => {
            setTimeout(resolve, 25)
          })
          for (const msg of messages) {
            await pub.send(msg)
          }
        }

        const receive = async () => {
          for await (const [msg] of sub) {
            assert.instanceOf(msg, Buffer)
            received.push(msg.toString())
            if (received.length === messages.length) {
              break
            }
          }
        }

        await Promise.all([send(), receive()])
        assert.deepEqual(received, messages)
      })
    })

    describe("subscribe/unsubscribe", function () {
      it("should filter messages", async function () {
        /* PUB  -> foo -X  SUB
                -> bar ->  subscribed to "ba"
                -> baz ->
                -> qux -X
         */

        const address = await uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const received: string[] = []

        sub.subscribe("fo", "ba", "qu")
        sub.unsubscribe("fo", "qu")

        await sub.bind(address)
        await pub.connect(address)

        const send = async () => {
          /* Wait briefly before publishing to avoid slow joiner syndrome. */
          await new Promise(resolve => {
            setTimeout(resolve, 25)
          })
          for (const msg of messages) {
            await pub.send(msg)
          }
        }

        const receive = async () => {
          for await (const [msg] of sub) {
            assert.instanceOf(msg, Buffer)
            received.push(msg.toString())
            if (received.length === 2) {
              break
            }
          }
        }

        await Promise.all([send(), receive()])
        assert.deepEqual(received, ["bar", "baz"])
      })
    })
  })
}
