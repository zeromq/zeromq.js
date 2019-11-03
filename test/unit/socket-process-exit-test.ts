import * as zmq from "../../src"

import {assert} from "chai"
import {createProcess, uniqAddress} from "./helpers"

describe("socket process exit", function() {
  it.skip("should occur cleanly when sending in exit hook", async function() {
    this.slow(200)
    const code = await createProcess(async () => {
      const sockA = new zmq.Pair
      const sockB = new zmq.Pair
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

  it("should occur cleanly when reading events", async function() {
    this.slow(200)
    const code = await createProcess(() => {
      const sock = new zmq.Dealer

      async function readEvents() {
        const events = []
        for await (const event of sock.events) {
          events.push(event)
        }
      }

      readEvents()
    })

    assert.equal(code, 0)
  })
})
