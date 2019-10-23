import * as path from "path"
import * as semver from "semver"
import {Worker} from "worker_threads"

import * as zmq from "../../src"

/* Stop pending messages in test suite from preventing process exit. */
zmq.context.blocky = false

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

export function createWorker<T, D extends {}>(
  data: D,
  fn: (data: D) => Promise<T>,
): Promise<T> {
  const src = `
    const {parentPort, workerData} = require("worker_threads")
    const zmq = require(${JSON.stringify(path.resolve(__dirname, "../.."))})

    async function run() {
      const fn = ${fn.toString()}
      const msg = await fn(workerData)
      parentPort.postMessage(msg)
    }

    run().then(global.gc)
  `

  const worker = new Worker(src, {
    eval: true,
    workerData: data,
  })

  return new Promise<T>((resolve, reject) => {
    let message: T
    worker.on("message", (msg) => {message = msg})
    worker.on("exit", (code) => {
      if (code === 0) {
        resolve(message)
      } else {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
    })
  })
}
