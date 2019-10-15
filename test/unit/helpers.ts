import * as semver from "semver"

import * as zmq from "../../src"

/* Windows cannot bind on a ports just above 1014; start higher to be safe. */
let seq = 5000

export function uniqAddress(proto: string) {
  const id = seq++
  switch (proto) {
  case "ipc":
    return `${proto}://${__dirname}/../../tmp/${proto}-${id}`
  case "tcp":
  case "udp":
    return `${proto}://127.0.0.1:${id}`
  default:
    return `${proto}://${proto}-${id}`
  }
}

export function testProtos(...requested: string[]) {
  const set = new Set(requested)

  /* Do not test with ipc if unsupported. */
  if (!zmq.capability.ipc) set.delete("ipc")

  /* Only test inproc with version 4.2+, earlier versions are unreliable. */
  if (semver.satisfies(zmq.version, "< 4.2")) set.delete("inproc")

  if (!set.size) console.error("Warning: test protocol set is empty")

  return [...set]
}
