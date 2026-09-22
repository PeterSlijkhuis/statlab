# StatLab — Content Platform Implementation Plan

**Goal:** Build the four interfaces the remaining thirteen modules need and the shell plan did not provide: per-lesson package installation, the workplace dataset, a manifest covering all fourteen modules, and the validator rules that keep that much content honest.

**Overview:** `docs/plans/2026-09-22-statlab-remaining-work-overview.md`

**Spec:** `docs/specs/2026-09-14-statlab-r-statistics-webapp-design.md` §3.5, §7.2, §8

**Depends on:** the shell plan, merged.

## Why this plan exists

The shell plan's self-review says the remaining modules are "content work against a stable interface". That is true of Modules 1, 3, 4, 5, 7 and 8. It is not true of the rest, and the gap is worth stating plainly before anyone starts writing lessons:

- `COURSE_PACKAGES` is `['dplyr', 'ggplot2']`. Spec §3.5 names a core set of five (`dplyr`, `ggplot2`, `tidyr`, `readr`, `broom`) and four modelling packages installed on demand (`emmeans`, `car`, `lme4`, `lmerTest`). Module 2 needs `tidyr`, Module 9 onwards needs `broom`, and Modules 11–13 need three of the four modelling packages. None of them can be attached today.
- There is no on-demand install mechanism at all. `prepareSession` installs the core set once per webR instance and nothing else ever installs anything.
- `DATASET_FILES` is `['wellbeing-population.csv']`. Ten of the thirteen remaining modules read a dataset that does not exist.
- `MODULES` contains one module. The sidebar, the home page and "continue where you left off" all read it.

## Global Constraints

The shell plan's Global Constraints apply in full. In addition:

- **`public/data/wellbeing-population.csv` must not change.** Module 6's exercise checks compare against its actual values, and its generator consumes a specific sequence of random draws. Any refactor of `scripts/generate-datasets.mjs` must leave that file byte-identical, verified by regenerating and diffing.
- **Package installation is idempotent and memoised per webR instance.** A student navigating between two Module 11 lessons must not re-download `emmeans`.
- **An install failure is a lesson-level error, not a crash.** The lesson stays readable; only code blocks wait, and the status pill explains what failed.

## File Structure

```
src/
  r/session.ts             + PACKAGE SETS, ensurePackages()
  r/useLessonSession.ts    + installs the lesson's declared packages
  content/manifest.ts      + packages field; all fourteen modules
  content/exercises/
    index.ts               + aggregates every module's exercises
    module-01.ts … module-14.ts   (created by the module plans; stubs here)
  components/RStatus.tsx   + shows an on-demand install in progress
scripts/
  generate-datasets.mjs    + the workplace study
public/data/
  workplace.csv            generated, committed
```

---

### Task P1: Per-lesson packages

**Files:**
- Modify: `src/r/session.ts`, `src/r/useLessonSession.ts`, `src/content/manifest.ts`, `src/components/RStatus.tsx`
- Test: `src/r/session.test.ts` (new unit file), `src/r/session.itest.ts` (extend)

**Interfaces:**
- Consumes: `setStatus` (`src/r/webrClient.ts`), `prepareSession`
- Produces: `CORE_PACKAGES`, `ensurePackages(webR, names)`, `LessonMeta.packages?: string[]`

- [ ] **Step 1: Write the failing unit test**

Create `src/r/session.test.ts`. This file must not boot webR — it drives a fake.

```ts
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ensurePackages, resetPackageCache } from './session';

function fakeWebR(installed: string[] = []) {
  const present = new Set(installed);
  return {
    installPackages: vi.fn(async (names: string[]) => names.forEach((n) => present.add(n))),
    evalRBoolean: vi.fn(async (code: string) => present.has(code.match(/"(\w+)"/)![1])),
  };
}

describe('ensurePackages', () => {
  beforeEach(() => resetPackageCache());

  test('installs only what is missing', async () => {
    const webR = fakeWebR(['dplyr']);
    await ensurePackages(webR as never, ['dplyr', 'broom']);
    expect(webR.installPackages).toHaveBeenCalledWith(['broom']);
  });

  test('installs nothing when everything is present', async () => {
    const webR = fakeWebR(['dplyr', 'broom']);
    await ensurePackages(webR as never, ['dplyr', 'broom']);
    expect(webR.installPackages).not.toHaveBeenCalled();
  });

  test('a second call for the same package does not reinstall', async () => {
    const webR = fakeWebR();
    await ensurePackages(webR as never, ['emmeans']);
    await ensurePackages(webR as never, ['emmeans']);
    expect(webR.installPackages).toHaveBeenCalledTimes(1);
  });

  test('concurrent calls for the same package install it once', async () => {
    // Two code blocks in one lesson can call Run before either install settles.
    const webR = fakeWebR();
    await Promise.all([
      ensurePackages(webR as never, ['car']),
      ensurePackages(webR as never, ['car']),
    ]);
    expect(webR.installPackages).toHaveBeenCalledTimes(1);
  });

  test('reports the package that could not be installed', async () => {
    const webR = {
      installPackages: vi.fn(async () => {}),   // webR only warns on a failed download
      evalRBoolean: vi.fn(async () => false),
    };
    await expect(ensurePackages(webR as never, ['lmerTest'])).rejects.toThrow(/lmerTest/);
  });

  test('a failed install is not cached', async () => {
    // Campus wifi drops; the student presses Run again and it must retry.
    const present = new Set<string>();
    const webR = {
      installPackages: vi.fn(async (names: string[]) => {
        if (webR.installPackages.mock.calls.length > 1) names.forEach((n) => present.add(n));
      }),
      evalRBoolean: vi.fn(async (code: string) => present.has(code.match(/"(\w+)"/)![1])),
    };
    await expect(ensurePackages(webR as never, ['car'])).rejects.toThrow();
    await expect(ensurePackages(webR as never, ['car'])).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/r/session.test.ts`
