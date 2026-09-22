import type { ModuleMeta } from './manifest';

/** Spec §7 groups the fourteen modules into three parts. */
export const PARTS = [
  { title: 'Foundations', blurb: 'R, data, summaries and plots', modules: [1, 2, 3, 4] },
  { title: 'Inference', blurb: 'From one sample to the population', modules: [5, 6, 7, 8] },
  { title: 'The linear model', blurb: 'One model, many names', modules: [9, 10, 11, 12, 13, 14] },
] as const;

export function partOf(module: ModuleMeta): (typeof PARTS)[number] | undefined {
  return PARTS.find((part) => (part.modules as readonly number[]).includes(module.number));
}
