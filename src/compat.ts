/*
  The API of the compatibility layer and parts of the implementation has been
  adapted from the original ZeroMQ.js version (up to 5.x)
*/

import {EventEmitter} from "events"
import * as zmq from "."
import {FullError} from "./errors"
import * as longOptions from "./compat/long-options"
import * as pollStates from "./compat/poll-states"
import * as sendOptions from "./compat/send-options"

type AnySocket =
  | zmq.Pair
  | zmq.Publisher
  | zmq.Subscriber
  | zmq.Request
  | zmq.Reply
  | zmq.Dealer
  | zmq.Router
  | zmq.Pull
  | zmq.Push
  | zmq.XPublisher
  | zmq.XSubscriber
  | zmq.Stream

let count = 1

const shortOptions = {
  _fd: longOptions.ZMQ_FD,
  _ioevents: longOptions.ZMQ_EVENTS,
  _receiveMore: longOptions.ZMQ_RCVMORE,
  _subscribe: longOptions.ZMQ_SUBSCRIBE,
  _unsubscribe: longOptions.ZMQ_UNSUBSCRIBE,
  affinity: longOptions.ZMQ_AFFINITY,
  backlog: longOptions.ZMQ_BACKLOG,
  identity: longOptions.ZMQ_IDENTITY,
  linger: longOptions.ZMQ_LINGER,
  rate: longOptions.ZMQ_RATE,
  rcvbuf: longOptions.ZMQ_RCVBUF,
  last_endpoint: longOptions.ZMQ_LAST_ENDPOINT,
  reconnect_ivl: longOptions.ZMQ_RECONNECT_IVL,
  recovery_ivl: longOptions.ZMQ_RECOVERY_IVL,
  sndbuf: longOptions.ZMQ_SNDBUF,
  mechanism: longOptions.ZMQ_MECHANISM,
  plain_server: longOptions.ZMQ_PLAIN_SERVER,
  plain_username: longOptions.ZMQ_PLAIN_USERNAME,
  plain_password: longOptions.ZMQ_PLAIN_PASSWORD,
  curve_server: longOptions.ZMQ_CURVE_SERVER,
  curve_publickey: longOptions.ZMQ_CURVE_PUBLICKEY,
  curve_secretkey: longOptions.ZMQ_CURVE_SECRETKEY,
  curve_serverkey: longOptions.ZMQ_CURVE_SERVERKEY,
  zap_domain: longOptions.ZMQ_ZAP_DOMAIN,
  heartbeat_ivl: longOptions.ZMQ_HEARTBEAT_IVL,
  heartbeat_ttl: longOptions.ZMQ_HEARTBEAT_TTL,
  heartbeat_timeout: longOptions.ZMQ_HEARTBEAT_TIMEOUT,
  connect_timeout: longOptions.ZMQ_CONNECT_TIMEOUT,
}

class Context {
  static setMaxThreads(value: number) {
    zmq.context.ioThreads = value
  }

  static getMaxThreads() {
    return zmq.context.ioThreads
  }

  static setMaxSockets(value: number) {
    zmq.context.maxSockets = value
  }

  static getMaxSockets() {
    return zmq.context.maxSockets
  }

  constructor() {
    throw new Error("Context cannot be instantiated in compatibility mode")
  }
}

type SocketType =
  | "pair"
  | "req"
  | "rep"
  | "pub"
  | "sub"
  | "dealer"
  | "xreq"
  | "router"
  | "xrep"
  | "pull"
  | "push"
  | "xpub"
  | "xsub"
  | "stream"

type Callback = (err?: Error) => void

class Socket extends EventEmitter {
  [key: string]: any

  type: SocketType
  private _msg: zmq.MessageLike[] = []
  private _recvQueue: zmq.Message[][] = []
  private _sendQueue: Array<[zmq.MessageLike[], Callback | undefined]> = []
  private _paused = false
  private _socket: AnySocket
  private _count = 0

