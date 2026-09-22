/**
 * Checks that every effect `workplace.csv` is designed to carry is actually
 * recoverable from the committed sample, and not merely true in the formula.
 * This is the plan's P2 step 4, run against the real generator rather than by
 * eye: a seeded draw can hide an effect the generator put in, and ten of the
 * fourteen modules teach against these numbers.
 *
 *   node scripts/check-workplace-effects.mjs          verify the committed constants
 *   node scripts/check-workplace-effects.mjs --search search for constants that pass
 *
 * Run under Node because this sandbox cannot reach the webR CDN; the same
 * models run in R in `src/r/session.itest.ts` under CI.
 */
import { WORKPLACE_DEFAULTS, writeWorkplace } from './generate-datasets.mjs';

const DEPARTMENTS = ['Sales', 'Engineering', 'Support', 'Marketing'];

function parse(rows) {
  const cols = rows[0].split(',');
  return rows.slice(1).map((line) =>
    Object.fromEntries(
      line.split(',').map((value, i) => [cols[i], Number.isNaN(Number(value)) ? value : Number(value)]),
    ),
  );
}

/** OLS with standard errors, by Gauss-Jordan on [X'X | I | X'y]. */
function ols(y, X) {
  const k = X[0].length;
  const n = X.length;
  const M = Array.from({ length: k }, (_, i) => [
    ...Array.from({ length: k }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0)),
    ...Array.from({ length: k }, (_, j) => (j === i ? 1 : 0)),
    X.reduce((s, r, t) => s + r[i] * y[t], 0),
  ]);
  for (let c = 0; c < k; c += 1) {
    let pivot = c;
    for (let r = c + 1; r < k; r += 1) if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) pivot = r;
    [M[c], M[pivot]] = [M[pivot], M[c]];
    const d = M[c][c];
    for (let j = 0; j < 2 * k + 1; j += 1) M[c][j] /= d;
    for (let r = 0; r < k; r += 1) {
      if (r === c) continue;
      const f = M[r][c];
      for (let j = 0; j < 2 * k + 1; j += 1) M[r][j] -= f * M[c][j];
    }
  }
  const beta = M.map((row) => row[2 * k]);
  const resid = y.map((v, t) => v - X[t].reduce((s, x, i) => s + x * beta[i], 0));
  const s2 = resid.reduce((s, e) => s + e * e, 0) / (n - k);
  return beta.map((est, i) => ({ est, se: Math.sqrt(s2 * M[i][k + i]), t: est / Math.sqrt(s2 * M[i][k + i]) }));
}

const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const median = (v) => {
  const a = [...v].sort((x, y) => x - y);
  return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
};

function measure(options) {
  const d = parse(writeWorkplace(options).rows);

  const m10 = ols(
    d.map((r) => r.wellbeing),
    d.map((r) => [1, r.autonomy, r.workload, r.tenure_years]),
  );
  const m12 = ols(
    d.map((r) => r.engagement_t2 - r.engagement_t1),
    d.map((r) => [
      1,
      r.training === 'Yes' ? 1 : 0,
      r.mentoring === 'Yes' ? 1 : 0,
      (r.training === 'Yes' ? 1 : 0) * (r.mentoring === 'Yes' ? 1 : 0),
    ]),
  );
  const m11remote = ols(
    d.map((r) => r.wellbeing),
    d.map((r) => [1, r.remote === 'Yes' ? 1 : 0]),
  );
  const m9 = ols(
    d.map((r) => r.performance),
    d.map((r) => [1, r.engagement_t2]),
  );

  const by = Object.fromEntries(
    DEPARTMENTS.map((name) => {
      const w = d.filter((r) => r.department === name).map((r) => r.wellbeing);
      return [name, { n: w.length, mean: mean(w), median: median(w) }];
    }),
  );
  const means = DEPARTMENTS.map((name) => by[name].mean);
  const medians = DEPARTMENTS.map((name) => by[name].median);
  const eng = by.Engineering;
  const otherMedians = DEPARTMENTS.filter((n) => n !== 'Engineering').map((n) => by[n].median);

  return {
    d, by, m10, m12, m11remote, m9,
    leftShare: d.filter((r) => r.left_company === 1).length / d.length,
    floored: d.filter((r) => r.wellbeing <= 0).length,
    medianMargin: eng.median - Math.max(...otherMedians),
    meanGap: Math.max(...means) - eng.mean,
    engMeanMidTable: eng.mean < Math.max(...means) && eng.mean > Math.min(...means),
    engTopMedian: eng.median === Math.max(...medians),
  };
}

