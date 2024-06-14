import * as zmq from "../../src"

import {assert} from "chai"
import {isFullError} from "../../src/errors"

describe("socket construction", function () {
  afterEach(function () {
    global.gc?.()
  })

  describe("with constructor", function () {
    it("should throw if called as function", function () {
      assert.throws(
        () => (zmq.Socket as any)(1, new zmq.Context()),
        TypeError,
        "Class constructors cannot be invoked without 'new'",
      )
    })

    it("should throw with too few arguments", function () {
      assert.throws(
        () => new (zmq.Socket as any)(),
        TypeError,
        "Socket type must be a number",
      )
    })

    it("should throw with too many arguments", function () {
      assert.throws(
        () => new (zmq.Socket as any)(1, new zmq.Context(), 2),
        TypeError,
        "Expected 2 arguments",
      )
    })

    it("should throw with wrong options argument", function () {
      assert.throws(
        () => new (zmq.Socket as any)(3, 1),
        TypeError,
        "Options must be an object",
      )
    })

    it("should throw with wrong type argument", function () {
      assert.throws(
        () => new (zmq.Socket as any)("foo", new zmq.Context()),
        TypeError,
        "Socket type must be a number",
      )
    })

    it("should throw with wrong type id", function () {
      try {
        new (zmq.Socket as any)(37, new zmq.Context())
        assert.ok(false)
      } catch (err) {
        if (!isFullError(err)) {
          throw err
        }
        assert.equal(err.message, "Invalid argument")
        assert.equal(err.code, "EINVAL")
        assert.typeOf(err.errno, "number")
      }
    })

    it("should throw with invalid context", function () {
      try {
        new (zmq.Socket as any)(1, {context: {}})
        assert.ok(false)
      } catch (err) {
        if (!isFullError(err)) {
          throw err
        }
        assert.oneOf(err.message, [
          "Invalid pointer passed as argument" /* before 8.7 */,
          "Invalid argument" /* as of 8.7 */,
        ])
      }
    })

    it("should create socket with default context", function () {
      class MySocket extends zmq.Socket {
        constructor() {
          super(1)
        }
      }
      const sock1 = new MySocket()
      const sock2 = new MySocket()
      assert.equal(sock1.context, sock2.context)
    })

    it("should create socket with given context", function () {
      class MySocket extends zmq.Socket {
        constructor(opts: zmq.SocketOptions<MySocket>) {
          super(1, opts)
        }
      }
      const context = new zmq.Context()
      const socket = new MySocket({context})
      assert.equal(socket.context, context)
    })
  })

  describe("with child constructor", function () {
    it("should throw if called as function", function () {
      assert.throws(
        () => (zmq.Dealer as any)(),
        TypeError,
        "Class constructor Dealer cannot be invoked without 'new'",
      )
    })

    it("should create socket with default context", function () {
      const sock = new zmq.Dealer()
      assert.instanceOf(sock, zmq.Dealer)
      assert.equal(sock.context, zmq.context)
    })

    it("should create socket with given context", function () {
      const ctxt = new zmq.Context()
      const sock = new zmq.Dealer({context: ctxt})
      assert.equal(sock.context, ctxt)
    })

    it("should set option", function () {
      const sock = new zmq.Dealer({recoveryInterval: 5})
      assert.equal(sock.recoveryInterval, 5)
    })

    it("should throw with invalid option value", function () {
      assert.throws(
        () => new (zmq.Dealer as any)({recoveryInterval: "hello"}),
        TypeError,
        "Option value must be a number",
      )
    })

    it("should throw with readonly option", function () {
      assert.throws(
        () => new (zmq.Dealer as any)({securityMechanism: 1}),
        TypeError,
        "Cannot set property securityMechanism of #<Socket> which has only a getter",
      )
    })

    it("should throw with unknown option", function () {
      assert.throws(
        () => new (zmq.Dealer as any)({doesNotExist: 1}),
        TypeError,
        "Cannot add property doesNotExist, object is not extensible",
      )
    })

    it("should throw with invalid type", function () {
      assert.throws(
        () => new (zmq.Socket as any)(4591),
        Error,
        "Invalid argument",
      )
    })

    if (!zmq.capability.draft) {
      it("should throw with draft type", function () {
        assert.throws(
          () => new (zmq.Socket as any)(14),
          Error,
          "Invalid argument",
        )
      })
    }

    it("should throw error on file descriptor limit", async function () {
      const context = new zmq.Context({maxSockets: 10})
      const sockets = []
      const n = 10

      try {
        for (let i = 0; i < n; i++) {
          sockets.push(new zmq.Dealer({context}))
        }
      } catch (err) {
        if (!isFullError(err)) {
          throw err
        }
        assert.equal(err.message, "Too many open file descriptors")
        assert.equal(err.code, "EMFILE")
        assert.typeOf(err.errno, "number")
      } finally {
        for (const socket of sockets) {
          socket.close()
        }
      }
    })
  })
})
