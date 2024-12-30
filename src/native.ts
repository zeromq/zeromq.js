/* eslint-disable @typescript-eslint/no-var-requires */

/* Declare all native C++ classes and methods in this file. */
import addon from "./load-addon"
module.exports = addon

/**
 * The version of the ØMQ library the bindings were built with. Formatted as
 * `(major).(minor).(patch)`. For example: `"4.3.2"`.
 */
export declare const version: string

/**
 * Exposes some of the optionally available ØMQ capabilities, which may depend
 * on the library version and platform.
 *
 * This is an object with keys corresponding to supported ØMQ features and
 * transport protocols. Available capabilities will be set to `true`.
 * Unavailable capabilities will be absent or set to `false`.
 *
 * Possible keys include:
 * * `ipc` - Support for the `ipc://` protocol.
 * * `pgm` - Support for the `pgm://` protocol.
 * * `tipc` - Support for the `tipc://` protocol.
 * * `norm` - Support for the `norm://` protocol.
 * * `curve` - Support for the CURVE security mechanism.
 * * `gssapi` - Support for the GSSAPI security mechanism.
 * * `draft` - Wether the library is built with support for DRAFT sockets.
 */
export declare const capability: Partial<{
  ipc: boolean
  pgm: boolean
  tipc: boolean
  norm: boolean
  curve: boolean
  gssapi: boolean
  draft: boolean
}>

/**
 * Returns a new random key pair to be used with the CURVE security mechanism.
 *
 * To correctly connect two sockets with this mechanism:
 *
 * * Generate a **client** keypair with {@link curveKeyPair}().
 *   * Assign the private and public key on the client socket with
 *     {@link Socket.curveSecretKey} and {@link Socket.curvePublicKey}.
 * * Generate a **server** keypair with {@link curveKeyPair}().
 *   * Assign the private key on the server socket with {@link Socket.curveSecretKey}.
 *   * Assign the public key **on the client socket** with
 *     {@link Socket.curveServerKey}. The server does *not* need to know its own
 *     public key. Key distribution is *not* handled by the CURVE security
 *     mechanism.
 *
 *
 * @returns An object with a `publicKey` and a `secretKey` property, each being
 * a 40 character Z85-encoded string.
 */
export declare function curveKeyPair(): {
  publicKey: string
  secretKey: string
}

/**
 * A ØMQ context. Contexts manage the background I/O to send and receive
 * messages of their associated sockets.
 *
 * It is usually not necessary to instantiate a new context - the global
 * {@link context} is used for new sockets by default. The global context is the
 * only context that is shared between threads (when using
 * [worker_threads](https://nodejs.org/api/worker_threads.html)). Custom
 * contexts can only be used in the same thread.
 *
 * ```typescript
 * // Use default context (recommended).
 * const socket = new Dealer()
 * ```
 *
 * ```typescript
 * // Use custom context.
 * const context = new Context()
 * const socket = new Dealer({context})
 * ```
 *
 * **Note:** By default all contexts (including the global context) will prevent
 * the process from terminating if there are any messages in an outgoing queue,
 * even if the associated socket was closed. For some applications this is
 * unnecessary or unwanted. Consider setting {@link Context.blocky} to `false`
 * or setting {@link Socket.linger} for each new socket.
 */
export declare class Context {
  /**
   * Creates a new ØMQ context and sets any provided context options. Sockets
   * need to be explicitly associated with a new context during construction.
   *
   * @param options An optional object with options that will be set on the
   * context during creation.
   */
  constructor(options?: Options<Context>)

  protected getBoolOption(option: number): boolean
  protected setBoolOption(option: number, value: boolean): void

  protected getInt32Option(option: number): number
  protected setInt32Option(option: number, value: number): void
}

/**
 * Any socket that has no explicit context passed in during construction will
 * be associated with this context. The default context is exposed in order to
 * be able to change its behaviour with {@link Context} options.
 */
export declare const context: Context

interface ErrnoError extends Error {
  code: string
  errno: number
}

export interface AuthError extends Error {
  status: 300 | 400 | 500
}

