import * as zmq from "../../../v5-compat"
import {capability} from "../../../src"
import {assert} from "chai"
import semver from "semver"

if (process.env.INCLUDE_COMPAT_TESTS) {
  describe("compat exports", function () {
    it("should export a valid version", function () {
      assert.ok(semver.valid(zmq.version))
    })

    it("should generate valid curve keypair", function () {
      if (!capability.curve) {
        this.skip()
      }

      const curve = zmq.curveKeypair()
      assert.typeOf(curve.public, "string")
      assert.typeOf(curve.secret, "string")
      assert.equal(curve.public.length, 40)
      assert.equal(curve.secret.length, 40)
    })

    it("should export socket types and options", function () {
      assert.typeOf(zmq.ZMQ_PUB, "number")
      assert.typeOf(zmq.ZMQ_SUB, "number")
      assert.typeOf(zmq.ZMQ_REQ, "number")
      assert.typeOf(zmq.ZMQ_XREQ, "number")
      assert.typeOf(zmq.ZMQ_REP, "number")
      assert.typeOf(zmq.ZMQ_XREP, "number")
      assert.typeOf(zmq.ZMQ_DEALER, "number")
      assert.typeOf(zmq.ZMQ_ROUTER, "number")
      assert.typeOf(zmq.ZMQ_PUSH, "number")
      assert.typeOf(zmq.ZMQ_PULL, "number")
      assert.typeOf(zmq.ZMQ_PAIR, "number")
      assert.typeOf(zmq.ZMQ_AFFINITY, "number")
      assert.typeOf(zmq.ZMQ_IDENTITY, "number")
      assert.typeOf(zmq.ZMQ_SUBSCRIBE, "number")
      assert.typeOf(zmq.ZMQ_UNSUBSCRIBE, "number")
      assert.typeOf(zmq.ZMQ_RCVTIMEO, "number")
      assert.typeOf(zmq.ZMQ_SNDTIMEO, "number")
      assert.typeOf(zmq.ZMQ_RATE, "number")
      assert.typeOf(zmq.ZMQ_RECOVERY_IVL, "number")
      assert.typeOf(zmq.ZMQ_SNDBUF, "number")
      assert.typeOf(zmq.ZMQ_RCVBUF, "number")
      assert.typeOf(zmq.ZMQ_RCVMORE, "number")
      assert.typeOf(zmq.ZMQ_FD, "number")
      assert.typeOf(zmq.ZMQ_EVENTS, "number")
      assert.typeOf(zmq.ZMQ_TYPE, "number")
      assert.typeOf(zmq.ZMQ_LINGER, "number")
      assert.typeOf(zmq.ZMQ_RECONNECT_IVL, "number")
      assert.typeOf(zmq.ZMQ_RECONNECT_IVL_MAX, "number")
      assert.typeOf(zmq.ZMQ_BACKLOG, "number")
      assert.typeOf(zmq.ZMQ_POLLIN, "number")
      assert.typeOf(zmq.ZMQ_POLLOUT, "number")
      assert.typeOf(zmq.ZMQ_POLLERR, "number")
      assert.typeOf(zmq.ZMQ_SNDMORE, "number")
      assert.typeOf(zmq.ZMQ_XPUB, "number")
      assert.typeOf(zmq.ZMQ_XSUB, "number")
      assert.typeOf(zmq.ZMQ_SNDHWM, "number")
      assert.typeOf(zmq.ZMQ_RCVHWM, "number")
      assert.typeOf(zmq.ZMQ_MAXMSGSIZE, "number")
      assert.typeOf(zmq.ZMQ_MULTICAST_HOPS, "number")
      assert.typeOf(zmq.ZMQ_TCP_KEEPALIVE, "number")
      assert.typeOf(zmq.ZMQ_TCP_KEEPALIVE_CNT, "number")
      assert.typeOf(zmq.ZMQ_TCP_KEEPALIVE_IDLE, "number")
      assert.typeOf(zmq.ZMQ_TCP_KEEPALIVE_INTVL, "number")
      assert.typeOf(zmq.ZMQ_IPV4ONLY, "number")
      assert.typeOf(zmq.ZMQ_DELAY_ATTACH_ON_CONNECT, "number")
      assert.typeOf(zmq.ZMQ_ROUTER_MANDATORY, "number")
      assert.typeOf(zmq.ZMQ_XPUB_VERBOSE, "number")
      assert.typeOf(zmq.ZMQ_TCP_ACCEPT_FILTER, "number")
      assert.typeOf(zmq.ZMQ_LAST_ENDPOINT, "number")
      assert.typeOf(zmq.ZMQ_ROUTER_RAW, "number")
    })

    it("should export states", function () {
      assert.typeOf(zmq.STATE_READY, "number")
      assert.typeOf(zmq.STATE_BUSY, "number")
      assert.typeOf(zmq.STATE_CLOSED, "number")
    })

    it("should export constructors", function () {
      assert.typeOf(zmq.Context, "function")
      assert.typeOf(zmq.Socket, "function")
    })

    it("should export methods", function () {
      assert.typeOf(zmq.socket, "function")
    })
  })
}
