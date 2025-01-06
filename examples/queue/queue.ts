import {Dealer, type MessageLike} from "zeromq"

export class Queue {
  queue: MessageLike[] = []
  socket: Dealer
  max: number
  sending = false

  constructor(socket: Dealer, max = 100) {
    this.socket = socket
    this.max = max
  }

  send(msg: MessageLike) {
    console.log(`Sending message: ${msg}`)
    if (this.queue.length > this.max) {
      throw new Error("Queue is full")
    }
    this.queue.push(msg)
    return this.trySend()
  }

  async trySend() {
    if (this.sending) {
      return
    }
    this.sending = true

    while (this.queue.length > 0) {
      const firstMessage = this.queue.shift()!
      await this.socket.send(firstMessage)
    }

    this.sending = false
  }
}
