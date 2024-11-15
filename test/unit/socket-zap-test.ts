import * as semver from "semver"
import * as zmq from "../../src"

import {assert} from "chai"
import {captureEvent, testProtos, uniqAddress} from "./helpers"

for (const proto of testProtos("tcp", "ipc")) {
  describe(`socket with ${proto} zap`, function () {
    let sockA: zmq.Pair
    let sockB: zmq.Pair
    let handler: ZapHandler | undefined

    beforeEach(function () {
      sockA = new zmq.Pair()
      sockB = new zmq.Pair()
    })

    afterEach(function () {
      if (handler) {
        handler.stop()
      }
      sockA.close()
      sockB.close()
      global.gc?.()
    })

    describe("with plain mechanism", function () {
      it("should deliver message", async function () {
        handler = new ValidatingZapHandler({
          domain: "test",
          mechanism: "PLAIN",
          credentials: ["user", "pass"],
        })

        sockA.plainServer = true
        sockA.zapDomain = "test"

        sockB.plainUsername = "user"
        sockB.plainPassword = "pass"

        assert.equal(sockA.securityMechanism, "plain")
        assert.equal(sockB.securityMechanism, "plain")

        const address = await uniqAddress(proto)
        await sockA.bind(address)
        await sockB.connect(address)

        const sent = "foo"
        await sockA.send(sent)
        const recv = await sockB.receive()
        assert.deepEqual(
          [sent],
          recv.map((buf: Buffer) => buf.toString()),
        )
      })

      it("should report authentication error", async function () {
        /* ZMQ < 4.3.0 does not have these event details. */
        if (semver.satisfies(zmq.version, "< 4.3.0")) {
          this.skip()
        }

        handler = new ValidatingZapHandler({
          domain: "test",
          mechanism: "PLAIN",
          credentials: ["user", "pass"],
        })

        sockA.plainServer = true
        sockA.zapDomain = "test"

        sockB.plainUsername = "user"
        sockB.plainPassword = "BAD PASS"

        const address = await uniqAddress(proto)

        const [eventA, eventB] = await Promise.all([
          captureEvent(sockA, "handshake:error:auth"),
          captureEvent(sockB, "handshake:error:auth"),
          sockA.bind(address),
          sockB.connect(address),
        ])

        assert.equal(eventA.type, "handshake:error:auth")
        assert.equal(eventB.type, "handshake:error:auth")

        assert.equal(eventA.address, address)
        assert.equal(eventB.address, address)

        assert.instanceOf(eventA.error, Error)
        assert.instanceOf(eventB.error, Error)

        assert.equal(eventA.error.message, "Authentication failure")
        assert.equal(eventB.error.message, "Authentication failure")

        assert.equal(eventA.error.status, 400)
        assert.equal(eventB.error.status, 400)
      })

      it("should report protocol version error", async function () {
        /* ZMQ < 4.3.0 does not have these event details. */
        if (semver.satisfies(zmq.version, "< 4.3.0")) {
          this.skip()
        }

        handler = new CustomZapHandler(
          ([path, delim, version, id, ...rest]) => {
            return [path, delim, "9.9", id, "200", "OK", null, null]
          },
        )

        sockA.plainServer = true
        sockA.zapDomain = "test"

        sockB.plainUsername = "user"

        const address = await uniqAddress(proto)
        const [eventA] = await Promise.all([
          captureEvent(sockA, "handshake:error:protocol"),
          sockA.bind(address),
          sockB.connect(address),
        ])

        assert.equal(eventA.type, "handshake:error:protocol")
        assert.equal(eventA.address, address)
        assert.instanceOf(eventA.error, Error)
        assert.equal(eventA.error.message, "ZAP protocol error")
        assert.equal(eventA.error.code, "ERR_ZAP_BAD_VERSION")
      })

      it("should report protocol format error", async function () {
        /* ZMQ < 4.3.0 does not have these event details. */
        if (semver.satisfies(zmq.version, "< 4.3.0")) {
          this.skip()
        }

        handler = new CustomZapHandler(([path, delim, ...rest]) => {
          return [path, delim, null, null]
        })

        sockA.plainServer = true
        sockA.zapDomain = "test"

        sockB.plainUsername = "user"

        const address = await uniqAddress(proto)
        const [eventA] = await Promise.all([
          captureEvent(sockA, "handshake:error:protocol"),
          sockA.bind(address),
          sockB.connect(address),
        ])

        assert.equal(eventA.type, "handshake:error:protocol")
        assert.equal(eventA.address, address)
        assert.instanceOf(eventA.error, Error)
        assert.equal(eventA.error.message, "ZAP protocol error")
        assert.equal(eventA.error.code, "ERR_ZAP_MALFORMED_REPLY")
      })

      it("should report mechanism mismatch error", async function () {
        /* ZMQ < 4.3.0 does not have these event details. */
        if (semver.satisfies(zmq.version, "< 4.3.0")) {
          this.skip()
        }
        if (zmq.capability.curve !== true) {
          console.warn("Curve not supported by this zmq build")
          this.skip()
        }

        sockA.plainServer = true
        sockB.curveServer = true

        const address = await uniqAddress(proto)
        const [eventA, eventB] = await Promise.all([
          captureEvent(sockA, "handshake:error:protocol"),
          captureEvent(sockB, "handshake:error:protocol"),
          sockA.bind(address),
          sockB.connect(address),
        ])

        assert.equal(eventA.type, "handshake:error:protocol")
        assert.equal(eventB.type, "handshake:error:protocol")

        assert.equal(eventA.address, address)
        assert.equal(eventB.address, address)

        assert.instanceOf(eventA.error, Error)
        assert.instanceOf(eventB.error, Error)

        assert.equal(eventA.error.message, "ZMTP protocol error")
        assert.equal(eventB.error.message, "ZMTP protocol error")

        assert.equal(eventA.error.code, "ERR_ZMTP_MECHANISM_MISMATCH")
        assert.equal(eventB.error.code, "ERR_ZMTP_MECHANISM_MISMATCH")
      })
    })
  })
}

