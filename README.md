# zmq-prebuilt &nbsp;&nbsp;[![Build Status](https://travis-ci.org/nteract/zmq-prebuilt.png)](https://travis-ci.org/nteract/zmq-prebuilt) &nbsp;[![Build status](https://ci.appveyor.com/api/projects/status/6u7saauir2msxpou?svg=true)](https://ci.appveyor.com/project/rgbkrk/zmq-prebuilt)

[ØMQ](http://www.zeromq.org/) bindings for node.js.

## Installation

    $ npm install zmq-prebuilt

We rely on [`prebuild`](https://github.com/mafintosh/prebuild). Prepare to be amazed at the wonders of binaries.

## Developer Installation

To set up `zmq-prebuilt` for development, clone and fork this repository. If you are running on Linux
or OS X, you will need to have `automake`, `autoconf`, `git-lfs`, `wget` and `libtool`. These can be installed using `brew` on OS X.

```
$ ./build_libzmq.sh
$ npm install
```

You can run then run the test suite.

```
$ npm test
```

Or run some of the example applications.

```
$ node examples/subber.js
```

### Supported operating systems

* [X] OS X/Darwin 64-bit
* [X] Linux 64-bit
* [ ] Windows (we'll get this one up soon, we're so close.)

## Usage

Everywhere you used `require(zmq)` in your code base before, replace it with `zmq-prebuilt`.

## Examples

### Push/Pull

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

## Release

After an `npm` release, push the tag to github and travis will create the prebuilds.

### Shipping Windows binaries

TODO
