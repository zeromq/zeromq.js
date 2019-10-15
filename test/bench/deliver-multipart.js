if (zmq.cur) {
  suite.add(`deliver multipart proto=${proto} msgsize=${msgsize} n=${n} zmq=cur`, Object.assign({
    fn: deferred => {
      const server = zmq.cur.socket("dealer")
      const client = zmq.cur.socket("dealer")

      let j = 0
      server.on("message", (msg1, msg2, mgs3) => {
        j++
        if (j == n - 1) {
          global.gc()

          server.close()
          client.close()

          global.gc()

          deferred.resolve()
        }
      })

      server.bind(address, () => {
        client.connect(address)

        global.gc()

        for (let i = 0; i < n; i++) {
          client.send([Buffer.alloc(msgsize), Buffer.alloc(msgsize), Buffer.alloc(msgsize)])
        }
      })
    }
  }, benchOptions))
}

if (zmq.ng) {
  suite.add(`deliver multipart proto=${proto} msgsize=${msgsize} n=${n} zmq=ng`, Object.assign({
    fn: async deferred => {
      const server = new zmq.ng.Dealer
      const client = new zmq.ng.Dealer

      await server.bind(address)
      client.connect(address)

      global.gc()

      const send = async () => {
        for (let i = 0; i < n; i++) {
          await client.send([Buffer.alloc(msgsize), Buffer.alloc(msgsize), Buffer.alloc(msgsize)])
        }
      }

      const receive = async () => {
        let j = 0
        for (j = 0; j < n - 1; j++) {
          const [msg1, msg2, msg3] = await server.receive()
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
