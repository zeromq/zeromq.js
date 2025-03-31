import {describe, it, beforeEach, afterEach, before, after} from "mocha"
import {assert} from "chai"

import * as zmq from "../../../v5-compat"

import {testProtos, uniqAddress} from "../helpers"

if (process.env.INCLUDE_COMPAT_TESTS === "true") {
  for (const proto of testProtos("tcp", "inproc")) {
    describe(`compat socket with ${proto}`, function () {
      let address: string
      beforeEach(async () => {
        address = await uniqAddress(proto)
      })

      it("should cooperate with gc", function (done) {
        const sockA = zmq.socket("dealer")
        const sockB = zmq.socket("dealer")

        /**
         * We create 2 dealer sockets.
         * One of them (`a`) is not referenced explicitly after the main loop
         * finishes so it"s a pretender for garbage collection.
         * This test performs global.gc?.() explicitly and then tries to send a message
         * to a dealer socket that could be destroyed and collected.
         * If a message is delivered, than everything is ok. Otherwise the guard
         * timeout will make the test fail.
         */
        sockA.on("message", function (msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "hello")
          sockA.close()
          sockB.close()
          done()
        })

        let bound = false

        sockA.bind(address, err => {
          if (err) {
            clearInterval(interval)
            done(err)
          } else {
            bound = true
          }
        })

        const interval = setInterval(function () {
          global.gc?.()
          if (bound) {
            clearInterval(interval)
            sockB.connect(address)
            sockB.send("hello")
          }
        }, 15)
      })
    })
  }
}
