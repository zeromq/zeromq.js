import * as path from "path"
import {exec} from "child_process"
import {
  emptyDir,
  remove,
  readJson,
  writeJson,
  readFile,
  writeFile,
} from "fs-extra"

import {assert} from "chai"

/**
 * Testing typings compatibility for TypeScript versions, i.e. when zeromq.js is
 * used in projects that use a certain TypeScript version.
 *
 * NOTE: Disable (skip) test by setting environment variable
 *       EXCLUDE_TYPINGS_COMPAT_TESTS=true
 */

type TestDef = {version: string; minTarget: string; requiredLibs?: string[]}

const tsVersions: TestDef[] = [
  // the oldest supported version
  {version: "3.7.x", minTarget: "es3"},

  // 4.x
  {version: "4.x", minTarget: "es3"},
]

// use ./typings-test.ts for tsc test, but change the import location for zmq
// to be used from `test/typings-compatibility/ts-x.x.x/typings-test.ts`:
const zmqImportLoc = "../../../"
const srcFile = path.resolve(__dirname, "typings-test.ts")
const srcStr = readFile(srcFile, "utf8").then(content => {
  // replace import statement `import * as zmq from ...`:
  return content.replace(
    /^(\s*import\s+\*\s+as\s+zmq\s+from\s+)(.*)$/m,
    `$1"${zmqImportLoc}"`,
  )
})
const tscTestBasePath = path.resolve(__dirname, "..", "typings-compatibility")
const templateSrcPath = path.resolve(tscTestBasePath, "template")

function addLibs(libs: string[], targetList: string[]): string[] {
  if (!targetList) {
    targetList = libs
  } else {
    libs.forEach(l => {
      if (!targetList.find(e => e.toLowerCase() === l.toLowerCase())) {
        targetList.push(l)
      }
    })
  }
  return targetList
}

async function run(
  cmd: string,
  cwd: string,
  errorAsString: boolean,
): Promise<string | Error | undefined> {
  return new Promise(resolve => {
    exec(cmd, {cwd}, (error, stdout, stderr) => {
      if (error) {
        resolve(errorAsString ? `${stdout}\n${stderr}` : error)
      } else {
        resolve(undefined)
      }
    })
  })
}

function getItLabelDetails(tsVer: TestDef): string {
  const lbl = `v${tsVer.version} for (minimal) compile target ${JSON.stringify(
    tsVer.minTarget,
  )}`
  if (!tsVer.requiredLibs || tsVer.requiredLibs.length === 0) {
    return lbl
  }
  return `${lbl}, and required compile lib: ${JSON.stringify(
    tsVer.requiredLibs,
  )}`
}

describe("compatibility of typings for typescript versions", function () {
  let execCmd: "pnpm" | "npm" | "yarn"

  before(async function () {
    this.timeout(10000)
    if (/^true$/.test(process.env.EXCLUDE_TYPINGS_COMPAT_TESTS as string)) {
      this.skip()
    } else {
      // detect package manager (pnpm, npm, yarn) for installing typescript versions
      const packageManagers = ["pnpm", "yarn", "npm"] as typeof execCmd[]

      const versionResults = await Promise.all(
        packageManagers.map(pm =>
          run(`${pm} --version`, tscTestBasePath, false),
        ),
      )

      const packageManagerIndex = versionResults.findIndex(
        versionResult => typeof versionResult === "string",
      )

      if (packageManagerIndex === -1) {
        throw new Error(
          "Cannot run typings compatibility test, because pnpm, npm, and yarn are not available.",
        )
      }

      execCmd = packageManagers[packageManagerIndex]
    }
  })

  for (const tsVer of tsVersions) {
    describe(`when used in a project with typescript version ${tsVer.version}`, function () {
      // must increase timeout for allowing `npm install`'ing the version of
      // the typescript package to complete
      this.timeout(30000)

      const tscTargetPath = path.resolve(tscTestBasePath, `ts-${tsVer.version}`)

      beforeEach(done => {
        emptyDir(tscTargetPath).then(() => {
          Promise.all([
            readJson(path.resolve(templateSrcPath, "tsconfig.json")).then(
              pkg => {
                pkg.compilerOptions.target = tsVer.minTarget
                if (tsVer.requiredLibs) {
                  pkg.compilerOptions.lib = addLibs(
                    tsVer.requiredLibs,
                    pkg.compilerOptions.lib,
                  )
                }
                return writeJson(
                  path.resolve(tscTargetPath, "tsconfig.json"),
                  pkg,
                )
              },
            ),
            readJson(path.resolve(templateSrcPath, "package.json")).then(
              pkg => {
                pkg.name = `test-typings-ts-${tsVer.version}`
                pkg.devDependencies.typescript = `${tsVer.version}`
                return writeJson(
                  path.resolve(tscTargetPath, "package.json"),
                  pkg,
                )
              },
            ),
            srcStr.then(content =>
              writeFile(
                path.resolve(tscTargetPath, "typings-test.ts"),
                content,
                "utf8",
              ),
            ),
          ])
            .then(() => run(`${execCmd} install`, tscTargetPath, false))
            .catch(err => {
              if (err) {
                done(err)
              }
            })
            .then(() => done())
        })
      })

      afterEach(done => {
        remove(tscTargetPath, err => {
          if (err) {
            return done(err)
          }
          done()
        })
      })

      it(`it should compile successfully with tsc ${getItLabelDetails(
        tsVer,
      )}`, async function () {
        const cmd = execCmd === "npm" ? `${execCmd} run` : execCmd
        const errMsg = (await run(`${cmd} test`, tscTargetPath, true)) as
          | string
          | undefined
        assert.isUndefined(errMsg, errMsg)
      })
    })
  }
})
