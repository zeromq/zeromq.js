import {describe, it, beforeEach, afterEach, before, after} from "mocha"
import {assert} from "chai"

import * as zmq from "../../../v5-compat"
import type {Socket} from "../../../v5-compat"

if (process.env.INCLUDE_COMPAT_TESTS === "true") {
  describe("compat socket error callback", function () {
    let sock: Socket

    beforeEach(function () {
      sock = zmq.socket("router")
    })

    afterEach(function () {
      sock.close()
    })

    it("should create a socket with mandatory", function () {
      sock.setsockopt(zmq.ZMQ_ROUTER_MANDATORY, 1)
      sock.setsockopt(zmq.ZMQ_SNDTIMEO, 10)
    })

    it("should callback with error when not connected", function (done) {
      sock.send(["foo", "bar"], null, err => {
        assert.isUndefined(err)
        sock.close()
        done()
      })
    })
  })
}