  constructor(type: SocketType) {
    super()
    this.type = type

    switch (type) {
      case "pair":
        this._socket = new zmq.Pair()
        break
      case "req":
        this._socket = new zmq.Request()
        break
      case "rep":
        this._socket = new zmq.Reply()
        break
      case "pub":
        this._socket = new zmq.Publisher()
        break
      case "sub":
        this._socket = new zmq.Subscriber()
        break
      case "dealer":
      case "xreq":
        this._socket = new zmq.Dealer()
        break
      case "router":
      case "xrep":
        this._socket = new zmq.Router()
        break
      case "pull":
        this._socket = new zmq.Pull()
        break
      case "push":
        this._socket = new zmq.Push()
        break
      case "xpub":
        this._socket = new zmq.XPublisher()
        break
      case "xsub":
        this._socket = new zmq.XSubscriber()
        break
      case "stream":
        this._socket = new zmq.Stream()
        break
      default:
        throw new Error(`Invalid socket type: ${type}`)
    }

    const recv = () => {
      this.once("_flushRecv", async () => {
        while (!this._socket.closed && !this._paused) {
          await this._recv()
        }

        if (!this._socket.closed) {
          recv()
        }
      })
    }

    const send = () => {
      this.once("_flushSend", async () => {
        while (
          !this._socket.closed &&
          !this._paused &&
          this._sendQueue.length
        ) {
          await this._send()
        }

        if (!this._socket.closed) {
          send()
        }
      })
    }

    if (type !== "push" && type !== "pub") {
      recv()
    }
    send()

    this.emit("_flushRecv")
  }

  async _recv() {
    if (
      this._socket instanceof zmq.Push ||
      this._socket instanceof zmq.Publisher
    ) {
      throw new Error("Cannot receive on this socket type.")
    }

    try {
      if (this._recvQueue.length) {
        const msg = this._recvQueue.shift()!
        process.nextTick(() => this.emit("message", ...msg))
      }

      {
        const msg = await this._socket.receive()
        if (this._paused) {
          this._recvQueue.push(msg)
        } else {
          process.nextTick(() => this.emit("message", ...msg))
        }
      }
    } catch (err) {
      if (!this._socket.closed && (err as FullError).code !== "EBUSY") {
        process.nextTick(() => this.emit("error", err))
      }
    }
  }

  async _send() {
    if (
      this._socket instanceof zmq.Pull ||
      this._socket instanceof zmq.Subscriber
    ) {
      throw new Error("Cannot send on this socket type.")
    }

    if (this._sendQueue.length) {
      const [msg, cb] = this._sendQueue.shift()!
      try {
        await (this._socket as zmq.Writable).send(msg)
        if (cb) {
          cb()
        }
      } catch (err) {
        if (cb) {
          cb(err as Error)
        } else {
          this.emit("error", err)
        }
      }
    }
  }

  bind(address: string, cb?: Callback) {
    this._socket
      .bind(address)
      .then(() => {
        process.nextTick(() => {
          this.emit("bind", address)
          if (cb) {
            cb()
          }
        })
      })
      .catch(err => {
        process.nextTick(() => {
          if (cb) {
            cb(err as Error)
          } else {
            this.emit("error", err)
          }
        })
      })

    return this
  }

  unbind(address: string, cb?: Callback) {
    this._socket
      .unbind(address)
      .then(() => {
        process.nextTick(() => {
          this.emit("unbind", address)
          if (cb) {
            cb()
          }
        })
      })
      .catch(err => {
        process.nextTick(() => {
          if (cb) {
            cb(err as Error)
          } else {
            this.emit("error", err)
          }
        })
      })

    return this
  }

  connect(address: string) {
    this._socket.connect(address)
    return this
  }

  disconnect(address: string) {
    this._socket.disconnect(address)
    return this
  }

  send(
    message: zmq.MessageLike[] | zmq.MessageLike,
    givenFlags: number | undefined | null = 0,
    cb: Callback | undefined = undefined,
  ) {
    const flags = (givenFlags ?? 0) | 0
    this._msg = this._msg.concat(message)
    if ((flags & sendOptions.ZMQ_SNDMORE) === 0) {
      this._sendQueue.push([this._msg, cb])
      this._msg = []
      if (!this._paused) {
        this.emit("_flushSend")
      }
    }
    return this
  }

