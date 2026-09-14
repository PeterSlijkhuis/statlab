// @vitest-environment node
import { WebR } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { evaluateR } from './evaluate';
import { DATASET_FILES, installCoursePackages, mountDatasets } from './session';

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
  test('dplyr and ggplot2 install and load', async () => {
    await installCoursePackages(webR);

    const loaded = await evaluateR(webR, 'suppressMessages({ library(dplyr); library(ggplot2) }); "ok"');
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
