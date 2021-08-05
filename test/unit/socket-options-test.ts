import * as semver from "semver"
import * as zmq from "../../src"

import {assert} from "chai"
import {uniqAddress} from "./helpers"

describe("socket options", function() {
  let warningListeners: NodeJS.WarningListener[]

  beforeEach(function() {
    warningListeners = process.listeners("warning")
  })

  afterEach(function() {
    process.removeAllListeners("warning")
    for (const listener of warningListeners) {
      process.on("warning", listener as (warning: Error) => void)
    }

    global.gc?.()
  })

  it("should set and get bool socket option", function() {
    const sock = new zmq.Dealer()
    assert.equal(sock.immediate, false)
    sock.immediate = true
    assert.equal(sock.immediate, true)
  })

  it("should set and get int32 socket option", function() {
    const sock = new zmq.Dealer()
    assert.equal(sock.backlog, 100)
    sock.backlog = 75
    assert.equal(sock.backlog, 75)
  })

  it("should set and get int64 socket option", function() {
    const sock = new zmq.Dealer()
    assert.equal(sock.maxMessageSize, -1)
    sock.maxMessageSize = 0xffffffff
    assert.equal(sock.maxMessageSize, 0xffffffff)
  })

  it("should set and get string socket option", function() {
    const sock = new zmq.Dealer()
    assert.equal(sock.routingId, null)
    sock.routingId = "åbçdéfghïjk"
    assert.equal(sock.routingId, "åbçdéfghïjk")
  })

  it("should set and get string socket option as buffer", function() {
    const sock = new zmq.Dealer()
    assert.equal(sock.routingId, null)
    ;(sock as any).routingId = Buffer.from("åbçdéfghïjk")
    assert.equal(sock.routingId, "åbçdéfghïjk")
  })

  it("should set and get string socket option to undefined", function() {
    if (semver.satisfies(zmq.version, "> 4.2.3")) {
      /* As of ZMQ 4.2.4, zap domain can no longer be reset to null. */
      const sock = new zmq.Dealer()
      assert.equal(sock.socksProxy, undefined)
      ;(sock as any).socksProxy = Buffer.from("foo")
      assert.equal(sock.socksProxy, "foo")
      ;(sock as any).socksProxy = null
      assert.equal(sock.socksProxy, undefined)
    } else {
      /* Older ZMQ versions did not allow socks proxy to be reset to null. */
      const sock = new zmq.Dealer()
      assert.equal(sock.zapDomain, undefined)
      ;(sock as any).zapDomain = Buffer.from("foo")
      assert.equal(sock.zapDomain, "foo")
      ;(sock as any).zapDomain = null
      assert.equal(sock.zapDomain, undefined)
    }
  })

  it("should set and get bool socket option", function() {
    const sock = new zmq.Dealer()
    assert.equal((sock as any).getBoolOption(39), false)
    ;(sock as any).setBoolOption(39, true)
    assert.equal((sock as any).getBoolOption(39), true)
  })

  it("should set and get int32 socket option", function() {
    const sock = new zmq.Dealer()
    assert.equal((sock as any).getInt32Option(19), 100)
    ;(sock as any).setInt32Option(19, 75)
    assert.equal((sock as any).getInt32Option(19), 75)
  })

  it("should set and get int64 socket option", function() {
    const sock = new zmq.Dealer()
    assert.equal((sock as any).getInt64Option(22), -1)
    ;(sock as any).setInt64Option(22, 0xffffffffffff)
    assert.equal((sock as any).getInt64Option(22), 0xffffffffffff)
  })

  it("should set and get uint64 socket option", function() {
    process.removeAllListeners("warning")

    const sock = new zmq.Dealer()
    assert.equal((sock as any).getUint64Option(4), 0)
    ;(sock as any).setUint64Option(4, 0xffffffffffffffff)
    assert.equal((sock as any).getUint64Option(4), 0xffffffffffffffff)
  })

  it("should set and get string socket option", function() {
    const sock = new zmq.Dealer()
    assert.equal((sock as any).getStringOption(5), null)
    ;(sock as any).setStringOption(5, "åbçdéfghïjk")
    assert.equal((sock as any).getStringOption(5), "åbçdéfghïjk")
  })

  it("should set and get string socket option as buffer", function() {
    const sock = new zmq.Dealer()
    assert.equal((sock as any).getStringOption(5), null)
    ;(sock as any).setStringOption(5, Buffer.from("åbçdéfghïjk"))
    assert.equal((sock as any).getStringOption(5), "åbçdéfghïjk")
  })

  it("should set and get string socket option to null", function() {
    if (semver.satisfies(zmq.version, "> 4.2.3")) {
      /* As of ZMQ 4.2.4, zap domain can no longer be reset to null. */
      const sock = new zmq.Dealer()
      assert.equal((sock as any).getStringOption(68), null)
      ;(sock as any).setStringOption(68, Buffer.from("åbçdéfghïjk"))
      assert.equal(
        (sock as any).getStringOption(68),
        Buffer.from("åbçdéfghïjk"),
      )
      ;(sock as any).setStringOption(68, null)
      assert.equal((sock as any).getStringOption(68), null)
    } else {
      /* Older ZMQ versions did not allow socks proxy to be reset to null. */
      const sock = new zmq.Dealer()
      assert.equal((sock as any).getStringOption(55), null)
      ;(sock as any).setStringOption(55, Buffer.from("åbçdéfghïjk"))
      assert.equal(
        (sock as any).getStringOption(55),
        Buffer.from("åbçdéfghïjk"),
      )
      ;(sock as any).setStringOption(55, null)
      assert.equal((sock as any).getStringOption(55), null)
    }
  })

  it("should throw for readonly option", function() {
    const sock = new zmq.Dealer()
    assert.throws(
      () => ((sock as any).securityMechanism = 1),
      TypeError,
      "Cannot set property securityMechanism of #<Socket> which has only a getter",
    )
  })

  it("should throw for unknown option", function() {
    const sock = new zmq.Dealer()
    assert.throws(
      () => ((sock as any).doesNotExist = 1),
      TypeError,
      "Cannot add property doesNotExist, object is not extensible",
    )
  })

  it("should get mechanism", function() {
    const sock = new zmq.Dealer()
    assert.equal(sock.securityMechanism, null)
    sock.plainServer = true
    assert.equal(sock.securityMechanism, "plain")
  })

  describe("warnings", function() {
    beforeEach(function() {
      /* ZMQ < 4.2 fails with assertion errors with inproc.
         See: https://github.com/zeromq/libzmq/pull/2123/files */
      if (semver.satisfies(zmq.version, "< 4.2")) this.skip()

      warningListeners = process.listeners("warning")
    })

    afterEach(function() {
      process.removeAllListeners("warning")
      for (const listener of warningListeners) {
        process.on("warning", listener as (warning: Error) => void)
      }
    })

    it("should be emitted for set after connect", async function() {
      const warnings: Error[] = []
      process.removeAllListeners("warning")
      process.on("warning", warning => warnings.push(warning))

      const sock = new zmq.Dealer()
      sock.connect(uniqAddress("inproc"))
      sock.routingId = "asdf"

      await new Promise(process.nextTick)
      assert.deepEqual(
        warnings.map(w => w.message),
        ["Socket option will not take effect until next connect/bind."],
      )

      sock.close()
    })

    it("should be emitted for set during bind", async function() {
      const warnings: Error[] = []
      process.removeAllListeners("warning")
      process.on("warning", warning => warnings.push(warning))

      const sock = new zmq.Dealer()
      const promise = sock.bind(uniqAddress("inproc"))
      sock.routingId = "asdf"

      await new Promise(process.nextTick)
      assert.deepEqual(
        warnings.map(w => w.message),
        ["Socket option will not take effect until next connect/bind."],
      )

      await promise
      sock.close()
    })

    it("should be emitted for set after bind", async function() {
      const warnings: Error[] = []
      process.removeAllListeners("warning")
      process.on("warning", warning => warnings.push(warning))

      const sock = new zmq.Dealer()
      await sock.bind(uniqAddress("inproc"))
      sock.routingId = "asdf"

      await new Promise(process.nextTick)
      assert.deepEqual(
        warnings.map(w => w.message),
        ["Socket option will not take effect until next connect/bind."],
      )

      sock.close()
    })

    it("should be emitted when setting large uint64 socket option", async function() {
      const warnings: Error[] = []
      process.removeAllListeners("warning")
      process.on("warning", warning => warnings.push(warning))

      const sock = new zmq.Dealer()
      ;(sock as any).setUint64Option(4, 0xfffffff7fab7fb)
      assert.equal((sock as any).getUint64Option(4), 0xfffffff7fab7fb)

      await new Promise(process.nextTick)
      assert.deepEqual(
        warnings.map(w => w.message),
        [
          "Value is larger than Number.MAX_SAFE_INTEGER and " +
            "may have been rounded inaccurately.",
        ],
      )
    })
  })
})