export interface ProtoError extends Error {
  code:
    | "ERR_ZMTP_UNSPECIFIED"
    | "ERR_ZMTP_UNEXPECTED_COMMAND"
    | "ERR_ZMTP_INVALID_SEQUENCE"
    | "ERR_ZMTP_KEY_EXCHANGE"
    | "ERR_ZMTP_MALFORMED_COMMAND_UNSPECIFIED"
    | "ERR_ZMTP_MALFORMED_COMMAND_MESSAGE"
    | "ERR_ZMTP_MALFORMED_COMMAND_HELLO"
    | "ERR_ZMTP_MALFORMED_COMMAND_INITIATE"
    | "ERR_ZMTP_MALFORMED_COMMAND_ERROR"
    | "ERR_ZMTP_MALFORMED_COMMAND_READY"
    | "ERR_ZMTP_MALFORMED_COMMAND_WELCOME"
    | "ERR_ZMTP_INVALID_METADATA"
    | "ERR_ZMTP_CRYPTOGRAPHIC"
    | "ERR_ZMTP_MECHANISM_MISMATCH"
    | "ERR_ZAP_UNSPECIFIED"
    | "ERR_ZAP_MALFORMED_REPLY"
    | "ERR_ZAP_BAD_REQUEST_ID"
    | "ERR_ZAP_BAD_VERSION"
    | "ERR_ZAP_INVALID_STATUS_CODE"
    | "ERR_ZAP_INVALID_METADATA"
}

export interface EventAddress {
  address: string
}

export interface EventInterval {
  interval: number
}

export interface EventError<E = ErrnoError> {
  error: E
}

export type EventFor<T extends string, D = {}> = Expand<{type: T} & D>

/**
 * A union type that represents all possible even types and the associated data.
 * Events always have a `type` property with an {@link EventType} value.
 *
 * The following socket events can be generated. This list may be different
 * depending on the ZeroMQ version that is used.
 *
 * Note that the **error** event is avoided by design, since this has a [special
 * behaviour](https://nodejs.org/api/events.html#events_error_events) in Node.js
 * causing an exception to be thrown if it is unhandled.
 *
 * Other error names are adjusted to be as close to possible as other
 * [networking related](https://nodejs.org/api/net.html) event names in Node.js
 * and/or to the corresponding ZeroMQ.js method call. Events (including any
 * errors) that correspond to a specific operation are namespaced with a colon
 * `:`, e.g. `bind:error` or `connect:retry`.
 *
 * * **accept** - ZMQ_EVENT_ACCEPTED The socket has accepted a connection from a
 *   remote peer.
 *
 * * **accept:error** - ZMQ_EVENT_ACCEPT_FAILED The socket has rejected a
 *   connection from a remote peer.
 *
 *   The following additional details will be included with this event:
 *
 *   * `error` - An error object that describes the specific error
 *     that occurred.
 *
 * * **bind** - ZMQ_EVENT_LISTENING The socket was successfully bound to a
 *   network interface.
 *
 * * **bind:error** - ZMQ_EVENT_BIND_FAILED The socket could not bind to a given
 *   interface.
 *
 *   The following additional details will be included with this event:
 *
 *   * `error` - An error object that describes the specific error
 *     that occurred.
 *
 * * **connect** - ZMQ_EVENT_CONNECTED The socket has successfully connected to
 *   a remote peer.
 *
 * * **connect:delay** - ZMQ_EVENT_CONNECT_DELAYED A connect request on the
 *   socket is pending.
 *
 * * **connect:retry** - ZMQ_EVENT_CONNECT_RETRIED A connection attempt is being
 *   handled by reconnect timer. Note that the reconnect interval is
 *   recalculated at each retry.
 *
 *   The following additional details will be included with this event:
 *
 *   * `interval` - The current reconnect interval.
 *
 * * **close** - ZMQ_EVENT_CLOSED The socket was closed.
 *
 * * **close:error** - ZMQ_EVENT_CLOSE_FAILED The socket close failed. Note that
 *   this event occurs **only on IPC** transports..
 *
 *   The following additional details will be included with this event:
 *
 *   * `error` - An error object that describes the specific error
 *     that occurred.
 *
 * * **disconnect** - ZMQ_EVENT_DISCONNECTED The socket was disconnected
 *   unexpectedly.
 *
 * * **handshake** - ZMQ_EVENT_HANDSHAKE_SUCCEEDED The ZMTP security mechanism
 *   handshake succeeded. NOTE: This event may still be in DRAFT statea and not
 *   yet available in stable releases.
 *
 * * **handshake:error:protocol** - ZMQ_EVENT_HANDSHAKE_FAILED_PROTOCOL The ZMTP
 *   security mechanism handshake failed due to some mechanism protocol error,
 *   either between the ZMTP mechanism peers, or between the mechanism server
 *   and the ZAP handler. This indicates a configuration or implementation error
 *   in either peer resp. the ZAP handler. NOTE: This event may still be in
 *   DRAFT state and not yet available in stable releases.
 *
 * * **handshake:error:auth** - ZMQ_EVENT_HANDSHAKE_FAILED_AUTH The ZMTP
 *   security mechanism handshake failed due to an authentication failure. NOTE:
 *   This event may still be in DRAFT state and not yet available in stable
 *   releases.
 *
 * * **handshake:error:other** - ZMQ_EVENT_HANDSHAKE_FAILED_NO_DETAIL
 *   Unspecified error during handshake. NOTE: This event may still be in DRAFT
 *   state and not yet available in stable releases.
 *
 * * **end** - ZMQ_EVENT_MONITOR_STOPPED Monitoring on this socket ended.
 *
 * * **unknown** An event was generated by ZeroMQ that the Node.js library could
 *   not interpret. Please submit a pull request for new event types if they are
 *   not yet included.
 */
