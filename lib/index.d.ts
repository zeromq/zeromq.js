import EventEmitter from 'events';

declare type CurveKeypair = {
  public: string;
  secret: string;
};

declare type SocketType = {
  pub: 1;
  xpub: 9;
  sub: 2;
  xsub: 10;
  req: 3;
  xreq: 5;
  rep: 4;
  xrep: 6;
  push: 8;
  pull: 7;
  dealer: 5;
  router: 6;
  pair: 0;
  stream: 11;
};

declare type SocketOptions = {
  affinity: 4;
  backlog: 19;
  hwm: 1;
  identity: 5;
  linger: 17;
  mcast_loop: 10;
  rate: 8;
  rcvbuf: 12;
  last_endpoint: 32;
  reconnect_ivl: 18;
  recovery_ivl: 9;
  sndbuf: 11;
  swap: 3;
  mechanism: 43;
  plain_server: 44;
  plain_username: 45;
  plain_password: 46;
  curve_server: 47;
  curve_publickey: 48;
  curve_secretkey: 49;
  curve_serverkey: 50;
  zap_domain: 55;
  heartbeat_ivl: 75;
  heartbeat_ttl: 76;
  heartbeat_timeout: 77;
  connect_timeout: 79;
};

declare type Events = {
  1: 'connect';
  2: 'connect_delay';
  4: 'connect_retry';
  8: 'listen';
  16: 'bind_error';
  32: 'accept';
  64: 'accept_error';
  128: 'close';
  256: 'close_error';
  512: 'disconnect';
};

declare type SendFlags = {
  ZMQ_DONTWAIT: 1;
  ZMQ_SNDMORE: 2;
};

declare type SocketAccessors = {
  [K in keyof SocketOptions]: unknown;
};

declare type UnaryCallback = (err?: Error) => void;

declare interface Socket extends EventEmitter, SocketAccessors {
  type: keyof SocketType;
  pause: () => void;
  resume: () => void;
  ref: () => void;
  unref: () => void;
  read: () => null | Buffer[];
  setsockopt: (opt: keyof SocketOptions, value: unknown) => this;
  getsockopt: (opt: keyof SocketOptions) => unknown;
  readonly closed: boolean,
  bind: (addr: string, cb?: UnaryCallback) => this;
  bindSync: (addr: string) => this;
  unbind: (addr: string, cb?: UnaryCallback) => this;
  unbindSync: (addr: string) => this;
  connect: (addr: string) => this;
  disconnect: (addr: string) => this;
  monitor: (interval: number, numOfEvents: number) => this;
  unmonitor: () => this;
  subscribe: (filter: string) => this;
  unsubscribe: (filter: string) => this;
  send: (msg: string | unknown[] | Buffer, flags?: SendFlags, cb?: UnaryCallback) => this;
  close: () => this;
}

declare interface Context {
  setMaxThreads: (value: number) => this;
  getMaxThreads: () => number;
  setMaxSockets: (value: number) => this;
  getMaxSockets: () => number;
}

export const version: string;
export const curveKeypair: () => CurveKeypair;
export const types: SocketType;
export const options: SocketOptions;
export const events: Events;
export const Socket: new (type: keyof SocketType) => Socket;
export const socket: (type: keyof SocketType, options?: Partial<SocketAccessors>) => Socket;
export const createSocket: typeof socket;
export const proxy: (frontend: Socket, backend: Socket, capture?: Socket) => void;
export const Context: Context;
