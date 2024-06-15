import * as zmq from "../../src"

import {assert} from "chai"
import {testProtos, uniqAddress} from "./helpers"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`socket with ${proto} curve send/receive`, function () {
    if (zmq.capability.curve !== true) {
      return
    }

    let sockA: zmq.Pair
    let sockB: zmq.Pair

    beforeEach(function () {
      const serverKeypair = zmq.curveKeyPair()
      const clientKeypair = zmq.curveKeyPair()

      sockA = new zmq.Pair({
        linger: 0,
        curveServer: true,
        curvePublicKey: serverKeypair.publicKey,
        curveSecretKey: serverKeypair.secretKey,
      })

      sockB = new zmq.Pair({
        linger: 0,
        curveServerKey: serverKeypair.publicKey,
        curvePublicKey: clientKeypair.publicKey,
        curveSecretKey: clientKeypair.secretKey,
      })
    })

    afterEach(function () {
      sockA.close()
      sockB.close()
      global.gc?.()
    })

    describe("when connected", function () {
      beforeEach(async function () {
        const address = uniqAddress(proto)
        await sockB.bind(address)
        await sockA.connect(address)
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
    })
  })
}
