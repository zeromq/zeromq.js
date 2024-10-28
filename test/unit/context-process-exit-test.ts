import * as semver from "semver"
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
import {createProcess} from "./helpers.js"

describe("context process exit", function () {
  describe("with default context", function () {
    it("should occur when sockets are closed", async function () {
      const {code} = await createProcess(() => {
        const socket1 = new zmq.Dealer()
        socket1.close()
        const socket2 = new zmq.Router()
        socket2.close()
      })

      assert.equal(code, 0)
    })

    it("should occur when sockets are not closed", async function () {
      const {code} = await createProcess(() => {
        const socket1 = new zmq.Dealer()
        const socket2 = new zmq.Router()
      })

      assert.equal(code, 0)
    })

    it("should not occur when sockets are open and polling", async function () {
      const {code, isTimeout} = await createProcess(() => {
        const socket1 = new zmq.Dealer()
        socket1.connect("inproc://foo")
        socket1.receive().catch(err => {
          throw err
        })
      })

      assert.equal(isTimeout, true)
      assert.equal(code, -1)
    })

    it("should produce warning when messages are queued with blocky", async function () {
      const {stderr} = await createProcess(() => {
        zmq.context.blocky = true
        const socket1 = new zmq.Dealer({linger: 1000})
        socket1.connect("tcp://127.0.0.1:4567")
        socket1.send(null).catch(err => {
          throw err
        })
      })

      if (semver.satisfies(zmq.version, ">= 4.2")) {
        assert.match(
          stderr.toString(),
          /\(node:\d+\) WARNING: Waiting for queued ZeroMQ messages to be delivered\. Set 'context\.blocky = false' to change this behaviour\.\r?\n/,
        )
      } else {
        assert.match(
          stderr.toString(),
          /\(node:\d+\) WARNING: Waiting for queued ZeroMQ messages to be delivered\.\r?\n/,
        )
      }
    })

    it("should produce warning when messages are queued without blocky", async function () {
      const {stderr} = await createProcess(() => {
        zmq.context.blocky = false
        const socket1 = new zmq.Dealer({linger: 1000})
        socket1.connect("tcp://127.0.0.1:4567")
        socket1.send(null).catch(err => {
          throw err
        })
      })

      assert.match(
        stderr.toString(),
        /\(node:\d+\) WARNING: Waiting for queued ZeroMQ messages to be delivered\.\r?\n/,
      )
    })

    it("should not produce warning when messages are queued for a short time", async function () {
      const {stderr} = await createProcess(() => {
        zmq.context.blocky = true
        const socket1 = new zmq.Dealer({linger: 50})
        socket1.connect("tcp://127.0.0.1:4567")
        socket1.send(null).catch(err => {
          throw err
        })
      })

      assert.equal(stderr.toString(), "")
    })
  })

  describe("with custom context", function () {
    it("should occur when sockets are closed", async function () {
      const {code} = await createProcess(() => {
        const context = new zmq.Context()
        const socket1 = new zmq.Dealer({context})
        socket1.close()
        const socket2 = new zmq.Router({context})
        socket2.close()
      })

      assert.equal(code, 0)
    })

    it("should occur when sockets are closed and context is gced", async function () {
      const {code} = await createProcess(() => {
        function run() {
          const context = new zmq.Context()
          const socket1 = new zmq.Dealer({context})
          socket1.close()
          const socket2 = new zmq.Router({context})
          socket2.close()
        }

        run()
        global.gc?.()
      })

      assert.equal(code, 0)
    })

    it("should occur when sockets are not closed", async function () {
      const {code} = await createProcess(() => {
        const context = new zmq.Context()
        const socket1 = new zmq.Dealer({context})
        const socket2 = new zmq.Router({context})
      })

      assert.equal(code, 0)
    })

    it("should not occur when sockets are open and polling", async function () {
      const {code, isTimeout} = await createProcess(() => {
        const context = new zmq.Context()
        const socket1 = new zmq.Dealer({context})
        socket1.connect("inproc://foo")
        socket1.receive()
      })

      assert.equal(isTimeout, true)
      assert.equal(code, -1)
    })
  })
})