  read() {
    throw new Error(
      "read() has been removed from compatibility mode; " +
        "use on('message', ...) instead.",
    )
  }

  bindSync(address: string) {
    this._socket.bindSync(address)
  }

  unbindSync(address: string) {
    this._socket.unbindSync(address)
  }

  pause() {
    this._paused = true
  }

  resume() {
    this._paused = false
    this.emit("_flushRecv")
    this.emit("_flushSend")
  }

  close() {
    this._socket.close()
    return this
  }

  get closed() {
    return this._socket.closed
  }

  monitor(interval?: number, num?: number) {
    this._count = count++

    /* eslint-disable-next-line no-unused-expressions */
    this._count

    if (interval || num) {
      process.emitWarning(
        "Arguments to monitor() are ignored in compatibility mode; " +
          "all events are read automatically",
      )
    }

    const events = this._socket.events

    const read = async () => {
      while (!events.closed) {
        try {
          const event = await events.receive()

          let type = event.type as string
          let value
          let error

          switch (event.type) {
            case "connect":
              break
            case "connect:delay":
              type = "connect_delay"
              break
            case "connect:retry":
              value = event.interval
              type = "connect_retry"
              break
            case "bind":
              type = "listen"
              break
            case "bind:error":
              error = event.error
              value = event.error ? event.error.errno : 0
              type = "bind_error"
              break
            case "accept":
              break
            case "accept:error":
              error = event.error
              value = event.error ? event.error.errno : 0
              type = "accept_error"
              break
            case "close":
              break
            case "close:error":
              error = event.error
              value = event.error ? event.error.errno : 0
              type = "close_error"
              break
            case "disconnect":
              break
            case "end":
              return
            default:
              continue
          }

          this.emit(type, value, event.address, error)
        } catch (err) {
          if (!this._socket.closed) {
            this.emit("error", err)
          }
        }
      }
    }

    read()
    return this
  }

  unmonitor() {
    this._socket.events.close()
    return this
  }

  subscribe(filter: string) {
    if (this._socket instanceof zmq.Subscriber) {
      this._socket.subscribe(filter)
      return this
    } else {
      throw new Error("Subscriber socket required")
    }
  }

  unsubscribe(filter: string) {
    if (this._socket instanceof zmq.Subscriber) {
      this._socket.unsubscribe(filter)
      return this
    } else {
      throw new Error("Subscriber socket required")
    }
  }

