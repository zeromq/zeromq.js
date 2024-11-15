import {allowMethods} from "./util"

export {
  capability,
  context,
  curveKeyPair,
  version,
  Context,
  Event,
  EventOfType,
  EventType,
  Socket,
  Observer,
  Proxy,
} from "./native"

import {
  capability,
  Context,
  EventOfType,
  EventType,
  Observer,
  Options,
  ReadableKeys,
  Socket,
  SocketType,
  WritableKeys,
} from "./native"

import * as draft from "./draft"
import {FullError} from "./errors"

/**
 * A type representing the messages that are returned inside promises by
 * {@link Readable.receive}().
 */
export type Message = Buffer

/**
 * Union type representing all message types that are accepted by
 * {@link Writable.send}().
 */
export type MessageLike =
  | ArrayBufferView /* Includes Node.js Buffer and all TypedArray types. */
  | ArrayBuffer /* Backing buffer of TypedArrays. */
  | SharedArrayBuffer
  | string
  | number
  | null

/**
 * Describes sockets that can send messages.
 *
 * @typeparam M The type of the message or message parts that can be sent.
 * @typeparam O Rest type for any options, if applicable to the socket type
 * (DRAFT only).
 */
export interface Writable<
  M extends MessageLike | MessageLike[] = MessageLike | MessageLike[],
  O extends [...object[]] = [],
> {
  /**
   * ZMQ_MULTICAST_HOPS
   *
   * Sets the time-to-live field in every multicast packet sent from this
   * socket. The default is 1 which means that the multicast packets don't leave
   * the local network.
   */
  multicastHops: number

  /**
   * ZMQ_SNDBUF
   *
   * Underlying kernel transmit buffer size in bytes. A value of -1 means leave
   * the OS default unchanged.
   */
  sendBufferSize: number

  /**
   * ZMQ_SNDHWM
   *
   * The high water mark is a hard limit on the maximum number of outgoing
   * messages ØMQ shall queue in memory for any single peer that the specified
   * socket is communicating with. A value of zero means no limit.
   *
   * If this limit has been reached the socket shall enter an exceptional state
   * and depending on the socket type, ØMQ shall take appropriate action such as
   * blocking or dropping sent messages.
   */
  sendHighWaterMark: number

  /**
   * ZMQ_SNDTIMEO
   *
   * Sets the timeout for sending messages on the socket. If the value is 0,
   * {@link send}() will return a rejected promise immediately if the message
   * cannot be sent. If the value is -1, it will wait asynchronously until the
   * message is sent. For all other values, it will try to send the message for
   * that amount of time before rejecting.
   */
  sendTimeout: number

  /**
   * Sends a single message or a multipart message on the socket. Queues the
   * message immediately if possible, and returns a resolved promise. If the
   * message cannot be queued because the high water mark has been reached, it
   * will wait asynchronously. The promise will be resolved when the message was
   * queued successfully.
   *
   * ```typescript
   * await socket.send("hello world")
   * await socket.send(["hello", "world"])
   * ```
   *
   * Queueing may fail eventually if the socket has been configured with a
   * {@link sendTimeout}.
   *
   * A call to {@link send}() is guaranteed to return with a resolved promise
   * immediately if the message could be queued directly.
   *
   * Only **one** asynchronously blocking call to {@link send}() may be executed
   * simultaneously. If you call {@link send}() again on a socket that is in the
   * mute state it will return a rejected promise with an `EBUSY` error.
   *
   * The reason for disallowing multiple {@link send}() calls simultaneously is
   * that it could create an implicit queue of unsendable outgoing messages.
   * This would circumvent the socket's {@link sendHighWaterMark}. Such an
   * implementation could even exhaust all system memory and cause the Node.js
   * process to abort.
   *
   * For most application you should not notice this implementation detail. Only
   * in rare occasions will a call to {@link send}() that does not resolve
   * immediately be undesired. Here are some common scenarios:
   *
   * * If you wish to **send a message**, use `await send(...)`. ZeroMQ socket
   *   types have been carefully designed to give you the correct blocking
   *   behaviour on the chosen socket type in almost all cases:
   *
   *   * If sending is not possible, it is often better to wait than to continue
   *     as if nothing happened. For example, on a {@link Request} socket, you
   *     can only receive a reply once a message has been sent; so waiting until
   *     a message could be queued before continuing with the rest of the
   *     program (likely to read from the socket) is required.
   *
   *   * Certain socket types (such as {@link Router}) will always allow
   *     queueing messages and `await send(...)` won't delay any code that comes
   *     after. This makes sense for routers, since typically you don't want a
   *     single send operation to stop the handling of other incoming or
   *     outgoing messages.
   *
   * * If you wish to send on an occasionally **blocking** socket (for example
   *   on a {@link Router} with the {@link Router.mandatory} option set, or on a
   *   {@link Dealer}) and you're 100% certain that **dropping a message is
   *   better than blocking**, then you can set the {@link sendTimeout} option
   *   to `0` to effectively force {@link send}() to always resolve immediately.
   *   Be prepared to catch exceptions if sending a message is not immediately
   *   possible.
   *
   * * If you wish to send on a socket and **messages should be queued before
   *   they are dropped**, you should implement a [simple
   *   queue](examples/queue/queue.ts) in JavaScript. Such a queue is not
   *   provided by this library because most real world applications need to
   *   deal with undeliverable messages in more complex ways - for example, they
   *   might need to reply with a status message; or first retry delivery a
   *   certain number of times before giving up.
   *
   * @param message Single message or multipart message to queue for sending.
   * @param options Any options, if applicable to the socket type (DRAFT only).
   * @returns Resolved when the message was successfully queued.
   */
  send(message: M, ...options: O): Promise<void>
}

type ReceiveType<T> = T extends {receive(): Promise<infer U>} ? U : never

/**
 * Describes sockets that can receive messages.
 *
 * @typeparam M The type of the message or message parts that can be read.
 */
export interface Readable<M extends object[] = Message[]> {
  /**
   * ZMQ_RCVBUF
   *
   * Underlying kernel receive buffer size in bytes. A value of -1 means leave
   * the OS default unchanged.
   */
  receiveBufferSize: number

  /**
   * ZMQ_RCVHWM
   *
   * The high water mark is a hard limit on the maximum number of incoming
   * messages ØMQ shall queue in memory for any single peer that the specified
   * socket is communicating with. A value of zero means no limit.
   *
   * If this limit has been reached the socket shall enter an exceptional state
   * and depending on the socket type, ØMQ shall take appropriate action such as
   * blocking or dropping sent messages.
   */
  receiveHighWaterMark: number

  /**
   * ZMQ_RCVTIMEO
   *
   * Sets the timeout receiving messages on the socket. If the value is 0,
   * {@link receive}() will return a rejected promise immediately if there is no
   * message to receive. If the value is -1, it will wait asynchronously until a
   * message is available. For all other values, it will wait for a message for
   * that amount of time before rejecting.
   */
  receiveTimeout: number

  /**
   * Waits for the next single or multipart message to become availeble on the
   * socket. Reads a message immediately if possible. If no messages can be
   * read, it will wait asynchonously. The promise will be resolved with an
   * array containing the parts of the next message when available.
   *
   * ```typescript
   * const [msg] = await socket.receive()
   * const [part1, part2] = await socket.receive()
   * ```
   *
   * Reading may fail (eventually) if the socket has been configured with a
   * {@link receiveTimeout}.
   *
   * A call to {@link receive}() is guaranteed to return with a resolved promise
   * immediately if a message could be read from the socket directly.
   *
   * Only **one** asynchronously blocking call to {@link receive}() can be in
   * progress simultaneously. If you call {@link receive}() again on the same
   * socket it will return a rejected promise with an `EBUSY` error. For
   * example, if no messages can be read and no `await` is used:
   *
   * ```typescript
   * socket.receive() // -> pending promise until read is possible
   * socket.receive() // -> promise rejection with `EBUSY` error
   * ```
   *
   * **Note:** Due to the nature of Node.js and to avoid blocking the main
   * thread, this method always attempts to read messages with the
   * `ZMQ_DONTWAIT` flag. It polls asynchronously if reading is not currently
   * possible. This means that all functionality related to timeouts and
   * blocking behaviour is reimplemented in the Node.js bindings. Any
   * differences in behaviour with the native ZMQ library is considered a bug.
   *
   * @returns Resolved with message parts that were successfully read.
   */
  receive(): Promise<M>