Expected: FAIL — `ensurePackages` is not exported.

- [ ] **Step 3: Implement `ensurePackages` in `src/r/session.ts`**

Replace `COURSE_PACKAGES` with the spec's core set and add the on-demand path. Keep `installCoursePackages` as the boot-time caller so `prepareSession` is unchanged.

```ts
/** Spec §3.5: installed at boot, about 40 MB with dependencies. */
export const CORE_PACKAGES = ['dplyr', 'ggplot2', 'tidyr', 'readr', 'broom'] as const;

/**
 * Spec §3.5: about 49 MB beyond the core, so these install only when a lesson
 * that declares them opens. Listed for the validator, which rejects a lesson
 * declaring a package the course does not know about — a typo in a manifest
 * entry would otherwise surface as a silent install failure mid-lesson.
 */
export const ON_DEMAND_PACKAGES = ['emmeans', 'car', 'lme4', 'lmerTest'] as const;

export const KNOWN_PACKAGES = [...CORE_PACKAGES, ...ON_DEMAND_PACKAGES] as const;

/** name → the in-flight or settled install. Resolved entries are never reinstalled. */
let packagePromises = new Map<string, Promise<void>>();

/** Test-only: forget what has been installed. */
export function resetPackageCache(): void {
  packagePromises = new Map();
}

async function isInstalled(webR: WebR, name: string): Promise<boolean> {
  return webR.evalRBoolean(`nzchar(system.file(package = "${name}"))`);
}

/**
 * Installs whichever of `names` is not present, at most once per webR instance.
 * `installPackages` only warns when a download fails (verified against webR
 * 0.6.0), so success is confirmed by looking for the installed package rather
 * than by the call returning.
 */
export async function ensurePackages(webR: WebR, names: readonly string[]): Promise<void> {
  const pending: string[] = [];
  const waits: Promise<void>[] = [];

  for (const name of names) {
    const existing = packagePromises.get(name);
    if (existing) {
      waits.push(existing);
    } else {
      pending.push(name);
    }
  }

  if (pending.length) {
    const install = (async () => {
      const missing: string[] = [];
      for (const name of pending) {
        if (!(await isInstalled(webR, name))) missing.push(name);
      }
      if (!missing.length) return;

      setStatus({ phase: 'installing', detail: `Installing ${missing.join(', ')}` });
      await webR.installPackages(missing);

      const failed: string[] = [];
      for (const name of missing) {
        if (!(await isInstalled(webR, name))) failed.push(name);
      }
      if (failed.length) {
        throw new Error(`Could not install ${failed.join(', ')}. Check your connection and try again.`);
      }
      setStatus({ phase: 'ready' });
    })();

    // A failure must not be cached: the student presses Run again after the
    // network comes back, and a rejected promise left in the map would make
    // every later attempt fail instantly with the original error.
    const tracked = install.catch((err) => {
      for (const name of pending) packagePromises.delete(name);
      throw err;
    });
    for (const name of pending) packagePromises.set(name, tracked);
    waits.push(tracked);
  }

  await Promise.all(waits);
}
```

Change `installCoursePackages` to install `CORE_PACKAGES` through `ensurePackages`, so the boot path and the on-demand path share one definition of "installed":

```ts
export async function installCoursePackages(webR: WebR): Promise<void> {
  await ensurePackages(webR, CORE_PACKAGES);
}
```

> **`src/r/session.itest.ts` imports `COURSE_PACKAGES`** (line 5, used at line 54). Either keep `COURSE_PACKAGES` exported as an alias of `CORE_PACKAGES` or update that import; do not leave a dangling name.

