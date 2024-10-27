import * as zmq from "../../../v5-compat"
import {assert} from "chai"
import {testProtos, uniqAddress} from "../helpers"

if (process.env.INCLUDE_COMPAT_TESTS) {
  for (const proto of testProtos("tcp", "inproc")) {
    describe(`compat socket with ${proto} req-rep`, function () {
      it("should support req-rep", async function (done) {
        const rep = zmq.socket("rep")
        const req = zmq.socket("req")

        const address = await uniqAddress(proto)

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

      it("should support multiple", function (done) {
        const n = 5

        for (let i = 0; i < n; i++) {
          ;(async function (n) {
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
                  done()
                }
              })
            })
          })(i)
        }
      })

      it("should support a burst", async function (done) {
        const rep = zmq.socket("rep")
        const req = zmq.socket("req")

        const address = await uniqAddress(proto)

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
