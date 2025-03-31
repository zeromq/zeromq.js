import {describe, it, beforeEach, afterEach, before, after} from "mocha"
import {assert} from "chai"

import * as semver from "semver"

import * as zmq from "../../src"

import {testProtos, uniqAddress} from "./helpers"
import {isFullError} from "../../src/errors"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} connect/disconnect`, function () {
    let sock: zmq.Dealer | zmq.Router

    beforeEach(function () {
      sock = new zmq.Dealer()
    })

    afterEach(function () {
      sock.close()
      global.gc?.()
    })

    describe("connect", function () {
      it("should throw error for invalid uri", async function () {
        try {
          await sock.connect("foo-bar")
          assert.ok(false)
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.equal(err.message, "Invalid argument")
          assert.equal(err.code, "EINVAL")
          assert.typeOf(err.errno, "number")
          assert.equal(err.address, "foo-bar")
        }
      })

      it("should throw error for invalid protocol", async function () {
        try {
          await sock.connect("foo://bar")
          assert.ok(false)
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.equal(err.message, "Protocol not supported")
          assert.equal(err.code, "EPROTONOSUPPORT")
          assert.typeOf(err.errno, "number")
          assert.equal(err.address, "foo://bar")
        }
      })

      if (semver.satisfies(zmq.version, ">= 4.1")) {
        it("should allow setting routing id on router", async function () {
          sock = new zmq.Router({mandatory: true, linger: 0})
          await sock.connect(await uniqAddress(proto), {routingId: "remoteId"})
          await sock.send(["remoteId", "hi"])
        })
      }
    })

    describe("disconnect", function () {
      it("should throw error if not connected to endpoint", async function () {
        const address = await uniqAddress(proto)
        try {
          await sock.disconnect(address)
          assert.ok(false)
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.equal(err.message, "No such endpoint")
          assert.equal(err.code, "ENOENT")
          assert.typeOf(err.errno, "number")
          assert.equal(err.address, address)
        }
      })

      it("should throw error for invalid uri", async function () {
        try {
          await sock.disconnect("foo-bar")
          assert.ok(false)
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.equal(err.message, "Invalid argument")
          assert.equal(err.code, "EINVAL")
          assert.typeOf(err.errno, "number")
          assert.equal(err.address, "foo-bar")
        }
      })

      it("should throw error for invalid protocol", async function () {
        try {
          await sock.disconnect("foo://bar")
          assert.ok(false)
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.equal(err.message, "Protocol not supported")
          assert.equal(err.code, "EPROTONOSUPPORT")
          assert.typeOf(err.errno, "number")
          assert.equal(err.address, "foo://bar")
        }
      })
    })
  })
}
