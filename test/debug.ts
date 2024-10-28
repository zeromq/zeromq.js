import * as zmq from "../src/index.js"

import {getGcOrSkipTest} from "./unit/helpers.js"

async function main() {
  const gc = getGcOrSkipTest()

  let weakRef: undefined | WeakRef<zmq.Context>
  const task = async () => {
    const context: zmq.Context | undefined = new zmq.Context()
    const dealer = new zmq.Dealer({context, linger: 0})
    weakRef = new WeakRef(context)

    // dealer.close()
  }

  await task()
  await gc()

  console.log(weakRef?.deref())
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
