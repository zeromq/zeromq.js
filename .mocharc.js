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
  retries: 2,
  fullTrace: true
}

module.exports = config
