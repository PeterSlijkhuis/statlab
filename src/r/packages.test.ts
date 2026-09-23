import { describe, expect, test } from 'vitest';
import { KNOWN_PACKAGES } from './session';
import { browserSupport, NOT_IN_BROWSER, packagesIn, RECOMMENDED_NAMES } from './packages';

describe('packagesIn', () => {
  test('finds the packages a script plainly asks for', () => {
    const code = [
      'library(psych)',
      "require('janitor')",
      'install.packages(c("lavaan", "semTools"))',
      'install.packages("haven")',
      'x <- skimr::skim(df)',
      'requireNamespace("writexl", quietly = TRUE)',
    ].join('\n');
    expect(packagesIn(code).sort()).toEqual(['haven', 'janitor', 'lavaan', 'psych', 'semTools', 'skimr', 'writexl']);
  });

  test('ignores what only looks like a package', () => {
    expect(packagesIn('df$psych::x\n# library(janitor)\nlibrary(pkg, character.only = TRUE)')).toEqual(['pkg']);
    expect(packagesIn('mean(1:10)')).toEqual([]);
  });
});

describe('the package catalogue', () => {
  test('recommends every package the course itself installs', () => {
    for (const name of KNOWN_PACKAGES) expect(RECOMMENDED_NAMES).toContain(name);
  });

  test('never recommends a package it also says cannot run', () => {
    for (const name of RECOMMENDED_NAMES) expect(Object.keys(NOT_IN_BROWSER)).not.toContain(name);
  });

  test('tells the model chooser what runs in the playground', () => {
    expect(browserSupport('ggplot2')).toBe('installed');
    expect(browserSupport('stats')).toBe('installed');
    expect(browserSupport('lme4')).toBe('recommended');
    expect(browserSupport('psych')).toBe('recommended');
    expect(browserSupport('brms')).toBe('unavailable');
    expect(browserSupport('somethingelse')).toBe('unknown');
  });

  test('explains itself without em dashes', () => {
    for (const reason of Object.values(NOT_IN_BROWSER)) expect(reason).not.toContain('\u2014');
  });
});