  setsockopt(givenOption: number | keyof typeof shortOptions, value: any) {
    const option =
      typeof givenOption === "number" ? givenOption : shortOptions[givenOption]

    switch (option) {
      case longOptions.ZMQ_AFFINITY:
        this._socket.affinity = value
        break
      case longOptions.ZMQ_IDENTITY:
        ;(this._socket as zmq.Router).routingId = value
        break
      case longOptions.ZMQ_SUBSCRIBE:
        ;(this._socket as zmq.Subscriber).subscribe(value)
        break
      case longOptions.ZMQ_UNSUBSCRIBE:
        ;(this._socket as zmq.Subscriber).unsubscribe(value)
        break
      case longOptions.ZMQ_RATE:
        this._socket.rate = value
        break
      case longOptions.ZMQ_RECOVERY_IVL:
        this._socket.recoveryInterval = value
        break
      case longOptions.ZMQ_SNDBUF:
        ;(this._socket as zmq.Writable).sendBufferSize = value
        break
      case longOptions.ZMQ_RCVBUF:
        ;(this._socket as zmq.Readable).receiveBufferSize = value
        break
      case longOptions.ZMQ_LINGER:
        this._socket.linger = value
        break
      case longOptions.ZMQ_RECONNECT_IVL:
        this._socket.reconnectInterval = value
        break
      case longOptions.ZMQ_BACKLOG:
        this._socket.backlog = value
        break
      case longOptions.ZMQ_RECOVERY_IVL_MSEC:
        this._socket.recoveryInterval = value
        break
      case longOptions.ZMQ_RECONNECT_IVL_MAX:
        this._socket.reconnectMaxInterval = value
        break
      case longOptions.ZMQ_MAXMSGSIZE:
        this._socket.maxMessageSize = value
        break
      case longOptions.ZMQ_SNDHWM:
        ;(this._socket as zmq.Writable).sendHighWaterMark = value
        break
      case longOptions.ZMQ_RCVHWM:
        ;(this._socket as zmq.Readable).receiveHighWaterMark = value
        break
      case longOptions.ZMQ_MULTICAST_HOPS:
        ;(this._socket as zmq.Writable).multicastHops = value
        break
      case longOptions.ZMQ_RCVTIMEO:
        ;(this._socket as zmq.Readable).receiveTimeout = value
        break
      case longOptions.ZMQ_SNDTIMEO:
        ;(this._socket as zmq.Writable).sendTimeout = value
        break
      case longOptions.ZMQ_IPV4ONLY:
        this._socket.ipv6 = !value
        break
      case longOptions.ZMQ_ROUTER_MANDATORY:
        ;(this._socket as zmq.Router).mandatory = Boolean(value)
        break
      case longOptions.ZMQ_TCP_KEEPALIVE:
        this._socket.tcpKeepalive = value
        break
      case longOptions.ZMQ_TCP_KEEPALIVE_CNT:
        this._socket.tcpKeepaliveCount = value
        break
      case longOptions.ZMQ_TCP_KEEPALIVE_IDLE:
        this._socket.tcpKeepaliveIdle = value
        break
      case longOptions.ZMQ_TCP_KEEPALIVE_INTVL:
        this._socket.tcpKeepaliveInterval = value
        break
      case longOptions.ZMQ_TCP_ACCEPT_FILTER:
        this._socket.tcpAcceptFilter = value
        break
      case longOptions.ZMQ_DELAY_ATTACH_ON_CONNECT:
        this._socket.immediate = Boolean(value)
        break
      case longOptions.ZMQ_XPUB_VERBOSE:
        ;(this._socket as zmq.XPublisher).verbosity = value ? "allSubs" : null
        break
      case longOptions.ZMQ_ROUTER_RAW:
        throw new Error("ZMQ_ROUTER_RAW is not supported in compatibility mode")
      case longOptions.ZMQ_IPV6:
        this._socket.ipv6 = Boolean(value)
        break
      case longOptions.ZMQ_PLAIN_SERVER:
        this._socket.plainServer = Boolean(value)
        break
      case longOptions.ZMQ_PLAIN_USERNAME:
        this._socket.plainUsername = value
        break
      case longOptions.ZMQ_PLAIN_PASSWORD:
        this._socket.plainPassword = value
        break
      case longOptions.ZMQ_CURVE_SERVER:
        this._socket.curveServer = Boolean(value)
        break
      case longOptions.ZMQ_CURVE_PUBLICKEY:
        this._socket.curvePublicKey = value
        break
      case longOptions.ZMQ_CURVE_SECRETKEY:
        this._socket.curveSecretKey = value
        break
      case longOptions.ZMQ_CURVE_SERVERKEY:
        this._socket.curveServerKey = value
        break
      case longOptions.ZMQ_ZAP_DOMAIN:
        this._socket.zapDomain = value
        break
      case longOptions.ZMQ_HEARTBEAT_IVL:
        this._socket.heartbeatInterval = value
        break
      case longOptions.ZMQ_HEARTBEAT_TTL:
        this._socket.heartbeatTimeToLive = value
        break
      case longOptions.ZMQ_HEARTBEAT_TIMEOUT:
        this._socket.heartbeatTimeout = value
        break
      case longOptions.ZMQ_CONNECT_TIMEOUT:
        this._socket.connectTimeout = value
        break
      case longOptions.ZMQ_ROUTER_HANDOVER:
        ;(this._socket as zmq.Router).handover = Boolean(value)
        break
      default:
        throw new Error("Unknown option")
    }

    return this
  }

