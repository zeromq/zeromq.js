import {describe, it, beforeEach, afterEach, before, after} from "mocha"

import {Worker} from "worker_threads"
import {testProtos} from "./helpers"

for (const proto of testProtos("tcp", "ipc", "inproc")) {
  describe(`proxy with ${proto} router/dealer`, () => {
    describe("run", () => {
      it("should proxy messages", async () => {
        const worker = new Worker(__filename, {
          workerData: {
            proto,
          },
        })
        await worker.terminate()
      })
    })
  })
}
