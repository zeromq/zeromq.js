import * as semver from "semver"
import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} xpub/xsub`, function () {
    let pub: zmq.Publisher
    let sub: zmq.Subscriber
    let xpub: zmq.XPublisher
    let xsub: zmq.XSubscriber

    beforeEach(function () {
      pub = new zmq.Publisher()
      sub = new zmq.Subscriber()
      xpub = new zmq.XPublisher()
      xsub = new zmq.XSubscriber()
    })

    afterEach(function () {
      pub.close()
      sub.close()
      xpub.close()
      xsub.close()
      global.gc?.()
    })

    describe("send/receive", function () {
      it("should deliver messages", async function () {
        /* PUB  -> foo ->  XSUB -> XPUB -> SUB
                -> bar ->                  subscribed to all
                -> baz ->
                -> qux ->
         */

        const address1 = await uniqAddress(proto)
        const address2 = await uniqAddress(proto)

        const messages = ["foo", "bar", "baz", "qux"]
        const received: string[] = []

        /* Subscribe to all. */
        sub.subscribe()

        await pub.bind(address1)
        await xpub.bind(address2)
        await xsub.connect(address1)
        await sub.connect(address2)

        const send = async () => {
          /* Wait briefly before publishing to avoid slow joiner syndrome. */
          await new Promise(resolve => {
            setTimeout(resolve, 25)
          })
          for (const msg of messages) {
            await pub.send(msg)
          }
        }

        let subbed = 0
        const forward = async () => {
          for await (const [msg] of xpub) {
            assert.instanceOf(msg, Buffer)
            await xsub.send(msg)
            if (++subbed === 1) {
              break
            }
          }
        }

        let pubbed = 0
        const publish = async () => {
          for await (const [msg] of xsub) {
            assert.instanceOf(msg, Buffer)
            await xpub.send(msg)
            if (++pubbed === messages.length) {
              break
            }
          }
        }

        const receive = async () => {
          for await (const [msg] of sub) {
            assert.instanceOf(msg, Buffer)
            received.push(msg.toString())
            if (received.length === messages.length) {
              break
            }
          }
        }

        await Promise.all([send(), forward(), publish(), receive()])
        assert.deepEqual(received, messages)
      })
    })

    describe("subscribe/unsubscribe", function () {
      it("should filter messages", async function () {
        /* PUB  -> foo -X  XSUB -> XPUB -> SUB
                -> bar ->                  subscribed to "ba"
                -> baz ->
                -> qux -X
         */

        const address1 = await uniqAddress(proto)
        const address2 = await uniqAddress(proto)

        const messages = ["foo", "bar", "baz", "qux"]
        const received: string[] = []

        sub.subscribe("fo", "ba", "qu")
        sub.unsubscribe("fo", "qu")

        await pub.bind(address1)
        await xpub.bind(address2)
        await xsub.connect(address1)
        await sub.connect(address2)

        const send = async () => {
          /* Wait briefly before publishing to avoid slow joiner syndrome. */
          await new Promise(resolve => {
            setTimeout(resolve, 25)
          })

          for (const msg of messages) {
            await pub.send(msg)
          }
        }

        let subbed = 0
        const forward = async () => {
          for await (const [msg] of xpub) {
            assert.instanceOf(msg, Buffer)
            await xsub.send(msg)
            if (++subbed === 1) {
              break
            }
          }
        }

        let pubbed = 0
        const publish = async () => {
          for await (const [msg] of xsub) {
            assert.instanceOf(msg, Buffer)
            await xpub.send(msg)
            if (++pubbed === 2) {
              break
            }
          }
        }

        const receive = async () => {
          for await (const [msg] of sub) {
            assert.instanceOf(msg, Buffer)
            received.push(msg.toString())
            if (received.length === 2) {
              break
            }
          }
        }

        await Promise.all([send(), forward(), publish(), receive()])
        assert.deepEqual(received, ["bar", "baz"])
      })
    })

    describe("verbosity", function () {
      it("should deduplicate subscriptions/unsubscriptions", async function () {
        const address = await uniqAddress(proto)

        const subs: Buffer[] = []

        xpub.verbosity = null

        const sub1 = sub
        const sub2 = new zmq.Subscriber()
        await xpub.bind(address)
        await sub1.connect(address)
        await sub2.connect(address)

        const subscribe = async () => {
          await new Promise(resolve => {
            setTimeout(resolve, 25)
          })
          sub1.subscribe("fo")
          sub2.subscribe("fo")
          sub2.unsubscribe("fo")
        }

        const forward = async () => {
          for await (const [msg] of xpub) {
            assert.instanceOf(msg, Buffer)
            await xsub.send(msg)
            subs.push(msg)
            if (subs.length === 1) {
              break
            }
          }
        }

        await Promise.all([subscribe(), forward()])
        assert.sameDeepMembers(subs, [Buffer.from("\x01fo")])

        sub2.close()
      })

      it("should forward all subscriptions", async function () {
        const address = await uniqAddress(proto)

        const subs: Buffer[] = []

        xpub.verbosity = "allSubs"

        const sub1 = sub
        const sub2 = new zmq.Subscriber()
        await xpub.bind(address)
        await sub1.connect(address)
        await sub2.connect(address)

        const subscribe = async () => {
          await new Promise(resolve => {
            setTimeout(resolve, 25)
          })
          sub1.subscribe("fo")
          sub2.subscribe("fo")
          sub2.unsubscribe("fo")
        }

        const forward = async () => {
          for await (const [msg] of xpub) {
            assert.instanceOf(msg, Buffer)
            await xsub.send(msg)
            subs.push(msg)
            if (subs.length === 2) {
              break
            }
          }
        }

        await Promise.all([subscribe(), forward()])
        assert.sameDeepMembers(subs, [
          Buffer.from("\x01fo"),
          Buffer.from("\x01fo"),
        ])

        sub2.close()
      })

      it("should forward all subscriptions/unsubscriptions", async function () {
        /* ZMQ 4.2 first introduced ZMQ_XPUB_VERBOSER. */
        if (semver.satisfies(zmq.version, "< 4.2")) {
          this.skip()
        }

        const address = await uniqAddress(proto)

        const subs: Buffer[] = []

        xpub.verbosity = "allSubsUnsubs"

        const sub1 = sub
        const sub2 = new zmq.Subscriber()
        await xpub.bind(address)
        await sub1.connect(address)
        await sub2.connect(address)

        const subscribe = async () => {
          await new Promise(resolve => {
            setTimeout(resolve, 25)
          })
          sub1.subscribe("fo")
          sub2.subscribe("fo")
          sub2.unsubscribe("fo")
        }

        const forward = async () => {
          for await (const [msg] of xpub) {
            assert.instanceOf(msg, Buffer)
            await xsub.send(msg)
            subs.push(msg)
            if (subs.length === 3) {
              break
            }
          }
        }

        await Promise.all([subscribe(), forward()])
        assert.sameDeepMembers(subs, [
          Buffer.from("\x01fo"),
          Buffer.from("\x01fo"),
          Buffer.from("\x00fo"),
        ])

        sub2.close()
      })
    })
  })
}
