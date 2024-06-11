/// <reference lib="ESNext" />

import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress, getGcOrSkipTest} from "./helpers"
import {isFullError} from "../../src/errors"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} send/receive`, function () {
    let sockA: zmq.Pair
    let sockB: zmq.Pair

    beforeEach(function () {
      sockA = new zmq.Pair({linger: 0})
      sockB = new zmq.Pair({linger: 0})
    })

    afterEach(function () {
      sockA.close()
      sockB.close()
      global.gc?.()
    })

    describe("when not applicable", function () {
      it("should fail sending", function () {
        try {
          ;(new zmq.Subscriber() as any).send()
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.include(err.message, "Message must be present")
        }
      })

      it("should fail receiving", function () {
        try {
          ;(new zmq.Publisher() as any).receive()
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.include(err.message, "receive is not a function")
        }
      })

      it("should fail iterating", async function () {
        this.test?.skip() // TODO this test timeouts

        try {
          /* eslint-disable-next-line no-empty */
          for await (const msg of new zmq.Publisher() as any) {
          }
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.include(err.message, "receive is not a function")
        }
      })
    })

    describe("when not connected", function () {
      beforeEach(async function () {
        sockA.sendHighWaterMark = 1
        await sockA.connect(await uniqAddress(proto))
      })

      it("should be writable", async function () {
        assert.equal(sockA.writable, true)
      })

      it("should not be readable", async function () {
        assert.equal(sockA.readable, false)
      })

      it("should honor send high water mark and timeout", async function () {
        sockA.sendTimeout = 2
        await sockA.send(Buffer.alloc(8192))
        try {
          await sockA.send(Buffer.alloc(8192))
          assert.ok(false)
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.equal(err.message, "Operation was not possible or timed out")
          assert.equal(err.code, "EAGAIN")
          assert.typeOf(err.errno, "number")
        }
      })

      it("should copy and release small buffers", async function () {
        const gc = getGcOrSkipTest(this)
        let weakRef: undefined | WeakRef<any>
        sockA.connect(await uniqAddress(proto))
        const send = async (size: number) => {
          const msg = Buffer.alloc(size)
          weakRef = new WeakRef(msg)
          await sockA.send(msg)
        }

        await send(16)
        await gc()
        assert.isDefined(weakRef)
        assert.isUndefined(weakRef!.deref())
      })

      it("should retain large buffers", async function () {
        const gc = getGcOrSkipTest(this)
        let weakRef: undefined | WeakRef<any>

        sockA.connect(await uniqAddress(proto))
        const send = async (size: number) => {
          const msg = Buffer.alloc(size)
          weakRef = new WeakRef(msg)
          await sockA.send(msg)
        }

        await send(1025)
        await gc()
        assert.isDefined(weakRef)
        assert.isDefined(weakRef.deref())
      })
    })

    describe("when connected", function () {
      beforeEach(async function () {
        const address = await uniqAddress(proto)
        await sockB.bind(address)
        await sockA.connect(address)
      })

      it("should be writable", async function () {
        assert.equal(sockA.writable, true)
      })

      it("should not be readable", async function () {
        assert.equal(sockA.readable, false)
      })

      it("should be readable if message is available", async function () {
        await sockB.send(Buffer.from("foo"))
        await new Promise(resolve => {
          setTimeout(resolve, 15)
        })
        assert.equal(sockA.readable, true)
      })

      it("should deliver single string message", async function () {
        const sent = "foo"
        await sockA.send(sent)

        const recv = await sockB.receive()
        assert.deepEqual(
          [sent],
          recv.map((buf: Buffer) => buf.toString()),
        )
      })

      it("should deliver single buffer message", async function () {
        const sent = Buffer.from("foo")
        await sockA.send(sent)

        const recv = await sockB.receive()
        assert.deepEqual([sent], recv)
      })

      it("should deliver single multipart string message", async function () {
        const sent = ["foo", "bar"]
        await sockA.send(sent)

        const recv = await sockB.receive()
        assert.deepEqual(
          sent,
          recv.map((buf: Buffer) => buf.toString()),
        )
      })

      it("should deliver single multipart buffer message", async function () {
        const sent = [Buffer.from("foo"), Buffer.from("bar")]
        await sockA.send(sent)

        const recv = await sockB.receive()
        assert.deepEqual(sent, recv)
      })

      it("should deliver multiple messages", async function () {
        const messages = ["foo", "bar", "baz", "qux"]
        for (const msg of messages) {
          await sockA.send(msg)
        }

        const received: string[] = []
        for await (const msg of sockB) {
          received.push(msg.toString())
          if (received.length === messages.length) {
            break
          }
        }

        assert.deepEqual(received, messages)
      })

      it("should deliver typed array and array buffer messages", async function () {
        const messages = [
          Uint8Array.from([0x66, 0x6f, 0x6f]),
          Uint8Array.from([0x66, 0x6f, 0x6f]).buffer,
          Int32Array.from([0x66, 0x6f, 0x6f]),
          Int32Array.from([0x66, 0x6f, 0x6f]).buffer,
        ]

        for (const msg of messages) {
          await sockA.send(msg)
        }

        const received: string[] = []
        for await (const msg of sockB) {
          received.push(msg.toString())
          if (received.length === messages.length) {
            break
          }
        }

        assert.deepEqual(received, [
          "foo",
          "foo",
          "f\x00\x00\x00o\x00\x00\x00o\x00\x00\x00",
          "f\x00\x00\x00o\x00\x00\x00o\x00\x00\x00",
        ])
      })

      it("should deliver messages coercible to string", async function () {
        const messages = [
          null,
          function () {},
          16.19,
          true,
          {},
          Promise.resolve(),
        ]
        for (const msg of messages) {
          await sockA.send(msg as zmq.MessageLike)
        }

        const received: string[] = []
        for await (const msg of sockB) {
          received.push(msg.toString())
          if (received.length === messages.length) {
            break
          }
        }

        /* Unify different output across Node/TypeScript versions. */
        received[1] = received[1].replace("function()", "function ()")
        received[1] = received[1].replace("function () { }", "function () {}")
        assert.deepEqual(received, [
          "",
          "function () {}",
          "16.19",
          "true",
          "[object Object]",
          "[object Promise]",
        ])
      })

      it("should poll simultaneously", async function () {
        this.timeout(5000)

        const sendReceiveA = async () => {
          const [msg1] = await Promise.all([
            sockA.receive(),
            sockA.send(Buffer.from("foo")),
          ])
          return msg1.toString()
        }

        const sendReceiveB = async () => {
          const [msg2] = await Promise.all([
            sockB.receive(),
            sockB.send(Buffer.from("bar")),
          ])
          return msg2.toString()
        }

        const msgs = await Promise.all([sendReceiveA(), sendReceiveB()])
        assert.deepEqual(msgs, ["bar", "foo"])
      })

      it("should poll simultaneously after delay", async function () {
        await new Promise(resolve => {
          setTimeout(resolve, 15)
        })
        const sendReceiveA = async () => {
          const [msg1] = await Promise.all([
            sockA.receive(),
            sockA.send(Buffer.from("foo")),
          ])
          return msg1.toString()
        }

        const sendReceiveB = async () => {
          const [msg2] = await Promise.all([
            sockB.receive(),
            sockB.send(Buffer.from("bar")),
          ])
          return msg2.toString()
        }

        const msgs = await Promise.all([sendReceiveA(), sendReceiveB()])
        assert.deepEqual(msgs, ["bar", "foo"])
      })

      it("should honor receive timeout", async function () {
        sockA.receiveTimeout = 2
        try {
          await sockA.receive()
          assert.ok(false)
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.equal(err.message, "Operation was not possible or timed out")
          assert.equal(err.code, "EAGAIN")
          assert.typeOf(err.errno, "number")
        }
      })

      it("should release buffers", async function () {
        const gc = await getGcOrSkipTest(this)

        const weakRefs: WeakRef<any>[] = []

        const n = 10

        const send = async (size: number) => {
          for (let i = 0; i < n; i++) {
            const msg = Buffer.alloc(size)
            weakRefs.push(new WeakRef(msg))
            await sockA.send(msg)
          }
        }

        const receive = async () => {
          for (let i = 0; i < n; i++) {
            const msg = await sockB.receive()
            weakRefs.push(new WeakRef(msg))
          }
        }

        await Promise.all([send(2048), receive()])

        /* Repeated GC to allow inproc messages from being collected. */
        for (let i = 0; i < 5; i++) {
          await gc()

          await new Promise(resolve => {
            setTimeout(resolve, 2)
          })
        }

        assert.equal(weakRefs.length, n * 2)
        const unreleased = weakRefs.filter(x => x.deref() !== undefined)
        assert.isEmpty(unreleased)
      })

      it("should release buffers after echo", async function () {
        const gc = getGcOrSkipTest(this)

        const weakRefs: WeakRef<any>[] = []

        const n = 10

        const echo = async () => {
          for (let i = 0; i < n; i++) {
            const [msg] = await sockB.receive()
            await sockB.send(msg)
            weakRefs.push(new WeakRef(msg))
          }
        }

        const send = async (size: number) => {
          for (let i = 0; i < n; i++) {
            const msg = Buffer.alloc(size)
            weakRefs.push(new WeakRef(msg))
            await sockA.send(msg)

            const [rep] = await sockA.receive()
            weakRefs.push(new WeakRef(rep))
          }

          sockA.close()
          sockB.close()
        }

        await Promise.all([send(2048), echo()])

        /* Repeated GC to allow inproc messages from being collected. */
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => {
            setTimeout(resolve, 2)
          })
          await gc()
        }

        assert.lengthOf(weakRefs, n * 3)
        assert.isEmpty(weakRefs.filter(r => r.deref() !== undefined))
      })

      if (proto === "inproc") {
        it("should share memory of large buffers", async function () {
          const orig = Buffer.alloc(2048)
          await sockA.send(orig)

          const echo = async (sock: zmq.Pair) => {
            const msg = await sock.receive()
            await sock.send(msg)
          }

          await echo(sockB)

          const [final] = await sockA.receive()
          final.writeUInt8(0x40, 0)
          assert.equal(orig.slice(0, 1).toString(), "@")
        })
      }

      it("should not starve event loop", async function () {
        this.slow(250)

        sockA.sendHighWaterMark = 5000
        sockB.receiveHighWaterMark = 5000

        const countDelays = async (fn: () => Promise<void>) => {
          let delays = 0
          await new Promise(resolve => {
            setTimeout(resolve, 15)
          })
          const interval = setInterval(() => {
            delays++
          }, 0)
          await new Promise(setImmediate) /* Move to check phase. */
          await fn()
          clearInterval(interval)
          await new Promise(resolve => {
            setTimeout(resolve, 15)
          })
          return delays
        }

        /* Send should not starve. */
        const sendDelays = await countDelays(async () => {
          for (let i = 0; i < 2500; i++) {
            await sockA.send("x")
          }
        })

        /* Receive should not starve. */
        const recvDelays = await countDelays(async () => {
          for (let i = 0; i < 2500; i++) {
            await sockB.receive()
          }
        })

        /* Should equal 4 under most circumstances. */
        assert.isAtLeast(sendDelays, 3)
        assert.isAtLeast(recvDelays, 3)
      })
    })

    if (proto !== "inproc") {
      describe("when connected after send/receive", function () {
        it("should deliver message", async function () {
          const address = await uniqAddress(proto)

          const sent = "foo"
          const promise = Promise.all([sockB.receive(), sockA.send(sent)])

          await sockB.bind(address)
          await sockA.connect(address)

          const [recv] = await promise
          assert.deepEqual(
            [sent],
            recv.map((buf: Buffer) => buf.toString()),
          )
        })
      })
    }

    describe("when closed", function () {
      beforeEach(function () {
        sockA.close()
        sockB.close()
      })

      it("should not be writable", async function () {
        assert.equal(sockA.writable, false)
      })

      it("should not be readable", async function () {
        assert.equal(sockA.readable, false)
      })

      it("should not be able to send", async function () {
        try {
          await sockA.send(Buffer.alloc(8192))
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

      it("should not be able to receive", async function () {
        try {
          await sockA.receive()
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

    describe("during close", function () {
      it("should gracefully stop async iterator", async function () {
        process.nextTick(() => sockA.close())
        /* eslint-disable-next-line no-empty */
        for await (const _ of sockA) {
        }
      })

      it("should not mask other error type in async iterator", async function () {
        sockA = new zmq.Request()
        process.nextTick(() => sockA.close())
        try {
          /* eslint-disable-next-line no-empty */
          for await (const _ of sockA) {
          }
          assert.ok(false)
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.equal(
            err.message,
            "Operation cannot be accomplished in current state",
          )
          assert.equal(err.code, "EFSM")
          assert.typeOf(err.errno, "number")
        }
      })
    })

    describe("concurrently", function () {
      it("should throw error on concurrent send", async function () {
        sockA.sendTimeout = 20
        const done = sockA.send(null).catch(() => null)
        try {
          sockA.send(null).catch(() => null)
          assert.ok(false)
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.equal(
            err.message,
            "Socket is busy writing; only one send operation may be in progress at any time",
          )
          assert.equal(err.code, "EBUSY")
          assert.typeOf(err.errno, "number")
        } finally {
          await done
        }
      })

      it("should throw error on concurrent receive", async function () {
        sockA.receiveTimeout = 20
        const done = sockA.receive().catch(() => null)
        try {
          sockA.receive().catch(() => null)
          assert.ok(false)
        } catch (err) {
          if (!isFullError(err)) {
            throw err
          }
          assert.equal(
            err.message,
            "Socket is busy reading; only one receive operation may be in progress at any time",
          )
          assert.equal(err.code, "EBUSY")
          assert.typeOf(err.errno, "number")
        } finally {
          await done
        }
      })
    })
  })
}