  /**
   * Asynchronously iterate over messages becoming available on the socket. When
   * the socket is closed with {@link Socket.close}(), the iterator will return.
   * Returning early from the iterator will **not** close the socket unless it
   * also goes out of scope.
   *
   * ```typescript
   * for await (const [msg] of socket) {
   *   // handle messages
   * }
   * ```
   */
  [Symbol.asyncIterator](): AsyncIterator<ReceiveType<this>, undefined>
}

/**
 * Represents the options that can be assigned in the constructor of a given
 * socket type, for example `new Dealer({...})`. Readonly options
 * for the particular socket will be omitted.
 *
 * @typeparam S The socket type to which the options should be applied.
 */
export type SocketOptions<S extends Socket> = Options<S, {context: Context}>

interface SocketLikeIterable<T> {
  closed: boolean
  receive(): Promise<T>
}

/* Support async iteration over received messages. Implementing this in JS
   is faster as long as there is no C++ native API to chain promises. */
function asyncIterator<T extends SocketLikeIterable<U>, U>(this: T) {
  return {
    next: async (): Promise<IteratorResult<U, undefined>> => {
      if (this.closed) {
        /* Cast so we can omit 'value: undefined'. */
        return {done: true} as IteratorReturnResult<undefined>
      }

      try {
        return {value: await this.receive(), done: false}
      } catch (err) {
        if (this.closed && (err as FullError).code === "EAGAIN") {
          /* Cast so we can omit 'value: undefined'. */
          return {done: true} as IteratorReturnResult<undefined>
        } else {
          throw err
        }
      }
    },
  }
}

Object.assign(Socket.prototype, {[Symbol.asyncIterator]: asyncIterator})
Object.assign(Observer.prototype, {[Symbol.asyncIterator]: asyncIterator})

export interface EventSubscriber {
  /**
   * Adds a listener function which will be invoked when the given event type is
   * observed. Calling this method will convert the {@link Observer} to **event
   * emitter mode**, which will make it impossible to call
   * {@link Observer.receive}() at the same time.
   *
   * ```typescript
   * socket.events.on("bind", event => {
   *   console.log(`Socket bound to ${event.address}`)
   *   // ...
   * })
   * ```
   *
   * @param type The type of event to listen for.
   * @param listener The listener function that will be called with all event
   * data when the event is observed.
   */
  on<E extends EventType>(
    type: E,
    listener: (data: EventOfType<E>) => void,
  ): EventSubscriber

  /**
   * Removes the specified listener function from the list of functions to call
   * when the given event is observed.
   *
   * @param type The type of event that the listener was listening for.
   * @param listener The previously registered listener function.
   */
  off<E extends EventType>(
    type: E,
    listener: (data: EventOfType<E>) => void,
  ): EventSubscriber
}

interface EventEmitter {
  emit<E extends EventType>(type: E, data: EventOfType<E>): void
}

if (!Observer.prototype.hasOwnProperty("emitter")) {
  Object.defineProperty(Observer.prototype, "emitter", {
    get: function emitter(this: Observer) {
      /* eslint-disable-next-line @typescript-eslint/no-var-requires */
      const events = require("events")
      const value: EventEmitter = new events.EventEmitter()

      const boundReceive = this.receive.bind(this)
      Object.defineProperty(this, "receive", {
        get: () => {
          throw new Error(
            "Observer is in event emitter mode. " +
              "After a call to events.on() it is not possible to read events " +
              "with events.receive().",
          )
        },
      })

      const run = async () => {
        while (!this.closed) {
          const event = await boundReceive()
          value.emit(event.type, event)
        }
      }

      run()

      Object.defineProperty(this, "emitter", {value})
      return value
    },
  })
}

Observer.prototype.on = function on(this: {emitter: EventSubscriber}, ...args) {
  return this.emitter.on(...args)
}

Observer.prototype.off = function off(
  this: {emitter: EventSubscriber},
  ...args
) {
  return this.emitter.off(...args)
}

/* Declare all additional TypeScript prototype methods that have been added
   in this file here. They will augment the native module exports. */
declare module "./native" {
  export interface Context {
    /**
     * ZMQ_BLOCKY
     *
     * By default the context will block forever when closed at process exit.
     * The assumption behind this behavior is that abrupt termination will cause
     * message loss. Most real applications use some form of handshaking to
     * ensure applications receive termination messages, and then terminate the
     * context with {@link Socket.linger} set to zero on all sockets. This
     * setting is an easier way to get the same result. When {@link blocky} is
     * set to `false`, all new sockets are given a linger timeout of zero. You
     * must still close all sockets before exiting.
     */
    blocky: boolean

    /**
     * ZMQ_IO_THREADS
     *
     * Size of the ØMQ thread pool to handle I/O operations. If your application
     * is using only the `inproc` transport for messaging you may set this to
     * zero, otherwise set it to at least one (default).
     */
    ioThreads: number

    /**
     * ZMQ_MAX_MSGSZ
     *
     * Maximum allowed size of a message sent in the context.
     */
    maxMessageSize: number

    /**
     * ZMQ_MAX_SOCKETS
     *
     * Maximum number of sockets allowed on the context.
     */
    maxSockets: number

    /**
     * ZMQ_IPV6
     *
     * Enable or disable IPv6. When IPv6 is enabled, a socket will connect to,
     * or accept connections from, both IPv4 and IPv6 hosts.
     */
    ipv6: boolean

    /**
     * ZMQ_THREAD_PRIORITY
     *
     * Scheduling priority for internal context's thread pool. This option is
     * not available on Windows. Supported values for this option depend on
     * chosen scheduling policy. Details can be found at
     * http://man7.org/linux/man-pages/man2/sched_setscheduler.2.html. This
     * option only applies before creating any sockets on the context.
     *
     * @writeonly
     */
    threadPriority: number

    /**
     * ZMQ_THREAD_SCHED_POLICY
     *
     * Scheduling policy for internal context's thread pool. This option is not
     * available on Windows. Supported values for this option can be found at
     * http://man7.org/linux/man-pages/man2/sched_setscheduler.2.html. This
     * option only applies before creating any sockets on the context.
     *
     * @writeonly
     */
    threadSchedulingPolicy: number

    /**
     * ZMQ_SOCKET_LIMIT
     *
     * Largest number of sockets that can be set with {@link maxSockets}.
     *
     * @readonly
     */
    readonly maxSocketsLimit: number
  }

  /**
   * Socket option names differ somewhat from the native libzmq option names.
   * This is intentional to improve readability and be more idiomatic for
   * JavaScript/TypeScript.
   */
  export interface Socket {
    /**
     * ZMQ_AFFINITY
     *
     * I/O thread affinity, which determines which threads from the ØMQ I/O
     * thread pool associated with the socket's context shall handle newly
     * created connections.
     *
     * **Note:** This value is a bit mask, but values higher than
     * `Number.MAX_SAFE_INTEGER` may not be represented accurately! This
     * currently means that configurations beyond 52 threads are unreliable.
     */
    affinity: number

