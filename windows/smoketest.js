// minimal smoke test for appveyor
// while mocha tests don't run
var zmq = require('..');

var s = new zmq.socket('pub');
s.bind('tcp://127.0.0.1:0');
s.send('test');
setTimeout(function () {
    s.close();
}, 1000);
