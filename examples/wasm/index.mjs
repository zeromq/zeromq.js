import { Environment, napi } from "napi-wasm";

async function main_node() {
	if (typeof window !== "undefined") {
		return;
	}

	// Nodejs
	const fs = await import("fs/promises");
	const path = await import("path");
	const url = await import("url");
	const { WASI } = await import("wasi");
	const { argv, env } = import("process");

	const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

	const wasm = await fs.readFile(path.join(__dirname, "addon.wasm"));

	const wasi = new WASI({
		version: "preview1",
		args: argv,
		env,
		preopens: {
			"/local": "/tmp",
		},
	});

	const { instance } = await WebAssembly.instantiate(wasm, {
		...wasi.getImportObject(),
		napi: napi,
		env: {}, // The env imports will be provided by napi-wasm
	});

	const exports = env.exports;

	console.log(exports);

	wasi.start(instance);
}

main_node().catch((err) => {
	throw err;
});

async function main_web() {
	if (typeof window === "undefined") {
		return;
	}

	// Browser
	const response = await fetch("./addon.wasm");
	if (!response.ok) {
		throw new Error(`Failed to fetch wasm: ${response.statusText}`);
	}
	const wasm = await response.arrayBuffer();

	const { instance } = await WebAssembly.instantiate(wasm, {
		napi: napi,
		env: {}, // The env imports will be provided by napi-wasm
	});

	// Create an environment.
	const env = new Environment(instance);
	const exports = env.exports;

	console.log(exports);
}

main_web().catch((err) => {
	throw err;
});
