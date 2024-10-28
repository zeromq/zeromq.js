import * as zmq from "../../../v5-compat.js"
import {
  assert,
  describe,
  it,
  beforeEach,
  beforeAll,
  afterEach,
  afterAll,
} from "vitest"

if (process.env.INCLUDE_COMPAT_TESTS === "true") {
  describe("compat proxy", function () {
    it("should be a function off the module namespace", function () {
      assert.typeOf(zmq.proxy, "function")
    })
  })
}
