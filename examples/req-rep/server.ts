import * as zmq from "zeromq"

async function run() {
  const sock = new zmq.Reply()

  await sock.bind("tcp://127.0.0.1:3000")

  for await (const [msg] of sock) {
    // parse the message as a number
    const value = parseInt(msg.toString(), 10)

    // calculate the result and send it back to the client
    const result = 2 * value
    await sock.send(result)
  }
}

run().catch(console.error)