- [ ] **Step 4: Add `packages` to the manifest type**

In `src/content/manifest.ts`:

```ts
export type LessonMeta = {
  id: string;
  title: string;
  file: string;
  exercises: string[];
  /**
   * Packages this lesson's code attaches beyond the core set. Installed when
   * the lesson opens, before its first code block can run. Every name must be
   * in KNOWN_PACKAGES; the content test enforces it.
   */
  packages?: string[];
};
```

- [ ] **Step 5: Install a lesson's packages in `useLessonSession`**

`useLessonSession` currently takes a lesson id. It needs the package list too. Change the signature to take the lesson's metadata, and install between `prepareSession` and `createLessonEnv`:

```ts
export function useLessonSession(lesson: { id: string; packages?: string[] } | null) {
  ...
      const instance = await getWebR();
      await prepareSession(instance, fetchDataset);
      if (lesson.packages?.length) {
        await ensurePackages(instance, lesson.packages);
      }
      const lessonEnv = await createLessonEnv(instance);
  ...
  }, [lesson?.id]);
```

The effect still keys on the lesson id alone — a manifest entry's `packages`
array is a new array literal on every render, so keying on it would recreate the
lesson environment on every render and discard the student's objects.

Two callers change. `src/pages/Lesson.tsx` passes `meta` in place of `meta.id`.
`src/pages/Playground.tsx` passes the string `'playground'` today; give it
`{ id: 'playground' }` and no packages — the playground gets the core set from
`prepareSession` and nothing more, which is correct: a student experimenting
there has not opened a lesson that justifies a 20 MB install.

- [ ] **Step 6: Show an on-demand install in `RStatus`**

`RStatus` renders the busy pill for any phase that is not `idle`, `ready` or
`error`, so a transition back into `installing` after `ready` already re-shows
it. Lock that in against a future refactor rather than assuming it, and make
the detail text visible — an on-demand install of `emmeans` must not read
"Installing packages…" when the student is waiting on a 20 MB download.
Add to `src/components/RStatus.test.tsx`:

```ts
test('an install that starts after R is ready is shown again', () => {
  setStatus({ phase: 'ready' });
  render(<RStatus />);
  act(() => setStatus({ phase: 'installing', detail: 'Installing emmeans' }));
  expect(screen.getByText(/Installing emmeans/)).toBeDefined();
});
```

- [ ] **Step 7: Run the unit tests**

Run: `npx vitest run src/r/session.test.ts src/components/RStatus.test.tsx`
Expected: PASS.

- [ ] **Step 8: Verify the modelling packages actually install under webR 0.6.0**

This is the step that de-risks Module 13. Add to `src/r/session.itest.ts`:

```ts
test('the modelling packages install and attach', async () => {
  const webR = new WebR();
  await webR.init();
  try {
    await ensurePackages(webR, ['broom', 'emmeans', 'car', 'lmerTest']);
    const result = await evaluateR(
      webR,
      'library(lmerTest); library(emmeans); library(car); library(broom); "ok"',
    );
    expect(result.errored).toBe(false);
  } finally {
    await webR.close();
  }
}, 900_000);
```

Run: `npx vitest run src/r/session.itest.ts`
Expected: PASS. If `lme4`/`lmerTest` are not available from the webR binary
repository, **stop and record it** — open question 3 in the overview says what
Module 13 becomes instead. Do not proceed to write Module 13 content on the
assumption that it works.

- [ ] **Step 9: Commit**

```bash
git add src/r/session.ts src/r/session.test.ts src/r/session.itest.ts src/r/useLessonSession.ts src/content/manifest.ts src/pages/Lesson.tsx src/components/RStatus.tsx src/components/RStatus.test.tsx
git commit -m "feat: per-lesson package installation with the spec's core set"
```

---

### Task P2: The workplace dataset

**Files:**
- Modify: `scripts/generate-datasets.mjs`, `src/r/session.ts` (`DATASET_FILES`)
- Create: `public/data/workplace.csv` (generated, committed)
- Test: `src/r/session.itest.ts` (extend)

**Interfaces:**
- Consumes: nothing
- Produces: `data/workplace.csv` readable from R as `read.csv("data/workplace.csv", stringsAsFactors = TRUE)`

**Spec:** §7.2 — "fictional employees in several departments and sites, designed so every model in Part 3 has a genuine effect to find".

> **Do not touch the existing generator's random draws.** `wellbeing-population.csv` is committed and Module 6 grades against its values. Append the workplace generation as a second block with its own seeded rng, after the existing one. Step 5 verifies the old file is unchanged.

**Codebook** — every column exists to serve a named lesson.

