import * as zmq from "../../../v5-compat.js"
import {assert} from "chai"
import {testProtos, uniqAddress} from "../helpers.js"

if (process.env.INCLUDE_COMPAT_TESTS === "true") {
  for (const proto of testProtos("tcp", "inproc")) {
    describe(`compat socket with ${proto} router`, function () {
      let address: string
      beforeEach(async () => {
        address = await uniqAddress(proto)
      })

      it("should handle unroutable messages", function (done) {
        let complete = 0

        const envelope = "12384982398293"

        const errMsgs =
          require("os").platform() === "win32" ? ["Unknown error"] : []
        errMsgs.push("No route to host")
        errMsgs.push("Resource temporarily unavailable")
        errMsgs.push("Host unreachable")

        function assertRouteError(err: Error | undefined) {
          if (err === undefined) {
            throw new Error("No error was emitted")
          }
          if (errMsgs.indexOf(err.message) === -1) {
            throw new Error(err.message)
          }
        }

        // should emit an error event on unroutable msgs if mandatory = 1 and error handler is set

        const sockA = zmq.socket("router")
        sockA.on("error", err => {
          sockA.close()
          assertRouteError(err)
          if (++complete === 2) {
            done()
          }
        })

        sockA.setsockopt(zmq.ZMQ_ROUTER_MANDATORY, 1)
        sockA.setsockopt(zmq.ZMQ_SNDTIMEO, 10)

        sockA.send([envelope, ""])

        // should throw an error on unroutable msgs if mandatory = 1 and no error handler is set

        const sockB = zmq.socket("router")

        sockB.setsockopt(zmq.ZMQ_ROUTER_MANDATORY, 1)
        sockB.setsockopt(zmq.ZMQ_SNDTIMEO, 10)

        sockB.send([envelope, ""], null, err => {
          assertRouteError(err)
        })

        sockB.send([envelope, ""], null, err => {
          assertRouteError(err)
        })

        sockB.send([envelope, ""], null, err => {
          assertRouteError(err)
        })

        sockB.close()

        // should silently ignore unroutable msgs if mandatory = 0

        const sockC = zmq.socket("router")

        sockC.send([envelope, ""])
        sockC.close()

        if (++complete === 2) {
          done()
        }
      })

      it("should handle router-dealer message bursts", function (done) {
        // tests https://github.com/JustinTulloss/zeromq.node/issues/523
        // based on https://gist.github.com/messa/862638ab44ca65f712fe4d6ef79aeb67

        const router = zmq.socket("router")
        const dealer = zmq.socket("dealer")

        const expected = 1000
        let counted = 0

        router.bind(address, err => {
          if (err) {
            throw err
          }

          router.on("message", function (...msg) {
            router.send(msg)
          })

          dealer.on("message", function (part1, part2, part3, part4, part5) {
            assert.equal(part1.toString(), "Hello")
            assert.equal(part2.toString(), "world")
            assert.equal(part3.toString(), "part3")
            assert.equal(part4.toString(), "part4")
            assert.equal(part5, undefined)

            counted += 1
            if (counted === expected) {
              router.close()
              dealer.close()
              done()
            }
          })

          dealer.connect(address)

          for (let i = 0; i < expected; i += 1) {
            dealer.send(["Hello", "world", "part3", "part4"])
          }
        })
      })
    })
  }
}
