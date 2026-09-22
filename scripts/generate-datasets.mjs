// Generates the course population dataset deterministically.
// Run once: `node scripts/generate-datasets.mjs`. The CSV is committed.
import { mkdir, writeFile } from 'node:fs/promises';

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20260914);

function normal(mu, sigma) {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const N = 5000;
const rows = ['id,programme,stress,sleep_hours,exam_score'];

for (let i = 1; i <= N; i += 1) {
  const programme = rng() < 0.5 ? 'Psychology' : 'Business';
  // Stress is skewed: most students low, a long tail of very stressed ones.
  const stress = Math.min(40, -12 * Math.log(Math.max(rng(), Number.EPSILON)));
  const sleep = Math.min(11, Math.max(3, normal(7.2 - stress * 0.03, 1.1)));
  const exam = Math.min(100, Math.max(0, normal(62 + sleep * 2.4 - stress * 0.45, 11)));
  rows.push(
    [i, programme, stress.toFixed(2), sleep.toFixed(2), exam.toFixed(1)].join(','),
  );
}

await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/wellbeing-population.csv', import.meta.url), `${rows.join('\n')}\n`);
console.log(`Wrote ${N} rows.`);
