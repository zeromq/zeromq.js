/* eslint-disable */
const zmq = require("zeromq/v5-compat")

function main() {
  const pub = zmq.socket("pub")
  const sub = zmq.socket("sub")

  pub.on("bind", address => {
    console.log(`Bound to ${address}`)
  })

  pub.bind("tcp://127.0.0.1:3456", err => {
    if (err) {
      throw err
    }

    sub.connect("tcp://127.0.0.1:3456")
    console.log("Subscriber connected to tcp://127.0.0.1:3456")

    sub.on("message", msg => {
      // Handle received message...
      console.log(`Received message: ${msg.toString()}`)
    })

    pub.send("message")
  })

  if (process.env.CI) {
    // exit after 1 second in CI environment
    setTimeout(() => {
      process.exit(0)
    }, 2000)
  }
}

main()
