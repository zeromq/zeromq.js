import * as zmq from "../../../v5-compat"
import {assert} from "chai"
import {testProtos, uniqAddress} from "../helpers"
import {isFullError} from "../../../src/errors"

if (process.env.INCLUDE_COMPAT_TESTS === "true") {
  for (const proto of testProtos("tcp")) {
    describe(`compat proxy with ${proto} xpub-xsub`, function () {
      const sockets: zmq.Socket[] = []

      let frontendAddr: string
      let backendAddr: string
      let captureAddr: string

      beforeEach(async function () {
        frontendAddr = await uniqAddress(proto)
        backendAddr = await uniqAddress(proto)
        captureAddr = await uniqAddress(proto)
      })

      afterEach(function () {
        while (sockets.length) {
          sockets.pop()?.close()
        }
      })

      it("should proxy pub-sub connected to xpub-xsub", function (done) {
        const frontend = zmq.socket("xpub")
        const backend = zmq.socket("xsub")

        const sub = zmq.socket("sub")
        const pub = zmq.socket("pub")
        sockets.push(frontend, backend, sub, pub)

        sub.subscribe("")
        sub.on("message", function (msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "foo")
          done()
        })

        frontend.bind(frontendAddr, err => {
          if (err) {
            throw err
          }
          backend.bind(backendAddr, err => {
            if (err) {
              throw err
            }

            sub.connect(frontendAddr)
            pub.connect(backendAddr)

            setTimeout(() => pub.send("foo"), 15)
            zmq.proxy(frontend, backend)
          })
        })
      })

      it("should proxy connections with capture", function (done) {
        const frontend = zmq.socket("xpub")
        const backend = zmq.socket("xsub")

        const capture = zmq.socket("pub")
        const capSub = zmq.socket("sub")

        const sub = zmq.socket("sub")
        const pub = zmq.socket("pub")
        sockets.push(frontend, backend, sub, pub, capture, capSub)

        let counter = 2

        sub.subscribe("")
        sub.on("message", function (msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "foo")

          if (--counter == 0) {
            done()
          }
        })

        capSub.subscribe("")
        capSub.on("message", function (msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "foo")

          if (--counter == 0) {
            done()
          }
        })

        capture.bind(captureAddr, err => {
          if (err) {
            throw err
          }
          frontend.bind(frontendAddr, err => {
            if (err) {
              throw err
            }
            backend.bind(backendAddr, err => {
              if (err) {
                throw err
              }

              pub.connect(backendAddr)
              sub.connect(frontendAddr)
              capSub.connect(captureAddr)

              setTimeout(() => pub.send("foo"), 15)
              zmq.proxy(frontend, backend, capture)
            })
          })
        })
      })

      it("should throw an error if the order is wrong", function () {
        const frontend = zmq.socket("xpub")
        const backend = zmq.socket("xsub")

        sockets.push(frontend, backend)

        try {
          zmq.proxy(backend, frontend)
        } catch (err) {
          assert(isFullError(err))
          assert.include(
            [
              "wrong socket order to proxy",
              "This socket type order is not supported in compatibility mode",
            ],
            err.message,
          )
        }
      })
    })
  }
}