| Column | Type | Serves |
|---|---|---|
| `employee_id` | integer | — |
| `department` | factor, 4 levels: Sales, Engineering, Support, Marketing | M11 dummy coding, M11 `emmeans` |
| `site` | factor, 6 levels | M13 nesting, random intercepts |
| `remote` | factor, 2 levels: No, Yes | M11 two groups = the *t*-test |
| `tenure_years` | numeric | M9 simple regression, M10 second predictor |
| `workload` | numeric 1–10 | M10 multiple regression (negative effect) |
| `autonomy` | numeric 1–10 | M9/M10 (positive effect) |
| `training` | factor, 2 levels: No, Yes | M12 factor A |
| `mentoring` | factor, 2 levels: No, Yes | M12 factor B; interacts with `training` |
| `wellbeing` | numeric | the Part 3 continuous outcome |
| `engagement_t1` | numeric | M2 `pivot_longer`, M13 repeated measures |
| `engagement_t2` | numeric | as above; the training × mentoring effect lands here |
| `performance` | numeric | M3/M4 descriptives and figures; M10 |
| `left_company` | integer 0/1 | M14 logistic regression |

**Built-in effects** (documented in the script, and the reason each module has
something to find):

- `wellbeing = 52 + 2.4·autonomy − 3.1·workload + 0.35·tenure_years + 2.0·(remote = Yes) + site intercept (SD 2.6) + ε (SD 5.5)`
- `engagement_t2 − engagement_t1 = 1.4·training + 0.7·mentoring + 2.3·(training × mentoring) + ε` — a genuine crossed interaction, and the main effects are small enough that reading them without the interaction is a mistake the lesson can point at.
- `left_company`: `logit(p) = 1.9 − 0.06·wellbeing − 0.11·tenure_years`, giving roughly 20 % leavers.
- **A deliberate surprise for Module 3:** Engineering has both the highest `workload` and the highest `autonomy`, so its mean `wellbeing` sits mid-table while its median is the highest of the four departments. A summary of means alone tells the wrong story, which is what §7.1's "always look at the descriptives" is for.

- [ ] **Step 1: Refactor `scripts/generate-datasets.mjs` into two generators**

Wrap the existing code in `function writeWellbeingPopulation()` with its own
`const rng = makeRng(20260914)` and its own `normal(rng, mu, sigma)` — the
existing `normal` closes over the module-level `rng`, so it must take the rng as
its first argument once there are two. The sequence of `rng()` calls inside the
loop must stay exactly as it is.

- [ ] **Step 2: Add the workplace generator**

```js
const DEPARTMENTS = ['Sales', 'Engineering', 'Support', 'Marketing'];
const SITES = ['Enschede', 'Hengelo', 'Almelo', 'Zwolle', 'Deventer', 'Apeldoorn'];

// Departments differ in workload and autonomy. Engineering is the deliberate
// surprise (see the plan's codebook): highest workload AND highest autonomy, so
// its mean wellbeing lands mid-table while its median is the highest. A table of
// means alone reports the wrong department as the healthiest.
const DEPARTMENT_PROFILE = {
  Sales:       { workload: 6.4, autonomy: 5.1, n: 132 },
  Engineering: { workload: 7.3, autonomy: 7.4, n: 128 },
  Support:     { workload: 6.9, autonomy: 4.2, n: 120 },
  Marketing:   { workload: 5.6, autonomy: 6.0, n: 100 },
};

function writeWorkplace() {
  const rng = makeRng(20260922);
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  // Employees are nested in sites: each site has its own wellbeing intercept,
  // which is exactly the variance component Module 13 fits with (1 | site).
  const siteIntercept = Object.fromEntries(SITES.map((s) => [s, normal(rng, 0, 2.6)]));

  const rows = [
    'employee_id,department,site,remote,tenure_years,workload,autonomy,training,mentoring,wellbeing,engagement_t1,engagement_t2,performance,left_company',
  ];

  let id = 0;
  for (const department of DEPARTMENTS) {
    const profile = DEPARTMENT_PROFILE[department];
    for (let k = 0; k < profile.n; k += 1) {
      id += 1;
      const site = SITES[Math.floor(rng() * SITES.length)];
      const remote = rng() < 0.38 ? 'Yes' : 'No';
      const tenure = clamp(-6 * Math.log(Math.max(rng(), Number.EPSILON)), 0.2, 32);
      const workload = clamp(normal(rng, profile.workload, 1.3), 1, 10);
      const autonomy = clamp(normal(rng, profile.autonomy, 1.4), 1, 10);
      const training = rng() < 0.5 ? 'Yes' : 'No';
      const mentoring = rng() < 0.5 ? 'Yes' : 'No';

      const wellbeing = clamp(
        52 + 2.4 * autonomy - 3.1 * workload + 0.35 * tenure
          + (remote === 'Yes' ? 2.0 : 0)
          + siteIntercept[site]
          + normal(rng, 0, 5.5),
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
```