    /**
     * ZMQ_RATE
     *
     * Maximum send or receive data rate for multicast transports such as `pgm`.
     */
    rate: number

    /**
     * ZMQ_RECOVERY_IVL
     *
     * Maximum time in milliseconds that a receiver can be absent from a
     * multicast group before unrecoverable data loss will occur.
     */
    recoveryInterval: number

    /**
     * ZMQ_LINGER
     *
     * Determines how long pending messages which have yet to be sent to a peer
     * shall linger in memory after a socket is closed with {@link close}().
     */
    linger: number

    /**
     * ZMQ_RECONNECT_IVL
     *
     * Period ØMQ shall wait between attempts to reconnect disconnected peers
     * when using connection-oriented transports. The value -1 means no
     * reconnection.
     */
    reconnectInterval: number

    /**
     * ZMQ_BACKLOG
     *
     * Maximum length of the queue of outstanding peer connections for the
     * specified socket. This only applies to connection-oriented transports.
     */
    backlog: number

    /**
     * ZMQ_RECONNECT_IVL_MAX
     *
     * Maximum period ØMQ shall wait between attempts to reconnect. On each
     * reconnect attempt, the previous interval shall be doubled until
     * {@link reconnectMaxInterval} is reached. This allows for exponential
     * backoff strategy. Zero (the default) means no exponential backoff is
     * performed and reconnect interval calculations are only based on
     * {@link reconnectInterval}.
     */
    reconnectMaxInterval: number

    /**
     * ZMQ_MAXMSGSIZE
     *
     * Limits the size of the inbound message. If a peer sends a message larger
     * than the limit it is disconnected. Value of -1 means no limit.
     */
    maxMessageSize: number

    /**
     * ZMQ_TCP_KEEPALIVE
     *
     * Override SO_KEEPALIVE socket option (if supported by OS). The default
     * value of -1 leaves it to the OS default.
     */
    tcpKeepalive: number

    /**
     * ZMQ_TCP_KEEPALIVE_CNT
     *
     * Overrides TCP_KEEPCNT socket option (if supported by OS). The default
     * value of -1 leaves it to the OS default.
     */
    tcpKeepaliveCount: number

    /**
     * ZMQ_TCP_KEEPALIVE_IDLE
     *
     * Overrides TCP_KEEPIDLE / TCP_KEEPALIVE socket option (if supported by
     * OS). The default value of -1 leaves it to the OS default.
     */
    tcpKeepaliveIdle: number

    /**
     * ZMQ_TCP_KEEPALIVE_INTVL
     *
     * Overrides TCP_KEEPINTVL socket option (if supported by the OS). The
     * default value of -1 leaves it to the OS default.
     */
    tcpKeepaliveInterval: number

    /**
     * ZMQ_TCP_ACCEPT_FILTER
     *
     * Assign a filter that will be applied for each new TCP transport
     * connection on a listening socket. If no filters are applied, then the TCP
     * transport allows connections from any IP address. If at least one filter
     * is applied then new connection source IP should be matched. To clear all
     * filters set to `null`. Filter is a string with IPv6 or IPv4 CIDR.
     */
    tcpAcceptFilter: string | null

    /**
     * ZMQ_IMMEDIATE
     *
     * By default queues will fill on outgoing connections even if the
     * connection has not completed. This can lead to "lost" messages on sockets
     * with round-robin routing ({@link Request}, {@link Push}, {@link Dealer}).
     * If this option is set to `true`, messages shall be queued only to
     * completed connections. This will cause the socket to block if there are
     * no other connections, but will prevent queues from filling on pipes
     * awaiting connection.
     */
    immediate: boolean

    /**
     * ZMQ_IPV6
     *
     * Enable or disable IPv6. When IPv6 is enabled, the socket will connect to,
     * or accept connections from, both IPv4 and IPv6 hosts.
     */
    ipv6: boolean

    /**
     * ZMQ_PLAIN_SERVER
     *
     * Defines whether the socket will act as server for PLAIN security. A value
     * of `true` means the socket will act as PLAIN server. A value of `false`
     * means the socket will not act as PLAIN server, and its security role then
     * depends on other option settings.
     */
    plainServer: boolean

    /**
     * ZMQ_PLAIN_USERNAME
     *
     * Sets the username for outgoing connections over TCP or IPC. If you set
     * this to a non-null value, the security mechanism used for connections
     * shall be PLAIN.
     */
    plainUsername: string | null

    /**
     * ZMQ_PLAIN_PASSWORD
     *
     * Sets the password for outgoing connections over TCP or IPC. If you set
     * this to a non-null value, the security mechanism used for connections
     * shall be PLAIN.
     */
    plainPassword: string | null

    /**
     * ZMQ_CURVE_SERVER
     *
     * Defines whether the socket will act as server for CURVE security. A value
     * of `true` means the socket will act as CURVE server. A value of `false`
     * means the socket will not act as CURVE server, and its security role then
     * depends on other option settings.
     */
    curveServer: boolean

    /**
     * ZMQ_CURVE_PUBLICKEY
     *
     * Sets the socket's long term public key. You must set this on CURVE client
     * sockets. A server socket does not need to know its own public key. You
     * can create a new keypair with {@link curveKeyPair}().
     */
    curvePublicKey: string | null

    /**
     * ZMQ_CURVE_SECRETKEY
     *
     * Sets the socket's long term secret key. You must set this on both CURVE
     * client and server sockets. You can create a new keypair with
     * {@link curveKeyPair}().
     */
    curveSecretKey: string | null

    /**
     * ZMQ_CURVE_SERVERKEY
     *
     * Sets the socket's long term server key. This is the public key of the
     * CURVE *server* socket. You must set this on CURVE *client* sockets. This
     * key must have been generated together with the server's secret key. You
     * can create a new keypair with {@link curveKeyPair}().
     */
    curveServerKey: string | null

    /** */
    gssapiServer: boolean

    /** */
    gssapiPrincipal: string | null

    /** */
    gssapiServicePrincipal: string | null

    /** */
    gssapiPlainText: boolean

    /** */
    gssapiPrincipalNameType: "hostBased" | "userName" | "krb5Principal"

    /** */
    gssapiServicePrincipalNameType: "hostBased" | "userName" | "krb5Principal"

    /**
     * ZMQ_ZAP_DOMAIN
     *
     * Sets the domain for ZAP (ZMQ RFC 27) authentication. For NULL security
     * (the default on all `tcp://` connections), ZAP authentication only
     * happens if you set a non-empty domain. For PLAIN and CURVE security, ZAP
     * requests are always made, if there is a ZAP handler present. See
     * http://rfc.zeromq.org/spec:27 for more details.
     */
    zapDomain: string | null

    /**
     * ZMQ_TOS
     *
     * Sets the ToS fields (the *Differentiated Services* (DS) and *Explicit
     * Congestion Notification* (ECN) field) of the IP header. The ToS field is
     * typically used to specify a packet's priority. The availability of this
     * option is dependent on intermediate network equipment that inspect the
     * ToS field and provide a path for low-delay, high-throughput,
     * highly-reliable service, etc.
     */
    typeOfService: number

    /**
     * ZMQ_HANDSHAKE_IVL
     *
     * Handshaking is the exchange of socket configuration information (socket
     * type, identity, security) that occurs when a connection is first opened
     * (only for connection-oriented transports). If handshaking does not
     * complete within the configured time, the connection shall be closed. The
     * value 0 means no handshake time limit.
     */
    handshakeInterval: number

    /**
     * ZMQ_SOCKS_PROXY
     *
     * The SOCKS5 proxy address that shall be used by the socket for the TCP
     * connection(s). Does not support SOCKS5 authentication. If the endpoints
     * are domain names instead of addresses they shall not be resolved and they
     * shall be forwarded unchanged to the SOCKS proxy service in the client
     * connection request message (address type 0x03 domain name).
     */
    socksProxy: string | null

