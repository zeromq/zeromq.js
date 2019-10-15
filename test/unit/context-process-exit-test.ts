/* tslint:disable: no-unused-expression */
import {assert} from "chai"
import {spawn} from "child_process"

/* This file is in JavaScript instead of TypeScript because most code is
   being evaluated with toString() and executed in a sub-process. */
describe("context process exit", function() {
  describe("with default context", function() {
    it("should occur when sockets are closed", async function() {
      this.slow(200)
      await ensureExit(function() {
        const zmq = require(".")
        const socket1 = new zmq.Dealer
        socket1.close()
        const socket2 = new zmq.Router
        socket2.close()
      })
    })

    it("should occur when sockets are not closed", async function() {
      this.slow(200)
      await ensureExit(function() {
        const zmq = require(".")
        const socket1 = new zmq.Dealer
        const socket2 = new zmq.Router
      })
    })

    it("should not occur when sockets are open and polling", async function() {
      this.slow(750)
      await ensureNoExit(function() {
        const zmq = require(".")
        const socket1 = new zmq.Dealer
        socket1.connect("inproc://foo")
        socket1.receive()
      })
    })
  })

  describe("with custom context", function() {
    it("should occur when sockets are closed", async function() {
      this.slow(200)
      await ensureExit(function() {
        const zmq = require(".")
        const context = new zmq.Context
        const socket1 = new zmq.Dealer({context})
        socket1.close()
        const socket2 = new zmq.Router({context})
        socket2.close()
      })
    })

    it("should occur when sockets are closed and context is gced", async function() {
      this.slow(200)
      await ensureExit(function() {
        const zmq = require(".")
        function run() {
          const context = new zmq.Context
          const socket1 = new zmq.Dealer({context})
          socket1.close()
          const socket2 = new zmq.Router({context})
          socket2.close()
        }

        run()
        global.gc()
      })
    })

    it("should occur when sockets are not closed", async function() {
      this.slow(200)
      await ensureExit(function() {
        const zmq = require(".")
        const context = new zmq.Context
        const socket1 = new zmq.Dealer({context})
        const socket2 = new zmq.Router({context})
      })
    })

    it("should not occur when sockets are open and polling", async function() {
      this.slow(750)
      await ensureNoExit(function() {
        const zmq = require(".")
        const context = new zmq.Context
        const socket1 = new zmq.Dealer({context})
        socket1.connect("inproc://foo")
        socket1.receive()
      })
    })
  })
})

async function ensureExit(fn: () => void): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn(process.argv[0], ["--expose_gc"])
    child.stdin.write(`(${fn})()`)
    child.stdin.end()

    child.stdout.on("data", (data: Buffer) => console.log(data.toString()))
    child.stderr.on("data", (data: Buffer) => console.error(data.toString()))

    child.on("close", (code: number) => {
      assert.equal(code, 0)
      resolve()
    })

    setTimeout(() => {
      resolve()
      child.kill()
    }, 2000)
  })
}

async function ensureNoExit(fn: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.argv[0], ["--expose_gc"])
    child.stdin.write(`(${fn})()`)
    child.stdin.end()

    child.stdout.on("data", (data: Buffer) => console.log(data.toString()))
    child.stderr.on("data", (data: Buffer) => console.error(data.toString()))

    child.on("close", (code: number) => {
      reject(new Error(`Exit with code ${code}`))
    })

    setTimeout(() => {
      resolve()
      child.kill()
    }, 500)
  })
}
