import * as zmq from "../../src"

describe("typings", function () {
  it("should compile successfully", function () {
    /* To test the TypeScript typings this file should compile successfully.
       We don't actually execute the code in this function. */

    function _test() {
      const version: string = zmq.version
      console.log(version)

      const capability = zmq.capability
      if (capability.ipc) {
        console.log("ipc")
      }
      if (capability.pgm) {
        console.log("pgm")
      }
      if (capability.tipc) {
        console.log("tipc")
      }
      if (capability.norm) {
        console.log("norm")
      }
      if (capability.curve) {
        console.log("curve")
      }
      if (capability.gssapi) {
        console.log("gssapi")
      }
      if (capability.draft) {
        console.log("draft")
      }

      const keypair = zmq.curveKeyPair()
      console.log(keypair.publicKey)
      console.log(keypair.secretKey)

      const context = new zmq.Context({
        ioThreads: 1,
        ipv6: true,
      })

      context.threadPriority = 4

      console.log(context.ioThreads)
      console.log(context.ipv6)

      zmq.context.ioThreads = 5
      zmq.context.ipv6 = true

      const socket = new zmq.Dealer({
        context: zmq.context,
        sendTimeout: 200,
        probeRouter: true,
        routingId: "foobar",
      })

      const router = new zmq.Router()
      if (router.type !== 6) {
        throw new Error()
      }

      console.log(socket.context)
      console.log(socket.sendTimeout)
      console.log(socket.routingId)

      const exec = async () => {
        await socket.bind("tcp://foobar")
        await socket.unbind("tcp://foobar")

        socket.connect("tcp://foobar")
        socket.disconnect("tcp://foobar")
        router.connect("tcp://foobar", {routingId: "remote_id"})

        for await (const [p1, p2] of socket) {
          console.log(p1)
          console.log(p2)
        }

        const [part1, part2] = await socket.receive()

        await socket.send(part1)
        await socket.send([part1, part2])

        await socket.send([null, Buffer.alloc(1), "foo"])
        await socket.send(null)
        await socket.send(Buffer.alloc(1))
        await socket.send("foo")

        socket.close()

        socket.events.on("bind", details => {
          console.log(details.address)
        })

        socket.events.off("bind", details => {
          console.log(details.address)
        })

        socket.events.on("connect:retry", details => {
          console.log(details.interval)
          console.log(details.address)
        })

        socket.events.on("accept:error", details => {
          console.log(details.error.code)
          console.log(details.error.errno)
          console.log(details.address)
        })

        for await (const event of socket.events) {
          switch (event.type) {
            case "end":
            case "unknown":
              break
            case "connect:retry":
              console.log(event.interval)
              console.log(event.address)
              break
            case "accept:error":
            case "bind:error":
            case "close:error":
            case "handshake:error:other":
              console.log(event.error.code)
              console.log(event.error.errno)
              console.log(event.address)
              break
            default:
              console.log(event.address)
          }
        }

        const proxy = new zmq.Proxy(new zmq.Router(), new zmq.Dealer())
        await proxy.run()

        proxy.pause()
        proxy.resume()
        proxy.terminate()

        proxy.frontEnd.close()
        proxy.backEnd.close()
      }

      exec().catch(err => {
        throw err
      })
    }
  })
})
