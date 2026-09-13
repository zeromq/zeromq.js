import {Environment, createNodeEnv, napi} from "napi-wasm"
import {unsupportedNodeImports} from "./wasm-node-imports"

export {Environment, napi}
export {unsupportedNodeImports}

export interface LoadWasmOptions {
  args?: string[]
  env?: NodeJS.ProcessEnv
  unsupportedImports?: Iterable<string>
}

export interface WasmRuntime {
  environment: {
    destroy(): void
    exports: Record<string, unknown>
  }
  nodeEnv: {
    bind(instance: unknown): unknown
    dispose(): void
    ref(): void
    unref(): void
  }
  wasi: {
    initialize(instance: unknown): void
  }
}

export async function loadWasm(
  addonPath: string | URL,
  options: LoadWasmOptions = {},
): Promise<WasmRuntime> {
  const fs = await import("node:fs/promises")
  const processModule = await import("node:process")
  const {WASI} = await import("node:wasi")
  const wasm = await fs.readFile(addonPath)
  const wasi = new WASI({
    version: "preview1",
    args: options.args ?? processModule.argv,
    env: options.env ?? processModule.env,
  })
  const nodeEnv = createNodeEnv({
    unsupportedImports: options.unsupportedImports ?? [],
  })

  try {
    const {instance} = await WebAssembly.instantiate(wasm, {
      ...wasi.getImportObject(),
      napi,
      env: nodeEnv,
    })
    nodeEnv.bind(instance)

    wasi.initialize(instance)
    return {environment: new Environment(instance), nodeEnv, wasi}
  } catch (error) {
    nodeEnv.dispose()
    throw error
  }
}
