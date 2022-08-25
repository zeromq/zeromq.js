/* This test is very unreliable in practice, especially in CI.
   It is disabled by default. */
if (
  process.env.INCLUDE_COMPAT_TESTS &&
  process.env.INCLUDE_COMPAT_UNBIND_TEST
) {
  const zmq = require("./load")
  const semver = require("semver")
  const {assert} = require("chai")
  const {testProtos, uniqAddress} = require("../helpers")

  for (const proto of testProtos("tcp")) {
    describe(`compat socket with ${proto} unbind`, function () {
      beforeEach(function () {
        /* Seems < 4.2 is affected by https://github.com/zeromq/libzmq/issues/1583 */
        if (semver.satisfies(zmq.version, "< 4.2")) {
          this.skip()
        }
      })

      let sockA
      let sockB
      let sockC

      beforeEach(function () {
        sockA = zmq.socket("dealer", {linger: 0})
        sockB = zmq.socket("dealer", {linger: 0})
        sockC = zmq.socket("dealer", {linger: 0})
      })

      afterEach(function () {
        sockA.close()
        sockB.close()
        sockC.close()
      })

      it("should be able to unbind", function (done) {
        const address1 = uniqAddress(proto)
        const address2 = uniqAddress(proto)

        let msgCount = 0
        sockA.bindSync(address1)
        sockA.bindSync(address2)

        sockA.on("unbind", async function (addr) {
          if (addr === address1) {
            sockB.send("Error from sockB.")
            sockC.send("Messsage from sockC.")
            sockC.send("Final message from sockC.")
          }
        })

        sockA.on("message", async function (msg) {
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