export type Event =
  | EventFor<"accept", EventAddress>
  | EventFor<"accept:error", EventAddress & EventError>
  | EventFor<"bind", EventAddress>
  | EventFor<"bind:error", EventAddress & EventError>
  | EventFor<"connect", EventAddress>
  | EventFor<"connect:delay", EventAddress>
  | EventFor<"connect:retry", EventAddress & EventInterval>
  | EventFor<"close", EventAddress>
  | EventFor<"close:error", EventAddress & EventError>
  | EventFor<"disconnect", EventAddress>
  | EventFor<"end">
  | EventFor<"handshake", EventAddress>
  | EventFor<"handshake:error:protocol", EventAddress & EventError<ProtoError>>
  | EventFor<"handshake:error:auth", EventAddress & EventError<AuthError>>
  | EventFor<"handshake:error:other", EventAddress & EventError>
  | EventFor<"unknown">

/**
 * A union type of all available event types. See {@link Event} for an overview
 * of the events that can be observed.
 */
export type EventType = Event["type"]

/**
 * Represents the event data object given one particular event type, for example
 * `EventOfType<"accept">`.
 *
 * @typeparam E The specific event type.
 */
export type EventOfType<E extends EventType = EventType> = Expand<
  Extract<Event, Event & EventFor<E>>
>

/**
 * An event observer for ØMQ sockets. This starts up a ZMQ monitoring socket
 * internally that receives all socket events. The event observer can be used in
 * one of two ways, which are **mutually exclusive**: with {@link receive}() or
 * with event listeners attached with {@link on}().
 */
export declare class Observer {
  /**
   * Whether the observer was closed, either manually or because the associated
   * socket was closed.
   *
   * @readonly
   */
  readonly closed: boolean

  /**
   * Creates a new ØMQ observer. It should not be necessary to instantiate a new
   * observer. Access an existing observer for a socket with
   * {@link Socket.events}.
   *
   * ```typescript
   * const socket = new Publisher()
   * const events = socket.events
   * ```
   *
   * @param socket The socket to observe.
   */
  constructor(socket: Socket)

  /**
   * Closes the observer. Afterwards no new events will be received or emitted.
   * Calling this method is optional.
   */
  close(): void

  /**
   * Waits for the next event to become availeble on the observer. Reads an
   * event immediately if possible. If no events are queued, it will wait
   * asynchonously. The promise will be resolved with the next event when
   * available.
   *
   * When reading events with {@link receive}() the observer may **not** be in
   * event emitter mode. Avoid mixing calls to {@link receive}() with event
   * handlers via attached with {@link on}().
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
   *
   * @returns Resolved with the next event and its details. See {@link Event}.
   */
  receive(): Promise<Event>
}

/**
 * Proxy messages between two ØMQ sockets. The proxy connects a front-end socket
 * to a back-end socket. Conceptually, data flows from front-end to back-end.
 * Depending on the socket types, replies may flow in the opposite direction.
 * The direction is conceptual only; the proxy is fully symmetric and there is
 * no technical difference between front-end and back-end.
 *
 * ```typescript
 * // Proxy between a router/dealer socket for 5 seconds.
 * const proxy = new Proxy(new Router, new Dealer)
 * await proxy.frontEnd.bind("tcp://*:3001")
 * await proxy.backEnd.bind("tcp://*:3002")
 * setTimeout(() => proxy.terminate(), 5000)
 * await proxy.run()
 * ```
 *
 * [Review the ØMQ documentation](http://api.zeromq.org/4-3:zmq-proxy#toc3) for
 * an overview of some example applications of a proxy.
 *
 * @typeparam F The front-end socket type.
 * @typeparam B The back-end socket type.
 */
