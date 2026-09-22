// Generates the course datasets deterministically.
// Run once: `node scripts/generate-datasets.mjs`. Both CSVs are committed.
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

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

// Takes its rng rather than closing over one: there are two generators now, and
// each owns its own seeded stream so adding the second cannot shift the first.
function normal(rng, mu, sigma) {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Part 2's population: 5000 students, whose stress is skewed on purpose.
 * Committed and graded against by Module 6 — the sequence of rng() calls in
 * this loop must not change.
 */
function writeWellbeingPopulation() {
  const rng = makeRng(20260914);
  const N = 5000;
  const rows = ['id,programme,stress,sleep_hours,exam_score'];

  for (let i = 1; i <= N; i += 1) {
    const programme = rng() < 0.5 ? 'Psychology' : 'Business';
    // Stress is skewed: most students low, a long tail of very stressed ones.
    const stress = Math.min(40, -12 * Math.log(Math.max(rng(), Number.EPSILON)));
    const sleep = Math.min(11, Math.max(3, normal(rng, 7.2 - stress * 0.03, 1.1)));
    const exam = Math.min(100, Math.max(0, normal(rng, 62 + sleep * 2.4 - stress * 0.45, 11)));
    rows.push([i, programme, stress.toFixed(2), sleep.toFixed(2), exam.toFixed(1)].join(','));
  }

  return { rows, n: N };
}

const DEPARTMENTS = ['Sales', 'Engineering', 'Support', 'Marketing'];
const SITES = ['Enschede', 'Hengelo', 'Almelo', 'Zwolle', 'Deventer', 'Apeldoorn'];

// Departments differ in workload and autonomy. Engineering is the deliberate
// surprise (spec §7.2): the highest workload AND the highest autonomy, so its
// mean wellbeing lands mid-table while its median is the highest of the four.
// A table of means alone reports the wrong department as the healthiest, which
// is what Module 3 is for.
const DEPARTMENT_PROFILE = {
  Sales: { workload: 6.4, autonomy: 5.1, autonomySd: 1.4, n: 132 },
  Engineering: { workload: 7.3, autonomy: 8.8, autonomySd: 1.2, n: 128 },
  Support: { workload: 6.9, autonomy: 4.2, autonomySd: 1.4, n: 120 },
  Marketing: { workload: 6.4, autonomy: 5.2, autonomySd: 1.4, n: 100 },
};

// The values WORKPLACE_DEFAULTS overrides are repeated above so the table still
// reads as one profile per department; the defaults are what the file is built
// from. `node scripts/check-workplace-effects.mjs` verifies the pair agree with
// what the lessons claim.

/**
 * The half of the Module 3 surprise that autonomy and workload cannot produce
 * on their own. Wellbeing is otherwise a linear function with symmetric noise,
 * so every department's median tracks its mean and no table of means can
 * mislead anybody. This is the skew: roughly one engineer in six carries the
 * permanent on-call rotation, and their wellbeing sits far below everyone
 * else's. The rotation is not a column in the file — that is the point. The
 * mean reports a department dragged down by a tail it cannot see; the median
 * reports the typical engineer, who is the best-off employee in the company.
 *
 * Without it the surprise cannot exist: wellbeing is otherwise linear with
 * symmetric noise, so a department's median tracks its mean to within a
 * rounding error and no table of means can mislead anyone.
 */
/**
 * The effect sizes the Part 3 lessons teach against. Gathered here because
 * `scripts/check-workplace-effects.mjs` searches over them: every one of them
 * has to hold up in the sample, not just in the formula, and a value that only
 * works in expectation is a lesson whose output contradicts its own prose.
 */
export const WORKPLACE_DEFAULTS = {
  seed: 20260922,
  engineeringAutonomy: 8.8,
  engineeringAutonomySd: 1.2,
  onCallShare: 0.22,
  onCallCost: 30,
  remoteEffect: 3.0,
  residualSd: 4.5,
  marketingAutonomy: 5.2,
  marketingWorkload: 6.4,
};

/**
 * Parts 1 and 3's workplace study: 480 employees, one wide row each, designed
 * so every model in Part 3 has a real effect to find.
 *
 *   wellbeing   = 52 + 2.4·autonomy − 3.1·workload + 0.35·tenure
 *                 + 2.0·(remote = Yes) + site intercept (SD 2.6)
 *                 − on-call cost (Engineering only) + ε (SD 5.5)
 *   engagement  t2 − t1 = 1.4·training + 0.7·mentoring
 *                 + 2.3·(training × mentoring) + ε (SD 3.2)
 *   left_company: logit(p) = 1.9 − 0.06·wellbeing − 0.11·tenure
 */
export function writeWorkplace(options = {}) {
  const p = { ...WORKPLACE_DEFAULTS, ...options };
  const rng = makeRng(p.seed);
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  // Employees are nested in sites: each site has its own wellbeing intercept,
  // which is exactly the variance component Module 13 fits with (1 | site).
  const siteIntercept = Object.fromEntries(SITES.map((s) => [s, normal(rng, 0, 2.6)]));

  const OVERRIDES = {
    Engineering: { autonomy: p.engineeringAutonomy, autonomySd: p.engineeringAutonomySd },
    Marketing: { autonomy: p.marketingAutonomy, workload: p.marketingWorkload },
  };
  const profileFor = (department) => ({ ...DEPARTMENT_PROFILE[department], ...OVERRIDES[department] });

  const rows = [
    'employee_id,department,site,remote,tenure_years,workload,autonomy,training,mentoring,wellbeing,engagement_t1,engagement_t2,performance,left_company',
  ];

  let id = 0;
  for (const department of DEPARTMENTS) {
    const profile = profileFor(department);
    for (let k = 0; k < profile.n; k += 1) {
      id += 1;
      const site = SITES[Math.floor(rng() * SITES.length)];
      const remote = rng() < 0.38 ? 'Yes' : 'No';
      const tenure = clamp(-6 * Math.log(Math.max(rng(), Number.EPSILON)), 0.2, 32);
      const workload = clamp(normal(rng, profile.workload, 1.3), 1, 10);
      const autonomy = clamp(normal(rng, profile.autonomy, profile.autonomySd), 1, 10);
      const training = rng() < 0.5 ? 'Yes' : 'No';
      const mentoring = rng() < 0.5 ? 'Yes' : 'No';

      // Drawn for every employee so the rng sequence does not depend on the
      // department, then applied only in Engineering.
      const onCallDraw = rng();
      const onCallCost = rng();
      const onCall = department === 'Engineering' && onCallDraw < p.onCallShare;
      const burnout = onCall ? -Math.max(6, p.onCallCost * (0.6 + 0.8 * onCallCost)) : 0;

      const wellbeing = clamp(
        52 + 2.4 * autonomy - 3.1 * workload + 0.35 * tenure
          + (remote === 'Yes' ? p.remoteEffect : 0)
          + siteIntercept[site]
          + burnout
          + normal(rng, 0, p.residualSd),
        0, 100,
      );

      const engagementT1 = clamp(normal(rng, 46 + 0.22 * wellbeing, 6.5), 0, 100);
      // Crossed interventions that interact: neither main effect is impressive
      // on its own, and the pair is worth more than their sum.
      const lift =
        1.4 * (training === 'Yes' ? 1 : 0)
        + 0.7 * (mentoring === 'Yes' ? 1 : 0)
        + 2.3 * (training === 'Yes' && mentoring === 'Yes' ? 1 : 0);
      const engagementT2 = clamp(engagementT1 + lift + normal(rng, 0, 3.2), 0, 100);

      const performance = clamp(
        30 + 0.38 * engagementT2 + 1.6 * autonomy - 0.5 * workload + normal(rng, 0, 7),
        0, 100,
      );

      const logit = 1.9 - 0.06 * wellbeing - 0.11 * tenure;
      const left = rng() < 1 / (1 + Math.exp(-logit)) ? 1 : 0;

      rows.push([
        id, department, site, remote,
        tenure.toFixed(1), workload.toFixed(2), autonomy.toFixed(2),
        training, mentoring,
        wellbeing.toFixed(1), engagementT1.toFixed(1), engagementT2.toFixed(1),
        performance.toFixed(1), left,
      ].join(','));
    }
  }

  return { rows, n: id };
}

// Only when run directly: `check-workplace-effects.mjs` imports the generators.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });

  const population = writeWellbeingPopulation();
  await writeFile(
    new URL('../public/data/wellbeing-population.csv', import.meta.url),
    `${population.rows.join('\n')}\n`,
  );
  console.log(`Wrote ${population.n} rows.`);

  const workplace = writeWorkplace();
  await writeFile(
    new URL('../public/data/workplace.csv', import.meta.url),
    `${workplace.rows.join('\n')}\n`,
  );
  console.log(`Wrote ${workplace.n} employees.`);
}
