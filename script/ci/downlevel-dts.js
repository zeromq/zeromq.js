// Based on web-streams-polyfill/build/downlevel-dts (MIT licensed) by Mattias Buelens, Diwank Singh Tomer
// https://github.com/MattiasBuelens/web-streams-polyfill/blob/57d83d0372428532fab83f8d252a5aad950892da/build/downlevel-dts.js
// Based on downlevel-dts (MIT licensed) by Nathan Shively-Sanders
// https://github.com/sandersn/downlevel-dts/blob/e7d1cb5aced5686826fe8aac4d4af2f745a9ef60/index.js

const { Project, ts } = require('ts-morph');
const path = require('path');

const project = new Project();
const inputDir = project.addDirectoryAtPath(path.join(__dirname, '../../lib/'));

// Create output directory
const ts36Dir = inputDir.createDirectory('ts3.6');
project.saveSync();

// Down-level all *.d.ts files in input directory
const files = inputDir.addSourceFilesAtPaths('*.d.ts');
for (const f of files) {
  // Create copy for TypeScript 3.6+
  f.copyToDirectory(ts36Dir, { overwrite: true });
  downlevelTS36(f);
  downlevelTS34(f);
  // Original file will be overwritten by down-leveled file when saved
}
project.saveSync();

/**
 * Down-level TypeScript 3.6 types in the given source file
 */
function downlevelTS36(f) {
  // Replace get/set accessors with (read-only) properties
  const gs = f.getDescendantsOfKind(ts.SyntaxKind.GetAccessor);
  for (const g of gs) {
    const s = g.getSetAccessor();
    const returnTypeNode = g.getReturnTypeNode();
    const returnType = returnTypeNode ? returnTypeNode.getText() : 'any';
    g.replaceWithText(`${getModifiersText(g)}${s ? '' : 'readonly '}${g.getName()}: ${returnType};`);
    if (s) {
      s.remove();
    }
  }
  const ss = f.getDescendantsOfKind(ts.SyntaxKind.SetAccessor);
  for (const s of ss) {
    const g = s.getGetAccessor();
    if (!g) {
      const firstParam = s.getParameters()[0];
      const firstParamTypeNode = firstParam && firstParam.getTypeNode();
      const firstParamType = firstParamTypeNode ? firstParamTypeNode.getText() : 'any';
      s.replaceWithText(`${getModifiersText(s)}${s.getName()}: ${firstParamType};`);
    }
  }
}

/**
 * Down-level TypeScript 3.4 types in the given source file
 */
function downlevelTS34(f) {
  // Replace "es2018.asynciterable" with "esnext.asynciterable" in lib references
  const refs = f.getLibReferenceDirectives();
  for (const r of refs) {
    if (r.getFileName() === 'es2018.asynciterable') {
      f.replaceText([r.getPos(), r.getEnd()], 'esnext.asynciterable');
    }
  }
}

function getModifiersText(node) {
  const modifiersText = node.getModifiers().map(m => m.getText()).join(' ');
  return modifiersText.length > 0 ? modifiersText + ' ' : '';
}
