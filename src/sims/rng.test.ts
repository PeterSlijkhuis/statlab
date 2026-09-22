import { describe, expect, test } from 'vitest';
import {
  correlate,
  describeShape,
  fitLine,
  histogram,
  makeRng,
  mean,
  normalCdf,
  normalPdf,
  normalQuantile,
  POPULATIONS,
  residualSumOfSquares,
  sampleMeans,
  sd,
  skewness,
  tQuantile,
} from './rng';

describe('seeded rng', () => {
  test('is deterministic for a given seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  test('differs between seeds', () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });

  test('stays within [0, 1)', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 500; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('populations', () => {
  test('each declares a mean close to what it actually generates', () => {
    for (const key of Object.keys(POPULATIONS) as (keyof typeof POPULATIONS)[]) {
      const population = POPULATIONS[key];
      const rng = makeRng(99);
      const draws = Array.from({ length: 20_000 }, () => population.draw(rng));
      expect(Math.abs(mean(draws) - population.mean)).toBeLessThan(population.sd * 0.1);
    }
  });

  test('each declares an sd close to what it actually generates', () => {
    for (const key of Object.keys(POPULATIONS) as (keyof typeof POPULATIONS)[]) {
      const population = POPULATIONS[key];
      const rng = makeRng(123);
      const draws = Array.from({ length: 20_000 }, () => population.draw(rng));
      expect(Math.abs(sd(draws) - population.sd)).toBeLessThan(population.sd * 0.15);
    }
  });
});

describe('sampleMeans', () => {
  test('returns one mean per replication', () => {
    expect(sampleMeans(POPULATIONS.normal, 10, 250, makeRng(3))).toHaveLength(250);
  });

  test('spread shrinks roughly as the square root of n — the point of the lesson', () => {
    const small = sd(sampleMeans(POPULATIONS.skewed, 4, 4000, makeRng(5)));
    const large = sd(sampleMeans(POPULATIONS.skewed, 64, 4000, makeRng(5)));
    // 16 times the sample size should shrink the spread by sqrt(16) = 4
    // (measured 3.99). Requiring more than 3 catches a wrong exponent that a
    // looser bound of 2 would let through.
    expect(large).toBeLessThan(small / 3);
  });

  test('centres on the population mean regardless of n', () => {
    const means = sampleMeans(POPULATIONS.skewed, 25, 4000, makeRng(11));
    expect(Math.abs(mean(means) - POPULATIONS.skewed.mean)).toBeLessThan(POPULATIONS.skewed.sd * 0.05);
  });
});

describe('histogram', () => {
  test('counts every value exactly once', () => {
    const { counts } = histogram([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(10);
  });

  test('produces one more edge than bin', () => {
    const { edges, counts } = histogram([1, 2, 3], 4);
    expect(edges).toHaveLength(counts.length + 1);
  });

  test('handles identical values without producing NaN', () => {
    const { counts } = histogram([5, 5, 5], 4);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
    expect(counts.every((c) => Number.isFinite(c))).toBe(true);
  });
});

describe('skewness', () => {
  test('is about 0 for a normal population', () => {
    const rng = makeRng(17);
    const draws = Array.from({ length: 20_000 }, () => POPULATIONS.normal.draw(rng));
    expect(Math.abs(skewness(draws))).toBeLessThan(0.15);
  });

  test('is about 2 for the exponential (skewed) population', () => {
    const rng = makeRng(17);
    const draws = Array.from({ length: 20_000 }, () => POPULATIONS.skewed.draw(rng));
    expect(Math.abs(skewness(draws) - 2)).toBeLessThan(0.3);
  });
});

describe('describeShape', () => {
  test('words a skewness value by rule of thumb', () => {
    expect(describeShape(0.2)).toBe('roughly symmetric');
    expect(describeShape(0.7)).toBe('moderately skewed right');
    expect(describeShape(-1.5)).toBe('strongly skewed left');
    expect(describeShape(Number.NaN)).toBe('shape unclear');
  });
});

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
