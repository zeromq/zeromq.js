if (process.env.INCLUDE_COMPAT_TESTS) {
  const zmq = require("./load")
  const {assert} = require("chai")
  const {testProtos, uniqAddress} = require("../helpers")

  for (const proto of testProtos("tcp")) {
    describe(`compat socket with ${proto} pair`, function () {
      it("should support pair-pair", function (done) {
        const pairA = zmq.socket("pair")
        const pairB = zmq.socket("pair")

        const address = uniqAddress(proto)

        let n = 0
        pairA.monitor()
        pairB.monitor()
        pairA.on("bindError", console.log)
        pairB.on("bindError", console.log)
        pairA.on("message", function (msg) {
          assert.instanceOf(msg, Buffer)

          switch (n++) {
            case 0:
              assert.equal(msg.toString(), "foo")
              break
            case 1:
              assert.equal(msg.toString(), "bar")
              break
            case 2:
              assert.equal(msg.toString(), "baz")
              pairA.close()
              pairB.close()
              done()
              break
          }
        })

        pairB.on("message", function (msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "barnacle")
        })

        pairA.bind(address, async err => {
          if (err) {
            throw err
          }

          pairB.connect(address)
          pairA.send("barnacle")
          pairB.send("foo")
          pairB.send("bar")
          pairB.send("baz")
        })
      })
    })
  }
}