export declare class Proxy<
  F extends Socket = Socket,
  B extends Socket = Socket,
> {
  /**
   * Returns the original front-end socket.
   *
   * @readonly
   */
  readonly frontEnd: F

  /**
   * Returns the original back-end socket.
   *
   * @readonly
   */
  readonly backEnd: B

  /**
   * Creates a new ØMQ proxy. Proxying will start between the front-end and
   * back-end sockets when {@link run}() is called after both sockets have been
   * bound or connected.
   *
   * @param frontEnd The front-end socket.
   * @param backEnd The back-end socket.
   */
  constructor(frontEnd: F, backEnd: B)

  /**
   * Starts the proxy loop in a worker thread and waits for its termination.
   * Before starting, you must set any socket options, and connect or bind both
   * front-end and back-end sockets.
   *
   * On termination the front-end and back-end sockets will be closed
   * automatically.
   *
   * @returns Resolved when the proxy has terminated.
   */
  run(): Promise<void>

  /**
   * Temporarily suspends any proxy activity. Resume activity with
   * {@link resume}().
   */
  pause(): void

  /**
   * Resumes proxy activity after suspending it with {@link pause}().
   */
  resume(): void

  /**
   * Gracefully shuts down the proxy. The front-end and back-end sockets will be
   * closed automatically. There might be a slight delay between terminating and
   * the {@link run}() method resolving.
   */
  terminate(): void
}

/**
 * A ØMQ socket. This class should generally not be used directly. Instead,
 * create one of its subclasses that corresponds to the socket type you want to
 * use.
 *
 * ```typescript
 * new zmq.Pair(...)
 * new zmq.Publisher(...)
 * new zmq.Subscriber(...)
 * new zmq.Request(...)
 * new zmq.Reply(...)
 * new zmq.Dealer(...)
 * new zmq.Router(...)
 * new zmq.Pull(...)
 * new zmq.Push(...)
 * new zmq.XPublisher(...)
 * new zmq.XSubscriber(...)
 * new zmq.Stream(...)
 * ```
 *
 * Socket options can be set during construction or via a property after the
 * socket was created. Most socket options do not take effect until the next
 * {@link bind}() or {@link connect}() call. Setting such an option after the
 * socket is already connected or bound will display a warning.
 */
export declare abstract class Socket {
  /**
   * Event {@link Observer} for this socket. This starts up a ØMQ monitoring
   * socket internally that receives all socket events.
   *
   * @readonly
   */
  readonly events: Observer

  /**
   * {@link Context} that this socket belongs to.
   *
   * @readonly
   */
  readonly context: Context

  /**
   * Whether this socket was previously closed with {@link close}().
   *
   * @readonly
   */
  readonly closed: boolean

  /**
   * Whether any messages are currently available. If `true`, the next call to
   * {@link Readable.receive}() will immediately read a message from the socket.
   * For sockets that cannot receive messsages this is always `false`.
   *
   * @readonly
   */
  readonly readable: boolean

  /**
   * Whether any messages can be queued for sending. If `true`, the next call to
   * {@link Writable.send}() will immediately queue a message on the socket.
   * For sockets that cannot send messsages this is always `false`.
   *
   * @readonly
   */
  readonly writable: boolean

  /**
   * Creates a new socket of the specified type. Subclasses are expected to
   * provide the correct socket type.
   *
   * @param type The socket type.
   * @param options Any options to set during construction.
   */
  protected constructor(type: SocketType, options?: {})

  /**
   * Closes the socket and disposes of all resources. Any messages that are
   * queued may be discarded or sent in the background depending on the
   * {@link linger} setting.
   *
   * After this method is called, it is no longer possible to call any other
   * methods on this socket.
   *
   * Sockets that go out of scope and have no {@link Readable.receive}() or
   * {@link Writable.send}() operations in progress will automatically be
   * closed. Therefore it is not necessary in most applications to call
   * {@link close}() manually.
   *
   * Calling this method on a socket that is already closed is a no-op.
   */
  close(): void

