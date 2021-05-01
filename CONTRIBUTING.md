# CONTRIBUTING

This page provides some general technical information about concepts and
tools used in this project. We hope this
will help guide future contributors to
helpful resources.

## What is a binding

A binding makes it easier for a Node.js application to take advantage of the
[ZMQ C++ library](https://github.com/zeromq/libzmq), `libzmq`. The binding
provides native JavaScript support to use the ZMQ library.

## What is `libzmq`

[Libzmq](https://github.com/zeromq/libzmq) is the low-level library behind
most of the different language bindings, including `zeromq.js`. Libzmq exposes
a C-API and is implemented in C++.

## How to create the binding

To create the binding, use [`node-gyp` Node.js native addon build tool](https://www.npmjs.com/package/node-gyp). `node-gyp` is a cross-platform command-line tool
written in Node.js for compiling native addon modules for Node.js.
- `npm install -g node-gyp` to install
- `node-gyp configure`
- `node-gyp build`
- For a debug build add `--debug` to the configure and build commands

## What is a `binding.gyp` file

A `binding.gyp` file describes the configuration to build your module. This file
gets placed in the root of your package, alongside `package.json`.

[GYP](https://gyp.gsrc.io/index.md), short for Generate Your Project, is a build
tool similar to Cmake. GYP was originally created to generate native IDE project
files (Visual Studio, Xcode) for building Chromium.

The `.gyp` file is structured as a Python dictionary.

## Weak-napi

https://www.npmjs.com/package/weak-napi
On certain rarer occasions, you run into the need to be notified when a JavaScript object is going to be garbage collected. This feature is exposed to V8's C++ API, but not to JavaScript.

That's where weak-napi comes in! This module exports the JS engine's GC tracking functionality to JavaScript. This allows you to create weak references, and optionally attach a callback function to any arbitrary JS object. 

