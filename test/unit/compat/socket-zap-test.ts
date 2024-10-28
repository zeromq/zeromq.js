import * as zmq from "../../../v5-compat.js"
import {capability} from "../../../src/index.js"
import semver from "semver"
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
  function start() {
    const zap = zmq.socket("router")

    zap.on("message", function () {
      const data = Array.prototype.slice.call(arguments)

      if (!data || !data.length) {
        throw new Error("Invalid ZAP request")
      }

      const returnPath = []
      let frame = data.shift()
      while (frame && frame.length != 0) {
        returnPath.push(frame)
        frame = data.shift()
      }

      returnPath.push(frame)

      if (data.length < 6) {
        throw new Error("Invalid ZAP request")
      }

      const zapReq = {
        version: data.shift(),
        requestId: data.shift(),
        domain: Buffer.from(data.shift()).toString("utf8"),
        address: Buffer.from(data.shift()).toString("utf8"),
        identity: Buffer.from(data.shift()).toString("utf8"),
        mechanism: Buffer.from(data.shift()).toString("utf8"),
        credentials: data.slice(0),
      }

      zap.send(
        returnPath.concat([
          zapReq.version,
          zapReq.requestId,
          Buffer.from("200", "utf8"),
          Buffer.from("OK", "utf8"),
          Buffer.alloc(0),
          Buffer.alloc(0),
        ]),
      )
    })

    return new Promise<zmq.Socket>((resolve, reject) => {
      zap.bind("inproc://zeromq.zap.01", err => {
        if (err) {
          return reject(err)
        }
        resolve(zap)
      })
    })
  }

  for (const proto of testProtos("tcp", "inproc")) {
    describe(`compat socket with ${proto} zap`, function () {
      let zapSocket: zmq.Socket
      let rep: zmq.Socket
      let req: zmq.Socket
      let address: string

      before(async function () {
        zapSocket = await start()
      })

      after(async function () {
        zapSocket.close()
        await new Promise(resolve => {
          setTimeout(resolve, 15)
        })
      })

      beforeEach(async function (ctx) {
        /* Since ZAP uses inproc transport, it does not work reliably. */
        if (semver.satisfies(zmq.version, "< 4.2")) {
          ctx.skip()
        }

        rep = zmq.socket("rep")
        req = zmq.socket("req")
        address = await uniqAddress(proto)
      })

      afterEach(function () {
        req.close()
        rep.close()
      })

      it("should support curve", function (ctx) {
        if (!capability.curve) {
          ctx.skip()
        }

        const serverPublicKey = Buffer.from(
          "7f188e5244b02bf497b86de417515cf4d4053ce4eb977aee91a55354655ec33a",
          "hex",
        )
        const serverPrivateKey = Buffer.from(
          "1f5d3873472f95e11f4723d858aaf0919ab1fb402cb3097742c606e61dd0d7d8",
          "hex",
        )
        const clientPublicKey = Buffer.from(
          "ea1cc8bd7c8af65497d43fc21dbec6560c5e7b61bcfdcbd2b0dfacf0b4c38d45",
          "hex",
        )
        const clientPrivateKey = Buffer.from(
          "83f99afacfab052406e5f421612568034e85f4c8182a1c92671e83dca669d31d",
          "hex",
        )

        rep.on("message", function (msg: unknown) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "hello")
          rep.send("world")
        })

        rep.zap_domain = "test"
        rep.curve_server = 1
        rep.curve_secretkey = serverPrivateKey
        assert.equal(rep.mechanism, 2)

        rep.bind(address, (err: any) => {
          if (err) {
            throw err
          }
          req.curve_serverkey = serverPublicKey
          req.curve_publickey = clientPublicKey
          req.curve_secretkey = clientPrivateKey
          assert.equal(req.mechanism, 2)

          req.connect(address)
          req.send("hello")
          req.on("message", function (msg: unknown) {
            assert.instanceOf(msg, Buffer)
            assert.equal(msg.toString(), "world")
            done()
          })
        })
      })

      it("should support null", function (done) {
        rep.on("message", function (msg: unknown) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "hello")
          rep.send("world")
        })

        rep.zap_domain = "test"
        assert.equal(rep.mechanism, 0)

        rep.bind(address, (err: any) => {
          if (err) {
            throw err
          }
          assert.equal(req.mechanism, 0)
          req.connect(address)
          req.send("hello")
          req.on("message", function (msg: unknown) {
            assert.instanceOf(msg, Buffer)
            assert.equal(msg.toString(), "world")
            done()
          })
        })
      })

      it("should support plain", function (done) {
        rep.on("message", function (msg: unknown) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "hello")
          rep.send("world")
        })

        rep.zap_domain = "test"
        rep.plain_server = 1
        assert.equal(rep.mechanism, 1)

        rep.bind(address, (err: any) => {
          if (err) {
            throw err
          }
          req.plain_username = "user"
          req.plain_password = "pass"
          assert.equal(req.mechanism, 1)

          req.connect(address)
          req.send("hello")
          req.on("message", function (msg: unknown) {
            assert.instanceOf(msg, Buffer)
            assert.equal(msg.toString(), "world")
            done()
          })
        })
      })
    })
  }
}
