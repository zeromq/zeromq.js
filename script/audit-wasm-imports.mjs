import fs from "node:fs"

const [wasmPath, contractPath] = process.argv.slice(2)

if (!wasmPath || !contractPath) {
  console.error("usage: node audit-wasm-imports.mjs <wasm> <contract>")
  process.exit(2)
}

const contract = new Set(
  fs
    .readFileSync(contractPath, "utf8")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean),
)
const imports = new Set(
  WebAssembly.Module.imports(
    new WebAssembly.Module(fs.readFileSync(wasmPath)),
  ).map(({module, name}) => `${module}:${name}`),
)
const unexpected = [...imports].filter(name => !contract.has(name)).sort()

if (unexpected.length > 0) {
  console.error(`Unexpected WASM imports in ${wasmPath}:`)
  for (const name of unexpected) {
    console.error(`  ${name}`)
  }
  process.exit(1)
}

console.log(`WASM import audit passed: ${imports.size} imports`)
