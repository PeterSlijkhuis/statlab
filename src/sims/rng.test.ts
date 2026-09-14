import { describe, expect, test } from 'vitest';
import { histogram, makeRng, mean, POPULATIONS, sampleMeans, sd } from './rng';

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
    expect(large).toBeLessThan(small / 2);
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
