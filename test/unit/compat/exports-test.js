if (process.env.INCLUDE_COMPAT_TESTS) {
  const zmq = require("./load")
  const semver = require("semver")
  const {assert} = require("chai")

  describe("compat exports", function() {
    it("should export a valid version", function(){
      assert.ok(semver.valid(zmq.version))
    })

    it("should generate valid curve keypair", function() {
      if (!zmq.capability.curve) this.skip()

      const curve = zmq.curveKeypair()
      assert.typeOf(curve.public, "string")
      assert.typeOf(curve.secret, "string")
      assert.equal(curve.public.length, 40)
      assert.equal(curve.secret.length, 40)
    })

    it("should export socket types and options", function() {
      const constants = [
        "PUB",
        "SUB",
        "REQ",
        "XREQ",
        "REP",
        "XREP",
        "DEALER",
        "ROUTER",
        "PUSH",
        "PULL",
        "PAIR",
        "AFFINITY",
        "IDENTITY",
        "SUBSCRIBE",
        "UNSUBSCRIBE",
        "RCVTIMEO",
        "SNDTIMEO",
        "RATE",
        "RECOVERY_IVL",
        "SNDBUF",
        "RCVBUF",
        "RCVMORE",
        "FD",
        "EVENTS",
        "TYPE",
        "LINGER",
        "RECONNECT_IVL",
        "RECONNECT_IVL_MAX",
        "BACKLOG",
        "POLLIN",
        "POLLOUT",
        "POLLERR",
        "SNDMORE",
        "XPUB",
        "XSUB",
        "SNDHWM",
        "RCVHWM",
        "MAXMSGSIZE",
        "MULTICAST_HOPS",
        "TCP_KEEPALIVE",
        "TCP_KEEPALIVE_CNT",
        "TCP_KEEPALIVE_IDLE",
        "TCP_KEEPALIVE_INTVL",
        "IPV4ONLY",
        "DELAY_ATTACH_ON_CONNECT",
        "ROUTER_MANDATORY",
        "XPUB_VERBOSE",
        "TCP_KEEPALIVE",
        "TCP_KEEPALIVE_IDLE",
        "TCP_KEEPALIVE_CNT",
        "TCP_KEEPALIVE_INTVL",
        "TCP_ACCEPT_FILTER",
        "LAST_ENDPOINT",
        "ROUTER_RAW",
      ]

      constants.forEach(function(typeOrProp) {
        assert.typeOf(zmq["ZMQ_" + typeOrProp], "number")
      })
    })

    it("should export states", function(){
      ["STATE_READY", "STATE_BUSY", "STATE_CLOSED"].forEach(function(state) {
        assert.typeOf(zmq[state], "number")
      })
    })

    it("should export constructors", function(){
      assert.typeOf(zmq.Context, "function")
      assert.typeOf(zmq.Socket, "function")
    })

    it("should export methods", function(){
      assert.typeOf(zmq.socket, "function")
    })
  })
}
