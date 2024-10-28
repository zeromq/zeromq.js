import * as semver from "semver"
import * as zmq from "../../src/index.js"

import {
  assert,
  describe,
  it,
  beforeEach,
  beforeAll,
  afterEach,
  afterAll,
} from "vitest"
import {testProtos, uniqAddress} from "./helpers.js"
import {isFullError} from "../../src/errors.js"

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

    const terminator_test = () => {
      try {
        proxy.terminate()
        assert.ok(false)
      } catch (err) {
        if (!isFullError(err)) {
          throw err
        }
        assert.equal(err.message, "Socket is closed")
        assert.equal(err.code, "EBADF")
        assert.typeOf(err.errno, "number")
      }
    }

    it("should throw if not started yet", async function () {
      await proxy.frontEnd.bind(await uniqAddress(proto))
      await proxy.backEnd.bind(await uniqAddress(proto))

      terminator_test()
    })

    it("should throw if called after termination", async function () {
      await proxy.frontEnd.bind(await uniqAddress(proto))
      await proxy.backEnd.bind(await uniqAddress(proto))

      setTimeout(() => {
        proxy.terminate()
      }, 50)

      await proxy.run()
      // TODO throws Operation not supported

      terminator_test()
    })
  })
}
