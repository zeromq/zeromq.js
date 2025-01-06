import {Request} from "zeromq"

import {Broker} from "./broker"
import {Worker} from "./worker"

async function sleep(msec: number) {
  return new Promise(resolve => {
    setTimeout(resolve, msec)
  })
}

class SodaWorker extends Worker {
  service = "soda"

  override async process(...msgs: Buffer[]): Promise<Buffer[]> {
    await sleep(Math.random() * 300)
    return msgs
  }
}

class TeaWorker extends Worker {
  service = "tea"

  override async process(...msgs: Buffer[]): Promise<Buffer[]> {
    await sleep(Math.random() * 500)
    return msgs
  }
}

class CoffeeWorker extends Worker {
  service = "coffee"

  override async process(...msgs: Buffer[]): Promise<Buffer[]> {
    await sleep(Math.random() * 200)
    return msgs
  }
}

const broker = new Broker()

const workers = [
  new SodaWorker(),
  new TeaWorker(),
  new CoffeeWorker(),
  new TeaWorker(),
]

async function request(
  service: string,
  ...req: string[]
): Promise<undefined | Buffer[]> {
  const socket = new Request({receiveTimeout: 2000})
  socket.connect(broker.address)

  console.log(`requesting '${req.join(", ")}' from '${service}'`)
  await socket.send(["MDPC01", service, ...req])

  try {
    const [_blank, _header, ...res] = await socket.receive()
    console.log(`received '${res.join(", ")}' from '${service}'`)
    return res
  } catch (err) {
    console.log(`timeout expired waiting for '${service}'`, err)
  }
}

async function main() {
  const _started = Promise.all([
    // start the broker
    broker.start(),
    // start the workers
    ...workers.map(worker => worker.start()),
  ])

  console.log("---------- Started -----------")

  /* Requests are issued in parallel. */
  await Promise.all([
    request("soda", "cola"),
    request("tea", "oolong"),
    request("tea", "sencha"),
    request("tea", "earl grey", "with milk"),
    request("tea", "jasmine"),
    request("coffee", "cappuccino"),
    request("coffee", "latte", "with soy milk"),
    request("coffee", "espresso"),
    request("coffee", "irish coffee"),
  ])

  console.log("---------- Stopping -----------")

  await Promise.all([
    // stop the broker
    broker.stop(),
    // stop the workers
    ...workers.map(worker => worker.stop()),
  ])
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

if (process.env.CI) {
  // exit after 1 second in CI environment
  setTimeout(() => {
    process.exit(0)
  }, 2000)
}
