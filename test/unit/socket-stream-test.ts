import * as zmq from "../../src"

import {assert} from "chai"
import {createServer, get, Server} from "http"
import {testProtos, uniqAddress} from "./helpers"

for (const proto of testProtos("tcp")) {
  describe(`socket with ${proto} stream`, function() {
    let stream: zmq.Stream

    beforeEach(function() {
      stream = new zmq.Stream()
    })

    afterEach(function() {
      stream.close()
      global.gc()
    })

    describe("send/receive as server", function() {
      it("should deliver messages", async function() {
        const address = uniqAddress(proto)

        await stream.bind(address)

        const serve = async () => {
          for await (const [id, msg] of stream) {
            if (!msg.length) continue
            assert.equal(msg.toString().split("\r\n")[0], "GET /foo HTTP/1.1")

            await stream.send([
              id,
              "HTTP/1.0 200 OK\r\n" +
                "Content-Type: text/plan\r\n" +
                "\r\n" +
                "Hello world!",
            ])

            stream.close()
          }
        }

        let body = ""
        const request = async () => {
          return new Promise(resolve => {
            get(address.replace("tcp:", "http:") + "/foo", res => {
              res.on("data", buffer => {
                body += buffer.toString()
              })
              res.on("end", resolve)
            })
          })
        }

        await Promise.all([request(), serve()])
        assert.equal(body, "Hello world!")
      })
    })

    describe("send/receive as client", function() {
      it("should deliver messages", async function() {
        const address = uniqAddress(proto)
        const port = parseInt(address.split(":").pop()!, 10)

        const server = await new Promise<Server>(resolve => {
          const http = createServer((req, res) => {
            res.writeHead(200, {
              "Content-Type": "text/plain",
              "Content-Length": 12,
            })
            res.end("Hello world!")
          })

          http.listen(port, () => resolve(http))
        })

        const routingId = "abcdef1234567890"
        stream.connect(address, {routingId})

        let body = ""
        const request = async () => {
          await stream.send([
            routingId,
            "GET /foo HTTP/1.1\r\n" +
              `Host: ${address.replace("tcp://", "")}\r\n\r\n`,
          ])

          for await (const [id, data] of stream) {
            assert.equal(id.toString(), routingId)
            if (data.length) {
              body += data
              break
            }
          }

          stream.close()
          server.close()
        }

        await Promise.all([request()])
        assert.equal(body.split("\r\n\r\n").pop(), "Hello world!")
      })
    })
  })
}
