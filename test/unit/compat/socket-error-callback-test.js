if (process.env.INCLUDE_COMPAT_TESTS) {
  const zmq = require("./load")
  const {assert} = require("chai")

  describe("compat socket error callback", function () {
    let sock

    beforeEach(function () {
      sock = zmq.socket("router")
    })

    afterEach(function () {
      sock.close()
    })

    it("should create a socket with mandatory", function () {
      sock.setsockopt(zmq.ZMQ_ROUTER_MANDATORY, 1)
      sock.setsockopt(zmq.ZMQ_SNDTIMEO, 10)
    })

    it("should callback with error when not connected", function (done) {
      sock.send(["foo", "bar"], null, err => {
        assert.instanceOf(err, Error)
        sock.close()
        done()
      })
    })
  })
}
