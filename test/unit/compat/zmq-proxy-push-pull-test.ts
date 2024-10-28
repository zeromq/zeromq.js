import * as zmq from "../../../v5-compat.js"
import {
  assert,
  describe,
  it,
  beforeEach,
  beforeAll,
  afterEach,
  afterAll,
} from "vitest"
import {testProtos, uniqAddress} from "../helpers.js"

if (process.env.INCLUDE_COMPAT_TESTS === "true") {
  for (const proto of testProtos("tcp")) {
    describe(`compat proxy with ${proto} push-pull`, function () {
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
        if (sockets.length) {
          sockets.pop()?.close()
        }
      })

      it("should proxy push-pull connected to pull-push", function (done) {
        const frontend = zmq.socket("pull")
        const backend = zmq.socket("push")

        const pull = zmq.socket("pull")
        const push = zmq.socket("push")

        frontend.bind(frontendAddr, err => {
          if (err) {
            throw err
          }
          backend.bind(backendAddr, err => {
            if (err) {
              throw err
            }
            push.connect(frontendAddr)
            pull.connect(backendAddr)
            sockets.push(frontend, backend, push, pull)

            pull.on("message", msg => {
              assert.instanceOf(msg, Buffer)
              assert.equal(msg.toString(), "foo")
              done()
            })

            setTimeout(() => push.send("foo"), 15)
            zmq.proxy(frontend, backend)
          })
        })
      })

      it("should proxy pull-push connected to push-pull with capture", function (done) {
        const frontend = zmq.socket("push")
        const backend = zmq.socket("pull")

        const capture = zmq.socket("pub")
        const capSub = zmq.socket("sub")

        const pull = zmq.socket("pull")
        const push = zmq.socket("push")
        sockets.push(frontend, backend, push, pull, capture, capSub)

        frontend.bind(frontendAddr, err => {
          if (err) {
            throw err
          }
          backend.bind(backendAddr, err => {
            if (err) {
              throw err
            }
            capture.bind(captureAddr, err => {
              if (err) {
                throw err
              }
              pull.connect(frontendAddr)
              push.connect(backendAddr)
              capSub.connect(captureAddr)

              let counter = 2

              pull.on("message", function (msg) {
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

              setTimeout(() => push.send("foo"), 15)
              zmq.proxy(frontend, backend, capture)
            })
          })
        })
      })
    })
  }
}
