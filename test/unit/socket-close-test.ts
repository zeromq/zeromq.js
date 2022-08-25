/* eslint-disable @typescript-eslint/no-var-requires */
import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} close`, function () {
    let sock: zmq.Dealer

    beforeEach(function () {
      sock = new zmq.Dealer()
    })

    afterEach(function () {
      sock.close()
      global.gc?.()
    })

    describe("with explicit call", function () {
      it("should close socket", function () {
        assert.equal(sock.closed, false)
        sock.close()
        assert.equal(sock.closed, true)
      })

      it("should close socket and cancel send", async function () {
        assert.equal(sock.closed, false)
        const promise = sock.send(Buffer.from("foo"))
        sock.close()
        assert.equal(sock.closed, true)
        try {
          await promise
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Operation was not possible or timed out")
          assert.equal(err.code, "EAGAIN")
          assert.typeOf(err.errno, "number")
        }
      })

      it("should close socket and cancel receive", async function () {
        assert.equal(sock.closed, false)
        const promise = sock.receive()
        sock.close()
        assert.equal(sock.closed, true)
        try {
          await promise
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Operation was not possible or timed out")
          assert.equal(err.code, "EAGAIN")
          assert.typeOf(err.errno, "number")
        }
      })

      it("should close after successful bind", async function () {
        const promise = sock.bind(uniqAddress(proto))
        sock.close()
        assert.equal(sock.closed, false)
        await promise
        assert.equal(sock.closed, true)
      })

      it("should close after unsuccessful bind", async function () {
        const address = uniqAddress(proto)
        await sock.bind(address)
        const promise = sock.bind(address)
        sock.close()
        assert.equal(sock.closed, false)
        try {
          await promise
          assert.ok(false)
        } catch (err) {
          /* Ignore */
        }
        assert.equal(sock.closed, true)
      })

      it("should close after successful unbind", async function () {
        const address = uniqAddress(proto)
        await sock.bind(address)
        const promise = sock.unbind(address)
        sock.close()
        assert.equal(sock.closed, false)
        await promise
        assert.equal(sock.closed, true)
      })

      it("should close after unsuccessful unbind", async function () {
        const address = uniqAddress(proto)
        const promise = sock.unbind(address)
        sock.close()
        assert.equal(sock.closed, false)
        try {
          await promise
          assert.ok(false)
        } catch (err) {
          /* Ignore */
        }
        assert.equal(sock.closed, true)
      })

      it("should release reference to context", async function () {
        if (process.env.SKIP_GC_TESTS) {
          this.skip()
        }
        this.slow(200)

        const weak = require("weak-napi") as typeof import("weak-napi")

        let released = false
        const task = async () => {
          let context: zmq.Context | undefined = new zmq.Context()
          const socket = new zmq.Dealer({context, linger: 0})

          weak(context, () => {
            released = true
          })
          context = undefined

          global.gc?.()
          socket.connect(uniqAddress(proto))
          await socket.send(Buffer.from("foo"))
          socket.close()
        }

        await task()
        global.gc?.()
        await new Promise(resolve => setTimeout(resolve, 5))
        assert.equal(released, true)
      })
    })

    describe("in gc finalizer", function () {
      it("should release reference to context", async function () {
        if (process.env.SKIP_GC_TESTS) {
          this.skip()
        }
        if (process.env.SKIP_GC_FINALIZER_TESTS) {
          this.skip()
        }
        this.slow(200)

        const weak = require("weak-napi") as typeof import("weak-napi")

        let released = false
        const task = async () => {
          let context: zmq.Context | undefined = new zmq.Context()

          new zmq.Dealer({context, linger: 0})

          weak(context, () => {
            released = true
          })
          context = undefined
          global.gc?.()
        }

        await task()
        global.gc?.()
        await new Promise(resolve => setTimeout(resolve, 5))
        assert.equal(released, true)
      })
    })
  })
}
