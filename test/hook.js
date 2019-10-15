/* Display zmq async hooks during test run, throw if trigger ID is invalid. */
require("async_hooks").createHook({
  init(id, type, triggerId, resource) {
    if (type == "zmq") {
      console.log("Created async context", id, type, triggerId, resource)
    }

    if (triggerId < 0 || id < 0) {
      process._rawDebug("init", {id, type, triggerId})
      Error.stackTraceLimit = Infinity
      throw new Error("bad async trigger id")
    }
  }
}).enable()
