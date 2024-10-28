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
    describe(`compat socket with ${proto} pub-sub`, function () {
      let pub: zmq.Socket
      let sub: zmq.Socket
      let address: string
      beforeEach(async function () {
        pub = zmq.socket("pub")
        sub = zmq.socket("sub")
        address = await uniqAddress(proto)
      })

      it("should support pub-sub", function (done) {
        let n = 0

        sub.subscribe("")
        sub.on("message", function (msg) {
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
              sub.close()
              pub.close()
              done()
              break
          }
        })

        sub.bind(address, err => {
          if (err) {
            throw err
          }
          pub.connect(address)

          // The connect is asynchronous, and messages published to a non-
          // connected socket are silently dropped.  That means that there is
          // a race between connecting and sending the first message which
          // causes this test to hang, especially when running on Linux. Even an
          // inproc:// socket seems to be asynchronous.  So instead of
          // sending straight away, we wait 100ms for the connection to be
          // established before we start the send.  This fixes the observed
          // hang.

          setTimeout(() => {
            pub.send("foo")
            pub.send("bar")
            pub.send("baz")
          }, 15)
        })
      })

      it("should support pub-sub filter", function (done) {
        let n = 0

        sub.subscribe("js")
        sub.subscribe("luna")

        sub.on("message", function (msg) {
          assert.instanceOf(msg, Buffer)
          switch (n++) {
            case 0:
              assert.equal(msg.toString(), "js is cool")
              break
            case 1:
              assert.equal(msg.toString(), "luna is cool too")
              sub.close()
              pub.close()
              done()
              break
          }
        })

        sub.bind(address, err => {
          if (err) {
            throw err
          }
          pub.connect(address)

          // See comments on pub-sub test.

          setTimeout(() => {
            pub.send("js is cool")
            pub.send("ruby is meh")
            pub.send("py is pretty cool")
            pub.send("luna is cool too")
          }, 15)
        })
      })

      describe("with errors", function () {
        before(function () {
          this.uncaughtExceptionListeners =
            process.listeners("uncaughtException")
          process.removeAllListeners("uncaughtException")
        })

        after(function () {
          process.removeAllListeners("uncaughtException")
          for (const listener of this.uncaughtExceptionListeners) {
            process.on("uncaughtException", listener)
          }
        })

        it("should continue to deliver messages in message handler", function (done) {
          let error: Error
          process.once("uncaughtException", err => {
            error = err
          })

          let n = 0

          sub.subscribe("")
          sub.on("message", function (msg) {
            assert.instanceOf(msg, Buffer)
            switch (n++) {
              case 0:
                assert.equal(msg.toString(), "foo")
                throw Error("test error")
                break
              case 1:
                assert.equal(msg.toString(), "bar")
                sub.close()
                pub.close()
                assert.equal(error.message, "test error")
                done()
                break
            }
          })

          sub.bind(address, err => {
            if (err) {
              throw err
            }
            pub.connect(address)

            setTimeout(() => {
              pub.send("foo")
              pub.send("bar")
            }, 15)
          })
        })
      })
    })
  }
}