    /**
     * ZMQ_HEARTBEAT_IVL
     *
     * Interval in milliseconds between sending ZMTP heartbeats for the
     * specified socket. If this option is greater than 0, then a PING ZMTP
     * command will be sent after every interval.
     */
    heartbeatInterval: number

    /**
     * ZMQ_HEARTBEAT_TTL
     *
     * The timeout in milliseconds on the remote peer for ZMTP heartbeats. If
     * this option is greater than 0, the remote side shall time out the
     * connection if it does not receive any more traffic within the TTL period.
     * This option does not have any effect if {@link heartbeatInterval} is 0.
     * Internally, this value is rounded down to the nearest decisecond, any
     * value less than 100 will have no effect.
     */
    heartbeatTimeToLive: number

    /**
     * ZMQ_HEARTBEAT_TIMEOUT
     *
     * How long (in milliseconds) to wait before timing-out a connection after
     * sending a PING ZMTP command and not receiving any traffic. This option is
     * only valid if {@link heartbeatInterval} is greater than 0. The connection
     * will time out if there is no traffic received after sending the PING
     * command. The received traffic does not have to be a PONG command - any
     * received traffic will cancel the timeout.
     */
    heartbeatTimeout: number

    /**
     * ZMQ_CONNECT_TIMEOUT
     *
     * Sets how long to wait before timing-out a connect() system call. The
     * connect() system call normally takes a long time before it returns a time
     * out error. Setting this option allows the library to time out the call at
     * an earlier interval.
     */
    connectTimeout: number

    /**
     * ZMQ_TCP_MAXRT
     *
     * Sets how long before an unacknowledged TCP retransmit times out (if
     * supported by the OS). The system normally attempts many TCP retransmits
     * following an exponential backoff strategy. This means that after a
     * network outage, it may take a long time before the session can be
     * re-established. Setting this option allows the timeout to happen at a
     * shorter interval.
     */
    tcpMaxRetransmitTimeout: number

    /**
     * ZMQ_MULTICAST_MAXTPDU
     *
     * Sets the maximum transport data unit size used for outbound multicast
     * packets. This must be set at or below the minimum Maximum Transmission
     * Unit (MTU) for all network paths over which multicast reception is
     * required.
     */
    multicastMaxTransportDataUnit: number

    /**
     * ZMQ_VMCI_BUFFER_SIZE
     *
     * The size of the underlying buffer for the socket. Used during negotiation
     * before the connection is established.
     * For `vmci://` transports only.
     */
    vmciBufferSize: number

    /**
     * ZMQ_VMCI_BUFFER_MIN_SIZE
     *
     * Minimum size of the underlying buffer for the socket. Used during
     * negotiation before the connection is established.
     * For `vmci://` transports only.
     */
    vmciBufferMinSize: number

    /**
     * ZMQ_VMCI_BUFFER_MAX_SIZE
     *
     * Maximum size of the underlying buffer for the socket. Used during
     * negotiation before the connection is established.
     * For `vmci://` transports only.
     */
    vmciBufferMaxSize: number

    /**
     * ZMQ_VMCI_CONNECT_TIMEOUT
     *
     * Connection timeout for the socket.
     * For `vmci://` transports only.
     */
    vmciConnectTimeout: number

    /**
     * ZMQ_BINDTODEVICE
     *
     * Binds the socket to the given network interface (Linux only). Allows to
     * use Linux VRF, see:
     * https://www.kernel.org/doc/Documentation/networking/vrf.txt. Requires the
     * program to be ran as root **or** with `CAP_NET_RAW`.
     */
    interface: string | null

    /**
     * ZMQ_ZAP_ENFORCE_DOMAIN
     *
     * The ZAP (ZMQ RFC 27) authentication protocol specifies that a domain must
     * always be set. Older versions of libzmq did not follow the spec and
     * allowed an empty domain to be set. This option can be used to enabled or
     * disable the stricter, backward incompatible behaviour. For now it is
     * disabled by default, but in a future version it will be enabled by
     * default.
     */
    zapEnforceDomain: boolean

    /**
     * ZMQ_LOOPBACK_FASTPATH
     *
     * Enable faster TCP connections on loopback devices. An application can
     * enable this option to reduce the latency and improve the performance of
     * loopback operations on a TCP socket on Windows.
     *
     * @windows
     */
    loopbackFastPath: boolean

    /**
     * ZMQ_TYPE
     *
     * Retrieve the socket type. This is fairly useless because you can test the
     * socket class with e.g. `socket instanceof Dealer`.
     *
     * @readonly
     */
    readonly type: SocketType

    /**
     * ZMQ_LAST_ENDPOINT
     *
     * The last endpoint bound for TCP and IPC transports.
     *
     * @readonly
     */
    readonly lastEndpoint: string | null

    /**
     * ZMQ_MECHANISM
     *
     * Returns the current security mechanism for the socket, if any. The
     * security mechanism is set implictly by using any of the relevant security
     * options. The returned value is one of:
     * * `null` - No security mechanism is used.
     * * `"plain"` - The PLAIN mechanism defines a simple username/password
     *   mechanism that lets a server authenticate a client. PLAIN makes no
     *   attempt at security or confidentiality.
     * * `"curve"` - The CURVE mechanism defines a mechanism for secure
     *   authentication and confidentiality for communications between a client
     *   and a server. CURVE is intended for use on public networks.
     * * `"gssapi"` - The GSSAPI mechanism defines a mechanism for secure
     *   authentication and confidentiality for communications between a client
     *   and a server using the Generic Security Service Application Program
     *   Interface (GSSAPI). The GSSAPI mechanism can be used on both public and
     *   private networks.
     *
     * @readonly
     */
    readonly securityMechanism: null | "plain" | "curve" | "gssapi"

    /**
     * ZMQ_THREAD_SAFE
     *
     * Whether or not the socket is threadsafe. Currently only DRAFT sockets is
     * thread-safe.
     *
     * @readonly
     */
    readonly threadSafe: boolean
  }

  export interface Observer extends EventSubscriber {
    /**
     * Asynchronously iterate over socket events. When the socket is closed or
     * when the observer is closed manually with {@link Observer.close}(), the
     * iterator will return.
     *
     * ```typescript
     * for await (event of socket.events) {
     *   switch (event.type) {
     *     case "bind":
     *       console.log(`Socket bound to ${event.address}`)
     *       break
     *     // ...
     *   }
     * }
     * ```
     */
    [Symbol.asyncIterator](): AsyncIterator<ReceiveType<this>, undefined>
  }
}

/* Concrete socket types. */

/**
 * A {@link Pair} socket can only be connected to one other {@link Pair} at any
 * one time. No message routing or filtering is performed on any messages.
 *
 * When a {@link Pair} socket enters the mute state due to having reached the
 * high water mark for the connected peer, or if no peer is connected, then any
 * {@link Writable.send}() operations on the socket shall block until the peer
 * becomes available for sending; messages are not discarded.
 *
 * While {@link Pair} sockets can be used over transports other than
 * `inproc://`, their inability to auto-reconnect coupled with the fact new
 * incoming connections will be terminated while any previous connections
 * (including ones in a closing state) exist makes them unsuitable for `tcp://`
 * in most cases.
 */
export class Pair extends Socket {
  constructor(options?: SocketOptions<Pair>) {
    super(SocketType.Pair, options)
  }
}

export interface Pair extends Writable, Readable {}
allowMethods(Pair.prototype, ["send", "receive"])