Write it to `public/data/workplace.csv` exactly as the existing file is written,
and log the row count.

- [ ] **Step 3: Generate the dataset**

Run: `node scripts/generate-datasets.mjs`
Expected: `Wrote 5000 rows.` and `Wrote 480 employees.`

- [ ] **Step 4: Check the built-in effects actually landed**

A seeded generator can produce a sample where a designed effect is not
recoverable. Verify before committing, in R (the playground, or `Rscript` if you
have R locally):

```r
d <- read.csv("public/data/workplace.csv", stringsAsFactors = TRUE)

# M9/M10: autonomy up, workload down, both clearly non-null
summary(lm(wellbeing ~ autonomy + workload + tenure_years, data = d))

# M11: four departments, with Engineering mid-table on the mean
aggregate(wellbeing ~ department, d, function(x) c(mean = mean(x), median = median(x)))

# M12: the interaction term must be the largest of the three
summary(lm(I(engagement_t2 - engagement_t1) ~ training * mentoring, data = d))

# M14: enough leavers to fit, not so many that it is trivial
table(d$left_company)
```

Expected: the three predictors in the first model have |t| > 4; Engineering's
mean wellbeing is neither highest nor lowest while its median is highest; the
`trainingYes:mentoringYes` coefficient is near 2.3 and the largest of the three;
`left_company` is between 15 % and 30 % ones. **If any of these fails, change the
seed, not the effect sizes**, and re-run — the effect sizes are what the lessons
teach against.

- [ ] **Step 5: Verify the existing dataset is unchanged**

Run: `git status --short public/data/`
Expected: `?? public/data/workplace.csv` only. If `wellbeing-population.csv`
appears as modified, the refactor changed the draw sequence — revert and redo
step 1 without touching the loop.

- [ ] **Step 6: Add the dataset to the mount list**

In `src/r/session.ts`:

```ts
export const DATASET_FILES = ['wellbeing-population.csv', 'workplace.csv'] as const;
```

- [ ] **Step 7: Add an integration test**

Append to `src/r/session.itest.ts`:

```ts
test('the workplace dataset mounts with its factors intact', async () => {
  const webR = new WebR();
  await webR.init();
  try {
    const { readFile } = await import('node:fs/promises');
    await mountDatasets(webR, async (name) =>
      new Uint8Array(await readFile(new URL(`../../public/data/${name}`, import.meta.url))),
    );
    const result = await evaluateR(
      webR,
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n' +
        'c(nrow(d), nlevels(d$department), nlevels(d$site), nlevels(d$remote))',
    );
    expect(result.errored).toBe(false);
    expect(text(result)).toContain('480');
    expect(text(result)).toContain('6');
  } finally {
    await webR.close();
  }
}, 300_000);
```

- [ ] **Step 8: Run it**

Run: `npx vitest run src/r/session.itest.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add scripts/generate-datasets.mjs public/data/workplace.csv src/r/session.ts src/r/session.itest.ts
git commit -m "feat: the workplace study dataset for Parts 1 and 3"
```

---

### Task P3: The fourteen-module manifest

**Files:**
- Modify: `src/content/manifest.ts`, `src/content/exercises/index.ts`
- Create: `src/content/exercises/module-01.ts` … `module-14.ts` (empty arrays)
- Test: `src/content/content.test.ts` (extend)

**Interfaces:**
- Consumes: `LessonMeta.packages` (P1), `DATASET_FILES` (P2)
- Produces: `MODULES` with all fourteen entries; `ALL_EXERCISES` aggregating every module

> **Order matters.** The manifest must land *before* the module plans, because
> each module task then fills in its own already-declared entry rather than
> editing a shared list in fourteen conflicting ways. But a manifest entry whose
> lesson file does not exist fails `content.test.ts`. The resolution: this task
> declares the modules in a **draft list that the sidebar does not yet read**,
> and each module task moves its own entry into `MODULES`. See step 3.

- [ ] **Step 1: Write the module and lesson table**

The full curriculum, ids frozen. Each module plan fills in one block.

