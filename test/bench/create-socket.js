if (zmq.cur) {
  zmq.cur.Context.setMaxSockets(n)
  suite.add(`create socket n=${n} zmq=cur`, Object.assign({
    fn: deferred => {
      const sockets = []
      for (let i = 0; i < n; i++) {
        sockets.push(zmq.cur.socket("dealer"))
      }
      deferred.resolve()
      for (const socket of sockets) socket.close()
    }
  }, benchOptions))
}

if (zmq.ng) {
  zmq.ng.global.maxSockets = n
  suite.add(`create socket n=${n} zmq=ng`, Object.assign({
    fn: deferred => {
      const sockets = []
      for (let i = 0; i < n; i++) {
        sockets.push(new zmq.ng.Dealer)
      }
      deferred.resolve()
      for (const socket of sockets) socket.close()
    }
  }, benchOptions))
}
