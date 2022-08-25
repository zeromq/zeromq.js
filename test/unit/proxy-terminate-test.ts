import * as semver from "semver"
import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"

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

      setTimeout(() => proxy.terminate(), 50)
      await proxy.run()

      try {
        await proxy.terminate()
        assert.ok(false)
      } catch (err) {
        assert.instanceOf(err, Error)
        assert.equal(err.message, "Socket is closed")
        assert.equal(err.code, "EBADF")
        assert.typeOf(err.errno, "number")
      }
    })
  })
}
