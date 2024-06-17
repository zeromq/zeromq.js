import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"
import {isFullError} from "../../src/errors"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} req/rep`, function () {
    let req: zmq.Request
    let rep: zmq.Reply

    beforeEach(function () {
      req = new zmq.Request()
      rep = new zmq.Reply()
    })

    afterEach(function () {
      req.close()
      rep.close()
      global.gc?.()
    })

    describe("send/receive", function () {
      it("should deliver messages", async function () {
        /* REQ  -> foo ->  REP
                <- foo <-
                -> bar ->
                <- bar <-
                -> baz ->
                <- baz <-
                -> qux ->
                <- qux <-
         */

        const address = await uniqAddress(proto)
        const messages = ["foo", "bar", "baz", "qux"]
        const received: string[] = []

        await rep.bind(address)
        await req.connect(address)

        const echo = async () => {
          for await (const msg of rep) {
            await rep.send(msg)
          }
        }

        const send = async () => {
          for (const msg of messages) {
            await req.send(Buffer.from(msg))

            const [res] = await req.receive()
            received.push(res.toString())
            if (received.length === messages.length) {
              break
            }
          }

          rep.close()
        }

        await Promise.all([echo(), send()])
        assert.deepEqual(received, messages)
      })

      it("should throw when waiting for a response", async function () {
        /* REQ  -> foo ->  REP
                -X foo
                <- foo <-
         */

        const address = await uniqAddress(proto)

        /* FIXME: Also trigger EFSM without setting timeout. */
        req.sendTimeout = 2
        await rep.bind(address)
        await req.connect(address)

        const echo = async () => {
          const msg = await rep.receive()
          await rep.send(msg)
        }

        const send = async () => {
          await req.send(Buffer.from("foo"))
          assert.equal(req.writable, false)

          try {
            await req.send(Buffer.from("bar"))
            assert.ok(false)
          } catch (err) {
            if (!isFullError(err)) {
              throw err
            }
            assert.equal(
              err.message,
              "Operation cannot be accomplished in current state",
            )
            assert.equal(err.code, "EFSM")
            assert.typeOf(err.errno, "number")
          }

          const [msg] = await req.receive()
          assert.deepEqual(msg, Buffer.from("foo"))

          rep.close()
        }

        await Promise.all([echo(), send()])
      })
    })
  })
}
