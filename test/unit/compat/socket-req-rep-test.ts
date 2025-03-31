import {describe, it, beforeEach, afterEach, before, after} from "mocha"
import {assert} from "chai"

import * as zmq from "../../../v5-compat"

import {testProtos, uniqAddress} from "../helpers"

if (process.env.INCLUDE_COMPAT_TESTS === "true") {
  for (const proto of testProtos("tcp", "inproc")) {
    describe(`compat socket with ${proto} req-rep`, function () {
      let address: string
      beforeEach(async () => {
        address = await uniqAddress(proto)
      })

      it("should support req-rep", function (done) {
        const rep = zmq.socket("rep")
        const req = zmq.socket("req")

        rep.on("message", function (msg: string) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "hello")
          rep.send("world")
        })

        rep.bind(address, err => {
          if (err) {
            throw err
          }
          req.connect(address)
          req.send("hello")
          req.on("message", function (msg) {
            assert.instanceOf(msg, Buffer)
            assert.equal(msg.toString(), "world")
            rep.close()
            req.close()
            done()
          })
        })
      })

      it("should support multiple", function () {
        return new Promise<void>(async resolve => {
          const n = 5
          for (let i = 0; i < n; i++) {
            let n = i
            const rep = zmq.socket("rep")
            const req = zmq.socket("req")

            const address = await uniqAddress(proto)

            rep.on("message", function (msg) {
              assert.instanceOf(msg, Buffer)
              assert.equal(msg.toString(), "hello")
              rep.send("world")
            })

            rep.bind(address, err => {
              if (err) {
                throw err
              }
              req.connect(address)
              req.send("hello")
              req.on("message", function (msg) {
                assert.instanceOf(msg, Buffer)
                assert.equal(msg.toString(), "world")
                req.close()
                rep.close()
                if (!--n) {
                  resolve()
                }
              })
            })
          }
        })
      })

      it("should support a burst", function (done) {
        const rep = zmq.socket("rep")
        const req = zmq.socket("req")

        const n = 10

        rep.on("message", function (msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "hello")
          rep.send("world")
        })

        rep.bind(address, err => {
          if (err) {
            throw err
          }
          req.connect(address)

          let received = 0

          req.on("message", function (msg) {
            assert.instanceOf(msg, Buffer)
            assert.equal(msg.toString(), "world")

            received += 1

            if (received === n) {
              rep.close()
              req.close()
              done()
            }
          })

          for (let i = 0; i < n; i += 1) {
            req.send("hello")
          }
        })
      })
    })
  }
}
