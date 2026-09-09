declare module 'napi-wasm' {
  export class Environment {
    constructor(instance: WebAssembly.Instance);
    exports: any;
  }

  export const napi: Record<string, Function>;
}
