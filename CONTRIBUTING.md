# CONTRIBUTING

## Technical Notes

bindings

ZMQ C/C++

Node.js usage

We create a binding to make it easier to use the C/C++ code.

[node-gyp - Node.js native addon build tool](https://www.npmjs.com/package/node-gyp)
- node-gyp is a cross-platform command-line tool written in Node.js for compiling native addon modules for Node.js.
- `npm install -g node-gyp` to install
- `node-gyp configure`
- `node-gyp build`
- For a debug build add `--debug` to the configure and build commands
- A `binding.gyp` file describes the configuration to build your module, in a JSON-like format. This file gets placed
  in the root of your package, alongside `package.json`.

https://www.npmjs.com/package/weak-napi
On certain rarer occasions, you run into the need to be notified when a JavaScript object is going to be garbage collected. This feature is exposed to V8's C++ API, but not to JavaScript.

That's where weak-napi comes in! This module exports the JS engine's GC tracking functionality to JavaScript. This allows you to create weak references, and optionally attach a callback function to any arbitrary JS object. 

