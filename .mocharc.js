/**
 * @type {import('mocha').MochaOptions}
 */
const config = {
  require: ["ts-node/register"],
  spec: ["test/unit/**/*-test.ts"],
  "expose-gc": true,
  "v8-expose-gc": true,
  exit: true,
  parallel: true,
  timeout: 10000,
  retries: 3,
}

module.exports = config
