declare namespace WebAssembly {
  interface Instance {
    exports: Record<string, unknown>
  }
}

declare const WebAssembly: {
  instantiate(
    source: unknown,
    imports: Record<string, unknown>,
  ): Promise<{instance: WebAssembly.Instance}>
}

declare module "napi-wasm" {
  export class Environment {
    constructor(instance: WebAssembly.Instance)
    destroy(): void
    exports: Record<string, unknown>
  }

  export interface NodeEnv {
    bind(instance: WebAssembly.Instance): NodeEnv
    dispose(): void
    ref(): void
    unref(): void
  }

  export function createNodeEnv(options?: {
    unsupportedImports?: Iterable<string>
  }): NodeEnv

  export const napi: Record<string, (...args: number[]) => number>
}
