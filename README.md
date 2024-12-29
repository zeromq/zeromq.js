# ZeroMQ.js Next Generation

[![Latest version](https://img.shields.io/npm/v/zeromq?label=version)](https://www.npmjs.com/package/zeromq)

[ØMQ](http://zeromq.org) bindings for Node.js. The goals of this library are:

- Semantically similar to the [native](https://github.com/zeromq/libzmq) ØMQ
  library, while sticking to JavaScript idioms.
- Use modern JavaScript and Node.js features such as `async`/`await` and async
  iterators.
- High performance.
- Fully usable with TypeScript (3+).
- Compatible with Zeromq 4/5 via "zeromq/v5-compat"
- Secure Curve protocol with Libsodium
- Zeromq Draft API support

## Useful links

- [ZeroMQ.js API reference](http://zeromq.github.io/zeromq.js/modules.html).
- [ZeroMQ project documentation](https://zeromq.org/get-started/).
  - **Note:** The Node.js examples on zeromq.org do not yet reflect the new API,
    but [the Guide](http://zguide.zeromq.org) in particular is still a good
    introduction to ZeroMQ for new users.

## Table of contents

- [ZeroMQ.js Next Generation](#zeromqjs-next-generation)
  - [Useful links](#useful-links)
  - [Table of contents](#table-of-contents)
  - [Installation](#installation)
    - [Prebuilt binaries](#prebuilt-binaries)
    - [Building from source](#building-from-source)
    - [Available Build Options](#available-build-options)
    - [Curve with Libsodium support](#curve-with-libsodium-support)
      - [Draft support](#draft-support)
      - [Websocket support](#websocket-support)
      - [Secure Websocket support](#secure-websocket-support)
      - [Not Synchronous Resolve](#not-synchronous-resolve)
      - [MacOS Deployment Target](#macos-deployment-target)
  - [Examples](#examples)
    - [Basic Usage](#basic-usage)
    - [Push/Pull](#pushpull)
      - [`producer.js`](#producerjs)
      - [`worker.js`](#workerjs)
    - [Pub/Sub](#pubsub)
      - [`publisher.js`](#publisherjs)
      - [`subscriber.js`](#subscriberjs)
    - [Req/Rep](#reqrep)
      - [`client.js`](#clientjs)
      - [`server.js`](#serverjs)
  - [Zeromq 4 and 5 Compatibility layer](#zeromq-4-and-5-compatibility-layer)
  - [TypeScript](#typescript)
  - [Contribution](#contribution)
    - [Dependencies](#dependencies)
    - [Defining new options](#defining-new-options)
    - [Testing](#testing)
    - [Publishing](#publishing)
  - [History](#history)

## Installation

Install **ZeroMQ.js** with prebuilt binaries:

```sh
npm install zeromq
```

Supported versions:

- Node.js v12 (requires a [N-API](https://nodejs.org/api/n-api.html))

### Prebuilt binaries

The following platforms have a **prebuilt binary** available:

- Windows on x86/x86-64

  Zeromq binaries on Windows 10 or older need
  [Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170#latest-microsoft-visual-c-redistributable-version)
  to be installed.

- Linux on x86-64 with libstdc++.so.6.0.21+ (glibc++ 3.4.21+), for example:
  - Debian 9+ (Stretch or later)
  - Ubuntu 16.04+ (Xenial or later)
  - CentOS 8+
- Linux on x86-64 with musl, for example:
  - Alpine 3.3+
- MacOS 10.9+ on x86-64

If a prebuilt binary is not available for your platform, installing will attempt
to start a build from source.

### Building from source

If a prebuilt binary is unavailable, or if you want to pass certain options
during build, you can build this package from source.

Make sure you have the following installed before attempting to build from
source:

- Node.js 10+ or Electron
- C++17 compiler toolchain (e.g. LLVM, GCC, MSVC)
- Python 3
- CMake 3.16+
- vcpkg dependencies (e.g. on Linux it needs curl, unzip, zip, tar, git,
  pkg-config)

For Curve:

- automake
- autoconf
- libtool

To install from source, specify `build_from_source=true` in a `.npmrc` file

```
build_from_source=true
```

When building from source, you can also specify additional build options in a
`.npmrc` file in your project:

### Available Build Options

<details>
<summary>👉🏻 Options</summary>

### Curve with Libsodium support

(Enabled by default)

Enables CURVE security for encrypted communications. Zeromq uses libsodium for
CURVE security. To enable CURVE support, add the following to your .npmrc:

```ini
zmq_curve="true"
zmq_sodium="true"
```

Building libsodium requires these dependencies on Linux/MacOS:
`autoconf automake libtool`, which can be installed via `apt-get` or `brew`,
etc.

#### Draft support

(Enabled by default)

By default `libzmq` is built with support for `Draft` patterns (e.g.
`server-client`, `radio-dish`, `scatter-gather`). If you want to build `libzmq`
without support for `Draft`, you can specify the following in `.npmrc`:

```ini
zmq_draft=false
```

#### Websocket support

Enables WebSocket transport, allowing ZeroMQ to communicate over WebSockets. To
enable WebSocket support, add the following to your .npmrc:

```ini
zmq_websockets="true"
```

#### Secure Websocket support

Enables WebSocket transport with TLS (wss), providing secure WebSocket
communications. To enable secure WebSocket support, add the following to your
.npmrc:

```ini
zmq_websockets_secure="true"
```

#### Not Synchronous Resolve

Enables immediate send/receive on the socket without synchronous resolution.
This option can improve performance in certain scenarios by allowing operations
to proceed without waiting for synchronous resolution. To enable this feature,
add the following to your `.npmrc`:

```ini
zmq_no_sync_resolve="true"
```

#### MacOS Deployment Target

Specifies the minimum macOS version that the binary will be compatible with.
This is particularly useful when building for different macOS versions. To set
this, add the following to your .npmrc, replacing 10.15 with your desired
minimum macOS version:

```ini
macosx_deployment_target="10.15"
```

</details>

## Examples

Here some examples of different features are provided. More examples can be
found in the [examples directory](examples).

You can also browse
[the API reference documentation](http://zeromq.github.io/zeromq.js/globals.html)
to see all socket types, methods & options as well as more detailed information
about how to apply them.

**Note:** If you are new to ZeroMQ, please start with the
[ZeroMQ documentation](https://zeromq.org/get-started/).

### Basic Usage

ES modules:

```typescript
import {Request} from "zeromq"
// or as namespace
import * as zmq from "zeromq"

const reqSock = new Request()
//...
const repSock = new zmq.Reply()
```

Commonjs:

```js
const zmq = require("zeromq")

const reqSock = new zmq.Request()
//...
const repSock = new zmq.Reply()
```

### Push/Pull

This example demonstrates how a producer pushes information onto a socket and
how a worker pulls information from the socket.

#### `producer.js`

Creates a producer to push information onto a socket.

```js
import * as zmq from "zeromq"

async function run() {
  const sock = new zmq.Push()

  await sock.bind("tcp://127.0.0.1:3000")
  console.log("Producer bound to port 3000")

  while (true) {
    await sock.send("some work")
    await new Promise(resolve => {
      setTimeout(resolve, 500)
    })
  }
}

run()
```

#### `worker.js`

Creates a worker to pull information from the socket.

```js
import * as zmq from "zeromq"

async function run() {
  const sock = new zmq.Pull()

  sock.connect("tcp://127.0.0.1:3000")
  console.log("Worker connected to port 3000")

  for await (const [msg] of sock) {
    console.log("work: %s", msg.toString())
  }
}

run()
```

### Pub/Sub

This example demonstrates using `zeromq` in a classic Pub/Sub,
Publisher/Subscriber, application.

#### `publisher.js`

Create the publisher which sends messages.

```js
import * as zmq from "zeromq"

async function run() {
  const sock = new zmq.Publisher()

  await sock.bind("tcp://127.0.0.1:3000")
  console.log("Publisher bound to port 3000")

  while (true) {
    console.log("sending a multipart message envelope")
    await sock.send(["kitty cats", "meow!"])
    await new Promise(resolve => {
      setTimeout(resolve, 500)
    })
  }
}

run()
```

#### `subscriber.js`

Create a subscriber to connect to a publisher's port to receive messages.

```js
import * as zmq from "zeromq"

async function run() {
  const sock = new zmq.Subscriber()

  sock.connect("tcp://127.0.0.1:3000")
  sock.subscribe("kitty cats")
  console.log("Subscriber connected to port 3000")

  for await (const [topic, msg] of sock) {
    console.log(
      "received a message related to:",
      topic,
      "containing message:",
      msg,
    )
  }
}

run()
```

### Req/Rep

This example illustrates a request from a client and a reply from a server.

#### `client.js`

```js
import * as zmq from "zeromq"

async function run() {
  const sock = new zmq.Request()

  sock.connect("tcp://127.0.0.1:3000")
  console.log("Producer bound to port 3000")

  await sock.send("4")
  const [result] = await sock.receive()

  console.log(result)
}

run()
```

#### `server.js`

```js
import * as zmq from "zeromq"

async function run() {
  const sock = new zmq.Reply()

  await sock.bind("tcp://127.0.0.1:3000")

  for await (const [msg] of sock) {
    await sock.send((2 * parseInt(msg.toString(), 10)).toString())
  }
}

run()
```

## Zeromq 4 and 5 Compatibility layer

The next generation version of the library features a compatibility layer for
ZeroMQ.js versions 4 and 5. This is recommended for users upgrading from
previous versions.

Example:

```js
const zmq = require("zeromq/v5-compat")

const pub = zmq.socket("pub")
const sub = zmq.socket("sub")

pub.bind("tcp://*:3456", err => {
  if (err) throw err

  sub.connect("tcp://127.0.0.1:3456")

  pub.send("message")

  sub.on("message", msg => {
    // Handle received message...
  })
})
```

## TypeScript

This library provides typings for TypeScript version 3.0.x and later.

_Requirements_

- For TypeScript version >= 3:
  - [compilerOptions](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- For TypeScript version < 3.6:
  - either set `compilerOptions.target` to `esnext` or later (e.g. `es2018`)
  - or add the following, or similar, libraries to `compilerOptions.lib` (and
    include their corresponding polyfills if needed): `es2015`,
    `ESNext.AsyncIterable`

## Contribution

If you are interested in making contributions to this project, please read the
following sections.

### Dependencies

In order to develop and test the library, you'll need the tools required to
build from source ([see above](#building-from-source)).

Additionally, having clang-format is strongly recommended.

### Defining new options

Socket and context options can be set at runtime, even if they are not
implemented by this library. By design, this requires no recompilation if the
built version of ZeroMQ has support for them. This allows library users to test
and use options that have been introduced in recent versions of ZeroMQ without
having to modify this library. Of course we'd love to include support for new
options in an idiomatic way.

Options can be set as follows:

```js
const {Dealer} = require("zeromq")

/* This defines an accessor named 'sendHighWaterMark', which corresponds to
   the constant ZMQ_SNDHWM, which is defined as '23' in zmq.h. The option takes
   integers. The accessor name has been converted to idiomatic JavaScript.
   Of course, this particular option already exists in this library. */
class MyDealer extends Dealer {
  get sendHighWaterMark(): number {
    return this.getInt32Option(23)
  }

  set sendHighWaterMark(value: number) {
    this.setInt32Option(23, value)
  }
}

const sock = new MyDealer({sendHighWaterMark: 456})
```

When submitting pull requests for new socket/context options, please consider
the following:

- The option is documented in the TypeScript interface.
- The option is only added to relevant socket types, and if the ZMQ\_ constant
  has a prefix indicating which type it applies to, it is stripped from the name
  as it is exposed in JavaScript.
- The name as exposed in this library is idiomatic for JavaScript, spelling out
  any abbreviations and using proper `camelCase` naming conventions.
- The option is a value that can be set on a socket, and you don't think it
  should actually be a method.

### Testing

The test suite can be run with:

```sh
npm install
npm run build
npm run test
```

The test suite will validate and fix the coding style, run all unit tests and
verify the validity of the included TypeScript type definitions.

Some tests are not enabled by default:

- API Compatibility tests from ZeroMQ 5.x have been disabled by default. You can
  include the tests with `INCLUDE_COMPAT_TESTS=1 npm run test`
- Some transports are not reliable on some older versions of ZeroMQ, the
  relevant tests will be skipped for those versions automatically.

### Publishing

To publish a new version, run:

```sh
npm version <new version>
git push && git push --tags
```

Wait for continuous integration to finish. Prebuilds will be generated for all
supported platforms and attached to a Github release. Documentation is
automatically generated and committed to `gh-pages`. Finally, a new NPM package
version will be automatically released.

## History

Version 6+ is a complete rewrite of previous versions of ZeroMQ.js in order to
be more reliable, correct, and usable in modern JavaScript & TypeScript code as
first outlined in [this issue](https://github.com/zeromq/zeromq.js/issues/189).
Previous versions of ZeroMQ.js were based on `zmq` and a fork that included
prebuilt binaries.

See detailed changes in the [CHANGELOG](CHANGELOG.md).
