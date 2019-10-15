export enum Header {
  Client = "MDPC01",
  Worker = "MDPW01",
}

export enum Message {
  Ready = "\x01",
  Request = "\x02",
  Reply = "\x03",
  Heartbeat = "\x04",
  Disconnect = "\x05",
}
