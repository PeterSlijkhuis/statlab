/** mulberry32: small, fast, and seedable so simulations are reproducible. */
export function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rng: () => number, mu: number, sigma: number): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type Population = {
  label: string;
  description: string;
  mean: number;
  sd: number;
  draw: (rng: () => number) => number;
};

export type PopulationName = 'normal' | 'skewed' | 'uniform' | 'bimodal';

export const POPULATIONS: Record<PopulationName, Population> = {
  normal: {
    label: 'Normal',
    description: 'A symmetric, bell-shaped population.',
    mean: 20,
    sd: 5,
    draw: (rng) => normal(rng, 20, 5),
  },
  skewed: {
    label: 'Strongly skewed',
    description: 'Most people score low, a few score very high — like stress or reaction times.',
    mean: 20,
    sd: 20,
    draw: (rng) => -20 * Math.log(Math.max(rng(), Number.EPSILON)),
  },
  uniform: {
    label: 'Flat',
    description: 'Every value between 0 and 40 is equally likely.',
    mean: 20,
    sd: 40 / Math.sqrt(12),
    draw: (rng) => rng() * 40,
  },
  bimodal: {
    label: 'Two peaks',
    description: 'Two distinct groups, with almost nobody in the middle.',
    mean: 20,
    sd: Math.sqrt(9 + 144),
    draw: (rng) => (rng() < 0.5 ? normal(rng, 8, 3) : normal(rng, 32, 3)),
  },
};

