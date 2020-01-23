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

type TestDef = {version: string; minTarget: string; requiredLibs?: string[]}

// NOTE tsc version 2.9.x (and lower) will not work with current typings!
const tsVersions: TestDef[] = [
  {
    version: "3.0.x",
    minTarget: "es3",
    requiredLibs: ["es2015", "ESNext.AsyncIterable"],
  },
  {
    version: "3.1.x",
    minTarget: "es3",
    requiredLibs: ["es2015", "ESNext.AsyncIterable"],
  },
  {version: "3.0.x", minTarget: "esnext"},
  {version: "3.1.x", minTarget: "esnext"},

  {version: "3.2.x", minTarget: "es3"},
  {version: "3.3.x", minTarget: "es3"},
  {version: "3.4.x", minTarget: "es3"},
  {version: "3.5.x", minTarget: "es3"},
  {version: "3.6.x", minTarget: "es3"},
  {version: "3.7.x", minTarget: "es3"},
]

// use ./typings-test.ts for tsc test, but change the import location for zmq
// to be used from templatePath+`/ts-x.x.x/test/typings-test.ts`:
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

function getItLabelDetails(tsVer: TestDef): string {
  const lbl = `v${tsVer.version} for (minimal) compile target "${tsVer.minTarget}"`
  if (!tsVer.requiredLibs || tsVer.requiredLibs.length === 0) return lbl
  return `${lbl}, and required compile lib(s): "${tsVer.requiredLibs.join(
    '", "',
  )}"`
}

for (const tsVer of tsVersions) {
  describe(`when used in a project with typescript version ${tsVer.version}`, function() {
    this.timeout(30000)

    const tscTargetPath = path.resolve(tscTestBasePath, `ts-${tsVer.version}`)

    beforeEach(done => {
      emptyDir(tscTargetPath).then(() => {
        Promise.all([
          readJson(path.resolve(templateSrcPath, "tsconfig.json")).then(pkg => {
            pkg.compilerOptions.target = tsVer.minTarget
            if (tsVer.requiredLibs) {
              pkg.compilerOptions.lib = addLibs(
                tsVer.requiredLibs,
                pkg.compilerOptions.lib,
              )
            }
            return writeJson(path.resolve(tscTargetPath, "tsconfig.json"), pkg)
          }),
          readJson(path.resolve(templateSrcPath, "package.json")).then(pkg => {
            pkg.name = `test-typings-ts-${tsVer.version}`
            pkg.devDependencies.typescript = `${tsVer.version}`
            return writeJson(path.resolve(tscTargetPath, "package.json"), pkg)
          }),
          srcStr.then(content =>
            writeFile(
              path.resolve(tscTargetPath, "typings-test.ts"),
              content,
              "utf8",
            ),
          ),
        ])
          .then(() => {
            exec("npm install", {cwd: tscTargetPath}, err => {
              if (err) return done(err)
              done()
            })
          })
          .catch(err => {
            if (err) done(err)
          })
      })
    })

    afterEach(done => {
      remove(tscTargetPath, err => {
        if (err) return done(err)
        done()
      })
    })

    it(`it should compile successfully with tsc ${getItLabelDetails(
      tsVer,
    )}`, async function() {
      let errMsg: string | undefined
      await new Promise(resolve => {
        exec("npm run test", {cwd: tscTargetPath}, (error, stdout, stderr) => {
          if (error) {
            errMsg = stdout + "\n" + stderr
          }
          resolve()
        })
      })

      assert.isUndefined(errMsg, errMsg)
    })
  })
}
