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
  for (const proto of testProtos("tcp", "inproc")) {
    describe(`compat socket with ${proto} push-pull`, function () {
      let address: string
      beforeEach(async () => {
        address = await uniqAddress(proto)
      })

      it("should support push-pull", function (done) {
        const push = zmq.socket("push")
        const pull = zmq.socket("pull")

        let n = 0
        pull.on("message", function (msg) {
          assert.instanceOf(msg, Buffer)
          switch (n++) {
            case 0:
              assert.equal(msg.toString(), "foo")
              break
            case 1:
              assert.equal(msg.toString(), "bar")
              break
            case 2:
              assert.equal(msg.toString(), "baz")
              pull.close()
              push.close()
              done()
              break
          }
        })

        pull.bind(address, err => {
          if (err) {
            throw err
          }
          push.connect(address)

          push.send("foo")
          push.send("bar")
          push.send("baz")
        })
      })

      it("should not emit messages after pause", function (done) {
        const push = zmq.socket("push")
        const pull = zmq.socket("pull")

        let n = 0

        pull.on("message", function (msg) {
          if (n++ === 0) {
            assert.equal(msg.toString(), "foo")
          } else {
            assert.equal(msg, undefined)
          }
        })

        pull.bind(address, err => {
          if (err) {
            throw err
          }
          push.connect(address)

          push.send("foo")
          pull.pause()
          push.send("bar")
          push.send("baz")
        })

        setTimeout(() => {
          pull.close()
          push.close()
          done()
        }, 15)
      })

      it("should be able to read messages after pause", function (done) {
        const push = zmq.socket("push")
        const pull = zmq.socket("pull")

        const messages = ["bar", "foo"]
        pull.bind(address, err => {
          if (err) {
            throw err
          }
          push.connect(address)

          pull.pause()
          messages.forEach(function (message) {
            push.send(message)
          })

          let i = 0
          pull.on("message", message => {
            assert.equal(message.toString(), messages[i++])
          })
        })

        setTimeout(() => {
          pull.close()
          push.close()
          done()
        }, 15)
      })

      it("should emit messages after resume", function (done) {
        const push = zmq.socket("push")
        const pull = zmq.socket("pull")

        let n = 0

        function checkNoMessages(msg: string) {
          assert.equal(msg, undefined)
        }

        function checkMessages(msg: string) {
          assert.instanceOf(msg, Buffer)
          switch (n++) {
            case 0:
              assert.equal(msg.toString(), "foo")
              break
            case 1:
              assert.equal(msg.toString(), "bar")
              break
            case 2:
              assert.equal(msg.toString(), "baz")
              pull.close()
              push.close()
              done()
              break
          }
        }

        pull.on("message", checkNoMessages)

        pull.bind(address, err => {
          if (err) {
            throw err
          }
          push.connect(address)
          pull.pause()

          push.send("foo")
          push.send("bar")
          push.send("baz")

          setTimeout(() => {
            pull.removeListener("message", checkNoMessages)
            pull.on("message", checkMessages)
            pull.resume()
          }, 15)
        })
      })
    })
  }
}
