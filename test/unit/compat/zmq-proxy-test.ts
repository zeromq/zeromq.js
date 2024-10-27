import * as zmq from "../../../v5-compat"
import {assert} from "chai"

if (process.env.INCLUDE_COMPAT_TESTS) {
  describe("compat proxy", function () {
    it("should be a function off the module namespace", function () {
      assert.typeOf(zmq.proxy, "function")
    })
  })
}
