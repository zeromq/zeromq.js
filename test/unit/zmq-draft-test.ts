import * as zmq from "../../src"
import * as draft from "../../src/draft"

import {assert} from "chai"

describe("zmq draft", function () {
  if (zmq.capability.draft !== true) {
    if (process.env.ZMQ_DRAFT === "true") {
      throw new Error("Draft API requested but not available at runtime.")
    }
    return
  }

  describe("exports", function () {
    it("should include functions and constructors", function () {
      const expected = [
        /* Specific socket constructors. */
        "Server",
        "Client",
        "Radio",
        "Dish",
        "Gather",
        "Scatter",
        "Datagram",
      ]

      assert.sameMembers(Object.keys(draft), expected)
    })
  })
})
