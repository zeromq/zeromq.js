if (zmq.ng) {
  suite.add(`deliver async iterator proto=${proto} msgsize=${msgsize} n=${n} zmq=ng`, Object.assign({
    fn: async deferred => {
      const server = new zmq.ng.Dealer
      const client = new zmq.ng.Dealer

      await server.bind(address)
      client.connect(address)

      global.gc()

      const send = async () => {
        for (let i = 0; i < n; i++) {
          await client.send(Buffer.alloc(msgsize))
        }
      }

      const receive = async () => {
        let i = 0
        for await (const [msg] of server) {
          if (++i == n) server.close()
        }
      }

      await Promise.all([send(), receive()])

      global.gc()

      server.close()
      client.close()

      global.gc()

      deferred.resolve()
    }
  }, benchOptions))
}