/**
 * A {@link Publisher} socket is used to distribute data to {@link Subscriber}s.
 * Messages sent are distributed in a fan out fashion to all connected peers.
 * This socket cannot receive messages.
 *
 * When a {@link Publisher} enters the mute state due to having reached the high
 * water mark for a connected {@link Subscriber}, then any messages that would
 * be sent to the subscriber in question shall instead be dropped until the mute
 * state ends. The {@link Writable.send}() method will never block.
 */
export class Publisher extends Socket {
  /**
   * ZMQ_XPUB_NODROP
   *
   * Sets the socket behaviour to return an error if the high water mark is
   * reached and the message could not be send. The default is to drop the
   * message silently when the peer high water mark is reached.
   */
  noDrop: boolean

  /**
   * ZMQ_CONFLATE
   *
   * If set to `true`, a socket shall keep only one message in its
   * inbound/outbound queue: the last message to be received/sent. Ignores any
   * high water mark options. Does not support multi-part messages - in
   * particular, only one part of it is kept in the socket internal queue.
   */
  conflate: boolean

  /**
   * ZMQ_INVERT_MATCHING
   *
   * Causes messages to be sent to all connected sockets except those subscribed
   * to a prefix that matches the message.
   *
   * All {@link Subscriber} sockets connecting to the {@link Publisher} must
   * also have the option set to `true`. Failure to do so will have the
   * {@link Subscriber} sockets reject everything the {@link Publisher} socket
   * sends them.
   */
  invertMatching: boolean

