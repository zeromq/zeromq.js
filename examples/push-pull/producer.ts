import * as zmq from "zeromq"

async function run() {
  const sock = new zmq.Push()

  await sock.bind("tcp://127.0.0.1:3000")
  console.log("Producer bound to port 3000")

  // eslint-disable-next-line no-constant-condition, @typescript-eslint/no-unnecessary-condition
  while (true) {
    await sock.send("some work")
    await new Promise(resolve => {
      setTimeout(resolve, 500)
    })
  }
}

run().catch(console.error)
