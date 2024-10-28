import * as semver from "semver"
import * as zmq from "../../src/index.js"

import {
  assert,
  describe,
  it,
  beforeEach,
  beforeAll,
  afterEach,
  afterAll,
} from "vitest"
import {createWorker} from "./helpers.js"

describe("context in thread", function () {
  beforeEach(function (ctx) {
    /* Node.js worker support introduced in version 10.5. */
    if (semver.satisfies(process.versions.node, "< 10.5")) {
      return ctx.skip()
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
