# StatLab — The Five Remaining Simulations Implementation Plan

**Goal:** Build the five simulations spec §6 names besides `clt`: `distribution`, `ci`, `pvalue`, `correlation` and `leastsquares`, each targeting the specific misconception its spec row names.

**Overview:** `docs/plans/2026-09-22-statlab-remaining-work-overview.md`

**Spec:** `docs/specs/2026-09-14-statlab-r-statistics-webapp-design.md` §6

**Depends on:** the shell plan, merged to `main` as PR #1 on 2026-09-22. Independent of the content platform — nothing here reads a dataset or a package.

**Consumed by:** Module 5 (`distribution`), Module 7 (`ci`), Module 8 (`pvalue`), Module 9 (`correlation`, `leastsquares`). Building these first means those module tasks never block.

## Global Constraints

The shell plan's Global Constraints apply. In addition, these come from `clt`,
which is the reference implementation and was fixed three times in review:

- **No R round trip.** A simulation animates in the browser from `src/sims/rng.ts`.
  Nothing in `src/sims/` may import from `src/r/`.
- **Seeded and reproducible.** Randomness comes from `makeRng(seed)`. A "Draw
  again" control bumps the seed in state; nothing calls `Math.random()`.
- **No props.** The registry is `Record<string, ComponentType>` and
  `<Simulation name="…" />` passes nothing, so every simulation owns its
  defaults. A simulation that needs configuring needs two registry entries, not
  a prop.
- **Every readout agrees with the picture it sits under, in every committed
  frame.** `clt` had a defect where the σ/√n readout and the histogram caption
  showed different `n` for one commit, because one read the live state and the
  other a `useDeferredValue`. Derive every number shown from the *same* deferred
  value the drawing uses. Each task's test asserts this with a `Profiler`, as
  `src/sims/CLT.test.tsx` does.
- **Accessible.** Every `<svg>` gets `role="img"` and an `aria-label` that says
  in words what the picture shows, including the numbers a sighted student reads
  off it. Every control is a real `<input>`, `<select>` or `<button>` with a
  label, reachable and operable from the keyboard. A simulation whose meaning
  lives only in colour also states it in text.
- **Plain SVG.** No charting library. `viewBox` plus `width: 100%` in CSS, as
  `CLT.css` does, so the figure scales with the lesson column.
- **A CSS file per simulation**, named after it, imported by it, following
  `CLT.css`'s flat class naming (`.ci`, `.ci-controls`, `.ci-svg`, …).

## File Structure

```
src/sims/
  rng.ts              + normalPdf, normalCdf, normalQuantile, tQuantile,
                        correlate, fitLine, residualSumOfSquares
  rng.test.ts         + tests for each of the above against known values
  Distribution.tsx    Distribution.css    Distribution.test.tsx
  CI.tsx              CI.css              CI.test.tsx
  PValue.tsx          PValue.css          PValue.test.tsx
  Correlation.tsx     Correlation.css     Correlation.test.tsx
  LeastSquares.tsx    LeastSquares.css    LeastSquares.test.tsx
  registry.ts         + five entries
```

---

### Task S0: Shared maths

**Files:**
- Modify: `src/sims/rng.ts`
- Test: `src/sims/rng.test.ts`

**Interfaces:**
- Consumes: `makeRng`, `mean`, `sd` (existing)
- Produces: `normalPdf`, `normalCdf`, `normalQuantile`, `tQuantile`, `correlate`, `fitLine`, `residualSumOfSquares`

Every one of the five simulations needs one or more of these, and each is the
kind of function that is silently 2 % wrong. Build and test them once, first.

- [ ] **Step 1: Write the failing test**

Append to `src/sims/rng.test.ts`. Expected values are R's, quoted in comments so
a reader can re-derive them.

