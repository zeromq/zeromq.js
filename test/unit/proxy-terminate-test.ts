import * as semver from "semver"
import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"
import {isFullError} from "../../src/errors"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`proxy with ${proto} terminate`, function () {
    let proxy: zmq.Proxy

    beforeEach(async function () {
      /* ZMQ < 4.0.5 has no steerable proxy support. */
      if (semver.satisfies(zmq.version, "< 4.0.5")) {
        this.skip()
      }

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

      try {
        const timer = setTimeout(() => proxy.terminate(), 50)
        await proxy.run()

        await proxy.terminate()
        timer.unref()
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