  /**
   * Binds the socket to the given address. During {@link bind}() the socket
   * cannot be used. Do not call any other methods until the returned promise
   * resolves. Make sure to use `await`.
   *
   * You can use `*` in place of a hostname to bind on all interfaces/addresses,
   * and you can use `*` in place of a port to bind to a random port (which can
   * be retrieved with {@link lastEndpoint} later).
   *
   * ```typescript
   * await socket.bind("tcp://127.0.0.1:3456")
   * await socket.bind("tcp://*:3456")         // binds on all interfaces
   * await socket.bind("tcp://127.0.0.1:*")    // binds on random port
   * ```
   *
   * @param address Address to bind this socket to.
   * @returns Resolved when the socket was successfully bound.
   */
  bind(address: string): Promise<void>

  /**
   * Binds the socket to the given address. During {@link bind}() the socket
   * cannot be used. Do not call any other methods until the returned promise
   * resolves. Make sure to use `await`.
   *
   * You can use `*` in place of a hostname to bind on all interfaces/addresses,
   * and you can use `*` in place of a port to bind to a random port (which can
   * be retrieved with {@link lastEndpoint} later).
   *
   * ```typescript
   * socket.bindSync("tcp://127.0.0.1:3456")
   * socket.bindSync("tcp://*:3456")         // binds on all interfaces
   * socket.bindSync("tcp://127.0.0.1:*")    // binds on random port
   * ```
   *
   * @param address Address to bind this socket to.
   * @returns Resolved when the socket was successfully bound.
   */
  bindSync(address: string): void

  /**
   * Unbinds the socket to the given address. During {@link unbind}() the socket
   * cannot be used. Do not call any other methods until the returned promise
   * resolves. Make sure to use `await`.
   *
   * @param address Address to unbind this socket from.
   * @returns Resolved when the socket was successfully unbound.
   */
  unbind(address: string): Promise<void>

  /**
   * Unbinds the socket to the given address. During {@link unbind}() the socket
   * cannot be used. Do not call any other methods until the returned promise
   * resolves. Make sure to use `await`.
   *
   * @param address Address to unbind this socket from.
   * @returns Resolved when the socket was successfully unbound.
   * */
  unbindSync(address: string): void

  /**
   * Connects to the socket at the given remote address and returns immediately.
   * The connection will be made asynchronously in the background.
   *
   * ```typescript
   * socket.connect("tcp://127.0.0.1:3456")
   * ```
   *
   * @param address The address to connect to.
   */
  connect(address: string): void

  /**
   * Disconnects a previously connected socket from the given address and
   * returns immediately. Disonnection will happen asynchronously in the
   * background.
   *
   * ```typescript
   * socket.disconnect("tcp://127.0.0.1:3456")
   * ```
   *
   * @param address The previously connected address to disconnect from.
   */
  disconnect(address: string): void

  /* The following methods are meant to be called by generated JS code only
     from specialized subclasses. */

  protected getBoolOption(option: number): boolean
  protected setBoolOption(option: number, value: boolean): void

  protected getInt32Option(option: number): number
  protected setInt32Option(option: number, value: number): void

  protected getUint32Option(option: number): number
  protected setUint32Option(option: number, value: number): void

  protected getInt64Option(option: number): number
  protected setInt64Option(option: number, value: number): void

  protected getUint64Option(option: number): number
  protected setUint64Option(option: number, value: number): void

  protected getStringOption(option: number): string | null
  protected setStringOption(option: number, value: string | Buffer | null): void
}

export const enum SocketType {
  Pair = 0,
  Publisher = 1,
  Subscriber = 2,
  Request = 3,
  Reply = 4,
  Dealer = 5,
  Router = 6,
  Pull = 7,
  Push = 8,
  XPublisher = 9,
  XSubscriber = 10,
  Stream = 11,

  /* DRAFT socket types. */
  Server = 12,
  Client = 13,
  Radio = 14,
  Dish = 15,
  Gather = 16,
  Scatter = 17,
  Datagram = 18,
}

/* Utility types. */

/* https://stackoverflow.com/questions/49579094 */
type IfEquals<X, Y, A, B = never> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B

/* https://stackoverflow.com/questions/57683303 */
export type Expand<T> = T extends infer O ? {[K in keyof O]: O[K]} : never

/** @internal */
export type ReadableKeys<T> = {
  [P in keyof T]-?: T[P] extends Function ? never : P
}[keyof T]

/** @internal */
export type WritableKeys<T> = {
  [P in keyof T]-?: T[P] extends Function
    ? never
    : IfEquals<{[Q in P]: T[P]}, {-readonly [Q in P]: T[P]}, P>
}[keyof T]

export type Options<T, E = {}> = Expand<Partial<E & Pick<T, WritableKeys<T>>>>
