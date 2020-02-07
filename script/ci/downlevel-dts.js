// Based on web-streams-polyfill/build/downlevel-dts (MIT licensed) by Mattias Buelens, Diwank Singh Tomer
// https://github.com/MattiasBuelens/web-streams-polyfill/blob/57d83d0372428532fab83f8d252a5aad950892da/build/downlevel-dts.js
// Based on downlevel-dts (MIT licensed) by Nathan Shively-Sanders
// https://github.com/sandersn/downlevel-dts/blob/e7d1cb5aced5686826fe8aac4d4af2f745a9ef60/index.js

/* eslint-env node */

const {Project, ts} = require("ts-morph")
const path = require("path")
const fs = require("fs-extra")

const project = new Project()
const inputDir = project.addDirectoryAtPath(path.join(__dirname, "../../lib/"))

// Create output directory
fs.emptyDirSync(path.join(inputDir.getPath().toString(), "ts3.6"))
const ts36Dir = inputDir.createDirectory("ts3.6")
project.saveSync()

// Down-level all *.d.ts files in input directory
const files = inputDir.addSourceFilesAtPaths("*.d.ts")
for (const f of files) {
  // Create copy for TypeScript 3.6+
  copyTypingsFile(f, ts36Dir)
  downlevelTS36(f)
  downlevelTS34(f)
  // Original file will be overwritten by down-leveled file when saved
}
project.saveSync()

/**
 * Copy typings source file *.d.ts to target dir
 */
function copyTypingsFile(f, targetDir) {
  const cf = f.copyToDirectory(targetDir, {overwrite: true})
  const srcPath = f.getDirectoryPath()
  const targetPath = targetDir.getPath()
  revertModulePathChange(cf.getImportDeclarations(), srcPath, targetPath)
  revertModulePathChange(cf.getExportDeclarations(), srcPath, targetPath)
}

/**
 * HELPER for reverting changed relative paths for import/export declarations in
 * copied files, so they to not point to the source-directory but the other
 * copied files in the target directory.
 *
 * For example:
 * [original in srcDir]         from "./<module-file>"
 * [after copied to targetDir]  from "../<module-file>"
 * [reverted in targetDir]      from "./<module-file>"
 */
function revertModulePathChange(importExportDecl, srcDir, targetDir) {
  const absSrcDir = path.resolve(srcDir)
  for (const decl of importExportDecl) {
    if (!decl.isModuleSpecifierRelative()) {
      continue
    }
    const declPath = decl.getModuleSpecifierValue()
    if (!declPath) {
      continue
    }
    const absDeclPath = path.resolve(path.join(targetDir, declPath))
    if (absDeclPath.indexOf(absSrcDir) === 0) {
      decl.setModuleSpecifier(relativeModulePath(absDeclPath, targetDir))
    }
  }
}

/**
 * Down-level TypeScript 3.6 types in the given source file
 */
function downlevelTS36(f) {
  // Replace get/set accessors with (read-only) properties
  const gs = f.getDescendantsOfKind(ts.SyntaxKind.GetAccessor)
  for (const g of gs) {
    const comment = getLeadingComments(g)
    const s = g.getSetAccessor()
    const returnTypeNode = g.getReturnTypeNode()
    const returnType = returnTypeNode ? returnTypeNode.getText() : "any"
    g.replaceWithText(
      `${comment}${getModifiersText(g)}${
        s ? "" : "readonly "
      }${g.getName()}: ${returnType};`,
    )
    if (s) {
      s.remove()
    }
  }
  const ss = f.getDescendantsOfKind(ts.SyntaxKind.SetAccessor)
  for (const s of ss) {
    const g = s.getGetAccessor()
    if (!g) {
      const comment = getLeadingComments(s)
      const firstParam = s.getParameters()[0]
      const firstParamTypeNode = firstParam && firstParam.getTypeNode()
      const firstParamType = firstParamTypeNode
        ? firstParamTypeNode.getText()
        : "any"
      s.replaceWithText(
        `${comment}${getModifiersText(s)}${s.getName()}: ${firstParamType};`,
      )
    }
  }
}

/**
 * Down-level TypeScript 3.4 types in the given source file
 */
function downlevelTS34(f) {
  // Replace "es2018.asynciterable" with "esnext.asynciterable" in lib references
  const refs = f.getLibReferenceDirectives()
  for (const r of refs) {
    if (r.getFileName() === "es2018.asynciterable") {
      f.replaceText([r.getPos(), r.getEnd()], "esnext.asynciterable")
    }
  }
  downlevelEs2018(f)
}

/**
 * Down-level es2018 to esnext library in the given source file
 */
function downlevelEs2018(f) {
  // Replace AsyncIterator<T1,T2> with AsyncIterator<T1>
  const typeParams = f.getDescendantsOfKind(ts.SyntaxKind.TypeReference)
  for (const t of typeParams) {
    if (t.wasForgotten()) {
      continue
    }
    const typeName = t.getTypeName().getText()
    if (typeName === "AsyncIterator") {
      const params = t.getTypeArguments()
      if (params.length > 1) {
        t.replaceWithText(`${typeName}<${params[0].getText()}>`)
      }
    }
  }
}

function getModifiersText(node) {
  const modifiersText = node
    .getModifiers()
    .map(m => m.getText())
    .join(" ")
  return modifiersText.length > 0 ? modifiersText + " " : ""
}

function getLeadingComments(node) {
  const t = node.getText()
  const tlen = t.length
  const ct = node.getText(true)
  const ctlen = ct.length
  // if no comment, or comment not leading, return empty string:
  if (tlen === ctlen || ct.indexOf(t) !== ctlen - tlen) {
    return ""
  }
  // remove indentation (execept 1 space for "stars-aligning") of comment lines,
  // since they will be re-indented on insertion
  // (and remove all leading whitespaces from non-comment lines)
  return ct
    .replace(t, "")
    .replace(/(\r?\n)\s+ /gm, "$1 ")
    .replace(/(\r?\n)\s+$/gm, "$1")
}

function relativeModulePath(fromAbsModulePath, toAbsTargetDir) {
  const fromModDir = path.dirname(fromAbsModulePath)
  const revertedPath = path.resolve(
    fromModDir,
    path.relative(fromModDir, toAbsTargetDir),
  )
  let relMod = path.relative(
    revertedPath,
    path.join(revertedPath, path.basename(fromAbsModulePath)),
  )
  if (!/^\./.test(relMod)) {
    relMod = "./" + relMod
  }
  if (path.sep === "/") {
    return relMod
  }
  return relMod.replace(/\\/g, "/")
}
