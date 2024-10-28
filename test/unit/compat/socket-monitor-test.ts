import * as zmq from "../../../v5-compat.js"
import semver from "semver"
import {assert} from "chai"
import {testProtos, uniqAddress} from "../helpers.js"
import {isFullError} from "../../../src/errors.js"

if (process.env.INCLUDE_COMPAT_TESTS === "true") {
  /* This test case only seems to work reliably with TCP. */
  for (const proto of testProtos("tcp")) {
    describe(`compat socket with ${proto} monitor`, function () {
      let address: string
      let warningListeners: NodeJS.WarningListener[]
      beforeEach(async () => {
        address = await uniqAddress(proto)
      })

      beforeEach(function (ctx) {
        /* ZMQ < 4.2 occasionally fails with assertion errors. */
        if (semver.satisfies(zmq.version, "< 4.2")) {
          return ctx.skip()
        }

        warningListeners = process.listeners("warning")
      })

      afterEach(function () {
        process.removeAllListeners("warning")
        for (const listener of warningListeners) {
          process.on("warning", listener)
        }
      })

      it("should be able to monitor the socket", function (done) {
        const rep = zmq.socket("rep")
        const req = zmq.socket("req")

        rep.on("message", function (msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "hello")
          rep.send("world")
        })

        const testedEvents = ["listen", "accept", "disconnect"]
        testedEvents.forEach(function (e) {
          rep.on(e, function (event_value, event_endpoint_addr) {
            assert.equal(event_endpoint_addr.toString(), address)

            testedEvents.pop()
            if (testedEvents.length === 0) {
              rep.unmonitor()
              rep.close()
              done()
            }
          })
        })

        // enable monitoring for this socket
        rep.monitor()

        rep.bind(address, err => {
          if (err) {
            throw err
          }
        })

        rep.on("bind", function () {
          req.connect(address)
          req.send("hello")
          req.on("message", function (msg) {
            assert.instanceOf(msg, Buffer)
            assert.equal(msg.toString(), "world")
            req.close()
          })

          // Test that bind errors pass an Error both to the callback
          // and to the monitor event
          const doubleRep = zmq.socket("rep")
          doubleRep.monitor()
          doubleRep.on("bind_error", function (errno, bindAddr, ex) {
            assert.instanceOf(ex, Error)
            doubleRep.close()
          })

          doubleRep.bind(address, err => {
            if (!isFullError(err)) {
              throw err
            }
          })
        })
      })
    })
  }
}