```ts
import {
  correlate, fitLine, normalCdf, normalPdf, normalQuantile,
  residualSumOfSquares, tQuantile, makeRng, sd,
} from './rng';

describe('normal distribution helpers', () => {
  test('normalPdf matches dnorm', () => {
    expect(normalPdf(0, 0, 1)).toBeCloseTo(0.3989423, 6);   // dnorm(0)
    expect(normalPdf(1.5, 0, 1)).toBeCloseTo(0.1295176, 6); // dnorm(1.5)
    expect(normalPdf(72, 70, 4)).toBeCloseTo(0.08801633, 6); // dnorm(72, 70, 4)
  });

  test('normalCdf matches pnorm to six decimals', () => {
    expect(normalCdf(0, 0, 1)).toBeCloseTo(0.5, 9);
    expect(normalCdf(1.96, 0, 1)).toBeCloseTo(0.9750021, 6);   // pnorm(1.96)
    expect(normalCdf(-2.5, 0, 1)).toBeCloseTo(0.006209665, 7); // pnorm(-2.5)
    // The tails are where a cheap approximation falls apart, and the p-value
    // simulation lives in the tails.
    expect(normalCdf(-5, 0, 1)).toBeCloseTo(2.866516e-7, 12);  // pnorm(-5)
  });

  test('normalQuantile inverts normalCdf', () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 5);  // qnorm(0.975)
    expect(normalQuantile(0.05)).toBeCloseTo(-1.644854, 5);  // qnorm(0.05)
    for (const p of [0.001, 0.1, 0.5, 0.9, 0.999]) {
      expect(normalCdf(normalQuantile(p))).toBeCloseTo(p, 6);
    }
  });

  test('tQuantile matches qt closely enough to draw', () => {
    expect(tQuantile(0.975, 4)).toBeCloseTo(2.776445, 3);   // qt(0.975, 4)
    expect(tQuantile(0.975, 29)).toBeCloseTo(2.045230, 3);  // qt(0.975, 29)
    expect(tQuantile(0.975, 200)).toBeCloseTo(1.971896, 3); // qt(0.975, 200)
    // As df grows it must approach the normal quantile, or the CI simulation
    // would show intervals that visibly disagree with the formula students use.
    expect(tQuantile(0.975, 100000)).toBeCloseTo(normalQuantile(0.975), 3);
  });
});

describe('bivariate helpers', () => {
  test('correlate produces points with the requested correlation', () => {
    const rng = makeRng(11);
    for (const target of [-0.8, -0.3, 0, 0.5, 0.95]) {
      const points = correlate(target, 400, rng);
      const r = fitLine(points).r;
      expect(r).toBeCloseTo(target, 1);
    }
  });

  test('fitLine reproduces a line it is given exactly', () => {
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 3 + 2 * x }));
    const { intercept, slope, r } = fitLine(points);
    expect(intercept).toBeCloseTo(3, 9);
    expect(slope).toBeCloseTo(2, 9);
    expect(r).toBeCloseTo(1, 9);
  });

  test('the OLS line minimises the residual sum of squares', () => {
    // This is the whole point of the leastsquares simulation. If it were not
    // true of our implementation, the simulation would teach the opposite of
    // what it claims.
    const rng = makeRng(3);
    const points = correlate(0.6, 40, rng);
    const best = fitLine(points);
    const bestRss = residualSumOfSquares(points, best.intercept, best.slope);
    for (const dSlope of [-0.3, -0.05, 0.05, 0.3]) {
      for (const dIntercept of [-0.4, 0, 0.4]) {
        if (dSlope === 0 && dIntercept === 0) continue;
        expect(residualSumOfSquares(points, best.intercept + dIntercept, best.slope + dSlope))
          .toBeGreaterThan(bestRss);
      }
    }
  });

  test('fitLine is degenerate-safe', () => {
    // A student can drag every point onto one x in the leastsquares simulation.
    expect(Number.isFinite(fitLine([{ x: 1, y: 2 }, { x: 1, y: 5 }]).slope)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sims/rng.test.ts`
Expected: FAIL — none of the new functions exist.

- [ ] **Step 3: Implement the helpers in `src/sims/rng.ts`**