  getsockopt(givenOption: number | keyof typeof shortOptions) {
    const option =
      typeof givenOption !== "number" ? shortOptions[givenOption] : givenOption

    switch (option) {
      case longOptions.ZMQ_AFFINITY:
        return this._socket.affinity
      case longOptions.ZMQ_IDENTITY:
        return (this._socket as zmq.Router).routingId
      case longOptions.ZMQ_RATE:
        return this._socket.rate
      case longOptions.ZMQ_RECOVERY_IVL:
        return this._socket.recoveryInterval
      case longOptions.ZMQ_SNDBUF:
        return (this._socket as zmq.Writable).sendBufferSize
      case longOptions.ZMQ_RCVBUF:
        return (this._socket as zmq.Readable).receiveBufferSize
      case longOptions.ZMQ_RCVMORE:
        throw new Error("ZMQ_RCVMORE is not supported in compatibility mode")
      case longOptions.ZMQ_FD:
        throw new Error("ZMQ_FD is not supported in compatibility mode")
      case longOptions.ZMQ_EVENTS:
        return (
          (this._socket.readable ? pollStates.ZMQ_POLLIN : 0) |
          (this._socket.writable ? pollStates.ZMQ_POLLOUT : 0)
        )
      case longOptions.ZMQ_TYPE:
        return this._socket.type
      case longOptions.ZMQ_LINGER:
        return this._socket.linger
      case longOptions.ZMQ_RECONNECT_IVL:
        return this._socket.reconnectInterval
      case longOptions.ZMQ_BACKLOG:
        return this._socket.backlog
      case longOptions.ZMQ_RECOVERY_IVL_MSEC:
        return this._socket.recoveryInterval
      case longOptions.ZMQ_RECONNECT_IVL_MAX:
        return this._socket.reconnectMaxInterval
      case longOptions.ZMQ_MAXMSGSIZE:
        return this._socket.maxMessageSize
      case longOptions.ZMQ_SNDHWM:
        return (this._socket as zmq.Writable).sendHighWaterMark
      case longOptions.ZMQ_RCVHWM:
        return (this._socket as zmq.Readable).receiveHighWaterMark
      case longOptions.ZMQ_MULTICAST_HOPS:
        return (this._socket as zmq.Writable).multicastHops
      case longOptions.ZMQ_RCVTIMEO:
        return (this._socket as zmq.Readable).receiveTimeout
      case longOptions.ZMQ_SNDTIMEO:
        return (this._socket as zmq.Writable).sendTimeout
      case longOptions.ZMQ_IPV4ONLY:
        return !this._socket.ipv6
      case longOptions.ZMQ_LAST_ENDPOINT:
        return this._socket.lastEndpoint
      case longOptions.ZMQ_ROUTER_MANDATORY:
        return (this._socket as zmq.Router).mandatory ? 1 : 0
      case longOptions.ZMQ_TCP_KEEPALIVE:
        return this._socket.tcpKeepalive
      case longOptions.ZMQ_TCP_KEEPALIVE_CNT:
        return this._socket.tcpKeepaliveCount
      case longOptions.ZMQ_TCP_KEEPALIVE_IDLE:
        return this._socket.tcpKeepaliveIdle
      case longOptions.ZMQ_TCP_KEEPALIVE_INTVL:
        return this._socket.tcpKeepaliveInterval
      case longOptions.ZMQ_DELAY_ATTACH_ON_CONNECT:
        return this._socket.immediate ? 1 : 0
      case longOptions.ZMQ_XPUB_VERBOSE:
        throw new Error("Reading ZMQ_XPUB_VERBOSE is not supported")
      case longOptions.ZMQ_ROUTER_RAW:
        throw new Error("ZMQ_ROUTER_RAW is not supported in compatibility mode")
      case longOptions.ZMQ_IPV6:
        return this._socket.ipv6 ? 1 : 0
      case longOptions.ZMQ_MECHANISM:
        switch (this._socket.securityMechanism) {
          case "plain":
            return 1
          case "curve":
            return 2
          case "gssapi":
            return 3
          default:
            return 0
        }
      case longOptions.ZMQ_PLAIN_SERVER:
        return this._socket.plainServer ? 1 : 0
      case longOptions.ZMQ_PLAIN_USERNAME:
        return this._socket.plainUsername
      case longOptions.ZMQ_PLAIN_PASSWORD:
        return this._socket.plainPassword
      case longOptions.ZMQ_CURVE_SERVER:
        return this._socket.curveServer ? 1 : 0
      case longOptions.ZMQ_CURVE_PUBLICKEY:
        return this._socket.curvePublicKey
      case longOptions.ZMQ_CURVE_SECRETKEY:
        return this._socket.curveSecretKey
      case longOptions.ZMQ_CURVE_SERVERKEY:
        return this._socket.curveServerKey
      case longOptions.ZMQ_ZAP_DOMAIN:
        return this._socket.zapDomain
      case longOptions.ZMQ_HEARTBEAT_IVL:
        return this._socket.heartbeatInterval
      case longOptions.ZMQ_HEARTBEAT_TTL:
        return this._socket.heartbeatTimeToLive
      case longOptions.ZMQ_HEARTBEAT_TIMEOUT:
        return this._socket.heartbeatTimeout
      case longOptions.ZMQ_CONNECT_TIMEOUT:
        return this._socket.connectTimeout
      default:
        throw new Error("Unknown option")
    }
  }
}

