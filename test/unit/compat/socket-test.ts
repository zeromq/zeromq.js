import * as zmq from "../../../v5-compat"
import {assert} from "chai"

if (process.env.INCLUDE_COMPAT_TESTS === "true") {
  describe("compat socket", function () {
    let sock: zmq.Socket

    beforeEach(function () {
      sock = zmq.socket("req")
    })

    afterEach(function () {
      sock.close()
    })

    it("should alias socket", function () {
      assert.equal(zmq.createSocket, zmq.socket)
    })

    it("should include type and close", function () {
      assert.equal(sock.type, "req")
      assert.typeOf(sock.close, "function")
    })

    it("should use socketopt", function () {
      assert.notEqual(sock.getsockopt(zmq.ZMQ_BACKLOG), 75)
      assert.equal(sock.setsockopt(zmq.ZMQ_BACKLOG, 75), sock)
      assert.equal(sock.getsockopt(zmq.ZMQ_BACKLOG), 75)
      sock.setsockopt(zmq.ZMQ_BACKLOG, 100)
    })

    it("should use socketopt with sugar", function () {
      assert.notEqual(sock.getsockopt("backlog"), 75)
      assert.equal(sock.setsockopt("backlog", 75), sock)
      assert.equal(sock.getsockopt("backlog"), 75)

      assert.typeOf(sock.backlog, "number")
      assert.notEqual(sock.backlog, 50)
      sock.backlog = 50
      assert.equal(sock.backlog, 50)
    })

    it("should close", function () {
      sock.close()
      assert.equal(sock.closed, true)
    })

    it("should support options", function () {
      sock.close()
      sock = zmq.socket("req", {backlog: 30})
      assert.equal(sock.getsockopt("backlog"), 30)
    })
  })
}
