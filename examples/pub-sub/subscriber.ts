import * as zmq from "zeromq"

async function run() {
  const sock = new zmq.Subscriber()

  sock.connect("tcp://127.0.0.1:3000")
  sock.subscribe("kitty cats")
  console.log("Subscriber connected to port 3000")

  for await (const [topic, msg] of sock) {
    console.log(
      "received a message related to:",
      topic,
      "containing message:",
      msg,
    )
  }
}

run()
