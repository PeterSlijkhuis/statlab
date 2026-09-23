// Lists the direct dependencies whose installed version differs between the
// committed package-lock.json and the one in the working tree, one per line,
// for the weekly update's commit message. Prints nothing when none changed.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const before = JSON.parse(execFileSync('git', ['show', 'HEAD:package-lock.json'], { encoding: 'utf8' }));
const after = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const direct = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).sort();

for (const name of direct) {
  const was = before.packages[`node_modules/${name}`]?.version;
  const now = after.packages[`node_modules/${name}`]?.version;
  if (was !== now) console.log(`${name} ${was ?? 'none'} to ${now ?? 'none'}`);
}