| Module | Lesson id | Title | File | Exercises | Packages |
|---|---|---|---|---|---|
| 1 First steps in R | 01-1 | Objects and scripts | `01-1-objects-and-scripts` | m1-1-a, m1-1-b | — |
| | 01-2 | Functions and getting help | `01-2-functions-and-help` | m1-2-a, m1-2-b | — |
| | 01-3 | Packages and `library()` | `01-3-packages-and-libraries` | m1-3-a | dplyr |
| 2 Working with data | 02-1 | Reading data, and what a factor is | `02-1-reading-data` | m2-1-a, m2-1-b | — |
| | 02-2 | The pipe, and four verbs | `02-2-pipe-and-verbs` | m2-2-a, m2-2-b | dplyr |
| | 02-3 | Wide and long | `02-3-wide-and-long` | m2-3-a | dplyr, tidyr |
| 3 Describing data | 03-1 | Summarising a column | `03-1-summaries` | m3-1-a, m3-1-b | dplyr |
| | 03-2 | Summaries by group | `03-2-group-by` | m3-2-a, m3-2-b | dplyr |
| | 03-3 | When the mean misleads | `03-3-mean-vs-median` | m3-3-a | dplyr |
| 4 Visualising data | 04-1 | ggplot2 as layers | `04-1-ggplot-layers` | m4-1-a | ggplot2 |
| | 04-2 | Comparing groups | `04-2-boxplots-and-facets` | m4-2-a, m4-2-b | dplyr, ggplot2 |
| | 04-3 | An APA-ready figure | `04-3-scatter-and-apa` | m4-3-a | ggplot2 |
| 5 The normal distribution | 05-1 | Density and area | `05-1-density-and-area` | m5-1-a | — |
| | 05-2 | z-scores | `05-2-z-scores` | m5-2-a, m5-2-b | — |
| | 05-3 | Probabilities both ways | `05-3-probabilities` | m5-3-a, m5-3-b | — |
| 6 Sampling | *built* | | | | |
| 7 Estimation | 07-1 | From standard error to interval | `07-1-standard-error-to-interval` | m7-1-a, m7-1-b | — |
| | 07-2 | What 95 % actually means | `07-2-what-95-percent-means` | m7-2-a | — |
| | 07-3 | SD, SE and CI error bars | `07-3-error-bars` | m7-3-a | dplyr, ggplot2 |
| 8 Hypothesis testing | 08-1 | The null distribution | `08-1-null-distribution` | m8-1-a | — |
| | 08-2 | p-values and α | `08-2-p-values-and-alpha` | m8-2-a, m8-2-b | — |
| | 08-3 | Two errors, and power | `08-3-errors-and-power` | m8-3-a | — |
| 9 Correlation and simple regression | 09-1 | Seeing association | `09-1-seeing-association` | m9-1-a | dplyr, ggplot2 |
| | 09-2 | Fitting a line | `09-2-fitting-a-line` | m9-2-a, m9-2-b | broom |
| | 09-3 | Reading the model | `09-3-reading-model-output` | m9-3-a, m9-3-b | broom |
| 10 Multiple regression | 10-1 | A second predictor | `10-1-two-predictors` | m10-1-a | broom |
| | 10-2 | Holding the others constant | `10-2-holding-constant` | m10-2-a, m10-2-b | broom, dplyr |
| | 10-3 | Model fit, and the APA report | `10-3-model-fit-and-reporting` | m10-3-a | broom |
| 11 Categorical predictors | 11-1 | Two groups | `11-1-two-groups` | m11-1-a, m11-1-b | broom, dplyr |
| | 11-2 | Three or more, and dummy coding | `11-2-dummy-coding` | m11-2-a, m11-2-b | broom, dplyr |
| | 11-3 | Which groups differ | `11-3-pairwise-comparisons` | m11-3-a | broom, emmeans |
| 12 Interactions | 12-1 | What an interaction is | `12-1-what-an-interaction-is` | m12-1-a | broom, dplyr |
| | 12-2 | Factorial designs | `12-2-factorial-and-type-iii` | m12-2-a, m12-2-b | broom, car |
| | 12-3 | Plotting and reporting it | `12-3-interaction-plots` | m12-3-a | dplyr, ggplot2 |
| 13 Repeated measures | 13-1 | When independence breaks | `13-1-why-independence-breaks` | m13-1-a | dplyr, tidyr |
| | 13-2 | Random intercepts | `13-2-random-intercepts` | m13-2-a, m13-2-b | lmerTest, broom |
| | 13-3 | Nesting, and the paired *t*-test | `13-3-nesting-and-paired-t` | m13-3-a | lmerTest, tidyr |
| 14 Binary outcomes | 14-1 | Why not a linear model | `14-1-why-not-a-linear-model` | m14-1-a | ggplot2 |
| | 14-2 | `glm` and log odds | `14-2-glm-and-log-odds` | m14-2-a, m14-2-b | broom |
| | 14-3 | Odds ratios, and reporting | `14-3-odds-ratios-and-reporting` | m14-3-a | broom |

