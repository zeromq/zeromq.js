const path = require("path")

module.exports = require(process.env.ZMQ_COMPAT_PATH
  ? path.resolve(process.cwd(), process.env.ZMQ_COMPAT_PATH)
  : "../../../src/compat")

/* Copy capabilities from regular module. */
module.exports.capability = require("../../../src").capability
