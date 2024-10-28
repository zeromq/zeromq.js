/* This test is very unreliable in practice, especially in CI.
   It is disabled by default. */
import * as zmq from "../../../v5-compat.js"
import semver from "semver"
import {assert} from "chai"
import {testProtos, uniqAddress} from "../helpers.js"

if (
  process.env.INCLUDE_COMPAT_TESTS === "true" &&
  process.env.INCLUDE_COMPAT_UNBIND_TEST
) {
  for (const proto of testProtos("tcp")) {
    describe(`compat socket with ${proto} unbind`, function () {
      beforeEach(function () {
        /* Seems < 4.2 is affected by https://github.com/zeromq/libzmq/issues/1583 */
        if (semver.satisfies(zmq.version, "< 4.2")) {
          this.skip()
        }
      })

      let sockA: zmq.Socket
      let sockB: zmq.Socket
      let sockC: zmq.Socket
      let address1: string
      let address2: string

      beforeEach(async function () {
        sockA = zmq.socket("dealer", {linger: 0})
        sockB = zmq.socket("dealer", {linger: 0})
        sockC = zmq.socket("dealer", {linger: 0})
        address1 = await uniqAddress(proto)
        address2 = await uniqAddress(proto)
      })

      afterEach(function () {
        sockA.close()
        sockB.close()
        sockC.close()
      })

      it("should be able to unbind", function (done) {
        let msgCount = 0
        sockA.bindSync(address1)
        sockA.bindSync(address2)

        sockA.on("unbind", async function (addr: string) {
          if (addr === address1) {
            sockB.send("Error from sockB.")
            sockC.send("Messsage from sockC.")
            sockC.send("Final message from sockC.")
          }
        })

        sockA.on("message", async function (msg: {toString: () => string}) {
          msgCount++
          if (msg.toString() === "Hello from sockB.") {
            sockA.unbindSync(address1)
          } else if (msg.toString() === "Final message from sockC.") {
            assert.equal(msgCount, 4)
            done()
          } else if (msg.toString() === "Error from sockB.") {
            throw Error("sockB should have been unbound")
          }
        })

        sockB.connect(address1)
        sockC.connect(address2)
        sockB.send("Hello from sockB.")
        sockC.send("Hello from sockC.")
      })
    })
  }
}
