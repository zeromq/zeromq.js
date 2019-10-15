if (process.env.INCLUDE_COMPAT_TESTS) {
  const zmq = require("./load")
  const {assert} = require("chai")
  const {testProtos, uniqAddress} = require("../helpers")

  for (const proto of testProtos("tcp", "inproc")) {
    describe(`compat socket with ${proto} req-rep`, function() {
      it("should support req-rep", function(done) {
        const rep = zmq.socket("rep")
        const req = zmq.socket("req")

        const address = uniqAddress(proto)

        rep.on("message", function(msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "hello")
          rep.send("world")
        })

        rep.bind(address, err => {
          if (err) throw err
          req.connect(address)
          req.send("hello")
          req.on("message", function(msg) {
            assert.instanceOf(msg, Buffer)
            assert.equal(msg.toString(), "world")
            rep.close()
            req.close()
            done()
          })
        })
      })

      it("should support multiple", function(done) {
        let n = 5

        for (let i = 0; i < n; i++) {
          (function(n) {
            const rep = zmq.socket("rep")
            const req = zmq.socket("req")

            const address = uniqAddress(proto)

            rep.on("message", function(msg) {
              assert.instanceOf(msg, Buffer)
              assert.equal(msg.toString(), "hello")
              rep.send("world")
            })

            rep.bind(address, err => {
              if (err) throw err
              req.connect(address)
              req.send("hello")
              req.on("message", function(msg) {
                assert.instanceOf(msg, Buffer)
                assert.equal(msg.toString(), "world")
                req.close()
                rep.close()
                if (!--n) done()
              })
            })
          })(i)
        }
      })

      it("should support a burst", function(done) {
        const rep = zmq.socket("rep")
        const req = zmq.socket("req")

        const address = uniqAddress(proto)

        let n = 10

        rep.on("message", function(msg) {
          assert.instanceOf(msg, Buffer)
          assert.equal(msg.toString(), "hello")
          rep.send("world")
        })

        rep.bind(address, err => {
          if (err) throw err
          req.connect(address)

          let received = 0

          req.on("message", function(msg) {
            assert.instanceOf(msg, Buffer)
            assert.equal(msg.toString(), "world")

            received += 1

            if (received === n) {
              rep.close()
              req.close()
              done()
            }
          })

          for (let i = 0; i < n; i += 1) {
            req.send("hello")
          }
        })
      })
    })
  }
}
