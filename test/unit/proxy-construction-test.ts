import * as semver from "semver"
import * as zmq from "../../src"

import {assert} from "chai"

describe("proxy construction", function() {
  beforeEach(function() {
    /* ZMQ < 4.0.5 has no steerable proxy support. */
    if (semver.satisfies(zmq.version, "< 4.0.5")) this.skip()
  })

  afterEach(function() {
    global.gc?.()
  })

  describe("with constructor", function() {
    it("should throw if called as function", function() {
      assert.throws(
        () => (zmq.Proxy as any)(),
        TypeError,
        "Class constructors cannot be invoked without 'new'",
      )
    })

    it("should throw with too few arguments", function() {
      assert.throws(
        () => new (zmq.Proxy as any)(),
        TypeError,
        "Front-end must be a socket object",
      )
    })

    it("should throw with too many arguments", function() {
      assert.throws(
        () =>
          new (zmq.Proxy as any)(
            new zmq.Dealer(),
            new zmq.Dealer(),
            new zmq.Dealer(),
          ),
        TypeError,
        "Expected 2 arguments",
      )
    })

    it("should throw with invalid socket", function() {
      try {
        new (zmq.Proxy as any)({}, {})
        assert.ok(false)
      } catch (err) {
        assert.instanceOf(err, Error)
        assert.oneOf(err.message, [
          "Invalid pointer passed as argument" /* before 8.7 */,
          "Invalid argument" /* as of 8.7 */,
        ])
      }
    })
  })
})
