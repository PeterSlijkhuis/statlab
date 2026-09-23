import type { ModuleMeta } from './manifest';

/**
 * Spec §7 groups the modules into three parts. Module 0 opens the first, and a
 * fourth part holds the advanced modules that go beyond the core course.
 */
export const PARTS = [
  { title: 'Foundations', blurb: 'Setting up, R, data, summaries and plots', modules: [0, 1, 2, 3, 4] },
  { title: 'Inference', blurb: 'From one sample to the population', modules: [5, 6, 7, 8] },
  { title: 'The linear model', blurb: 'One model, many names', modules: [9, 10, 11, 12, 13, 14] },
  { title: 'Advanced', blurb: 'Beyond the core course: Bayesian statistics', modules: [15] },
] as const;

export function partOf(module: ModuleMeta): (typeof PARTS)[number] | undefined {
  return PARTS.find((part) => (part.modules as readonly number[]).includes(module.number));
}
