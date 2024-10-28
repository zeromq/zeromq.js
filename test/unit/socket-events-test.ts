import * as zmq from "../../src/index.js"

import {assert} from "chai"
import {
  captureEvent,
  captureEventsUntil,
  testProtos,
  uniqAddress,
} from "./helpers.js"
import {isFullError} from "../../src/errors.js"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} events`, function () {
    let sockA: zmq.Dealer
    let sockB: zmq.Dealer

    beforeEach(function () {
      sockA = new zmq.Dealer()
      sockB = new zmq.Dealer()
    })

    afterEach(function () {
      sockA.close()
      sockB.close()
      global.gc?.()
    })

    describe("when not connected", function () {
      it("should receive events", async function () {
        const done = captureEventsUntil(sockA, "end")
        sockA.close()

        const events = await done
        assert.deepEqual(events, [{type: "end"}])
      })
    })

    describe("when connected", function () {
      it("should return same object", function () {
        assert.equal(sockA.events, sockA.events)
      })

      if (proto !== "inproc") {
        it("should receive bind events", async function () {
          const address = await uniqAddress(proto)

          const [event] = await Promise.all([
            captureEvent(sockA, "bind"),
            sockA.bind(address),
            sockB.connect(address),
          ])

          assert.deepEqual(event, {type: "bind", address})
        })

        it("should receive connect events", async function () {
          const address = await uniqAddress(proto)

          const [event] = await Promise.all([
            captureEvent(sockB, "connect"),
            sockA.bind(address),
            sockB.connect(address),
          ])

          assert.deepEqual(event, {type: "connect", address})
        })
      }

      if (proto === "tcp") {
        it("should receive error events", async function () {
          const address = await uniqAddress(proto)

          await sockA.bind(address)
          const [event] = await Promise.all([
            captureEvent(sockB, "bind:error"),
            sockB.bind(address).catch(() => {
              /* Ignore */
            }),
          ])

          assert.equal(`tcp://${event.address}`, address)
          assert.instanceOf(event.error, Error)
          assert.equal(event.error.message, "Address already in use")
          assert.equal(event.error.code, "EADDRINUSE")
          assert.typeOf(event.error.errno, "number")
        })
      }

      it("should receive events with emitter", async function () {
        const address = await uniqAddress(proto)
        const events: zmq.Event[] = []

        sockA.events.on("bind", event => {
          events.push(event)
        })

        sockA.events.on("accept", event => {
          events.push(event)
        })

        sockA.events.on("close", event => {
          events.push(event)
        })

        sockA.events.on("end", event => {
          events.push(event)
        })

        assert.throws(
          () => sockA.events.receive(),
          Error,
          "Observer is in event emitter mode. After a call to events.on() it " +
            "is not possible to read events with events.receive().",
        )

        const connected = captureEvent(sockB, "connect")
        const done = Promise.all([
          captureEvent(sockA, "end"),
          sockA.bind(address),
          sockB.connect(address),
        ])

        if (proto !== "inproc") {
          await connected
        }
        sockA.close()
        sockB.close()

        await done
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

    describe("when closed automatically", function () {
      it("should not be able to receive", async function () {
        const events = sockA.events
        sockA.close()

        const {type} = await events.receive()
        assert.equal(type, "end")

        try {
          await events.receive()
          assert.ok(false)
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.equal(err.message, "Socket is closed")
          assert.equal(err.code, "EBADF")
          assert.typeOf(err.errno, "number")
        }
      })

      it("should be closed", async function () {
        const events = sockA.events
        sockA.close()
        await events.receive()
        assert.equal(events.closed, true)
      })
    })
  })
}
