import {Router} from "zeromq"

import {Service} from "./service"
import {Header, Message} from "./types"

export class Broker {
  address: string
  socket: Router = new Router({sendHighWaterMark: 1, sendTimeout: 1})
  services: Map<string, Service> = new Map()
  workers: Map<string, Buffer> = new Map()

  constructor(address = "tcp://127.0.0.1:5555") {
    this.address = address
  }

  async start() {
    console.log(`starting broker on ${this.address}`)
    await this.socket.bind(this.address)

    const loop = async () => {
      for await (const [sender, blank, header, ...rest] of this.socket) {
        switch (header.toString()) {
          case Header.Client:
            this.handleClient(sender, ...rest)
            break
          case Header.Worker:
            this.handleWorker(sender, ...rest)
            break
          default:
            console.error(`invalid message header: ${header}`)
        }
      }
    }

    loop()
  }

  async stop() {
    if (!this.socket.closed) {
      this.socket.close()
    }
  }

  handleClient(client: Buffer, service?: Buffer, ...req: Buffer[]) {
    if (service) {
      this.dispatchRequest(client, service, ...req)
    }
  }

  handleWorker(worker: Buffer, type?: Buffer, ...rest: Buffer[]) {
    switch (type && type.toString()) {
      case Message.Ready: {
        const [service] = rest
        this.register(worker, service)
        break
      }

      case Message.Reply: {
        const [client, blank, ...rep] = rest
        this.dispatchReply(worker, client, ...rep)
        break
      }

      case Message.Heartbeat:
        /* Heartbeats not implemented yet. */
        break

      case Message.Disconnect:
        this.deregister(worker)
        break

      default:
        console.error(`invalid worker message type: ${type}`)
    }
  }

  register(worker: Buffer, service: Buffer) {
    this.setWorkerService(worker, service)
    this.getService(service).register(worker)
  }

  dispatchRequest(client: Buffer, service: Buffer, ...req: Buffer[]) {
    this.getService(service).dispatchRequest(client, ...req)
  }

  dispatchReply(worker: Buffer, client: Buffer, ...rep: Buffer[]) {
    const service = this.getWorkerService(worker)
    this.getService(service).dispatchReply(worker, client, ...rep)
  }

  deregister(worker: Buffer) {
    const service = this.getWorkerService(worker)
    this.getService(service).deregister(worker)
  }

  getService(name: Buffer): Service {
    const key = name.toString()
    if (this.services.has(key)) {
      return this.services.get(key)!
    } else {
      const service = new Service(this.socket, key)
      this.services.set(key, service)
      return service
    }
  }

  getWorkerService(worker: Buffer): Buffer {
    return this.workers.get(worker.toString("hex"))!
  }

  setWorkerService(worker: Buffer, service: Buffer) {
    this.workers.set(worker.toString("hex"), service)
  }
}
