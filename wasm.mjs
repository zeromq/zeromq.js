/* global FinalizationRegistry, globalThis */

import {access, readdir} from "node:fs/promises"
import {createRequire} from "node:module"
import {resolve} from "node:path"
import process from "node:process"
import {fileURLToPath} from "node:url"

const require = createRequire(import.meta.url)
const {loadWasm, unsupportedNodeImports} = require("./lib/wasm.js")

async function isFile(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function findWasmFiles(directory) {
  let entries
  try {
    entries = await readdir(directory, {withFileTypes: true})
  } catch {
    return []
  }

  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await findWasmFiles(path)))
    } else if (entry.isFile() && entry.name === "addon.wasm") {
      files.push(path)
    }
  }
  return files
}

async function resolveWasmPath() {
  const configuredPath = process.env.ZEROMQ_WASM_PATH
  if (configuredPath) {
    const path = resolve(configuredPath)
    if (await isFile(path)) {
      return path
    }
    throw new Error(`ZEROMQ_WASM_PATH does not point to a file: ${path}`)
  }

  const packageRoot = fileURLToPath(new URL(".", import.meta.url))
  const sourceExample = resolve(packageRoot, "examples/wasm/addon.wasm")
  if (await isFile(sourceExample)) {
    return sourceExample
  }

  const buildFiles = (await findWasmFiles(resolve(packageRoot, "build"))).sort()
  if (buildFiles.length > 0) {
    return buildFiles[0]
  }

  throw new Error(
    "Unable to find the ZeroMQ WASM addon. Set ZEROMQ_WASM_PATH or build the WASM target with `pnpm run build.wasm`.",
  )
}

function loadApi(nativeExports) {
  const backendKey = Symbol.for("zeromq.wasm.backend")
  const globalObject = globalThis
  const previousBackend = globalObject[backendKey]
  const nativePath = require.resolve("./lib/native.js")
  const draftPath = require.resolve("./lib/draft.js")
  const indexPath = require.resolve("./lib/index.js")
  const paths = [nativePath, draftPath, indexPath]
  const previous = new Map(paths.map(path => [path, require.cache[path]]))

  globalObject[backendKey] = nativeExports
  delete require.cache[nativePath]
  delete require.cache[draftPath]
  delete require.cache[indexPath]

  try {
    return require(indexPath)
  } finally {
    if (previousBackend === undefined) {
      delete globalObject[backendKey]
    } else {
      globalObject[backendKey] = previousBackend
    }
    for (const path of paths) {
      const cached = previous.get(path)
      if (cached) {
        require.cache[path] = cached
      } else {
        delete require.cache[path]
      }
    }
  }
}

function trackSockets(loadedApi, nodeEnv) {
  const trackedApi = {...loadedApi}
  const constructorMap = new Map()
  let openSockets = 0
  const closedSockets = new WeakSet()
  const finalizer =
    typeof FinalizationRegistry === "function"
      ? new FinalizationRegistry(() => {
          openSockets--
          if (openSockets === 0) {
            nodeEnv.unref()
          }
        })
      : undefined

  const register = socket => {
    openSockets++
    nodeEnv.ref()
    finalizer?.register(socket, undefined, socket)
  }

  const unregister = socket => {
    if (closedSockets.has(socket)) {
      return
    }
    closedSockets.add(socket)
    finalizer?.unregister(socket)
    openSockets--
    if (openSockets === 0) {
      nodeEnv.unref()
    }
  }

  const wrap = socket => {
    const close = socket.close
    const boundMethods = new Map()
    const closeSocket = (...args) => {
      const result = close.apply(socket, args)
      unregister(socket)
      return result
    }

    return new globalThis.Proxy(socket, {
      get(target, property) {
        if (property === "close") {
          return closeSocket
        }

        const value = Reflect.get(target, property, target)
        if (property === "constructor") {
          return constructorMap.get(value) ?? value
        }
        if (typeof value !== "function") {
          return value
        }
        if (!boundMethods.has(property)) {
          boundMethods.set(property, value.bind(target))
        }
        return boundMethods.get(property)
      },
    })
  }

  for (const name of [
    "Socket",
    "Pair",
    "Publisher",
    "Subscriber",
    "Request",
    "Reply",
    "Dealer",
    "Router",
    "Pull",
    "Push",
    "XPublisher",
    "XSubscriber",
    "Stream",
  ]) {
    const Constructor = trackedApi[name]
    const PublicConstructor = new globalThis.Proxy(Constructor, {
      construct(target, args, newTarget) {
        const socket = Reflect.construct(target, args, newTarget)
        register(socket)
        return wrap(socket)
      },
    })
    constructorMap.set(Constructor, PublicConstructor)
    trackedApi[name] = PublicConstructor
  }

  return trackedApi
}

const runtime = await loadWasm(await resolveWasmPath(), {
  unsupportedImports: unsupportedNodeImports,
})
runtime.nodeEnv.unref()

let cleanedUp = false
function cleanup() {
  if (cleanedUp) {
    return
  }
  cleanedUp = true
  runtime.environment.destroy()
  runtime.nodeEnv.dispose()
}

let api
try {
  api = loadApi(runtime.environment.exports)
  api = trackSockets(api, runtime.nodeEnv)
} catch (error) {
  cleanup()
  throw error
}

process.once("exit", cleanup)

const {
  capability,
  context,
  curveKeyPair,
  version,
  Context,
  Socket,
  Observer,
  Proxy,
  Pair,
  Publisher,
  Subscriber,
  Request,
  Reply,
  Dealer,
  Router,
  Pull,
  Push,
  XPublisher,
  XSubscriber,
  Stream,
} = api

export {
  capability,
  context,
  curveKeyPair,
  version,
  Context,
  Socket,
  Observer,
  Proxy,
  Pair,
  Publisher,
  Subscriber,
  Request,
  Reply,
  Dealer,
  Router,
  Pull,
  Push,
  XPublisher,
  XSubscriber,
  Stream,
}