Module titles, in order: First steps in R; Working with data; Describing data;
Visualising data; The normal distribution; Sampling; Estimation; Hypothesis
testing; Correlation and simple regression; Multiple regression; Categorical
predictors; Interactions and factorial designs; Repeated measures and nested
data; Binary outcomes.

- [ ] **Step 2: Create empty exercise files**

For each of `module-01` … `module-14` except `module-06`:

```ts
import type { ExerciseDef } from '../../r/checker';

/** Filled in by the Module N task. */
export const moduleNN: ExerciseDef[] = [];
```

Aggregate them in `src/content/exercises/index.ts`:

```ts
export const ALL_EXERCISES: ExerciseDef[] = [
  ...module01, ...module02, ...module03, ...module04, ...module05,
  ...module06, ...module07, ...module08, ...module09, ...module10,
  ...module11, ...module12, ...module13, ...module14,
];
```

- [ ] **Step 3: Add the manifest entries behind a completeness gate**

Put the full fourteen-module list in `manifest.ts` as `PLANNED_MODULES`, and
derive `MODULES` from it by keeping only modules whose lesson files exist:

```ts
const lessonFiles = new Set(
  Object.keys(import.meta.glob('./lessons/*.mdx')).map(
    (path) => path.replace('./lessons/', '').replace('.mdx', ''),
  ),
);

/** The curriculum as planned; see the content-platform plan, task P3. */
export const PLANNED_MODULES: ModuleMeta[] = [ /* all fourteen */ ];

/** The modules a student can actually open. A planned module appears here as
 *  soon as every one of its lesson files is written. */
export const MODULES: ModuleMeta[] = PLANNED_MODULES.filter((module) =>
  module.lessons.every((lesson) => lessonFiles.has(lesson.file)),
);
```

This is what lets fourteen module tasks run without editing a shared list: each
writes its lesson files and its module becomes live. It also means a
half-finished module never appears in the sidebar as a dead link.

> `import.meta.glob` is resolved by Vite at build time and returns `{}` under
> plain Node, so `MODULES` would be empty in a Node-only context. Everything that
> reads it runs under Vite or Vitest, both of which resolve the glob;
> `content.test.ts` already relies on this. Do not read `MODULES` from
> `scripts/`.

- [ ] **Step 4: Add the validator rules this task makes possible**

In `src/content/content.test.ts`:

```ts
test('every planned lesson has a unique id and file', () => {
  const ids = PLANNED_MODULES.flatMap((m) => m.lessons.map((l) => l.id));
  const files = PLANNED_MODULES.flatMap((m) => m.lessons.map((l) => l.file));
  expect(new Set(ids).size).toBe(ids.length);
  expect(new Set(files).size).toBe(files.length);
});

test('every planned exercise id is unique across the course', () => {
  const ids = PLANNED_MODULES.flatMap((m) => m.lessons.flatMap((l) => l.exercises));
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  expect(duplicates).toEqual([]);
});

test('every declared package is one the course knows how to install', async () => {
  const { KNOWN_PACKAGES } = await import('../r/session');
  for (const module of PLANNED_MODULES) {
    for (const lesson of module.lessons) {
      for (const name of lesson.packages ?? []) {
        expect(KNOWN_PACKAGES as readonly string[], `${lesson.id} declares ${name}`).toContain(name);
      }
    }
  }
});

test('a live lesson attaches no package it did not declare', () => {
  // library(emmeans) in a lesson that does not declare it works only if some
  // other lesson happened to install it first. It then fails for the student
  // who opens this lesson first.
  for (const module of MODULES) {
    for (const lesson of module.lessons) {
      const source = sources[`./lessons/${lesson.file}.mdx`] ?? '';
      const declared = new Set([...(lesson.packages ?? []), ...CORE_PACKAGES]);
      for (const match of source.matchAll(/library\((\w+)\)/g)) {
        expect([...declared], `${lesson.id} attaches ${match[1]}`).toContain(match[1]);
      }
    }
  }
});
```

- [ ] **Step 5: Run the content tests**

Run: `npx vitest run src/content/content.test.ts`
Expected: PASS, with `MODULES` containing only Module 6.

- [ ] **Step 6: Verify the home page and sidebar still render**

Run: `npm run dev` and open `http://localhost:5173/statlab/`.
Expected: Module 6 is listed and reachable. No empty module headings.

- [ ] **Step 7: Commit**

```bash
git add src/content/manifest.ts src/content/exercises/ src/content/content.test.ts
git commit -m "feat: declare the full fourteen-module curriculum"
```

---

### Task P4: Validator rules for content at scale

**Files:**
- Modify: `src/content/content.test.ts`, `src/content/exercises/validate.itest.ts`, `package.json`
- Test: the files themselves