  constructor(options?: SocketOptions<Publisher>) {
    super(SocketType.Publisher, options)
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Publisher extends Writable {}
allowMethods(Publisher.prototype, ["send"])

/**
 * A {@link Subscriber} socket is used to subscribe to data distributed by a
 * {@link Publisher}. Initially a {@link Subscriber} is not subscribed to any
 * messages. Use {@link Subscriber.subscribe}() to specify which messages to
 * subscribe to. This socket cannot send messages.
 */
export class Subscriber extends Socket {
  /**
   * ZMQ_CONFLATE
   *
   * If set to `true`, a socket shall keep only one message in its
   * inbound/outbound queue: the last message to be received/sent. Ignores any
   * high water mark options. Does not support multi-part messages - in
   * particular, only one part of it is kept in the socket internal queue.
   */
  conflate: boolean

  /**
   * ZMQ_INVERT_MATCHING
   *
   * Causes incoming messages that do not match any of the socket's
   * subscriptions to be received by the user.
   *
   * All {@link Subscriber} sockets connecting to a {@link Publisher} must also
   * have the option set to `true`. Failure to do so will have the
   * {@link Subscriber} sockets reject everything the {@link Publisher} socket
   * sends them.
   */
  invertMatching: boolean

  constructor(options?: SocketOptions<Subscriber>) {
    super(SocketType.Subscriber, options)
  }

  /**
   * Establish a new message filter. Newly created {@link Subsriber} sockets
   * will filtered out all incoming messages. Call this method to subscribe to
   * messages beginning with the given prefix.
   *
   * Multiple filters may be attached to a single socket, in which case a
   * message shall be accepted if it matches at least one filter. Subscribing
   * without any filters shall subscribe to **all** incoming messages.
   *
   * ```typescript
   * const sub = new Subscriber()
   *
   * // Listen to all messages beginning with 'foo'.
   * sub.subscribe("foo")
   *
   * // Listen to all incoming messages.
   * sub.subscribe()
   * ```
   *
   * @param prefixes The prefixes of messages to subscribe to.
   */
  subscribe(...prefixes: Array<Buffer | string>) {
    if (prefixes.length === 0) {
      this.setStringOption(6, null)
    } else {
      for (const prefix of prefixes) {
        this.setStringOption(6, prefix)
      }
    }
  }

  /**
   * Remove an existing message filter which was previously established with
   * {@link subscribe}(). Stops receiving messages with the given prefix.
   *
   * Unsubscribing without any filters shall unsubscribe from the "subscribe
   * all" filter that is added by calling {@link subscribe}() without arguments.
   *
   * ```typescript
   * const sub = new Subscriber()
   *
   * // Listen to all messages beginning with 'foo'.
   * sub.subscribe("foo")
   * // ...
   *
   * // Stop listening to messages beginning with 'foo'.
   * sub.unsubscribe("foo")
   * ```
   *
   * @param prefixes The prefixes of messages to subscribe to.
   */
  unsubscribe(...prefixes: Array<Buffer | string>) {
    if (prefixes.length === 0) {
      this.setStringOption(7, null)
    } else {
      for (const prefix of prefixes) {
        this.setStringOption(7, prefix)
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Subscriber extends Readable {}
allowMethods(Subscriber.prototype, ["receive"])

/**
 * A {@link Request} socket acts as a client to send requests to and receive
 * replies from a {@link Reply} socket. This socket allows only an alternating
 * sequence of {@link Writable.send}() and subsequent {@link Readable.receive}()
 * calls. Each request sent is round-robined among all services, and each reply
 * received is matched with the last issued request.
 *
 * If no services are available, then any send operation on the socket shall
 * block until at least one service becomes available. The REQ socket shall not
 * discard messages.
 */
export class Request extends Socket {
  /**
   * ZMQ_ROUTING_ID
   *
   * The identity of the specified socket when connecting to a `Router` socket.
   */
  routingId: string | null

  /**
   * ZMQ_PROBE_ROUTER
   *
   * When set to `true`, the socket will automatically send an empty message
   * when a new connection is made or accepted. You may set this on sockets
   * connected to a {@link Router} socket. The application must filter such
   * empty messages. This option provides the {@link Router} with an event
   * signaling the arrival of a new peer.
   *
   * *Warning:** Do not set this option on a socket that talks to any other
   * socket type except {@link Router}: the results are undefined.
   *
   * @writeonly
   */
  probeRouter: boolean

  /**
   * ZMQ_REQ_CORRELATE
   *
   * The default behaviour of {@link Request} sockets is to rely on the ordering
   * of messages to match requests and responses and that is usually sufficient.
   * When this option is set to `true` the socket will prefix outgoing messages
   * with an extra frame containing a request id. That means the full message is
   * `[<request id>, `null`, user frames…]`. The {@link Request} socket will
   * discard all incoming messages that don't begin with these two frames.
   */
  correlate: boolean

  /**
   * ZMQ_REQ_RELAXED
   *
   * By default, a {@link Request} socket does not allow initiating a new
   * request until the reply to the previous one has been received. When set to
   * `true`, sending another message is allowed and previous replies will be
   * discarded. The request-reply state machine is reset and a new request is
   * sent to the next available peer.
   *
   * **Note:** If set to `true`, also enable {@link correlate} to ensure correct
   * matching of requests and replies. Otherwise a late reply to an aborted
   * request can be reported as the reply to the superseding request.
   */
  relaxed: boolean

  constructor(options?: SocketOptions<Request>) {
    super(SocketType.Request, options)
  }
}

export interface Request extends Readable, Writable {}
allowMethods(Request.prototype, ["send", "receive"])

/**
 * A {@link Reply} socket can act as a server which receives requests from and
 * sends replies to a {@link Request} socket. This socket type allows only an
 * alternating sequence of {@link Readable.receive}() and subsequent
 * {@link Writable.send}() calls. Each request received is fair-queued from
 * among all clients, and each reply sent is routed to the client that issued
 * the last request. If the original requester does not exist any more the reply
 * is silently discarded.
 */
export class Reply extends Socket {
  /**
   * ZMQ_ROUTING_ID
   *
   * The identity of the specified socket when connecting to a `Router` socket.
   */
  routingId: string | null

  constructor(options?: SocketOptions<Reply>) {
    super(SocketType.Reply, options)
  }
}

export interface Reply extends Readable, Writable {}
allowMethods(Reply.prototype, ["send", "receive"])

/**
 * A {@link Dealer} socket can be used to extend request/reply sockets. Each
 * message sent is round-robined among all connected peers, and each message
 * received is fair-queued from all connected peers.
 *
 * When a {@link Dealer} socket enters the mute state due to having reached the
 * high water mark for all peers, or if there are no peers at all, then any
 * {@link Writable.send}() operations on the socket shall block until the mute
 * state ends or at least one peer becomes available for sending; messages are
 * not discarded.
 *
 * When a {@link Dealer} is connected to a {@link Reply} socket, each message
 * sent must consist of an empty message part, the delimiter, followed by one or
 * more body parts.
 */
export class Dealer extends Socket {
  /**
   * ZMQ_ROUTING_ID
   *
   * The identity of the specified socket when connecting to a `Router` socket.
   */
  routingId: string | null

  /**
   * ZMQ_PROBE_ROUTER
   *
   * When set to `true`, the socket will automatically send an empty message
   * when a new connection is made or accepted. You may set this on sockets
   * connected to a {@link Router} socket. The application must filter such
   * empty messages. This option provides the {@link Router} with an event
   * signaling the arrival of a new peer.
   *
   * *Warning:** Do not set this option on a socket that talks to any other
   * socket type except {@link Router}: the results are undefined.
   *
   * @writeonly
   */
  probeRouter: boolean

  /**
   * ZMQ_CONFLATE
   *
   * If set to `true`, a socket shall keep only one message in its
   * inbound/outbound queue: the last message to be received/sent. Ignores any
   * high water mark options. Does not support multi-part messages - in
   * particular, only one part of it is kept in the socket internal queue.
   */
  conflate: boolean

  constructor(options?: SocketOptions<Dealer>) {
    super(SocketType.Dealer, options)
  }
}

export interface Dealer extends Readable, Writable {}
allowMethods(Dealer.prototype, ["send", "receive"])

/**
 * A {@link Router} can be used to extend request/reply sockets. When receiving
 * messages a {@link Router} shall prepend a message part containing the routing
 * id of the originating peer to the message. Messages received are fair-queued
 * from among all connected peers. When sending messages, the first part of the
 * message is removed and used to determine the routing id of the peer the
 * message should be routed to.
 *
 * If the peer does not exist anymore, or has never existed, the message shall
 * be silently discarded. However, if {@link Router.mandatory} is set to `true`,
 * the socket shall fail with a `EHOSTUNREACH` error in both cases.
 *
 * When a {@link Router} enters the mute state due to having reached the high
 * water mark for all peers, then any messages sent to the socket shall be
 * dropped until the mute state ends. Likewise, any messages routed to a peer
 * for which the individual high water mark has been reached shall also be
 * dropped. If {@link Router.mandatory} is set to `true` the socket shall block
 * or return an `EAGAIN` error in both cases.
 *
 * When a {@link Request} socket is connected to a {@link Router}, in addition
 * to the routing id of the originating peer each message received shall contain
 * an empty delimiter message part. Hence, the entire structure of each received
 * message as seen by the application becomes: one or more routing id parts,
 * delimiter part, one or more body parts. When sending replies to a
 * {@link Request} the delimiter part must be included.
 */
export class Router extends Socket {
  /**
   * ZMQ_ROUTING_ID
   *
   * The identity of the specified socket when connecting to a `Router` socket.
   */
  routingId: string | null

  /**
   * ZMQ_ROUTER_MANDATORY
   *
   * A value of `false` is the default and discards the message silently when it
   * cannot be routed or the peer's high water mark is reached. A value of
   * `true` causes {@link send}() to fail if it cannot be routed, or wait
   * asynchronously if the high water mark is reached.
   */
  mandatory: boolean

  /**
   * ZMQ_PROBE_ROUTER
   *
   * When set to `true`, the socket will automatically send an empty message
   * when a new connection is made or accepted. You may set this on sockets
   * connected to a {@link Router} socket. The application must filter such
   * empty messages. This option provides the {@link Router} with an event
   * signaling the arrival of a new peer.
   *
   * *Warning:** Do not set this option on a socket that talks to any other
   * socket type except {@link Router}: the results are undefined.
   *
   * @writeonly
   */
  probeRouter: boolean

  /**
   * ZMQ_ROUTER_HANDOVER
   *
   * If two clients use the same identity when connecting to a {@link Router},
   * the results shall depend on the this option. If it set to `false`
   * (default), the {@link Router} socket shall reject clients trying to connect
   * with an already-used identity. If it is set to `true`, the {@link Router}
   * socket shall hand-over the connection to the new client and disconnect the
   * existing one.
   */
  handover: boolean

  constructor(options?: SocketOptions<Router>) {
    super(SocketType.Router, options)
  }

  /**
   * Connects to the given remote address. To specificy a specific routing id,
   * provide a `routingId` option. The identity should be unique, from 1 to 255
   * bytes long and MAY NOT start with binary zero.
   *
   * @param address The `tcp://` address to connect to.
   * @param options Any connection options.
   */
  connect(address: string, options: RouterConnectOptions = {}) {
    if (options.routingId) {
      this.setStringOption(61, options.routingId)
    }

    super.connect(address)
  }
}

export interface RouterConnectOptions {
  routingId?: string
}

export interface Router extends Readable, Writable {}
allowMethods(Router.prototype, ["send", "receive"])

/**
 * A {@link Pull} socket is used by a pipeline node to receive messages from
 * upstream pipeline nodes. Messages are fair-queued from among all connected
 * upstream nodes. This socket cannot send messages.
 */
export class Pull extends Socket {
  constructor(options?: SocketOptions<Pull>) {
    super(SocketType.Pull, options)
  }
}

export interface Pull extends Readable {
  /**
   * ZMQ_CONFLATE
   *
   * If set to `true`, a socket shall keep only one message in its
   * inbound/outbound queue: the last message to be received/sent. Ignores any
   * high water mark options. Does not support multi-part messages - in
   * particular, only one part of it is kept in the socket internal queue.
   */
  conflate: boolean
}

allowMethods(Pull.prototype, ["receive"])

/**
 * A {@link Push} socket is used by a pipeline node to send messages to
 * downstream pipeline nodes. Messages are round-robined to all connected
 * downstream nodes. This socket cannot receive messages.
 *
 * When a {@link Push} socket enters the mute state due to having reached the
 * high water mark for all downstream nodes, or if there are no downstream nodes
 * at all, then {@link Writable.send}() will block until the mute state ends or
 * at least one downstream node becomes available for sending; messages are not
 * discarded.
 */
export class Push extends Socket {
  constructor(options?: SocketOptions<Push>) {
    super(SocketType.Push, options)
  }
}

export interface Push extends Writable {
  /**
   * ZMQ_CONFLATE
   *
   * If set to `true`, a socket shall keep only one message in its
   * inbound/outbound queue: the last message to be received/sent. Ignores any
   * high water mark options. Does not support multi-part messages - in
   * particular, only one part of it is kept in the socket internal queue.
   */
  conflate: boolean
}

allowMethods(Push.prototype, ["send"])

/**
 * Same as {@link Publisher}, except that you can receive subscriptions from the
 * peers in form of incoming messages. Subscription message is a byte 1 (for
 * subscriptions) or byte 0 (for unsubscriptions) followed by the subscription
 * body. Messages without a sub/unsub prefix are also received, but have no
 * effect on subscription status.
 */
export class XPublisher extends Socket {
  /**
   * ZMQ_XPUB_NODROP
   *
   * Sets the socket behaviour to return an error if the high water mark is
   * reached and the message could not be send. The default is to drop the
   * message silently when the peer high water mark is reached.
   */
  noDrop: boolean

  /**
   * ZMQ_XPUB_MANUAL
   *
   * Sets the {@link XPublisher} socket subscription handling mode to
   * manual/automatic. A value of `true` will change the subscription requests
   * handling to manual.
   */
  manual: boolean

  /**
   * ZMQ_XPUB_WELCOME_MSG
   *
   * Sets a welcome message that will be recieved by subscriber when connecting.
   * Subscriber must subscribe to the welcome message before connecting. For
   * welcome messages to work well, poll on incoming subscription messages on
   * the {@link XPublisher} socket and handle them.
   */
  welcomeMessage: string | null

  /**
   * ZMQ_INVERT_MATCHING
   *
   * Causes messages to be sent to all connected sockets except those subscribed
   * to a prefix that matches the message.
   */
  invertMatching: boolean

  /**
   * ZMQ_XPUB_VERBOSE / ZMQ_XPUB_VERBOSER
   *
   * Whether to pass any duplicate subscription/unsuscription messages.
   *  * `null` (default) - Only unique subscribe and unsubscribe messages are
   *    visible to the caller.
   *  * `"allSubs"` - All subscribe messages (including duplicates) are visible
   *    to the caller, but only unique unsubscribe messages are visible.
   *  * `"allSubsUnsubs"` - All subscribe and unsubscribe messages (including
   *    duplicates) are visible to the caller.
   */
  set verbosity(value: null | "allSubs" | "allSubsUnsubs") {
    /* ZMQ_XPUB_VERBOSE and ZMQ_XPUB_VERBOSER interact, so we normalize the
       situation by making it a single property. */
    switch (value) {
      case null:
        /* This disables ZMQ_XPUB_VERBOSE + ZMQ_XPUB_VERBOSER: */
        this.setBoolOption(40 /* ZMQ_XPUB_VERBOSE */, false)
        break
      case "allSubs":
        this.setBoolOption(40 /* ZMQ_XPUB_VERBOSE */, true)
        break
      case "allSubsUnsubs":
        this.setBoolOption(78 /* ZMQ_XPUB_VERBOSER */, true)
        break
    }
  }

  constructor(options?: SocketOptions<XPublisher>) {
    super(SocketType.XPublisher, options)
  }
}

export interface XPublisher extends Readable, Writable {}
allowMethods(XPublisher.prototype, ["send", "receive"])

/**
 * Same as {@link Subscriber}, except that you subscribe by sending subscription
 * messages to the socket. Subscription message is a byte 1 (for subscriptions)
 * or byte 0 (for unsubscriptions) followed by the subscription body. Messages
 * without a sub/unsub prefix may also be sent, but have no effect on
 * subscription status.
 */
export class XSubscriber extends Socket {
  constructor(options?: SocketOptions<XSubscriber>) {
    super(SocketType.XSubscriber, options)
  }
}

export interface XSubscriber extends Readable, Writable {}
allowMethods(XSubscriber.prototype, ["send", "receive"])

/**
 * A {@link Stream} is used to send and receive TCP data from a non-ØMQ peer
 * with the `tcp://` transport. A {@link Stream} can act as client and/or
 * server, sending and/or receiving TCP data asynchronously.
 *
 * When sending and receiving data with {@link Writable.send}() and
 * {@link Readable.receive}(), the first message part shall be the routing id of
 * the peer. Unroutable messages will cause an error.
 *
 * When a connection is made to a {@link Stream}, a zero-length message will be
 * received. Similarly, when the peer disconnects (or the connection is lost), a
 * zero-length message will be received.
 *
 * To close a specific connection, {@link Writable.send}() the routing id frame
 * followed by a zero-length message.
 *
 * To open a connection to a server, use {@link Stream.connect}().
 */
export class Stream extends Socket {
  /**
   * ZMQ_STREAM_NOTIFY
   *
   * Enables connect and disconnect notifications on a {@link Stream} when set
   * to `true`. When notifications are enabled, the socket delivers a
   * zero-length message when a peer connects or disconnects.
   */
  notify: boolean

  constructor(options?: SocketOptions<Stream>) {
    super(SocketType.Stream, options)
  }

  /**
   * Connects to the given remote address. To specificy a specific routing id,
   * provide a `routingId` option. The identity should be unique, from 1 to 255
   * bytes long and MAY NOT start with binary zero.
   *
   * @param address The `tcp://` address to connect to.
   * @param options Any connection options.
   */
  connect(address: string, options: StreamConnectOptions = {}) {
    if (options.routingId) {
      this.setStringOption(61, options.routingId)
    }

    super.connect(address)
  }
}

export interface StreamConnectOptions {
  routingId?: string
}

export interface Stream
  extends Readable<[Message, Message]>,
    Writable<[MessageLike, MessageLike]> {}
allowMethods(Stream.prototype, ["send", "receive"])

/* Meta functionality to define new socket/context options. */
const enum Type {
  Bool = "Bool",
  Int32 = "Int32",
  Uint32 = "Uint32",
  Int64 = "Int64",
  Uint64 = "Uint64",
  String = "String",
}

/* Defines the accessibility of options. */
const enum Acc {
  Read = 1,
  ReadOnly = 1,

  Write = 2,
  WriteOnly = 2,

  ReadWrite = 3,
}

type PrototypeOf<T> = T extends Function & {prototype: infer U} ? U : never

/* Readable properties may be set as readonly. */
function defineOpt<T, K extends ReadableKeys<PrototypeOf<T>>>(
  targets: T[],
  name: K,
  id: number,
  type: Type,
  acc: Acc.Read,
  values?: Array<string | null>,
): void

/* Writable properties may be set as writeable or readable & writable. */
function defineOpt<T, K extends WritableKeys<PrototypeOf<T>>>(
  targets: T[],
  name: K,
  id: number,
  type: Type,
  acc?: Acc.ReadWrite | Acc.Write,
  values?: Array<string | null>,
): void

/* The default is to use R/w. The overloads above ensure the correct flag is
   set if the property has been defined as readonly in the interface/class. */
function defineOpt<
  T extends {prototype: any},
  K extends ReadableKeys<PrototypeOf<T>>,
>(
  targets: T[],
  name: K,
  id: number,
  type: Type,
  acc: Acc = Acc.ReadWrite,
  values?: Array<string | null>,
): void {
  const desc: PropertyDescriptor = {}

  if (acc & Acc.Read) {
    const getter = `get${type}Option`
    if (values) {
      desc.get = function get(this: any) {
        return values[this[getter](id)]
      }
    } else {
      desc.get = function get(this: any) {
        return this[getter](id)
      }
    }
  }

  if (acc & Acc.Write) {
    const setter = `set${type}Option`
    if (values) {
      desc.set = function set(this: any, val: any) {
        this[setter](id, values.indexOf(val))
      }
    } else {
      desc.set = function set(this: any, val: any) {
        this[setter](id, val)
      }
    }
  }

  for (const target of targets) {
    if (target.prototype.hasOwnProperty(name)) {
      continue
    }
    Object.defineProperty(target.prototype, name, desc)
  }
}

/* Context options. ALSO include any options in the Context interface above. */
defineOpt([Context], "ioThreads", 1, Type.Int32)
defineOpt([Context], "maxSockets", 2, Type.Int32)
defineOpt([Context], "maxSocketsLimit", 3, Type.Int32, Acc.Read)
defineOpt([Context], "threadPriority", 3, Type.Int32, Acc.Write)
defineOpt([Context], "threadSchedulingPolicy", 4, Type.Int32, Acc.Write)
defineOpt([Context], "maxMessageSize", 5, Type.Int32)
defineOpt([Context], "ipv6", 42, Type.Bool)
defineOpt([Context], "blocky", 70, Type.Bool)
/* Option 'msgTSize' is fairly useless in Node.js. */
/* These options should be methods. */
/* defineOpt([Context], "threadAffinityCpuAdd", 7, Type.Int32) */
/* defineOpt([Context], "threadAffinityCpuRemove", 8, Type.Int32) */
/* To be released in a new ZeroMQ version. */
/* if (Context.prototype.setStringOption) {
  defineOpt([Context], "threadNamePrefix", 9, Type.String)
} */
/* There should be no reason to change this in JS. */
/* defineOpt([Context], "zeroCopyRecv", 10, Type.Bool) */

/* Socket options. ALSO include any options in the Socket interface above. */
const writables = [
  Pair,
  Publisher,
  Request,
  Reply,
  Dealer,
  Router,
  Push,
  XPublisher,
  XSubscriber,
  Stream,
  draft.Server,
  draft.Client,
  draft.Radio,
  draft.Scatter,
  draft.Datagram,
]

defineOpt(writables, "sendBufferSize", 11, Type.Int32)
defineOpt(writables, "sendHighWaterMark", 23, Type.Int32)
defineOpt(writables, "sendTimeout", 28, Type.Int32)
defineOpt(writables, "multicastHops", 25, Type.Int32)

const readables = [
  Pair,
  Subscriber,
  Request,
  Reply,
  Dealer,
  Router,
  Pull,
  XPublisher,
  XSubscriber,
  Stream,
  draft.Server,
  draft.Client,
  draft.Dish,
  draft.Gather,
  draft.Datagram,
]

defineOpt(readables, "receiveBufferSize", 12, Type.Int32)
defineOpt(readables, "receiveHighWaterMark", 24, Type.Int32)
defineOpt(readables, "receiveTimeout", 27, Type.Int32)

defineOpt([Socket], "affinity", 4, Type.Uint64)
defineOpt([Request, Reply, Router, Dealer], "routingId", 5, Type.String)
defineOpt([Socket], "rate", 8, Type.Int32)
defineOpt([Socket], "recoveryInterval", 9, Type.Int32)
defineOpt([Socket], "type", 16, Type.Int32, Acc.Read)
defineOpt([Socket], "linger", 17, Type.Int32)
defineOpt([Socket], "reconnectInterval", 18, Type.Int32)
defineOpt([Socket], "backlog", 19, Type.Int32)
defineOpt([Socket], "reconnectMaxInterval", 21, Type.Int32)
defineOpt([Socket], "maxMessageSize", 22, Type.Int64)
defineOpt([Socket], "lastEndpoint", 32, Type.String, Acc.Read)
defineOpt([Router], "mandatory", 33, Type.Bool)
defineOpt([Socket], "tcpKeepalive", 34, Type.Int32)
defineOpt([Socket], "tcpKeepaliveCount", 35, Type.Int32)
defineOpt([Socket], "tcpKeepaliveIdle", 36, Type.Int32)
defineOpt([Socket], "tcpKeepaliveInterval", 37, Type.Int32)
defineOpt([Socket], "tcpAcceptFilter", 38, Type.String)
defineOpt([Socket], "immediate", 39, Type.Bool)
/* Option 'verbose' is implemented as verbosity on XPublisher. */
defineOpt([Socket], "ipv6", 42, Type.Bool)
defineOpt([Socket], "securityMechanism", 43, Type.Int32, Acc.Read, [
  null,
  "plain",
  "curve",
  "gssapi",
])
defineOpt([Socket], "plainServer", 44, Type.Bool)
defineOpt([Socket], "plainUsername", 45, Type.String)
defineOpt([Socket], "plainPassword", 46, Type.String)

if (capability.curve) {
  defineOpt([Socket], "curveServer", 47, Type.Bool)
  defineOpt([Socket], "curvePublicKey", 48, Type.String)
  defineOpt([Socket], "curveSecretKey", 49, Type.String)
  defineOpt([Socket], "curveServerKey", 50, Type.String)
}

defineOpt([Router, Dealer, Request], "probeRouter", 51, Type.Bool, Acc.Write)
defineOpt([Request], "correlate", 52, Type.Bool, Acc.Write)
defineOpt([Request], "relaxed", 53, Type.Bool, Acc.Write)

const conflatables = [
  Pull,
  Push,
  Subscriber,
  Publisher,
  Dealer,
  draft.Scatter,
  draft.Gather,
]

defineOpt(conflatables, "conflate", 54, Type.Bool, Acc.Write)

defineOpt([Socket], "zapDomain", 55, Type.String)
defineOpt([Router], "handover", 56, Type.Bool, Acc.Write)
defineOpt([Socket], "typeOfService", 57, Type.Uint32)

if (capability.gssapi) {
  defineOpt([Socket], "gssapiServer", 62, Type.Bool)
  defineOpt([Socket], "gssapiPrincipal", 63, Type.String)
  defineOpt([Socket], "gssapiServicePrincipal", 64, Type.String)
  defineOpt([Socket], "gssapiPlainText", 65, Type.Bool)

  const principals = ["hostBased", "userName", "krb5Principal"]
  defineOpt(
    [Socket],
    "gssapiPrincipalNameType",
    90,
    Type.Int32,
    Acc.ReadWrite,
    principals,
  )
  defineOpt(
    [Socket],
    "gssapiServicePrincipalNameType",
    91,
    Type.Int32,
    Acc.ReadWrite,
    principals,
  )
}

defineOpt([Socket], "handshakeInterval", 66, Type.Int32)
defineOpt([Socket], "socksProxy", 68, Type.String)
defineOpt([XPublisher, Publisher], "noDrop", 69, Type.Bool, Acc.Write)
defineOpt([XPublisher], "manual", 71, Type.Bool, Acc.Write)
defineOpt([XPublisher], "welcomeMessage", 72, Type.String, Acc.Write)
defineOpt([Stream], "notify", 73, Type.Bool, Acc.Write)
defineOpt([Publisher, Subscriber, XPublisher], "invertMatching", 74, Type.Bool)
defineOpt([Socket], "heartbeatInterval", 75, Type.Int32)
defineOpt([Socket], "heartbeatTimeToLive", 76, Type.Int32)
defineOpt([Socket], "heartbeatTimeout", 77, Type.Int32)
/* Option 'verboser' is implemented as verbosity on XPublisher. */
defineOpt([Socket], "connectTimeout", 79, Type.Int32)
defineOpt([Socket], "tcpMaxRetransmitTimeout", 80, Type.Int32)
defineOpt([Socket], "threadSafe", 81, Type.Bool, Acc.Read)
defineOpt([Socket], "multicastMaxTransportDataUnit", 84, Type.Int32)
defineOpt([Socket], "vmciBufferSize", 85, Type.Uint64)
defineOpt([Socket], "vmciBufferMinSize", 86, Type.Uint64)
defineOpt([Socket], "vmciBufferMaxSize", 87, Type.Uint64)
defineOpt([Socket], "vmciConnectTimeout", 88, Type.Int32)
/* Option 'useFd' is fairly useless in Node.js. */
defineOpt([Socket], "interface", 92, Type.String)
defineOpt([Socket], "zapEnforceDomain", 93, Type.Bool)
defineOpt([Socket], "loopbackFastPath", 94, Type.Bool)

/* The following options are still in DRAFT. */
/* defineOpt([Socket], "metadata", 95, Type.String) */
/* defineOpt([Socket], "multicastLoop", 96, Type.String) */
/* defineOpt([Router], "notify", 97, Type.String) */
/* defineOpt([XPublisher], "manualLastValue", 98, Type.String) */
/* defineOpt([Socket], "socksUsername", 99, Type.String) */
/* defineOpt([Socket], "socksPassword", 100, Type.String) */
/* defineOpt([Socket], "inBatchSize", 101, Type.String) */
/* defineOpt([Socket], "outBatchSize", 102, Type.String) */
