import {
  methods,
  Socket,
  SocketType,
} from "./native"

import {
  Message,
  MessageLike,
  Readable,
  SocketOptions,
  Writable,
} from "."


const {send, receive, join, leave} = methods


export interface ServerRoutingOptions {
  routingId: number
}

export class Server extends Socket {
  constructor(options?: SocketOptions<Server>) {
    super(SocketType.Server, options)
  }
}

export interface Server extends
  Readable<[Message, ServerRoutingOptions]>,
  Writable<MessageLike, [ServerRoutingOptions]> {}
Object.assign(Server.prototype, {send, receive})


export class Client extends Socket {
  constructor(options?: SocketOptions<Client>) {
    super(SocketType.Client, options)
  }
}

export interface Client extends Readable<[Message]>, Writable<MessageLike> {}
Object.assign(Client.prototype, {send, receive})


export interface RadioDishGroupOptions {
  group: string
}

export class Radio extends Socket {
  constructor(options?: SocketOptions<Radio>) {
    super(SocketType.Radio, options)
  }
}

export interface Radio extends Writable<MessageLike, [RadioDishGroupOptions]> {}
Object.assign(Radio.prototype, {send})


export class Dish extends Socket {
  constructor(options?: SocketOptions<Dish>) {
    super(SocketType.Dish, options)
  }

  /* TODO: These methods might accept arrays in their C++ implementation for
     the sake of simplicity. */

  join(...values: Array<Buffer | string>): void {
    for (const value of values) join.call(this, value)
  }

  leave(...values: Array<Buffer | string>): void {
    for (const value of values) leave.call(this, value)
  }
}

export interface Dish extends Readable<[Message, RadioDishGroupOptions]> {}
Object.assign(Dish.prototype, {receive})


export class Gather extends Socket {
  constructor(options?: SocketOptions<Gather>) {
    super(SocketType.Gather, options)
  }
}

export interface Gather extends Readable<[Message]> {
  conflate: boolean
}

Object.assign(Gather.prototype, {receive})


export class Scatter extends Socket {
  constructor(options?: SocketOptions<Scatter>) {
    super(SocketType.Scatter, options)
  }
}

export interface Scatter extends Writable<MessageLike> {
  conflate: boolean
}

Object.assign(Scatter.prototype, {send})


export class Datagram extends Socket {
  constructor(options?: SocketOptions<Datagram>) {
    super(SocketType.Datagram, options)
  }
}

export interface Datagram extends
  Readable<[Message, Message]>, Writable<[MessageLike, MessageLike]> {}
Object.assign(Datagram.prototype, {send, receive})
