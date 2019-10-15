import * as semver from "semver"
import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`proxy with ${proto} run`, function() {
    let proxy: zmq.Proxy

    beforeEach(async function() {
      /* ZMQ < 4.0.5 has no steerable proxy support. */
      if (semver.satisfies(zmq.version, "< 4.0.5")) this.skip()

      proxy = new zmq.Proxy(new zmq.Router, new zmq.Dealer)
    })

    afterEach(function() {
      proxy.frontEnd.close()
      proxy.backEnd.close()
      global.gc()
    })

    describe("run", function() {
      it("should fail if front end is not bound or connected", async function() {
        await proxy.backEnd.bind(uniqAddress(proto))

        try {
          await proxy.run()
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Front-end socket must be bound or connected")
        }
      })

      it("should fail if front end is not open", async function() {
        await proxy.frontEnd.bind(uniqAddress(proto))
        await proxy.backEnd.bind(uniqAddress(proto))
        proxy.frontEnd.close()

        try {
          await proxy.run()
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Front-end socket must be bound or connected")
        }
      })

      it("should fail if back end is not bound or connected", async function() {
        await proxy.frontEnd.bind(uniqAddress(proto))

        try {
          await proxy.run()
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Back-end socket must be bound or connected")
        }
      })

      it("should fail if back end is not open", async function() {
        await proxy.frontEnd.bind(uniqAddress(proto))
        await proxy.backEnd.bind(uniqAddress(proto))
        proxy.backEnd.close()

        try {
          await proxy.run()
          assert.ok(false)
        } catch (err) {
          assert.instanceOf(err, Error)
          assert.equal(err.message, "Back-end socket must be bound or connected")
        }
      })
    })
  })
}
