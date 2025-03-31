import {describe, it, beforeEach, afterEach, before, after} from "mocha"
import {assert} from "chai"

import * as zmq from "../../../v5-compat"

if (process.env.INCLUDE_COMPAT_TESTS === "true") {
  describe("compat proxy", function () {
    it("should be a function off the module namespace", function () {
      assert.typeOf(zmq.proxy, "function")
    })
  })
}
