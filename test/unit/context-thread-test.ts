import {describe, it, beforeEach, afterEach, before, after} from "mocha"
import {assert} from "chai"

import * as semver from "semver"

import * as zmq from "../../src"

import {createWorker} from "./helpers"

describe("context in thread", function () {
  beforeEach(function () {
    /* Node.js worker support introduced in version 10.5. */
    if (semver.satisfies(process.versions.node, "< 10.5")) {
      this.skip()
    }
  })

  describe("with default context", function () {
    it("should be shared", async function () {
      try {
        zmq.context.ioThreads = 3

        const val = await createWorker({}, async () => {
          return zmq.context.ioThreads
        })

        assert.equal(val, 3)
      } finally {
        zmq.context.ioThreads = 1
      }
    })
  })
})