interface ZapDetails {
  domain: string
  mechanism: "NULL" | "PLAIN" | "CURVE"
  credentials: string[]
}

abstract class ZapHandler {
  socket = new zmq.Router()

  async run() {
    await this.socket.bind("inproc://zeromq.zap.01")

    /* See https://rfc.zeromq.org/spec:27/ZAP/ */
    for await (const msg of this.socket) {
      await this.socket.send(this.handle(msg))
    }
  }

  stop() {
    this.socket.close()
  }

  protected abstract handle(request: Buffer[]): Array<Buffer | string | null>
}

class ValidatingZapHandler extends ZapHandler {
  details: ZapDetails

  constructor(details: ZapDetails) {
    super()
    this.details = details
    this.run().catch(err => {
      throw err
    })
  }

  handle(request: Buffer[]) {
    const [
      path,
      delimiter,
      version,
      id,
      domain,
      address,
      identity,
      mechanism,
      ...credentials
    ] = request

    let status = ["200", "OK"]
    if (mechanism.toString() === "NULL" && credentials.length !== 0) {
      status = ["300", "Expected no credentials"]
    } else if (mechanism.toString() === "PLAIN" && credentials.length !== 2) {
      status = ["300", "Expected 2 credentials"]
    } else if (mechanism.toString() === "CURVE" && credentials.length !== 1) {
      status = ["300", "Expected 1 credential"]
    } else if (domain.toString() !== this.details.domain) {
      status = ["400", "Unknown domain"]
    } else {
      for (const [i, credential] of credentials.entries()) {
        if (this.details.credentials[i] !== credential.toString()) {
          status = ["400", "Bad credentials"]
          break
        }
      }
    }

    return [path, delimiter, version, id, ...status, null, null]
  }
}

class CustomZapHandler extends ZapHandler {
  handle: ZapHandler["handle"]

  constructor(handler: ZapHandler["handle"]) {
    super()
    this.handle = handler
    this.run().catch(err => {
      throw err
    })
  }
}
