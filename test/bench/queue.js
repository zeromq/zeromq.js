if (zmq.cur) {
  suite.add(`queue msgsize=${msgsize} n=${n} zmq=cur`, Object.assign({
    fn: deferred => {
      const client = zmq.cur.socket("dealer")
      client.linger = 0
      client.connect(address)

      global.gc?.()

      for (let i = 0; i < n; i++) {
        client.send(Buffer.alloc(msgsize))
      }

      global.gc?.()

      client.close()

      deferred.resolve()
    }
  }, benchOptions))
}

if (zmq.ng) {
  suite.add(`queue msgsize=${msgsize} n=${n} zmq=ng`, Object.assign({
    fn: async deferred => {
      const client = new zmq.ng.Dealer
      client.linger = 0
      client.sendHighWaterMark = n * 2
      client.connect(address)

      global.gc?.()

      for (let i = 0; i < n; i++) {
        await client.send(Buffer.alloc(msgsize))
      }

      global.gc?.()

      client.close()

      deferred.resolve()
    }
  }, benchOptions))
}
