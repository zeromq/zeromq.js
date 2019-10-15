import * as semver from "semver"
import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} router/dealer`, function() {
    let router: zmq.Router
    let dealerA: zmq.Dealer
    let dealerB: zmq.Dealer

    beforeEach(function() {
      router = new zmq.Router
      dealerA = new zmq.Dealer
      dealerB = new zmq.Dealer
    })

    afterEach(function() {
      router.close()
      dealerA.close()
      dealerB.close()
      global.gc()
    })

    describe("send/receive", function() {
      it("should deliver messages", async function() {
        const address = uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const receivedA: string[] = []
        const receivedB: string[] = []

        await router.bind(address)
        dealerA.connect(address)
        dealerB.connect(address)

        const echo = async () => {
          for await (const [sender, msg] of router) {
            await router.send([sender, msg])
          }
        }

        const send = async () => {
          for (const msg of messages) {
            await dealerA.send(msg)
            await dealerB.send(msg)
          }

          for await (const msg of dealerA) {
            receivedA.push(msg.toString())
            if (receivedA.length === messages.length) break
          }

          for await (const msg of dealerB) {
            receivedB.push(msg.toString())
            if (receivedB.length === messages.length) break
          }

          router.close()
        }

        await Promise.all([echo(), send()])
        assert.deepEqual(receivedA, messages)
        assert.deepEqual(receivedB, messages)
      })

      /* This only works reliably with ZMQ 4.2.3+ */
      if (semver.satisfies(zmq.version, ">= 4.2.3")) {
        it("should fail with unroutable message if mandatory", async function() {
          router.mandatory = true
          router.sendTimeout = 0
          try {
            await router.send(["fooId", "foo"])
            assert.ok(false)
          } catch (err) {
            assert.instanceOf(err, Error)

            assert.equal(err.message, "Host unreachable")
            assert.equal(err.code, "EHOSTUNREACH")
            assert.typeOf(err.errno, "number")
          }
        })
      }
    })
  })
}
