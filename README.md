# zmq-prebuilt

[![](https://img.shields.io/badge/version-latest-blue.svg)](https://github.com/nteract/zmq-prebuilt)
[![Build Status](https://travis-ci.org/nteract/zmq-prebuilt.svg?branch=master)](https://travis-ci.org/nteract/zmq-prebuilt)
[![Build status](https://ci.appveyor.com/api/projects/status/6u7saauir2msxpou?svg=true)](https://ci.appveyor.com/project/nteract/zmq-prebuilt)
[![](https://img.shields.io/badge/version-stable-blue.svg)](https://github.com/nteract/zmq-prebuilt/releases/tag/v1.4.0)
[![Build Status](https://travis-ci.org/nteract/zmq-prebuilt-testing.svg?branch=master)](https://travis-ci.org/nteract/zmq-prebuilt-testing)
[![Build status](https://ci.appveyor.com/api/projects/status/ox85p208tsxw6vt1?svg=true)](https://ci.appveyor.com/project/nteract/zmq-prebuilt-testing)

[**Users**](#installation--users) | [**Contributors and Development**](#installation---contributors-and-development) | [**Maintainers**](#for-maintainers-creating-a-release)

**zmq-prebuilt**: Your ready to use, prebuilt [ØMQ](http://www.zeromq.org/)
bindings for [Node.js](https://nodejs.org/en/).

ØMQ provides handy functionality when working with sockets. Yet,
installing dependencies on your operating system or building ØMQ from
source can lead to developer frustration.

**zmq-prebuilt** simplifies creating communications for a Node.js
application by providing well-tested, ready to use ØMQ bindings.
zmq-prebuilt supports all major operating systems, including:

* OS X/Darwin 64-bit
* Linux 64-bit
* Windows (64-bit and 32-bit)

Use **zmq-prebuilt** and take advantage of the *elegant simplicity of binaries*.


----

## Installation - Users

*Prerequisites*

We rely on [`prebuild`](https://github.com/mafintosh/prebuild).

Install `zmq-prebuilt` with the following:

```bash
npm install zmq-prebuilt
```

Now, prepare to be amazed by the wonders of binaries.

## Usage

Replace `require(zmq)` in your code base with `require(zmq-prebuilt)`. That's it.
The wonder of binaries begins.

----

## Installation - Contributors and Development

To set up `zmq-prebuilt` for development, fork this repository and
clone your fork to your system. Be sure you have [`git-lfs`](https://git-lfs.github.com/) installed.

**Prerequisites for Linux**
- `python` (`v2.7` recommended, `v3.x.x` is not supported)
- `make`
- A proper C/C++ compiler toolchain, like [GCC](https://gcc.gnu.org/)

Use your distribution's package manager to install.

**Prerequisites for macOS**

- `python` (`v2.7` recommended, `v3.x.x` is not supported): already installed on Mac OS X
- `Xcode Command Line Tools`: Can be installed with `xcode-select --install`

**Prerequisites for Windows**

- **Option 1:** Install all the required tools and configurations using Microsoft's [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools) by running `npm install -g windows-build-tools` from an elevated PowerShell (run as Administrator).
- **Option 2:** Install dependencies and configuration manually
   1. Visual C++ Build Environment:
     * **Option 1:** Install [Visual C++ Build Tools](http://go.microsoft.com/fwlink/?LinkId=691126) using the *Default Install* option.
     * **Option 2:** Install [Visual Studio 2015](https://www.visualstudio.com/products/visual-studio-community-vs) (or modify an existing installation) and select *Common Tools for Visual C++* during setup.  

  > :bulb: [Windows Vista / 7 only] requires [.NET Framework 4.5.1](http://www.microsoft.com/en-us/download/details.aspx?id=40773)

  2. Install [Python 2.7](https://www.python.org/downloads/) or [Miniconda 2.7](http://conda.pydata.org/miniconda.html) (`v3.x.x` is not supported), and run `npm config set python python2.7`
  3. Launch cmd, `npm config set msvs_version 2015`


**Installation**

Install a development version of `zmq-prebuilt` with the following:

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


## Examples using zmq-prebuilt

### Push/Pull

This example demonstrates how a producer pushes information onto a
socket and how a worker pulls information from the socket.

**producer.js**

```js
// producer.js
var zmq = require('zmq-prebuilt')
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
var zmq = require('zmq-prebuilt')
  , sock = zmq.socket('pull');

sock.connect('tcp://127.0.0.1:3000');
console.log('Worker connected to port 3000');

sock.on('message', function(msg){
  console.log('work: %s', msg.toString());
});
```

### Pub/Sub

This example demonstrates using `zmq-prebuilt` in a classic Pub/Sub,
Publisher/Subscriber, application.

**Publisher: pubber.js**

```js
// pubber.js
var zmq = require('zmq-prebuilt')
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
var zmq = require('zmq-prebuilt')
  , sock = zmq.socket('sub');

sock.connect('tcp://127.0.0.1:3000');
sock.subscribe('kitty cats');
console.log('Subscriber connected to port 3000');

sock.on('message', function(topic, message) {
  console.log('received a message related to:', topic, 'containing message:', message);
});
```

----

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

To check if the binaries are packaged correctly, you can push a commit to
[`nteract/zmq-prebuilt-testing`](https://github.com/nteract/zmq-prebuilt-testing).

## Learn more about nteract

- Visit our website http://nteract.io/.
- See our organization on GitHub https://github.com/nteract
- Join us on [Slack](http://slack.nteract.in/) if you need help or have
  questions. If you have trouble creating an account, either
  email rgbkrk@gmail.com or post an issue on GitHub.

<img src="https://cloud.githubusercontent.com/assets/836375/15271096/98e4c102-19fe-11e6-999a-a74ffe6e2000.gif" alt="nteract animated logo" height="80px" />
