import * as zmq from "zeromq"

async function run() {
  const sock = new zmq.Publisher()

  await sock.bind("tcp://127.0.0.1:3000")
  console.log("Publisher bound to port 3000")

  while (true) {
    console.log("sending a multipart message envelope")
    await sock.send(["kitty cats", "meow!"])
    await new Promise(resolve => {
      setTimeout(resolve, 500)
    })
  }
}

run()