for (const key in shortOptions) {
  if (!shortOptions.hasOwnProperty(key)) {
    continue
  }
  if (Socket.prototype.hasOwnProperty(key)) {
    continue
  }
  Object.defineProperty(Socket.prototype, key, {
    get(this: Socket) {
      return this.getsockopt(shortOptions[key as keyof typeof shortOptions])
    },
    set(this: Socket, givenVal: string | Buffer) {
      const val =
        typeof givenVal === "string" ? Buffer.from(givenVal, "utf8") : givenVal
      return this.setsockopt(
        shortOptions[key as keyof typeof shortOptions],
        val,
      )
    },
  })
}

function createSocket(type: SocketType, options: {[key: string]: any} = {}) {
  const sock = new Socket(type)
  for (const key in options) {
    if (options.hasOwnProperty(key)) {
      sock[key] = options[key]
    }
  }
  return sock
}

function curveKeypair() {
  const {publicKey, secretKey} = zmq.curveKeyPair()
  return {public: publicKey, secret: secretKey}
}

function proxy(frontend: Socket, backend: Socket, capture?: Socket) {
  switch (`${frontend.type}/${backend.type}`) {
    case "push/pull":
    case "pull/push":
    case "xpub/xsub":
      frontend.on("message", (...args: zmq.MessageLike[]) => {
        backend.send(args)
      })

      if (capture) {
        backend.on("message", (...args: zmq.MessageLike[]) => {
          frontend.send(args)
          capture.send(args)
        })
      } else {
        backend.on("message", (...args: zmq.MessageLike[]) => {
          frontend.send(args)
        })
      }
      break

    case "router/dealer":
    case "xrep/xreq":
      frontend.on("message", (...args: zmq.MessageLike[]) => {
        backend.send(args)
      })

      if (capture) {
        backend.on("message", (...args: zmq.MessageLike[]) => {
          frontend.send(args)
          capture.send(args.slice(2))
        })
      } else {
        backend.on("message", (...args: zmq.MessageLike[]) => {
          frontend.send(args)
        })
      }
      break

    default:
      throw new Error(
        "This socket type order is not supported in compatibility mode",
      )
  }
}

const version = zmq.version

export {
  version,
  Context,
  Socket,
  SocketType,
  createSocket as socket,
  createSocket,
  curveKeypair,
  proxy,
  shortOptions as options,
}

export * from "./compat/long-options"
export * from "./compat/types"
export * from "./compat/poll-states"
export * from "./compat/send-options"
export * from "./compat/capabilities"
export * from "./compat/socket-states"
