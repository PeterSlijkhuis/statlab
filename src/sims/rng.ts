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
