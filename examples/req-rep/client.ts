import * as zmq from "zeromq"

async function run() {
  const sock = new zmq.Request()

  sock.connect("tcp://127.0.0.1:3000")
  console.log("Producer bound to port 3000")

  await sock.send(4)
  console.log("Request a calculation for 4")

  const [result] = await sock.receive()
  console.log(`Received result: ${result}`)
}

run().catch(console.error)