```ts
export function normalPdf(x: number, mu = 0, sigma = 1): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/**
 * Φ via the complementary error function, Numerical Recipes' erfc
 * approximation: fractional error below 1.2e-7 everywhere, including the far
 * tails where the p-value simulation reads off its numbers. A Taylor series
 * around 0, which is the obvious alternative, is useless past about z = 3.
 */
export function normalCdf(x: number, mu = 0, sigma = 1): number {
  const z = (x - mu) / (sigma * Math.SQRT2);
  return 1 - 0.5 * erfc(z);
}

function erfc(x: number): number {
  const t = 1 / (1 + 0.5 * Math.abs(x));
  const y = t * Math.exp(
    -x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418
      + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587
        + t * (-0.82215223 + t * 0.17087277)))))))),
  );
  return x >= 0 ? y : 2 - y;
}

/** Acklam's inverse-normal approximation, refined by one Halley step. */
export function normalQuantile(p: number, mu = 0, sigma = 1): number { /* … */ }

/**
 * Cornish–Fisher expansion of the Student t quantile. Accurate to about 1e-3
 * for df >= 3, which is finer than a pixel at the sizes we draw, and it needs
 * no incomplete beta function. The CI simulation never goes below df = 4.
 */
export function tQuantile(p: number, df: number): number {
  const z = normalQuantile(p);
  const g1 = (z ** 3 + z) / 4;
  const g2 = (5 * z ** 5 + 16 * z ** 3 + 3 * z) / 96;
  const g3 = (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / 384;
  const g4 = (79 * z ** 9 + 776 * z ** 7 + 1482 * z ** 5 - 1920 * z ** 3 - 945 * z) / 92160;
  return z + g1 / df + g2 / df ** 2 + g3 / df ** 3 + g4 / df ** 4;
}

export type Point = { x: number; y: number };

/**
 * n points whose sample correlation is close to `target`, built the standard
 * way: y = r·x + √(1 − r²)·z with x and z independent standard normals. The
 * sample r wobbles around the target, which is correct — it is what makes the
 * "guess r" simulation honest rather than a lookup table.
 */
export function correlate(target: number, n: number, rng: () => number): Point[] { /* … */ }

export function fitLine(points: Point[]): { intercept: number; slope: number; r: number } { /* … */ }

export function residualSumOfSquares(points: Point[], intercept: number, slope: number): number {
  return points.reduce((total, p) => total + (p.y - (intercept + slope * p.x)) ** 2, 0);
}
```

`fitLine` returns `slope: NaN` when every `x` is identical rather than dividing
by zero, and callers must check — `LeastSquares` lets a student create exactly
that state.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sims/rng.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sims/rng.ts src/sims/rng.test.ts
git commit -m "feat: normal, t and least-squares helpers for the simulations"
```

---

### Task S1: `distribution` — the normal distribution and z-scores

**Files:**
- Create: `src/sims/Distribution.tsx`, `src/sims/Distribution.css`, `src/sims/Distribution.test.tsx`
- Modify: `src/sims/registry.ts`

**Interfaces:**
- Consumes: `normalPdf`, `normalCdf`, `normalQuantile` (S0)
- Produces: registry entry `distribution`

**Teaches (spec §6):** the normal distribution and z-scores. **Interaction:** drag
mean and SD; shaded tail probabilities update.

**The misconception it targets:** that the normal curve's *height* is a
probability. It is not; the *area* is. The simulation makes the shaded area and
its number move together, and shows the same shaded region collapsing onto one
curve when the axis is switched to z.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { describe, expect, test } from 'vitest';
import Distribution from './Distribution';

const shaded = () => screen.getByTestId('tail-probability').textContent;

describe('Distribution', () => {
  test('the shaded probability is the area to the left of the cut', () => {
    render(<Distribution />);
    // Defaults: mean 70, SD 10, cut at 70 -> exactly half the area.
    expect(shaded()).toBe('0.500');
    fireEvent.change(screen.getByLabelText(/Cut-off/), { target: { value: '90' } });
    expect(shaded()).toBe('0.977'); // pnorm(90, 70, 10)
  });

  test('the z-score readout and the shaded area never disagree', () => {
    const seen: (string | null)[] = [];
    render(
      <Profiler id="d" onRender={() => seen.push(
        `${screen.getByTestId('z-score').textContent}|${shaded()}`,
      )}>
        <Distribution />
      </Profiler>,
    );
    fireEvent.change(screen.getByLabelText(/Standard deviation/), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/Cut-off/), { target: { value: '80' } });
    for (const frame of seen) {
      const [z, p] = frame!.split('|');
      expect(Number(p)).toBeCloseTo(normalCdf(Number(z)), 3);
    }
  });

  test('changing the SD does not change the area at the mean', () => {
    // The height of the curve changes; the area to the left of the mean is
    // always 0.5. This is the point of the simulation.
    render(<Distribution />);
    for (const value of ['4', '12', '20']) {
      fireEvent.change(screen.getByLabelText(/Standard deviation/), { target: { value } });
      fireEvent.change(screen.getByLabelText(/Cut-off/), { target: { value: '70' } });
      expect(shaded()).toBe('0.500');
    }
  });

  test('the curve is described in words for screen readers', () => {
    render(<Distribution />);
    expect(screen.getByRole('img').getAttribute('aria-label'))
      .toMatch(/mean 70.*standard deviation 10.*0\.500/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sims/Distribution.test.tsx`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Implement `src/sims/Distribution.tsx`**

