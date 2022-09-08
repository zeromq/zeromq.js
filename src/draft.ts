import {Socket, SocketType} from "./native"

import {Message, MessageLike, Readable, SocketOptions, Writable} from "."
import {allowMethods} from "./util"

export class Server extends Socket {
  constructor(options?: SocketOptions<Server>) {
    super(SocketType.Server, options)
  }
}

interface ServerRoutingOptions {
  routingId: number
}

export interface Server
  extends Readable<[Message, ServerRoutingOptions]>,
    Writable<MessageLike, [ServerRoutingOptions]> {}
allowMethods(Server.prototype, ["send", "receive"])

export class Client extends Socket {
  constructor(options?: SocketOptions<Client>) {
    super(SocketType.Client, options)
  }
}

export interface Client extends Readable<[Message]>, Writable<MessageLike> {}
allowMethods(Client.prototype, ["send", "receive"])

export class Radio extends Socket {
  constructor(options?: SocketOptions<Radio>) {
    super(SocketType.Radio, options)
  }
}

interface RadioGroupOptions {
  group: Buffer | string
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Radio extends Writable<MessageLike, [RadioGroupOptions]> {}
allowMethods(Radio.prototype, ["send"])

const join = (Socket.prototype as any).join
const leave = (Socket.prototype as any).leave

export class Dish extends Socket {
  constructor(options?: SocketOptions<Dish>) {
    super(SocketType.Dish, options)
  }

  /* TODO: These methods might accept arrays in their C++ implementation for
     the sake of simplicity. */

  join(...values: Array<Buffer | string>): void {
    for (const value of values) {
      join(value)
    }
  }

  leave(...values: Array<Buffer | string>): void {
    for (const value of values) {
      leave(value)
    }
  }
}

interface DishGroupOptions {
  group: Buffer
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Dish extends Readable<[Message, DishGroupOptions]> {}
allowMethods(Dish.prototype, ["receive", "join", "leave"])

export class Gather extends Socket {
  constructor(options?: SocketOptions<Gather>) {
    super(SocketType.Gather, options)
  }
}

export interface Gather extends Readable<[Message]> {
  conflate: boolean
}

allowMethods(Gather.prototype, ["receive"])

export class Scatter extends Socket {
  constructor(options?: SocketOptions<Scatter>) {
    super(SocketType.Scatter, options)
  }
}

export interface Scatter extends Writable<MessageLike> {
  conflate: boolean
}

allowMethods(Scatter.prototype, ["send"])

export class Datagram extends Socket {
  constructor(options?: SocketOptions<Datagram>) {
    super(SocketType.Datagram, options)
  }
}

export interface Datagram
  extends Readable<[Message, Message]>,
    Writable<[MessageLike, MessageLike]> {}
allowMethods(Datagram.prototype, ["send", "receive"])
