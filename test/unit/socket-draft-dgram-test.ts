import * as zmq from "../../src"
import * as draft from "../../src/draft"

import {assert} from "chai"
import {createSocket} from "dgram"
import {testProtos, uniqAddress} from "./helpers"

if (zmq.capability.draft) {
  for (const proto of testProtos("udp")) {
    describe(`draft socket with ${proto} dgram`, function () {
      let dgram: draft.Datagram

      beforeEach(function () {
        dgram = new draft.Datagram()
      })

      afterEach(function () {
        dgram.close()
        global.gc?.()
      })

      describe("send/receive", function () {
        it("should deliver messages", async function () {
          const messages = ["foo", "bar", "baz", "qux"]
          const address = uniqAddress(proto)
          const port = parseInt(address.split(":").pop()!, 10)

          await dgram.bind(address)

          const echo = async () => {
            for await (const [id, msg] of dgram) {
              await dgram.send([id, msg])
            }
          }

          const received: string[] = []
          const send = async () => {
            for (const msg of messages) {
              const client = createSocket("udp4")
              await new Promise(resolve => {
                client.on("message", res => {
                  received.push(res.toString())
                  client.close()
                  resolve(undefined)
                })

                client.send(msg, port, "localhost")
              })
            }

            dgram.close()
          }

          await Promise.all([echo(), send()])
          assert.deepEqual(received, messages)
        })
      })
    })
  }
} else {
  if (process.env.ZMQ_DRAFT === "true") {
    throw new Error("Draft API requested but not available at runtime.")
  }
}
