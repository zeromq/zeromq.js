import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} events`, function() {
    let sockA: zmq.Dealer
    let sockB: zmq.Dealer

    beforeEach(function() {
      sockA = new zmq.Dealer
      sockB = new zmq.Dealer
    })

    afterEach(function() {
      sockA.close()
      sockB.close()
      global.gc()
    })

    describe("when not connected", function() {
      it("should receive events", async function() {
        const events: zmq.Event[] = []

        const read = async () => {
          for await (const event of sockA.events) {
            events.push(event)
          }
        }

        const done = read()
        await sockA.close()
        await done

        assert.deepEqual(events, [{type: "end"}])
      })
    })

    describe("when connected", function() {
      it("should return same object", function() {
        assert.equal(sockA.events, sockA.events)
      })

      it("should receive bind events", async function() {
        const address = uniqAddress(proto)
        const events: zmq.Event[] = []

        const read = async () => {
          for await (const event of sockA.events) {
            events.push(event)
          }
        }

        const done = read()

        await sockA.bind(address)
        await sockB.connect(address)
        await new Promise((resolve) => setTimeout(resolve, 15))
        sockA.close()
        sockB.close()
        await done
        await new Promise((resolve) => setTimeout(resolve, 15))

        if (proto === "inproc") {
          assert.deepEqual(events, [{type: "end"}])
        } else {
          assert.deepInclude(events, {type: "bind", address})
          assert.deepInclude(events, {type: "accept", address})
          assert.deepInclude(events, {type: "close", address})
          assert.deepInclude(events, {type: "end"})
        }
      })

      it("should receive connect events", async function() {
        const address = uniqAddress(proto)
        const events: zmq.Event[] = []

        const read = async () => {
          for await (const event of sockB.events) {
            events.push(event)
          }
        }

        const done = read()

        await sockA.bind(address)
        await sockB.connect(address)
        await new Promise((resolve) => setTimeout(resolve, 15))
        sockA.close()
        sockB.close()
        await done
        await new Promise((resolve) => setTimeout(resolve, 15))

        if (proto === "inproc") {
          assert.deepEqual(events, [{type: "end"}])
        } else {
          if (proto === "tcp") {
            assert.deepInclude(events, {type: "connect:delay", address})
          }

          assert.deepInclude(events, {type: "connect", address})
          assert.deepInclude(events, {type: "end"})
        }
      })

      it("should receive error events", async function() {
        const address = uniqAddress(proto)
        const events: zmq.Event[] = []

        const read = async () => {
          for await (const event of sockB.events) {
            events.push(event)
          }
        }

        const done = read()

        await sockA.bind(address)
        try {
          await sockB.bind(address)
        } catch (err) {
          /* Ignore error here */
        }

        await new Promise((resolve) => setTimeout(resolve, 15))
        sockA.close()
        sockB.close()
        await done

        if (proto === "tcp") {
          let bindError = false
          for (const event of events) {
            if (event.type === "bind:error") {
              bindError = true
              assert.equal("tcp://" + event.address, address)
              assert.instanceOf(event.error, Error)
              assert.equal(event.error.message, "Address already in use")
              assert.equal(event.error.code, "EADDRINUSE")
              assert.typeOf(event.error.errno, "number")
            }
          }

          assert.equal(true, bindError)
        }

        assert.deepInclude(events, {type: "end"})
      })

      it("should receive events with emitter", async function() {
        const address = uniqAddress(proto)
        const events: zmq.Event[] = []

        sockA.events.on("bind", (event) => {
          events.push(event)
        })

        sockA.events.on("accept", (event) => {
          events.push(event)
        })

        sockA.events.on("close", (event) => {
          events.push(event)
        })

        sockA.events.on("end", (event) => {
          events.push(event)
        })

        assert.throws(
          () => sockA.events.receive(),
          Error,
          "Observer is in event emitter mode. After a call to events.on() it " +
          "is not possible to read events with events.receive().",
        )

        await sockA.bind(address)
        await sockB.connect(address)
        await new Promise((resolve) => setTimeout(resolve, 15))
        sockA.close()
        sockB.close()
        await new Promise((resolve) => setTimeout(resolve, 15))

        if (proto === "inproc") {
          assert.deepEqual(events, [{type: "end"}])
        } else {
          assert.deepInclude(events, {type: "bind", address})
          assert.deepInclude(events, {type: "accept", address})
          assert.deepInclude(events, {type: "close", address})
          assert.deepInclude(events, {type: "end"})
        }
      })
    })

    describe("when closed automatically", function() {
      it("should not be able to receive", async function() {
        const events = sockA.events
        sockA.close()

        const {type} = await events.receive()
        assert.equal(type, "end")

        try {
          await events.receive()
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Socket is closed")
          assert.equal(err.code, "EBADF")
          assert.typeOf(err.errno, "number")
        }
      })

      it("should be closed", async function() {
        const events = sockA.events
        sockA.close()
        await events.receive()
        assert.equal(events.closed, true)
      })
    })
  })
}
