/// <reference lib="ESNext" />

import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress, getGcOrSkipTest} from "./helpers"
import {isFullError} from "../../src/errors"

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
          if (!isFullError(err)) {
            throw err
          }
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
          if (!isFullError(err)) {
            throw err
          }
          assert.equal(err.message, "Operation was not possible or timed out")
          assert.equal(err.code, "EAGAIN")
          assert.typeOf(err.errno, "number")
        }
      })

      it("should close after successful bind", async function () {
        const promise = sock.bind(await uniqAddress(proto))
        sock.close()
        assert.equal(sock.closed, false)
        await promise
        assert.equal(sock.closed, true)
      })

      it("should close after unsuccessful bind", async function () {
        const address = await uniqAddress(proto)
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
        const address = await uniqAddress(proto)
        await sock.bind(address)
        const promise = sock.unbind(address)
        sock.close()
        assert.equal(sock.closed, false)
        await promise
        assert.equal(sock.closed, true)
      })

      it("should close after unsuccessful unbind", async function () {
        const address = await uniqAddress(proto)
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
        const gc = getGcOrSkipTest(this)
        this.slow(200)

        let weakRef: undefined | WeakRef<any>

        const task = async () => {
          const context: zmq.Context | undefined = new zmq.Context()
          const socket = new zmq.Dealer({context, linger: 0})
          weakRef = new WeakRef(context)

          socket.connect(await uniqAddress(proto))
          await socket.send(Buffer.from("foo"))
          socket.close()
        }

        await task()
        await gc()

        assert.isDefined(weakRef)
        assert.isUndefined(weakRef!.deref())
      })
    })

    describe("in gc finalizer", function () {
      it("should release reference to context", async function () {
        const gc = getGcOrSkipTest(this)
        if (process.env.SKIP_GC_FINALIZER_TESTS) {
          this.skip()
        }
        this.slow(200)

        let weakRef: undefined | WeakRef<any>
        const task = async () => {
          const context: zmq.Context | undefined = new zmq.Context()
          const _dealer = new zmq.Dealer({context, linger: 0})
          weakRef = new WeakRef(context)
        }

        await task()
        await gc()

        assert.isDefined(weakRef)
        assert.isUndefined(weakRef!.deref())
      })
    })
  })
}
