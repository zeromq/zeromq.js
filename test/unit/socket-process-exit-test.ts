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
import {createProcess} from "./helpers.js"

describe("socket process exit", function () {
  /* Reported: https://github.com/nodejs/node-addon-api/issues/591 */
  it.skip("should occur cleanly when sending in exit hook", async function () {
    const {code} = await createProcess(async () => {
      const sockA = new zmq.Pair()
      const sockB = new zmq.Pair()
      await sockA.bind("inproc://test-1")
      sockB.connect("inproc://test-1")

      process.on("exit", () => {
        console.log("hook")
        sockB.receive()
        sockA.send("foo")
      })
    })

    assert.equal(code, 0)
  })

  it("should occur cleanly when sending on unbound socket", async function () {
    const {code} = await createProcess(async () => {
      const sock = new zmq.Publisher()
      await sock.send("test")
    })

    assert.equal(code, 0)
  })

  it("should not occur when sending and blocked on unbound socket", async function () {
    const {code} = await createProcess(async () => {
      const sock = new zmq.Dealer()
      await sock.send("test")
    })

    assert.equal(code, -1)
  })

  it("should occur cleanly on socket close when reading events", async function () {
    const {code} = await createProcess(() => {
      const sock = new zmq.Dealer()

      async function readEvents() {
        const events = []
        for await (const event of sock.events) {
          events.push(event)
        }
      }

      readEvents()
      sock.close()
    })

    assert.equal(code, 0)
  })

  it("should not occur while reading events", async function () {
    const {code} = await createProcess(async () => {
      const sock = new zmq.Dealer()

      const events = []
      for await (const event of sock.events) {
        events.push(event)
      }
    })

    assert.equal(code, -1)
  })
})
