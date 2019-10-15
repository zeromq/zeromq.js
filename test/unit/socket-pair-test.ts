import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} pair/pair`, function() {
    let sockA: zmq.Dealer
    let sockB: zmq.Dealer

    beforeEach(function() {
      sockA = new zmq.Dealer
      sockB = new zmq.Dealer
    })

    afterEach(function() {
      sockA.close()
      sockB.close()
      global.gc()
    })

    describe("send/receive", function() {
      it("should deliver messages", async function() {
        /* PAIR  -> foo ->  PAIR
           [A]   -> bar ->  [B]
                 -> baz ->  responds when received
                 -> qux ->
                 <- foo <-
                 <- bar <-
                 <- baz <-
                 <- qux <-
         */

        const address = uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const received: string[] = []

        await sockA.bind(address)
        await sockB.connect(address)

        const echo = async () => {
          for await (const msg of sockB) {
            await sockB.send(msg)
          }
        }

        const send = async () => {
          for (const msg of messages) {
            await sockA.send(msg)
          }

          for await (const msg of sockA) {
            received.push(msg.toString())
            if (received.length === messages.length) break
          }

          sockB.close()
        }

        await Promise.all([echo(), send()])
        assert.deepEqual(received, messages)
      })
    })
  })
}