**Interfaces:**
- Consumes: `PLANNED_MODULES`, `ALL_EXERCISES`
- Produces: rules that catch the mistakes thirty-nine lessons make and three did not

**Why:** the existing validator was written for three lessons. Three mistakes
become likely only at scale, and each of them ships silently.

- [ ] **Step 1: Every exercise in the registry is reachable**

```ts
test('every defined exercise is referenced by some lesson', () => {
  const referenced = new Set(
    PLANNED_MODULES.flatMap((m) => m.lessons.flatMap((l) => l.exercises)),
  );
  for (const exercise of ALL_EXERCISES) {
    expect(referenced, `${exercise.id} is defined but no lesson uses it`).toContain(exercise.id);
  }
});
```

An orphaned exercise is never seen by a student, is never opened in review, and
still passes the validator today.

- [ ] **Step 2: Every inferential lesson ends with an `<Interpret>`**

Spec §4.1 says `<Interpret>` "closes every inferential lesson". Encode it:

```ts
// Modules 5 and 7-14 are the inferential ones; Modules 1-4 teach tools, not inference.
const INFERENTIAL = /^(0[578]|1[0-4]|09)-/;

test('every inferential lesson closes with an Interpret block', () => {
  for (const module of MODULES) {
    for (const lesson of module.lessons) {
      if (!INFERENTIAL.test(lesson.id)) continue;
      const source = sources[`./lessons/${lesson.file}.mdx`] ?? '';
      expect(source, `${lesson.id} has no <Interpret>`).toMatch(/<Interpret\b/);
    }
  }
});
```

- [ ] **Step 3: Every exercise carries negative and alternate fixtures**

```ts
test('every exercise has at least one wrong answer and one alternate solution', () => {
  for (const exercise of ALL_EXERCISES) {
    expect(exercise.wrongAnswers.length, `${exercise.id} has no wrong answers`).toBeGreaterThan(0);
    expect(
      exercise.alternateSolutions?.length ?? 0,
      `${exercise.id} has no alternate solution`,
    ).toBeGreaterThan(0);
  }
});
```

Two of Module 6's three exercises carry `alternateSolutions`; the third does
not. Add one to it rather than scoping the test around it — a `dplyr` route
exists for all three, and the validator already requires every alternate to
pass.

- [ ] **Step 4: Checks read the student's objects only through `answer()`**

```ts
test('checks do not read objects from the lesson environment', () => {
  for (const exercise of ALL_EXERCISES) {
    expect(exercise.check, `${exercise.id} uses exists() instead of has_answer()`)
      .not.toMatch(/\bexists\s*\(/);
  }
});
```

This is the defect class that once passed an empty submission, fixed in commit
`9ef8548`. The lesson-environment suite in `validate.itest.ts` catches it
dynamically; this catches it in a second, so an author writing thirty-nine
lessons' worth of checks gets the feedback immediately rather than after a
long R run. Module 6's three checks already comply, so this test passes the
moment it is written — which is the point: it is a ratchet, not a migration.

- [ ] **Step 5: Bound the validator's runtime**

With thirty-nine lessons the R validation suite runs every lesson's code blocks
and every exercise's fixtures. Measure it:

Run: `time npm run validate`
Expected: it completes. Record the wall time in the commit message.

If it exceeds about 20 minutes, split `validate` into `validate:static` (fast,
runs on every push) and `validate:r` (the R suite), and have the workflow run
both but in separate jobs so a static failure reports in under a minute. Update
`.github/workflows/deploy.yml` accordingly, keeping `npm run validate` as the
alias that runs both.

- [ ] **Step 6: Run the whole suite**

Run: `npx tsc --noEmit && npx vitest run && npm run validate`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/content/content.test.ts src/content/exercises/ package.json .github/workflows/deploy.yml
git commit -m "test: validator rules for content at fourteen-module scale"
```

---

## Self-Review

| Spec section | Covered by |
|---|---|
| §3.5 Core package set, on-demand modelling packages | P1 |
| §3.5 Datasets mounted at boot | P2 |
| §7 Curriculum structure (fourteen modules) | P3 |
| §7.2 Workplace dataset, documented effect sizes | P2 |
| §8.1 Content validation | P4 |
| §8.2 Static content checks | P3 step 4, P4 |

**Deliberate deviations**

1. **`MODULES` is derived rather than hand-edited** (P3 step 3). The spec says
   nothing about this; it exists so fourteen independent module tasks do not
   collide in one list, and so a half-written module cannot reach a student.
2. **`readr` is installed but not taught.** Spec §3.5 names it in the core set;
   the curriculum uses `read.csv` (spec §7, Module 2). It is installed because
   the spec says the core set is those five, and because `broom`'s dependency
   tree pulls it in regardless.
