
var zmq = require('..')
  , should = require('should')
  , semver = require('semver');


describe('socket.error-callback', function(){
  var sock;

  it('should create a socket and set ZMQ_ROUTER_MANDATORY', function () {
    sock = zmq.socket('router');
    sock.setsockopt(zmq.ZMQ_ROUTER_MANDATORY, 1);
  });

  it('should callback with error when not connected', function (done) {
    sock.send(['foo', 'bar'], null, function (error) {
      error.should.be.an.instanceof(Error);
      done();
    });
  });
});