export function mean(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function sd(values: number[]): number {
  if (values.length < 2) return Number.NaN;
  const average = mean(values);
  const variance = values.reduce((total, value) => total + (value - average) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Sample skewness (adjusted Fisher-Pearson, as R's e1071 type 2 and Excel's
 * SKEW): about 0 for a symmetric distribution, 2 for an exponential.
 */
export function skewness(values: number[]): number {
  const n = values.length;
  if (n < 3) return Number.NaN;
  const average = mean(values);
  const spread = sd(values);
  if (!(spread > 0)) return 0;
  const sum = values.reduce((total, value) => total + ((value - average) / spread) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

/** Rule-of-thumb wording for a skewness value, for screen-reader users. */
export function describeShape(skew: number): string {
  if (!Number.isFinite(skew)) return 'shape unclear';
  const size = Math.abs(skew);
  if (size < 0.5) return 'roughly symmetric';
  const side = skew > 0 ? 'right' : 'left';
  return size < 1 ? `moderately skewed ${side}` : `strongly skewed ${side}`;
}

export function drawSample(population: Population, n: number, rng: () => number): number[] {
  return Array.from({ length: n }, () => population.draw(rng));
}

export function sampleMeans(
  population: Population,
  n: number,
  replications: number,
  rng: () => number,
): number[] {
  return Array.from({ length: replications }, () => mean(drawSample(population, n, rng)));
}

export function histogram(values: number[], bins: number): { edges: number[]; counts: number[] } {
  const counts = new Array<number>(bins).fill(0);
  if (values.length === 0) return { edges: new Array(bins + 1).fill(0), counts };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = min === max ? min - 0.5 : min;
  const hi = min === max ? max + 0.5 : max;
  const width = (hi - lo) / bins;
  const edges = Array.from({ length: bins + 1 }, (_, index) => lo + index * width);

  for (const value of values) {
    const index = Math.min(Math.floor((value - lo) / width), bins - 1);
    counts[index] += 1;
  }
  return { edges, counts };
}

export function normalPdf(x: number, mu = 0, sigma = 1): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/**
 * Phi, by Hart's rational approximation (as in West 2005). Accurate to about
 * 1e-15 across the whole range, including the far tails where the p-value
 * simulation reads off its numbers.
 *
 * The obvious cheaper choices both fail a test in rng.test.ts: a Taylor series
 * around 0 is useless past about z = 3, and Numerical Recipes' erfc is only
 * good to 1.2e-7 relative, which is visible at Phi(0) = 0.5.
 */
export function normalCdf(x: number, mu = 0, sigma = 1): number {
  const z = (x - mu) / sigma;
  const a = Math.abs(z);
  if (a > 37) return z > 0 ? 1 : 0;

  const e = Math.exp(-0.5 * a * a);
  let c: number;
  if (a < 7.07106781186547) {
    let n = 3.52624965998911e-2 * a + 0.700383064443688;
    n = n * a + 6.37396220353165;
    n = n * a + 33.912866078383;
    n = n * a + 112.079291497871;
    n = n * a + 221.213596169931;
    n = n * a + 220.206867912376;
    let d = 8.83883476483184e-2 * a + 1.75566716318264;
    d = d * a + 16.064177579207;
    d = d * a + 86.7807322029461;
    d = d * a + 296.564248779674;
    d = d * a + 637.333633378831;
    d = d * a + 793.826512519948;
    d = d * a + 440.413735824752;
    c = (e * n) / d;
  } else {
    // A continued fraction, which is what the rational form degrades to once
    // the exponential has already underflowed most of the answer away.
    let f = a + 0.65;
    for (const k of [4, 3, 2, 1]) f = a + k / f;
    c = e / (f * 2.506628274631);
  }
  return z > 0 ? 1 - c : c;
}

// Acklam's coefficients, for the rational approximation below.
const ACKLAM_A = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
const ACKLAM_B = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
const ACKLAM_C = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
const ACKLAM_D = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
const ACKLAM_LOW = 0.02425;

/**
 * Acklam's inverse-normal approximation, refined by one Halley step, which
 * takes it to full double precision. Used to place confidence-interval bounds
 * and critical values, so a visible error here is a lesson teaching the wrong
 * number.
 */
export function normalQuantile(p: number, mu = 0, sigma = 1): number {
  if (!(p > 0)) return p === 0 ? -Infinity : Number.NaN;
  if (!(p < 1)) return p === 1 ? Infinity : Number.NaN;

  let z: number;
  if (p < ACKLAM_LOW) {
    const q = Math.sqrt(-2 * Math.log(p));
    z =
      (((((ACKLAM_C[0] * q + ACKLAM_C[1]) * q + ACKLAM_C[2]) * q + ACKLAM_C[3]) * q + ACKLAM_C[4]) * q + ACKLAM_C[5]) /
      ((((ACKLAM_D[0] * q + ACKLAM_D[1]) * q + ACKLAM_D[2]) * q + ACKLAM_D[3]) * q + 1);
  } else if (p <= 1 - ACKLAM_LOW) {
    const q = p - 0.5;
    const r = q * q;
    z =
      ((((((ACKLAM_A[0] * r + ACKLAM_A[1]) * r + ACKLAM_A[2]) * r + ACKLAM_A[3]) * r + ACKLAM_A[4]) * r + ACKLAM_A[5]) * q) /
      (((((ACKLAM_B[0] * r + ACKLAM_B[1]) * r + ACKLAM_B[2]) * r + ACKLAM_B[3]) * r + ACKLAM_B[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    z =
      -(((((ACKLAM_C[0] * q + ACKLAM_C[1]) * q + ACKLAM_C[2]) * q + ACKLAM_C[3]) * q + ACKLAM_C[4]) * q + ACKLAM_C[5]) /
      ((((ACKLAM_D[0] * q + ACKLAM_D[1]) * q + ACKLAM_D[2]) * q + ACKLAM_D[3]) * q + 1);
  }

  // One Halley step against normalCdf, which is accurate to ~1e-7. Without it
  // Acklam alone is good to ~1e-9 in the body but drifts in the tails.
  const error = normalCdf(z) - p;
  const density = normalPdf(z);
  if (density > 0) {
    const u = error / density;
    z -= u / (1 + (z * u) / 2);
  }
  return mu + sigma * z;
}

/**
 * Cornish-Fisher expansion of the Student t quantile, to five terms: agrees
 * with R's qt to better than 2e-4 for df >= 4, which is finer than a pixel at
 * the sizes we draw, and needs no incomplete beta function. The CI simulation
 * never goes below df = 4.
 */
export function tQuantile(p: number, df: number): number {
  const z = normalQuantile(p);
  const g1 = (z ** 3 + z) / 4;
  const g2 = (5 * z ** 5 + 16 * z ** 3 + 3 * z) / 96;
  const g3 = (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / 384;
  const g4 = (79 * z ** 9 + 776 * z ** 7 + 1482 * z ** 5 - 1920 * z ** 3 - 945 * z) / 92160;
  // The fifth term matters only at the small df the CI simulation reaches: it
  // moves qt(0.975, 4) by 7e-4, which is the difference between agreeing with
  // R to three decimals and not. By df = 30 it is worth 4e-8.
  const g5 =
    (27 * z ** 11 + 339 * z ** 9 + 930 * z ** 7 - 1782 * z ** 5 - 765 * z ** 3 + 17955 * z) / 368640;
  return z + g1 / df + g2 / df ** 2 + g3 / df ** 3 + g4 / df ** 4 + g5 / df ** 5;
}

export type Point = { x: number; y: number };

/**
 * n points whose sample correlation is close to `target`, built the standard
 * way: y = r*x + sqrt(1 - r^2)*z with x and z independent standard normals.
 * The sample r wobbles around the target, which is correct: it is what makes
 * the "guess r" simulation honest rather than a lookup table.
 */
export function correlate(target: number, n: number, rng: () => number): Point[] {
  const r = Math.max(-1, Math.min(1, target));
  const scale = Math.sqrt(Math.max(0, 1 - r * r));
  return Array.from({ length: n }, () => {
    const x = normal(rng, 0, 1);
    const z = normal(rng, 0, 1);
    return { x, y: r * x + scale * z };
  });
}

/**
 * The ordinary least-squares line through `points`, with Pearson's r.
 * Returns NaN for the slope when every x is identical rather than dividing by
 * zero; LeastSquares lets a student drag every point onto one x, so callers
 * must check.
 */
export function fitLine(points: Point[]): { intercept: number; slope: number; r: number } {
  const n = points.length;
  if (n < 2) return { intercept: Number.NaN, slope: Number.NaN, r: Number.NaN };

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const mx = mean(xs);
  const my = mean(ys);

  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
  }

  const slope = sxx === 0 ? Number.NaN : sxy / sxx;
  const intercept = sxx === 0 ? Number.NaN : my - slope * mx;
  const denominator = Math.sqrt(sxx * syy);
  const r = denominator === 0 ? Number.NaN : sxy / denominator;
  return { intercept, slope, r };
}

export function residualSumOfSquares(points: Point[], intercept: number, slope: number): number {
  return points.reduce((total, p) => total + (p.y - (intercept + slope * p.x)) ** 2, 0);
}
