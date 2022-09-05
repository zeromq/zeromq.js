import {cpus} from "os"
import {Publisher, Pull, Push} from "zeromq"

import {ThreadedWorker} from "./threaded-worker"

export class Processor {
  threads: number

  input = new Push()
  output = new Pull()
  signal = new Publisher()

  init: Promise<any>
  exit: Promise<any>

  constructor(threads: number = cpus().length) {
    console.log(`starting ${threads} worker threads`)
    console.log("---")

    this.threads = threads
    this.init = Promise.all([
      this.input.bind("inproc://input"),
      this.output.bind("inproc://output"),
      this.signal.bind("inproc://signal"),
      new Promise(resolve => setTimeout(resolve, 100)),
    ])

    this.exit = Promise.all([ThreadedWorker.spawn(this.threads)])
  }

  async process(str: string): Promise<string> {
    await this.init

    const input = str.split("")
    for (const req of input.entries()) {
      await this.input.send(req.map(pt => pt.toString()))
    }

    const output: string[] = Array.from({length: input.length})
    for await (const [pos, res] of this.output) {
      output[parseInt(pos.toString(), 10)] = res.toString()
      if (output.every(el => el !== undefined)) {
        break
      }
    }

    return output.join("")
  }

  async stop() {
    await Promise.all([
      this.signal.send("stop"),
      this.input.unbind("inproc://input"),
      this.output.unbind("inproc://output"),
      this.signal.unbind("inproc://signal"),
    ])

    await this.exit
  }
}
