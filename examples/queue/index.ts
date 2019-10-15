/* tslint:disable: no-console */
import {Dealer} from "zeromq"

import {Queue} from "./queue"

async function main() {
  const sender = new Dealer()
  await sender.bind("tcp://127.0.0.1:5555")

  const queue = new Queue(sender)
  queue.send("hello")
  queue.send("world!")
  queue.send(null)

  const receiver = new Dealer()
  receiver.connect("tcp://127.0.0.1:5555")

  for await (const [msg] of receiver) {
    if (msg.length === 0) {
      receiver.close()
      console.log("received: <empty message>")
    } else {
      console.log(`received: ${msg}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
