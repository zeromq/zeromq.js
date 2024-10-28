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

describe("context construction", function () {
  afterEach(function () {
    global.gc?.()
  })

  it("should throw if called as function", function () {
    assert.throws(
      () => (zmq.Context as any)(),
      TypeError,
      "Class constructors cannot be invoked without 'new'",
    )
  })

  it("should throw with wrong options argument", function () {
    assert.throws(
      () => new (zmq.Context as any)(1),
      TypeError,
      "Options must be an object",
    )
  })

  it("should throw with too many arguments", function () {
    assert.throws(
      () => new (zmq.Context as any)({}, 2),
      TypeError,
      "Expected 1 argument",
    )
  })

  it("should set option", function () {
    const context = new zmq.Context({ioThreads: 5})
    assert.equal(context.ioThreads, 5)
  })

  it("should throw with invalid option value", function () {
    assert.throws(
      () => new (zmq.Context as any)({ioThreads: "hello"}),
      TypeError,
      "Option value must be a number",
    )
  })

  it("should throw with readonly option", function () {
    assert.throws(
      () => new (zmq.Context as any)({maxSocketsLimit: 1}),
      TypeError,
      "Cannot set property maxSocketsLimit of #<Context> which has only a getter",
    )
  })

  it("should throw with unknown option", function () {
    assert.throws(
      () => new (zmq.Context as any)({doesNotExist: 1}),
      TypeError,
      "Cannot add property doesNotExist, object is not extensible",
    )
  })
})
