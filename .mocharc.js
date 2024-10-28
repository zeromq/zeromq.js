/**
 * @type {import('mocha').MochaOptions}
 */
const config = {
  require: ["ts-node/register"],
  "expose-gc": true,
  "v8-expose-gc": true,
  exit: true,
  parallel: true,
  timeout: 5000,
  retries: 1,
  fullTrace: true,
  bail: false,
}

module.exports = config
