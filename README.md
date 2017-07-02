# zeromq

[![codecov](https://codecov.io/gh/zeromq/zeromq.js/branch/master/graph/badge.svg)](https://codecov.io/gh/zeromq/zeromq.js)
[![Greenkeeper badge](https://badges.greenkeeper.io/zeromq/zeromq.js.svg)](https://greenkeeper.io/)
[![](https://img.shields.io/badge/version-latest-blue.svg)](https://github.com/zeromq/zeromq.js)
[![Build Status](https://travis-ci.org/zeromq/zeromq.js.svg?branch=master)](https://travis-ci.org/zeromq/zeromq.js)
[![Build status](https://ci.appveyor.com/api/projects/status/6u7saauir2msxpou?svg=true)](https://ci.appveyor.com/project/zeromq/zeromq-js/branch/master)
[![](https://img.shields.io/badge/version-stable-blue.svg)](https://github.com/zeromq/zeromq.js/releases)
[![Build Status](https://travis-ci.org/zeromq/zeromq.js.svg?branch=prebuilt-testing)](https://travis-ci.org/zeromq/zeromq.js)
[![Build status](https://ci.appveyor.com/api/projects/status/w189dgubmg9darun/branch/master?svg=true)](https://ci.appveyor.com/project/zeromq/zeromq-js/branch/prebuilt-testing)

[**Users**](#installation---users) | [**From Source**](#installation---from-source) | [**Contributors and Development**](#installation---contributors-and-development) | [**Maintainers**](#for-maintainers-creating-a-release)

**zeromq**: Your ready to use, prebuilt [ØMQ](http://www.zeromq.org/)
bindings for [Node.js](https://nodejs.org/en/).

ØMQ provides handy functionality when working with sockets. Yet,
installing dependencies on your operating system or building ØMQ from
source can lead to developer frustration.

**zeromq** simplifies creating communications for a Node.js
application by providing well-tested, ready to use ØMQ bindings.
zeromq supports all major operating systems, including:

* OS X/Darwin (x64)
* Linux (x64, ARMv7 and ARMv8)
* Windows (x64 and x86)

Use **zeromq** and take advantage of the *elegant simplicity of binaries*.


## Installation - Users

We rely on [`prebuild`](https://github.com/mafintosh/prebuild).

Install `zeromq` with the following:

```bash
npm install zeromq
```

Now, prepare to be amazed by the wonders of binaries.

### Rebuilding for Electron

If you want to use `zeromq` inside your [Electron](http://electron.atom.io/) application
it needs to be rebuild against Electron headers. We ship prebuilt binaries for Electron so you won't need to build `zeromq` from source.

You can rebuild `zeromq` manually by running:
```bash
npm rebuild zeromq --runtime=electron --target=1.4.5
```
Where `target` is your desired Electron version. This will download the correct binary for usage in Electron.

For packaging your Electron application we recommend using [`electron-builder`](https://github.com/electron-userland/electron-builder) which handles rebuilding automatically. Enable the `npmSkipBuildFromSource` option to make use of the prebuilt binaries. For a real world example take a look at [nteract](https://github.com/nteract/nteract/blob/master/package.json).


## Installation - From Source

If you are working on a Linux 32-bit system or want to install a developement version, you have to build `zeromq` from source.

### Prerequisites

**Linux**
- `python` (`v2.7` recommended, `v3.x.x` is not supported)
- `make`
- A proper C/C++ compiler toolchain, like [GCC](https://gcc.gnu.org/)

Use your distribution's package manager to install.

**macOS**

- `python` (`v2.7` recommended, `v3.x.x` is not supported): already installed on Mac OS X
- `Xcode Command Line Tools`: Can be installed with `xcode-select --install`

**Windows**

- **Option 1:** Install all the required tools and configurations using Microsoft's [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools) by running `npm install -g windows-build-tools` from an elevated PowerShell (run as Administrator).
- **Option 2:** Install dependencies and configuration manually
   1. Visual C++ Build Environment:
     * **Option 1:** Install [Visual C++ Build Tools](http://go.microsoft.com/fwlink/?LinkId=691126) using the *Default Install* option.
     * **Option 2:** Install [Visual Studio 2015](https://www.visualstudio.com/products/visual-studio-community-vs) (or modify an existing installation) and select *Common Tools for Visual C++* during setup.

  > :bulb: [Windows Vista / 7 only] requires [.NET Framework 4.5.1](http://www.microsoft.com/en-us/download/details.aspx?id=40773)

  2. Install [Python 2.7](https://www.python.org/downloads/) or [Miniconda 2.7](http://conda.pydata.org/miniconda.html) (`v3.x.x` is not supported), and run `npm config set python python2.7`
  3. Launch cmd, `npm config set msvs_version 2015`


### Installation

Now you can install `zeromq` with the following:

```bash
npm install zeromq
```

## Installation - Contributors and Development

To set up `zeromq` for development, fork this repository and
clone your fork to your system.

Make sure you have the required [dependencies for building `zeromq` from source](#installation---from-source) installed.

Install a development version of `zeromq` with the following:

```bash
npm install
```

## Testing

Run the test suite using:

```bash
npm test
```

## Running an example application

Several example applications are found in the `examples` directory. Use
`node` to run an example. To run the 'subber' application, enter the
following:

```bash
node examples/subber.js
```


## Examples using zeromq

### Push/Pull

This example demonstrates how a producer pushes information onto a
socket and how a worker pulls information from the socket.

**producer.js**

```js
// producer.js
var zmq = require('zeromq')
  , sock = zmq.socket('push');

sock.bindSync('tcp://127.0.0.1:3000');
console.log('Producer bound to port 3000');

setInterval(function(){
  console.log('sending work');
  sock.send('some work');
}, 500);
```

**worker.js**

```js
// worker.js
var zmq = require('zeromq')
  , sock = zmq.socket('pull');

sock.connect('tcp://127.0.0.1:3000');
console.log('Worker connected to port 3000');

sock.on('message', function(msg){
  console.log('work: %s', msg.toString());
});
```

### Pub/Sub

This example demonstrates using `zeromq` in a classic Pub/Sub,
Publisher/Subscriber, application.

**Publisher: pubber.js**

```js
// pubber.js
var zmq = require('zeromq')
  , sock = zmq.socket('pub');

sock.bindSync('tcp://127.0.0.1:3000');
console.log('Publisher bound to port 3000');

setInterval(function(){
  console.log('sending a multipart message envelope');
  sock.send(['kitty cats', 'meow!']);
}, 500);
```

**Subscriber: subber.js**

```js
// subber.js
var zmq = require('zeromq')
  , sock = zmq.socket('sub');

sock.connect('tcp://127.0.0.1:3000');
sock.subscribe('kitty cats');
console.log('Subscriber connected to port 3000');

sock.on('message', function(topic, message) {
  console.log('received a message related to:', topic, 'containing message:', message);
});
```


## For maintainers: Creating a release

When making a release, do the following:

```bash
npm version minor && git push && git push --tags
```

Then, wait for the prebuilds to get uploaded for each OS. After the
prebuilds are uploaded, run the following to publish the release:

```bash
npm publish
```

## Background

This codebase largely came from the npm module `zmq` and was, at one point, named `nteract/zmq-prebuilt`. It started as a community run fork of `zmq` that fixed up the build process and automated prebuilt binaries. In the process of setting up a way to do statically compiled binaries of zeromq for node, `zmq-static` was created. Eventually `zmq-prebuilt` was able to do the job of `zmq-static` and it was deprecated. Once `zmq-prebuilt` was shipping for a while, allowed building from source,  and suggesting people use it for electron + node.js, the repository moved to the zeromq org and it became official.