State: `mean` (range 50–90, default 70), `sd` (range 3–20, default 10), `cut`
(range mean ± 4 SD, default = mean), `axis` (`'raw' | 'z'`).

Render, in one `<svg viewBox="0 0 640 240">`:

- the density curve as a single `<path>`, sampled at 240 x positions across
  mean ± 4·sd, with `normalPdf` scaled so the *tallest curve the controls can
  produce* fills the height — not the current curve. Rescaling per frame makes a
  narrow SD look identical to a wide one, which destroys the lesson.
- the shaded region left of `cut` as a second `<path>` with the same sampling,
  closed to the baseline, `fill` at 0.35 opacity.
- vertical rules at the mean and at ±1, ±2 SD, labelled on the axis.
- the cut-off as a draggable vertical line. Dragging is a convenience; the
  `<input type="range">` is the accessible control and the test drives that.

Below the figure, a readout table with `data-testid`s: `tail-probability`
(`normalCdf(cut, mean, sd).toFixed(3)`), `z-score`
(`((cut - mean) / sd).toFixed(2)`), and the complementary area to the right.
Derive all three from the same state values used to draw, in one `useMemo`.

The `axis` toggle relabels the x axis in z units and keeps the shaded fraction
fixed — the visual proof that the z-score is the same statement as the raw cut.

- [ ] **Step 4: Create `src/sims/Distribution.css`**

Follow `CLT.css`: `.distribution` card, `.distribution-controls` flex row,
`.distribution-svg { width: 100%; height: auto; }`, `.distribution-readout`
table with `font-variant-numeric: tabular-nums`.

- [ ] **Step 5: Register it**

```ts
import Distribution from './Distribution';
export const SIMULATIONS: Record<string, ComponentType> = { clt: CLT, distribution: Distribution };
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/sims/Distribution.test.tsx src/content/content.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/sims/Distribution.tsx src/sims/Distribution.css src/sims/Distribution.test.tsx src/sims/registry.ts
git commit -m "feat: the normal distribution simulation"
```

---

### Task S2: `ci` — what 95 % confidence means

**Files:**
- Create: `src/sims/CI.tsx`, `src/sims/CI.css`, `src/sims/CI.test.tsx`
- Modify: `src/sims/registry.ts`

**Interfaces:**
- Consumes: `POPULATIONS`, `drawSample`, `mean`, `sd`, `makeRng`, `tQuantile` (S0)
- Produces: registry entry `ci`

**Teaches (spec §6):** what 95 % confidence means. **Interaction:** draw 100
intervals; about 95 capture the true mean. **Kills:** "there is a 95 % chance the
mean is in *this* interval".

- [ ] **Step 1: Write the failing test**

