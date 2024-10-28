import * as zmq from "../../../v5-compat.js"
import {assert} from "chai"

if (process.env.INCLUDE_COMPAT_TESTS === "true") {
  describe("compat context", function () {
    it("should support setting max io threads", function () {
      zmq.Context.setMaxThreads(3)
      assert.equal(zmq.Context.getMaxThreads(), 3)
      zmq.Context.setMaxThreads(1)
    })

    it("should support setting max number of sockets", function () {
      const currMaxSockets = zmq.Context.getMaxSockets()
      zmq.Context.setMaxSockets(256)
      assert.equal(zmq.Context.getMaxSockets(), 256)
      zmq.Context.setMaxSockets(currMaxSockets)
    })
  })
}
