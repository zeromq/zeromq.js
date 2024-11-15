import * as zmq from "../../../v5-compat"
import {assert} from "chai"
import {testProtos, uniqAddress} from "../helpers"

if (process.env.INCLUDE_COMPAT_TESTS === "true") {
  for (const proto of testProtos("tcp", "inproc")) {
    describe(`compat socket with ${proto} events`, function () {
      let address: string
      beforeEach(async () => {
        address = await uniqAddress(proto)
      })

      it("should support events", function (done) {
        const rep = zmq.socket("rep")
        const req = zmq.socket("req")

        rep.on("message", function (msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "hello")
          rep.send("world")
        })

        rep.bind(address, err => {
          if (err) {
            throw err
          }
        })

        rep.on("bind", function () {
          req.connect(address)
          req.on("message", function (msg) {
            assert.instanceOf(msg, Buffer)
            assert.equal(msg.toString(), "world")
            req.close()
            rep.close()
            done()
          })

          req.send("hello")
        })
      })
    })
  }
}
