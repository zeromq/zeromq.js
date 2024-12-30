import * as path from "path"
import * as semver from "semver"
import * as fs from "fs"
import * as lockfile from "proper-lockfile"

import {spawn} from "child_process"

import * as zmq from "../../src"

console.log(`ZeroMQ version ${zmq.version}`)
if (semver.satisfies(zmq.version, ">= 4.2")) {
  /* Stop pending messages in test suite from preventing process exit. */
  zmq.context.blocky = false
}

/**
 * Get a unique id to be used as a port number or IPC path.
 * This function is thread-safe and will use a lock file to ensure that the id is unique.
 */
let idFallback = 5000
async function getUniqueId() {
  const idPath = path.resolve(__dirname, "../../tmp/port-id.lock")
  await fs.promises.mkdir(path.dirname(idPath), {recursive: true})

  try {
    // Create the file if it doesn't exist
    if (!fs.existsSync(idPath)) {
      await fs.promises.writeFile(idPath, "5000", "utf8")

      /* Windows cannot bind on a ports just above 1014; start higher to be safe. */
      return 5000
    }

    await lockfile.lock(idPath, {retries: 10})

    // Read the current number from the file
    const idString = await fs.promises.readFile(idPath, "utf8")
    let id = parseInt(idString, 10)

    // Increment the number
    id++

    // Ensure the number is within the valid port range
    if (id > 65535) {
      idFallback++
      id = idFallback
    }

    // Write the new number back to the file
    await fs.promises.writeFile(idPath, id.toString(), "utf8")

    return id
  } catch (err) {
    console.error(`Error getting unique id via id file: ${err}`)
    return idFallback++
  } finally {
    // Release the lock
    try {
      await lockfile.unlock(idPath)
    } catch {
      // ignore
    }
  }
}

type Proto = "ipc" | "tcp" | "udp" | "inproc"

export async function uniqAddress(proto: Proto) {
  const id = await getUniqueId()
  switch (proto) {
    case "ipc": {
      const sock = path.resolve(__dirname, `../../tmp/${proto}-${id}`)

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

export async function cleanSocket(address: string) {
  const [proto, path] = address.split("://")[1]
  if (proto !== "ipc" || !path) {
    return
  }
  const exists = await fs.promises
    .access(path, fs.constants.F_OK)
    .catch(() => false)
  if (exists) {
    await fs.promises.rm(path)
  }
}

export function testProtos(...requested: Proto[]) {
  const set = new Set(requested)

  /* Do not test with ipc if unsupported. */
  if (zmq.capability.ipc !== true) {
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
  isTimeout: boolean
}

export function createProcess(fn: () => void): Promise<Result> {
  const src = `
    const zmq = require(${JSON.stringify(path.resolve(__dirname, "../.."))})
    const fn = ${fn.toString()}
    const result = fn()
    if (result instanceof Promise) {
      result.catch(err => {
        if (error instanceof Error) {
          console.error(error.message)
          console.error(error.stack)
        } else {
          console.error(error)
        }
        process.exit(10)
      })
    }
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
        reject(
          new Error(
            `Child exited with ${signal}:\n${stdout.toString()}\n${stderr.toString()}`,
          ),
        )
      } else {
        if (code !== 0) {
          console.error(
            `Child exited with code ${code}:\n${stdout.toString()}\n${stderr.toString()}`,
          )
        }

        resolve({code, stdout, stderr, isTimeout: false})
      }
    })

    setTimeout(() => {
      resolve({code: -1, stdout, stderr, isTimeout: true})
      console.error(
        `Child timed out\n${stdout.toString()}\n${stderr.toString()}`,
      )
      child.kill()
    }, 750)
  })
}

export function captureEvent<E extends zmq.EventType>(
  socket: zmq.Socket,
  type: E,
): Promise<zmq.EventOfType<E>> {
  return new Promise(resolve => {
    socket.events.on<E>(type, resolve)
  })
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

// REAL typings for global.gc per
// https://github.com/nodejs/node/blob/v20.0.0/deps/v8/src/extensions/gc-extension.cc
interface GCFunction {
  (options: {
    execution?: "sync"
    flavor?: "regular" | "last-resort"
    type?: "major-snapshot" | "major" | "minor"
    filename?: string
  }): void
  (options: {
    execution?: "async"
    flavor?: "regular" | "last-resort"
    type?: "major-snapshot" | "major" | "minor"
    filename?: string
  }): Promise<void>
  (options: {
    execution?: "async" | "sync"
    flavor?: "regular" | "last-resort"
    type?: "major-snapshot" | "major" | "minor"
    filename?: string
  }): void | Promise<void>
}

export function getGcOrSkipTest(test?: Mocha.Context) {
  if (process.env.SKIP_GC_TESTS === "true") {
    test?.skip()
  }

  const gc = global.gc as undefined | GCFunction
  if (typeof gc !== "function") {
    throw new Error(
      "Garbage collection is not exposed. It may be enabled by the node --expose-gc flag or v8-expose-gc flag in Mocha. To skip GC tests, set the environment variable `SKIP_GC_TESTS`",
    )
  }
  // https://github.com/nodejs/node/blob/v20.0.0/deps/v8/src/extensions/gc-extension.h
  // per docs, we we're using use case 2 (Test that certain objects indeed are reclaimed)
  const asyncMajorGc = () => gc({type: "major", execution: "async"})
  return asyncMajorGc
}