/** Every criterion the modules depend on, as a predicate with a reason. */
function criteria(m) {
  return [
    ['M10 autonomy is clearly non-null', Math.abs(m.m10[1].t) > 4, `t = ${m.m10[1].t.toFixed(2)}`],
    ['M10 workload is clearly non-null', Math.abs(m.m10[2].t) > 4, `t = ${m.m10[2].t.toFixed(2)}`],
    ['M10 tenure is clearly non-null', Math.abs(m.m10[3].t) > 4, `t = ${m.m10[3].t.toFixed(2)}`],
    ['M9 engagement predicts performance', Math.abs(m.m9[1].t) > 6, `t = ${m.m9[1].t.toFixed(2)}`],
    ['M11 remote is a findable two-group difference', Math.abs(m.m11remote[1].t) > 2.5, `t = ${m.m11remote[1].t.toFixed(2)}`],
    ['M12 the interaction is the largest of the three', m.m12[3].est > m.m12[1].est && m.m12[3].est > m.m12[2].est, `${m.m12[3].est.toFixed(2)} vs ${m.m12[1].est.toFixed(2)} and ${m.m12[2].est.toFixed(2)}`],
    ['M12 the interaction is clearly non-null', Math.abs(m.m12[3].t) > 3, `t = ${m.m12[3].t.toFixed(2)}`],
    ['M3 Engineering’s mean wellbeing is mid-table', m.engMeanMidTable, `${m.by.Engineering.mean.toFixed(2)}, ${m.meanGap.toFixed(2)} below the top`],
    ['M3 Engineering’s median wellbeing is the highest', m.engTopMedian && m.medianMargin > 1, `margin ${m.medianMargin.toFixed(2)}`],
    ['M3 the mean and the median tell different stories', m.meanGap > 1.5, `mean gap ${m.meanGap.toFixed(2)}`],
    ['M14 leavers are between 15 % and 30 %', m.leftShare > 0.15 && m.leftShare < 0.3, `${(100 * m.leftShare).toFixed(1)} %`],
    ['wellbeing never hits the floor of the scale', m.floored === 0, `${m.floored} at 0`],
  ];
}

function report(m) {
  for (const [name, ok, detail] of criteria(m)) {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name} (${detail})`);
  }
  console.log('\n  wellbeing by department');
  for (const name of DEPARTMENTS) {
    const g = m.by[name];
    console.log(`    ${name.padEnd(12)} n ${String(g.n).padStart(3)}  mean ${g.mean.toFixed(2)}  median ${g.median.toFixed(2)}`);
  }
  return criteria(m).every(([, ok]) => ok);
}

if (process.argv.includes('--search')) {
  const grid = {
    engineeringAutonomy: [8.2, 8.5, 8.8],
    onCallShare: [0.14, 0.18, 0.22],
    onCallCost: [22, 26, 30],
    remoteEffect: [3.0, 4.0],
    residualSd: [4.5, 5.5],
    marketingAutonomy: [5.2, 5.6, 6.0],
    marketingWorkload: [5.6, 6.0, 6.4],
  };
  const keys = Object.keys(grid);
  const found = [];
  const walk = (i, acc) => {
    if (i === keys.length) {
      const m = measure(acc);
      if (criteria(m).every(([, ok]) => ok)) {
        found.push({ options: { ...acc }, margin: Math.min(m.medianMargin, m.meanGap), m });
      }
      return;
    }
    for (const value of grid[keys[i]]) walk(i + 1, { ...acc, [keys[i]]: value });
  };
  walk(0, {});
  found.sort((a, b) => b.margin - a.margin);
  console.log(`${found.length} combinations satisfy every criterion\n`);
  if (!found.length) {
    // Which criterion is doing the excluding? Without this the search just
    // says "no" and the next move is a guess.
    const fails = new Map();
    const all = [];
    const walkAll = (i, acc) => {
      if (i === keys.length) { all.push({ ...acc }); return; }
      for (const value of grid[keys[i]]) walkAll(i + 1, { ...acc, [keys[i]]: value });
    };
    walkAll(0, {});
    const near = [];
    for (const options of all) {
      const m = measure(options);
      const bad = criteria(m).filter(([, ok]) => !ok);
      for (const [name] of bad) fails.set(name, (fails.get(name) ?? 0) + 1);
      near.push({ options, bad: bad.map(([n, , d]) => `${n} (${d})`) });
    }
    console.log(`  out of ${all.length} combinations, each criterion failed this often:`);
    for (const [name, count] of [...fails].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(count).padStart(4)}  ${name}`);
    }
    near.sort((a, b) => a.bad.length - b.bad.length);
    console.log('\n  closest combinations:');
    for (const n of near.slice(0, 5)) {
      console.log(`    ${JSON.stringify(n.options)}\n      still failing: ${n.bad.join('; ')}`);
    }
  }
  for (const f of found.slice(0, 5)) {
    console.log(`  margin ${f.margin.toFixed(2)}  ${JSON.stringify(f.options)}`);
  }
  if (found.length) {
    console.log('\nBest:');
    report(found[0].m);
  }
} else {
  console.log(`Checking workplace.csv against ${JSON.stringify(WORKPLACE_DEFAULTS)}\n`);
  process.exitCode = report(measure({})) ? 0 : 1;
}
