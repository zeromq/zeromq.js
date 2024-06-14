import * as semver from "semver"
import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"
import {isFullError} from "../../src/errors"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`proxy with ${proto} terminate`, function () {
    /* ZMQ < 4.0.5 has no steerable proxy support. */
    if (semver.satisfies(zmq.version, "< 4.0.5")) {
      return
    }

    let proxy: zmq.Proxy

    beforeEach(async function () {
      proxy = new zmq.Proxy(new zmq.Router(), new zmq.Dealer())
    })

    afterEach(function () {
      proxy.frontEnd.close()
      proxy.backEnd.close()
      global.gc?.()
    })

    it("should throw if called after termination", async function () {
      await proxy.frontEnd.bind(uniqAddress(proto))
      await proxy.backEnd.bind(uniqAddress(proto))

      const sleep_ms = 50

      setTimeout(() => proxy.terminate(), sleep_ms)
      await proxy.run()

      try {
        await proxy.terminate()
        assert.ok(false)
      } catch (err) {
        if (!isFullError(err)) {
          throw err
        }
        assert.equal(err.message, "Socket is closed")
        assert.equal(err.code, "EBADF")
        assert.typeOf(err.errno, "number")
      }
    })
  })
}
