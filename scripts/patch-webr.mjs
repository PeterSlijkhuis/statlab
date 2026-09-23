// Runs after every npm install. Under Node, webR's worker imports a script by
// its resolved filesystem path, and Node's ESM loader rejects a Windows path
// such as C:\... The fix wraps that path in pathToFileURL. It matters only in
// Node, where the content validator runs; the browser loads webR from the CDN.
//
// This matches the code rather than a line diff, so it keeps working when webR
// is bumped. If a new webR release changes that code, it stops the install
// with a message instead of leaving the validator broken on Windows.
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'node_modules/webr/dist/webr-worker.js';
const source = readFileSync(file, 'utf8');
const pathImport = /await import\(\(await import\("path"\)\)\.default\.resolve\(([\w$]+)\)\)/g;

if (source.includes('pathToFileURL')) {
  // Already patched by an earlier install, or fixed in webR itself.
  process.exit(0);
}

const found = source.match(pathImport)?.length ?? 0;
if (found !== 1) {
  console.error(
    `patch-webr: expected one path import in ${file}, found ${found}. ` +
      'webR changed its worker; check whether it still needs the Windows path fix ' +
      'and update scripts/patch-webr.mjs.',
  );
  process.exit(1);
}

writeFileSync(
  file,
  source.replace(
    pathImport,
    (_, path) =>
      `await import((await import("url")).pathToFileURL((await import("path")).default.resolve(${path})).href)`,
  ),
);
console.log('patch-webr: webR worker now imports files by URL under Node.');
