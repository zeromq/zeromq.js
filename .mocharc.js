/**
 * @type {import('mocha').MochaOptions}
 */
const config = {
  require: ["ts-node/register"],
  "expose-gc": true,
  "v8-expose-gc": true,
  exit: true,
  parallel: false,
  timeout: 6000,
  retries: 5,
  fullTrace: true,
  bail: false,
}

module.exports = config
