// @vitest-environment node
import { WebR } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { evaluateR } from './evaluate';
import {
  CORE_PACKAGES,
  DATASET_FILES,
  ensurePackages,
  installCoursePackages,
  mountDatasets,
} from './session';

let webR: WebR;

// A synthetic file, so this task does not depend on the real dataset
// existing yet. Task 15 adds the test that reads the committed CSV.
const SYNTHETIC = 'id,score\n1,10\n2,20\n3,30\n';

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
  await mountDatasets(webR, async () => new TextEncoder().encode(SYNTHETIC));
}, 300_000);

afterAll(async () => {
  await webR.close();
});

const text = (r: { output: { data: string }[] }) => r.output.map((o) => o.data).join('\n');

describe('dataset mounting', () => {
  test('declares at least one dataset', () => {
    expect(DATASET_FILES.length).toBeGreaterThan(0);
  });

  test('read.csv finds a mounted file at the documented relative path', async () => {
    const result = await evaluateR(webR, `nrow(read.csv("data/${DATASET_FILES[0]}"))`);
    expect(result.errored).toBe(false);
    expect(text(result)).toContain('3');
  });

  test('mounting twice succeeds, as it must after a reload', async () => {
    await mountDatasets(webR, async () => new TextEncoder().encode(SYNTHETIC));
    const result = await evaluateR(webR, `nrow(read.csv("data/${DATASET_FILES[0]}"))`);
    expect(result.errored).toBe(false);
  });
});

describe('course packages', () => {
  // Slow (downloads binaries) and deliberately kept: the entire curriculum
  // from Module 4 onward assumes webR publishes builds of these for this R
  // version. Finding out here costs one minute; finding out at Module 4 costs
  // a rewrite of every visualisation lesson.
  test('the core package set installs and loads', async () => {
    await installCoursePackages(webR);

    // The exact predicate installCoursePackages verifies with. A real
    // installation must read as present, or the new guard would turn every
    // healthy session into "Could not install dplyr, ggplot2".
    for (const pkg of CORE_PACKAGES) {
      expect(await webR.evalRBoolean(`nzchar(system.file(package = "${pkg}"))`)).toBe(true);
    }

    const loaded = await evaluateR(
      webR,
      'suppressMessages({ library(dplyr); library(ggplot2); library(tidyr); library(broom) }); "ok"',
    );
    expect(loaded.errored, loaded.output.map((o) => o.data).join('\n')).toBe(false);

    const piped = await evaluateR(
      webR,
      'as.character(nrow(filter(data.frame(x = 1:10), x > 6)))',
    );
    expect(text(piped)).toContain('4');

    const plotted = await evaluateR(
      webR,
      'class(ggplot(data.frame(x = 1, y = 1), aes(x, y)) + geom_point())[1]',
    );
    expect(text(plotted)).toContain('gg');
  }, 600_000);
});

describe('the real course dataset', () => {
  test('mounts and reads back the full population', async () => {
    const real = new WebR();
    await real.init();
    try {
      const { readFile } = await import('node:fs/promises');
      await mountDatasets(real, async (name) =>
        new Uint8Array(await readFile(new URL(`../../public/data/${name}`, import.meta.url))),
      );
      const result = await evaluateR(real, 'nrow(read.csv("data/wellbeing-population.csv"))');
      expect(result.errored).toBe(false);
      expect(text(result)).toContain('5000');
    } finally {
      await real.close();
    }
  }, 300_000);
});

describe('the modelling packages', () => {
  // The step that de-risks Module 13. If lme4 and lmerTest are not published for
  // this R version, Module 13 teaches the paired t-test and the long-format
  // reshape only, and the chooser's mixed-model leaf becomes reference material
  // rather than a link to a lesson. Finding that out here costs one run;
  // finding it out at Module 13 costs the module.
  test('emmeans, car, lme4 and lmerTest install and attach', async () => {
    const real = new WebR();
    await real.init();
    try {
      await ensurePackages(real, [...CORE_PACKAGES, 'emmeans', 'car', 'lme4', 'lmerTest']);
      const result = await evaluateR(
        real,
        'suppressMessages({ library(lmerTest); library(lme4); library(emmeans); library(car); library(broom) }); "ok"',
      );
      expect(result.errored, result.output.map((o) => o.data).join('\n')).toBe(false);

      // Not just attachable: a mixed model must actually fit, which is what
      // Module 13 asks a student to do.
      const fitted = await evaluateR(
        real,
        'd <- data.frame(y = rnorm(60), g = rep(letters[1:10], each = 6))\n' +
          'class(lmer(y ~ 1 + (1 | g), data = d))[1]',
      );
      expect(fitted.errored, fitted.output.map((o) => o.data).join('\n')).toBe(false);
    } finally {
      await real.close();
    }
  }, 900_000);
});

describe('the workplace dataset', () => {
  test('mounts with its factors intact', async () => {
    const real = new WebR();
    await real.init();
    try {
      const { readFile } = await import('node:fs/promises');
      await mountDatasets(real, async (name) =>
        new Uint8Array(await readFile(new URL(`../../public/data/${name}`, import.meta.url))),
      );
      const result = await evaluateR(
        real,
        'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n' +
          'paste(nrow(d), nlevels(d$department), nlevels(d$site), nlevels(d$remote))',
      );
      expect(result.errored).toBe(false);
      expect(text(result)).toContain('480 4 6 2');
    } finally {
      await real.close();
    }
  }, 300_000);

  test('carries the effects the Part 3 lessons teach against', async () => {
    // The JavaScript twin of this check is scripts/check-workplace-effects.mjs,
    // which runs without a network. This is the same arithmetic in R, which is
    // the language the students will see it in.
    const real = new WebR();
    await real.init();
    try {
      const { readFile } = await import('node:fs/promises');
      await mountDatasets(real, async (name) =>
        new Uint8Array(await readFile(new URL(`../../public/data/${name}`, import.meta.url))),
      );
      const result = await evaluateR(
        real,
        [
          'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)',
          'fit <- summary(lm(wellbeing ~ autonomy + workload + tenure_years, data = d))$coefficients',
          'inter <- coef(lm(I(engagement_t2 - engagement_t1) ~ training * mentoring, data = d))',
          'mu <- tapply(d$wellbeing, d$department, mean)',
          'md <- tapply(d$wellbeing, d$department, median)',
          'paste(',
          '  all(abs(fit[2:4, "t value"]) > 4),',
          '  inter[4] > inter[2] && inter[4] > inter[3],',
          '  mu["Engineering"] < max(mu) && mu["Engineering"] > min(mu),',
          '  names(md)[which.max(md)] == "Engineering",',
          '  mean(d$left_company) > 0.15 && mean(d$left_company) < 0.30',
          ')',
        ].join('\n'),
      );
      expect(result.errored, result.output.map((o) => o.data).join('\n')).toBe(false);
      expect(text(result)).toContain('TRUE TRUE TRUE TRUE TRUE');
    } finally {
      await real.close();
    }
  }, 300_000);
});
