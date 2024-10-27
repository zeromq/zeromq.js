import * as zmq from "../../../v5-compat"
import {assert} from "chai"
import {uniqAddress} from "../helpers"
import http from "http"

if (process.env.INCLUDE_COMPAT_TESTS) {
  describe("compat socket stream", function () {
    it("should support a stream socket type", async function (done) {
      const stream = zmq.socket("stream")
      const address = await uniqAddress("tcp")

      stream.on("message", function (id: string, msg: string) {
        assert.instanceOf(msg, Buffer)
        if (msg.length == 0) {
          return
        }

        const raw_header = String(msg).split("\r\n")
        const method = raw_header[0].split(" ")[0]
        assert.equal(method, "GET")

        //finding an HTTP GET method, prepare HTTP response for TCP socket
        const httpProtocolString =
          "HTTP/1.0 200 OK\r\n" + //status code
          "Content-Type: text/html\r\n" + //headers
          "\r\n" +
          "<!DOCTYPE html>" + //response body
          "<head>" + //make it xml, json, html or something else
          "<meta charset='UTF-8'>" +
          "</head>" +
          "<body>" +
          "<p>derpin over protocols</p>" +
          "</body>" +
          "</html>"

        //zmq streaming prefixed by envelope"s routing identifier
        stream.send([id, httpProtocolString])
      })

      stream.bind(address, (err: Error | undefined) => {
        if (err) {
          throw err
        }

        //send non-peer request to zmq, like an http GET method with URI path
        http.get(
          `${address.replace("tcp:", "http:")}/aRandomRequestPath`,
          function (httpMsg) {
            // @ts-expect-error
            assert.equal(httpMsg.socket._readableState.reading, false)

            httpMsg.on("data", function (msg: string) {
              assert.instanceOf(msg, Buffer)
              assert.equal(
                msg.toString(),
                "<!DOCTYPE html><head><meta charset='UTF-8'></head>" +
                  "<body>" +
                  "<p>derpin over protocols</p>" +
                  "</body>" +
                  "</html>",
              )
              stream.close()
              done()
            })
          },
        )
      })
    })
  })
}
