if (process.env.INCLUDE_COMPAT_TESTS) {
  const zmq = require("./load")
  const {assert} = require("chai")
  const {testProtos, uniqAddress} = require("../helpers")

  for (const proto of testProtos("tcp", "inproc")) {
    describe(`compat socket with ${proto} xpub-xsub`, function() {
      it("should support pub-sub tracing and filtering", function(done) {
        let n = 0
        let m = 0
        const pub = zmq.socket("pub")
        const sub = zmq.socket("sub")
        const xpub = zmq.socket("xpub")
        const xsub = zmq.socket("xsub")

        const address1 = uniqAddress(proto)
        const address2 = uniqAddress(proto)

        pub.bind(address1, err => {
          if (err) throw err
          xsub.connect(address1)

          xpub.bind(address2, err => {
            if (err) throw err
            sub.connect(address2)

            xsub.on("message", function(msg) {
              xpub.send(msg) // Forward message using the xpub so subscribers can receive it
            })

            xpub.on("message", function(msg) {
              assert.instanceOf(msg, Buffer)

              const type = msg[0] === 0 ? "unsubscribe" : "subscribe"
              const channel = msg.slice(1).toString()

              switch (type) {
                case "subscribe":
                  switch (m++) {
                    case 0:
                      assert.equal(channel, "js")
                      break
                    case 1:
                      assert.equal(channel, "luna")
                      break
                  }
                  break
                case "unsubscribe":
                  switch (m++) {
                    case 2:
                      assert.equal(channel, "luna")
                      sub.close()
                      pub.close()
                      xsub.close()
                      xpub.close()
                      done()
                      break
                  }
                  break
              }

              xsub.send(msg) // Forward message using the xsub so the publisher knows it has a subscriber
            })

            sub.on("message", function(msg) {
              assert.instanceOf(msg, Buffer)
              switch (n++) {
                case 0:
                  assert.equal(msg.toString(), "js is cool")
                  break
                case 1:
                  assert.equal(msg.toString(), "luna is cool too")
                  break
              }
            })

            sub.subscribe("js")
            sub.subscribe("luna")

            setTimeout(() => {
              pub.send("js is cool")
              pub.send("ruby is meh")
              pub.send("py is pretty cool")
              pub.send("luna is cool too")
            }, 15)

            setTimeout(() => {
              sub.unsubscribe("luna")
            }, 15)
          })
        })
      })
    })
  }
}
