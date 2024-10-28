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
import {testProtos, uniqAddress, getGcOrSkipTest} from "./helpers.js"
import {isFullError} from "../../src/errors.js"

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
          console.log(err)
          /* Ignore */
        }
        assert.equal(sock.closed, true)
      })

      it("should release reference to context", async function (ctx) {
        const gc = getGcOrSkipTest(ctx)

        let weakRef: undefined | WeakRef<zmq.Context>

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
        assert.isUndefined(weakRef?.deref())
      })
    })

    // // Because context is shared in the global module, it is not GC'd until the end of the process
    // // Unless dealer is closed explicitly.
    // describe("in gc finalizer", function () {
    //   it("should release reference to context", async function (ctx) {
    //     const gc = getGcOrSkipTest(ctx)
    //     if (process.env.SKIP_GC_FINALIZER_TESTS) {
    //       return ctx.skip()
    //     }
    //

    //     let weakRef: undefined | WeakRef<zmq.Context>
    //     const task = async () => {
    //       const context: zmq.Context | undefined = new zmq.Context()
    //       const _dealer = new zmq.Dealer({context, linger: 0})
    //       weakRef = new WeakRef(context)
    //     }

    //     await task()
    //     await gc()

    //     assert.isDefined(weakRef)
    //     assert.isUndefined(weakRef.deref())
    //   })
    // })
  })
}
