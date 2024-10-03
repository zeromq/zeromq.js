const zmq = require("zeromq/v5-compat")

const pub = zmq.socket("pub")
const sub = zmq.socket("sub")

pub.bind("tcp://*:3456", err => {
  if (err) throw err

  sub.connect("tcp://127.0.0.1:3456")

  pub.send("message")

  sub.on("message", msg => {
    // Handle received message...
  })
})