```tsx
describe('CI', () => {
  test('the capture count equals the number of intervals drawn as capturing', () => {
    render(<CI />);
    const captured = Number(screen.getByTestId('captured').textContent);
    // Every interval is a <line> tagged with whether it covers mu. The count
    // and the picture must come from one computation, not two.
    expect(screen.getAllByTestId('interval-hit')).toHaveLength(captured);
    expect(screen.getAllByTestId('interval-miss')).toHaveLength(100 - captured);
  });

  test('about 95 of 100 intervals capture the mean at 95% confidence', () => {
    // Averaged over ten redraws, so a single unlucky seed cannot fail the build.
    render(<CI />);
    let total = 0;
    for (let i = 0; i < 10; i += 1) {
      total += Number(screen.getByTestId('captured').textContent);
      fireEvent.click(screen.getByRole('button', { name: /Draw again/ }));
    }
    expect(total / 10).toBeGreaterThan(90);
    expect(total / 10).toBeLessThan(99);
  });

  test('lowering the confidence level narrows the intervals and captures fewer', () => {
    render(<CI />);
    const at95 = Number(screen.getByTestId('captured').textContent);
    fireEvent.change(screen.getByLabelText(/Confidence/), { target: { value: '50' } });
    expect(Number(screen.getByTestId('captured').textContent)).toBeLessThan(at95);
  });

  test('a larger sample narrows the intervals without changing the capture rate', () => {
    render(<CI />);
    const width = () => Number(screen.getByTestId('mean-width').textContent);
    const narrow = (() => { fireEvent.change(screen.getByLabelText(/Sample size/), { target: { value: '100' } }); return width(); })();
    fireEvent.change(screen.getByLabelText(/Sample size/), { target: { value: '10' } });
    expect(width()).toBeGreaterThan(narrow);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Expected: FAIL.

- [ ] **Step 3: Implement `src/sims/CI.tsx`**

State: `populationName` (the four from `POPULATIONS`, default `normal`), `n`
(5–100, default 25), `level` (50, 80, 90, 95, 99 — a `<select>`, default 95),
`seed`, and `highlight: number | null` (the interval a student has clicked).

For each of 100 replications: draw a sample, compute `mean ± tQuantile(1 - (1 - level/100)/2, n - 1) · sd(sample)/√n`, and tag it `captured` when it
spans `population.mean`. Compute the intervals, the capture count and the mean
width in **one** `useMemo` returning one object, so the readout cannot describe a
different draw from the picture.

Draw 100 horizontal `<line>`s stacked vertically, a vertical rule at μ, hits in
slate and misses in red — and, because colour alone is not a signal, misses also
get a small marker and the `aria-label` states the count.

The control that does the teaching: clicking one interval highlights it and
shows the sentence *"This interval either contains μ or it does not. Ninety-five
per cent is how often the **procedure** works, not a probability about this
line."* That is the misconception in the spec's own words; put it on screen at
the moment the student is looking at a single interval.

- [ ] **Step 4: Create `src/sims/CI.css`**

As `CLT.css`. Intervals are 2 px lines with 1 px gaps at 100 rows in a 640×320
`viewBox`.

- [ ] **Step 5: Register it, run the tests, and commit**

```bash
git add src/sims/CI.tsx src/sims/CI.css src/sims/CI.test.tsx src/sims/registry.ts
git commit -m "feat: the confidence interval simulation"
```

---

### Task S3: `pvalue` — NHST logic

**Files:**
- Create: `src/sims/PValue.tsx`, `src/sims/PValue.css`, `src/sims/PValue.test.tsx`
- Modify: `src/sims/registry.ts`

**Interfaces:**
- Consumes: `makeRng`, `mean`, `sd`, `histogram`, `normalCdf` (S0)
- Produces: registry entry `pvalue`

**Teaches (spec §6):** NHST logic. **Interaction:** simulate the null
distribution, place the observed statistic, shade the tail, slide α.

**The misconception it targets:** that *p* is the probability the null hypothesis
is true. The simulation builds the null distribution *by assuming the null* —
visibly, by simulation — so the only thing *p* can be is "how often chance alone
produces a result this extreme".

- [ ] **Step 1: Write the failing test**

```tsx
describe('PValue', () => {
  test('the p-value is the proportion of null results at least as extreme', () => {
    render(<PValue />);
    const p = Number(screen.getByTestId('p-value').textContent);
    const extreme = Number(screen.getByTestId('extreme-count').textContent);
    const total = Number(screen.getByTestId('replications').textContent);
    expect(p).toBeCloseTo(extreme / total, 6);
  });

  test('moving the observed effect further out lowers p', () => {
    render(<PValue />);
    const at = (value: string) => {
      fireEvent.change(screen.getByLabelText(/Observed difference/), { target: { value } });
      return Number(screen.getByTestId('p-value').textContent);
    };
    expect(at('4')).toBeLessThan(at('1'));
  });

  test('the verdict follows alpha, and says what it does not mean', () => {
    render(<PValue />);
    fireEvent.change(screen.getByLabelText(/Observed difference/), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/α/), { target: { value: '0.01' } });
    const verdict = screen.getByTestId('verdict').textContent ?? '';
    expect(verdict).toMatch(/reject|not reject/);
    expect(screen.getByTestId('caveat').textContent)
      .toMatch(/not the probability that the null hypothesis is true/i);
  });

  test('a two-tailed test counts both tails', () => {
    render(<PValue />);
    fireEvent.change(screen.getByLabelText(/Observed difference/), { target: { value: '2.5' } });
    const two = Number(screen.getByTestId('p-value').textContent);
    fireEvent.click(screen.getByLabelText(/One-tailed/));
    expect(Number(screen.getByTestId('p-value').textContent)).toBeCloseTo(two / 2, 2);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails, then implement `src/sims/PValue.tsx`**

The scenario is fixed and concrete: two groups of `n` people each, drawn from
*one* population — so the true difference is zero by construction. Simulating
4000 such studies and recording each difference in means *is* the null
distribution, and the simulation says so in a caption.

State: `n` (10–100, default 30), `observed` (0–5 in steps of 0.1, default 1.2),
`alpha` (0.10, 0.05, 0.01), `tails` (`two` default, `one`), `seed`.

One `useMemo` produces `{ differences, p, extremeCount, replications }`; `p` is
counted from `differences`, never from `normalCdf`. Use `normalCdf` only to draw
the smooth overlay that shows the simulated null is the *t*-ish shape the formula
assumes, labelled as such.

Render the histogram of `differences` with the tail(s) beyond `observed` shaded,
a marker at `observed`, and a dashed line at the α critical value so the student
sees the decision rule and the evidence in the same picture. Below it: `p-value`,
`extreme-count`, `replications`, `verdict`, and a permanent `caveat` line reading
*"p is how often chance alone produces a difference this big when nothing is
going on. It is not the probability that the null hypothesis is true, and it is
not the size of the effect."*

- [ ] **Step 3: CSS, register, test, commit**

```bash
git add src/sims/PValue.tsx src/sims/PValue.css src/sims/PValue.test.tsx src/sims/registry.ts
git commit -m "feat: the p-value simulation"
```

---

### Task S4: `correlation` — guess *r*

**Files:**
- Create: `src/sims/Correlation.tsx`, `src/sims/Correlation.css`, `src/sims/Correlation.test.tsx`
- Modify: `src/sims/registry.ts`

**Interfaces:**
- Consumes: `correlate`, `fitLine`, `makeRng` (S0)
- Produces: registry entry `correlation`

**Teaches (spec §6):** correlation strength. **Interaction:** guess *r* from a
scatterplot before it is revealed.

**The misconception it targets:** that *r* = .3 looks like a clear line and
*r* = .9 like a perfect one. Students consistently overestimate weak
correlations and underestimate strong ones; a guess-then-reveal loop with a
running error is the only thing that fixes it.

- [ ] **Step 1: Write the failing test**

```tsx
describe('Correlation', () => {
  test('the answer is hidden until the student commits', () => {
    render(<Correlation />);
    expect(screen.queryByTestId('actual-r')).toBeNull();
    fireEvent.change(screen.getByLabelText(/Your guess/), { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
    expect(screen.getByTestId('actual-r')).toBeDefined();
  });

  test('the revealed r is the r of the points on screen', () => {
    render(<Correlation />);
    fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
    const shown = Number(screen.getByTestId('actual-r').textContent);
    const points = screen.getAllByTestId('point').map((node) => ({
      x: Number(node.getAttribute('data-x')), y: Number(node.getAttribute('data-y')),
    }));
    expect(fitLine(points).r).toBeCloseTo(shown, 2);
  });

  test('a new round hides the answer again and changes the points', () => {
    render(<Correlation />);
    fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
    const first = screen.getByTestId('actual-r').textContent;
    fireEvent.click(screen.getByRole('button', { name: /Next scatterplot/ }));
    expect(screen.queryByTestId('actual-r')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
    expect(screen.getByTestId('actual-r').textContent).not.toBe(first);
  });

  test('the running score counts every completed round', () => {
    render(<Correlation />);
    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
      fireEvent.click(screen.getByRole('button', { name: /Next scatterplot/ }));
    }
    expect(screen.getByTestId('rounds').textContent).toBe('3');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails, then implement `src/sims/Correlation.tsx`**

State: `round` (seeds the rng), `guess` (−1 to 1, step 0.05, default 0),
`revealed` (boolean), and a history array of `{ target, guess }`.

Each round: pick `target` from a fixed ladder shuffled by the seed —
`[-0.9, -0.7, -0.5, -0.3, 0, 0.3, 0.5, 0.7, 0.9]` — so a student meets the whole
range rather than a random walk, and generate 60 points with `correlate`.
`actual-r` shows `fitLine(points).r`, not `target`: the sample *r* is what is on
screen, and the gap between them is itself worth seeing.

Each point is a `<circle data-testid="point" data-x data-y>` so the test can
recover the data. On reveal, draw the OLS line, show the actual *r*, the guess,
the signed error, and the running mean absolute error across rounds. A short
verdict line names the standard bias when it appears: *"You have overestimated
the last three weak correlations — a cloud that looks slightly tilted is usually
r below .3."*

- [ ] **Step 3: CSS, register, test, commit**

```bash
git add src/sims/Correlation.tsx src/sims/Correlation.css src/sims/Correlation.test.tsx src/sims/registry.ts
git commit -m "feat: the guess-the-correlation simulation"
```

---

### Task S5: `leastsquares` — what "best fit" means

**Files:**
- Create: `src/sims/LeastSquares.tsx`, `src/sims/LeastSquares.css`, `src/sims/LeastSquares.test.tsx`
- Modify: `src/sims/registry.ts`

**Interfaces:**
- Consumes: `correlate`, `fitLine`, `residualSumOfSquares`, `makeRng` (S0)
- Produces: registry entry `leastsquares`

**Teaches (spec §6):** regression fitting. **Interaction:** drag points and a
candidate line, watch squared residuals; reveal the OLS line.

**The misconception it targets:** that the regression line is "the line through
the middle", or the line minimising perpendicular distance. It minimises the sum
of *squared vertical* distances, and the squares have to be visible as squares
for that to land.

- [ ] **Step 1: Write the failing test**

```tsx
describe('LeastSquares', () => {
  test('the student line starts worse than the OLS line', () => {
    render(<LeastSquares />);
    expect(Number(screen.getByTestId('your-rss').textContent))
      .toBeGreaterThan(Number(screen.getByTestId('best-rss').textContent));
  });

  test('no slope the student can choose beats the revealed best', () => {
    render(<LeastSquares />);
    const best = Number(screen.getByTestId('best-rss').textContent);
    for (const value of ['-2', '-0.5', '0', '0.5', '1', '2']) {
      fireEvent.change(screen.getByLabelText(/Slope/), { target: { value } });
      expect(Number(screen.getByTestId('your-rss').textContent)).toBeGreaterThanOrEqual(best - 1e-6);
    }
  });

  test('Show the best line sets the controls to the OLS fit', () => {
    render(<LeastSquares />);
    fireEvent.click(screen.getByRole('button', { name: /Show the best line/ }));
    expect(Number(screen.getByTestId('your-rss').textContent))
      .toBeCloseTo(Number(screen.getByTestId('best-rss').textContent), 3);
  });

  test('one residual square is drawn per point, sized by its residual', () => {
    render(<LeastSquares />);
    const squares = screen.getAllByTestId('residual-square');
    expect(squares).toHaveLength(screen.getAllByTestId('point').length);
    // Area, not length: the square of the residual is what is being summed.
    const total = squares.reduce((sum, node) => sum + Number(node.getAttribute('data-area')), 0);
    expect(total).toBeCloseTo(Number(screen.getByTestId('your-rss').textContent), 3);
  });

  test('a vertical run of points reports no line rather than crashing', () => {
    render(<LeastSquares />);
    fireEvent.click(screen.getByRole('button', { name: /Stack the points/ }));
    expect(screen.getByTestId('best-rss').textContent).toMatch(/—|no line/i);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails, then implement `src/sims/LeastSquares.tsx`**

State: `points` (12, generated with `correlate(0.65, 12, rng)` and then
draggable), `intercept` and `slope` (sliders, deliberately initialised away from
the OLS values), `showBest` (boolean), `seed`.

Draw, in a square `viewBox` with equal x and y scales — **this is not optional**,
because a residual square drawn on unequal axes is a rectangle and the visual
argument collapses:

- the points, each `<circle data-testid="point">`, draggable by pointer and
  movable by arrow keys when focused;
- the student's line;
- for each point, a `<rect data-testid="residual-square" data-area="…">` with the
  residual as its side, hanging from the point to the line, at low opacity;
- on `showBest`, the OLS line as a dashed overlay.

Readout: `your-rss`, `best-rss`, and the gap between them, plus the fitted
equation in the course's notation (`ŷ = 2.41 + 0.63x`). When `fitLine` returns a
non-finite slope, show `—` and a line explaining that with every point at one x
there is no line to fit.

The pedagogy is in the ordering: the student must move the line by hand and watch
the total shrink *before* "Show the best line" is pressed. Keep that button below
the readout, not beside the sliders.

- [ ] **Step 3: CSS, register, test, commit**

```bash
git add src/sims/LeastSquares.tsx src/sims/LeastSquares.css src/sims/LeastSquares.test.tsx src/sims/registry.ts
git commit -m "feat: the least squares simulation"
```

---

### Task S6: All six registered and proven

**Files:**
- Modify: `src/components/Simulation.test.tsx`, `e2e/smoke.spec.ts`
- Test: both

- [ ] **Step 1: Assert the registry matches the spec**

```ts
test('every simulation the spec names is registered', () => {
  expect(SIMULATION_NAMES.sort()).toEqual(
    ['ci', 'clt', 'correlation', 'distribution', 'leastsquares', 'pvalue'],
  );
});

test('every registered simulation renders without crashing', () => {
  for (const name of SIMULATION_NAMES) {
    const { unmount } = render(<Simulation name={name} />);
    unmount();
  }
});
```

The second test is cheap and would have caught a missing CSS import or a
destructuring error in any of the five before a student met it.

- [ ] **Step 2: Extend the smoke test**

The existing smoke test opens a Module 6 lesson and drives the `clt` slider. Add
one that opens a Module 9 lesson and drives `leastsquares`, since it is the only
simulation with pointer interaction and the only one whose geometry depends on
the rendered aspect ratio — exactly what a unit test under jsdom cannot check.

> If the module plans have not run yet, this step's lesson does not exist.
> Do it then; leave the checkbox unticked until it is real, and do not
> substitute a Module 6 lesson, which proves nothing new.

- [ ] **Step 3: Run everything**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/Simulation.test.tsx e2e/smoke.spec.ts
git commit -m "test: every simulation the spec names is registered and renders"
```

---

## Self-Review

| Spec section | Covered by |
|---|---|
| §6 `distribution` | S1 |
| §6 `ci` | S2 |
| §6 `pvalue` | S3 |
| §6 `correlation` | S4 |
| §6 `leastsquares` | S5 |
| §6 registry lookup, CI fails on an unknown name | S6 (the registry test already exists in `content.test.ts`) |
| §8.3 Unit and smoke tests | S0–S6 |

**Deliberate deviations**

1. **`tQuantile` is an approximation**, not an exact `qt`. It is accurate to
   about 1e-3 for df ≥ 3, which is finer than a pixel at the sizes drawn, and it
   avoids pulling in an incomplete beta implementation for a picture. The CI
   simulation is the only consumer, and its own test bounds the capture rate.
2. **`pvalue` counts its p from the simulation, not from a formula.** A formula
   would be exact and would teach the wrong thing; the whole point is that the
   *p*-value is a proportion of a distribution the student watched being built.
3. **`correlation` reveals the sample *r*, not the target *r*** it generated
   from. They differ, sometimes visibly at n = 60, and hiding that would be a
   small lie in a simulation whose subject is sampling variability.
