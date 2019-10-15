import * as zmq from "../../src"

import {assert} from "chai"

describe("context options", function() {
  afterEach(function() {
    global.gc()
  })

  it("should set and get bool socket option", function() {
    const context = new zmq.Context
    assert.equal(context.ipv6, false)
    context.ipv6 = true
    assert.equal(context.ipv6, true)
  })

  it("should set and get int socket option", function() {
    const context = new zmq.Context
    assert.equal(context.ioThreads, 1)
    context.ioThreads = 75
    assert.equal(context.ioThreads, 75)
  })

  it("should throw for readonly option", function() {
    const context = new zmq.Context
    assert.throws(
      () => (context as any).maxSocketsLimit = 1,
      TypeError,
      "Cannot set property maxSocketsLimit of #<Context> which has only a getter",
    )
  })

  it("should throw for unknown option", function() {
    const context = new zmq.Context
    assert.throws(
      () => (context as any).doesNotExist = 1,
      TypeError,
      "Cannot add property doesNotExist, object is not extensible",
    )
  })
})
