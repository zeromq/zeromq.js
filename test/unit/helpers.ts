import * as path from "path"
import * as semver from "semver"
import * as fs from "fs"

import {spawn} from "child_process"

import * as zmq from "../../src"

console.log(`ZeroMQ version ${zmq.version}`)
if (semver.satisfies(zmq.version, ">= 4.2")) {
  /* Stop pending messages in test suite from preventing process exit. */
  zmq.context.blocky = false
}

/* Windows cannot bind on a ports just above 1014; start higher to be safe. */
let seq = 5000

type Proto = "ipc" | "tcp" | "udp" | "inproc"

export function uniqAddress(proto: Proto) {
  const id = seq++
  switch (proto) {
    case "ipc": {
      const sock = path.resolve(__dirname, `../../tmp/${proto}-${id}`)
      // create the directory
      fs.mkdirSync(path.dirname(sock), {recursive: true})

      return `${proto}://${sock}`
    }

    case "tcp":
    case "udp":
      return `${proto}://127.0.0.1:${id}`

    case "inproc":
    default:
      return `${proto}://${proto}-${id}`
  }
}

export function testProtos(...requested: Proto[]) {
  const set = new Set(requested)

  /* Do not test with ipc if unsupported. */
  if (!zmq.capability.ipc) {
    set.delete("ipc")
  }

  /* Only test inproc with version 4.2+, earlier versions are unreliable. */
  if (semver.satisfies(zmq.version, "< 4.2")) {
    set.delete("inproc")
  }

  if (!set.size) {
    console.error("Warning: test protocol set is empty")
  }

  return [...set]
}

export async function createWorker<T, D extends {}>(
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

    run()
  `

  const {Worker} = await import("worker_threads")

  return new Promise<T>((resolve, reject) => {
    const worker = new Worker(src, {
      eval: true,
      workerData: data,
    })

    let message: T
    worker.on("message", msg => {
      message = msg
    })

    worker.on("exit", code => {
      if (code === 0) {
        resolve(message)
      } else {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
    })
  })
}

interface Result {
  code: number
  stdout: Buffer
  stderr: Buffer
}

export function createProcess(fn: () => void): Promise<Result> {
  const src = `
    const zmq = require(${JSON.stringify(path.resolve(__dirname, "../.."))})
    const fn = ${fn.toString()}
    fn()
  `

  const child = spawn(process.argv[0], ["--expose_gc"])
  child.stdin.write(src)
  child.stdin.end()

  let stdout: Buffer = Buffer.alloc(0)
  let stderr: Buffer = Buffer.alloc(0)
  child.stdout.on("data", (data: Buffer) => {
    stdout = Buffer.concat([stdout, data])
  })
  child.stderr.on("data", (data: Buffer) => {
    stderr = Buffer.concat([stderr, data])
  })

  return new Promise((resolve, reject) => {
    child.on("close", (code: number, signal: string) => {
      if (signal) {
        reject(new Error(`Child exited with ${signal}`))
      } else {
        resolve({code, stdout, stderr})
      }
    })

    setTimeout(() => {
      resolve({code: -1, stdout, stderr})
      child.kill()
    }, 750)
  })
}

export function captureEvent<E extends zmq.EventType>(
  socket: zmq.Socket,
  type: E,
): Promise<zmq.EventOfType<E>> {
  return new Promise(resolve => socket.events.on<E>(type, resolve))
}

export async function captureEventsUntil(
  socket: zmq.Socket,
  type: zmq.EventType,
): Promise<zmq.Event[]> {
  const events = []

  for await (const event of socket.events) {
    events.push(event)
    if (event.type === type) {
      break
    }
  }

  return events
}
