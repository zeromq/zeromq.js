var zmq = require('..')
  , should = require('should')
  , semver = require('semver')

describe('context', function() {

  it('should support setting max io threads', function(done) {
    zmq.Context.setMaxThreads(3);
    zmq.Context.getMaxThreads().should.equal(3);
    zmq.Context.setMaxThreads(1);
    done();
  });

  it('should support setting max number of sockets', function(done) {
    var currMaxSockets = zmq.Context.getMaxSockets();
    zmq.Context.setMaxSockets(256);
    zmq.Context.getMaxSockets().should.equal(256);
    zmq.Context.setMaxSockets(currMaxSockets);
    done();
  });

});
