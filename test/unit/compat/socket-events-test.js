if (process.env.INCLUDE_COMPAT_TESTS) {
  const zmq = require("./load")
  const {assert} = require("chai")
  const {testProtos, uniqAddress} = require("../helpers")

  for (const proto of testProtos("tcp", "inproc")) {
    describe(`compat socket with ${proto} events`, function () {
      it("should support events", function (done) {
        const rep = zmq.socket("rep")
        const req = zmq.socket("req")

        const address = uniqAddress(proto)

        rep.on("message", function (msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "hello")
          rep.send("world")
        })

        rep.bind(address, err => {
          if (err) {
            throw err
          }
        })

        rep.on("bind", function () {
          req.connect(address)
          req.on("message", function (msg) {
            assert.instanceOf(msg, Buffer)
            assert.equal(msg.toString(), "world")
            req.close()
            rep.close()
            done()
          })

          req.send("hello")
        })
      })
    })
  }
}
