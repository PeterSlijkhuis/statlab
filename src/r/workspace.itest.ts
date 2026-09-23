// @vitest-environment node
import { WebR, type RObject } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createLessonEnv } from './environments';
import {
  clearObjects,
  helpText,
  listFiles,
  listObjects,
  parseStatements,
  previewData,
  runInConsole,
} from './workspace';

let webR: WebR;
let env: RObject;

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
  env = await createLessonEnv(webR);
}, 300_000);

afterAll(async () => {
  await webR.close();
});

describe('parseStatements', () => {
  test('gives each top-level statement its lines, even across a pipe', async () => {
    const parsed = await parseStatements(webR, 'x <- 1\n\ny <- c(1,\n  2)\nx + y');
    expect(parsed).toEqual({ kind: 'ok', ranges: [[1, 1], [3, 4], [5, 5]] });
  });

  test('tells an unfinished line from a mistake', async () => {
    expect(await parseStatements(webR, 'mean(x')).toEqual({ kind: 'incomplete' });
    expect(await parseStatements(webR, 'x <- "open')).toEqual({ kind: 'incomplete' });
    expect(await parseStatements(webR, 'x <- )')).toEqual({ kind: 'error' });
  });

  test('survives quotes and backslashes in the code', async () => {
    const parsed = await parseStatements(webR, 'cat("a \\"b\\" \\\\ c\\n")');
    expect(parsed).toEqual({ kind: 'ok', ranges: [[1, 1]] });
  });
});

describe('runInConsole', () => {
  test('echoes each statement before its output, then stops at an error', async () => {
    const result = await runInConsole(webR, env, '# setup\nz <- 1:3\nsum(z)\nstop("boom")\nz * 2', false);
    expect(result.lines.map((l) => [l.type, l.text])).toEqual([
      ['echo', '> # setup'],
      ['echo', '> z <- 1:3'],
      ['echo', '> sum(z)'],
      ['stdout', '[1] 6'],
      ['echo', '> stop("boom")'],
      ['error', 'boom'],
    ]);
    expect(result.errored).toBe(true);
  });

  test('marks continuation lines with +', async () => {
    const result = await runInConsole(webR, env, 'c(1,\n  2)', false);
    expect(result.lines.filter((l) => l.type === 'echo').map((l) => l.text)).toEqual(['> c(1,', '+   2)']);
  });

  test('catches help and View instead of sending them to R', async () => {
    const result = await runInConsole(webR, env, '?mean\nView(z)', false);
    expect(result.requests).toEqual([
      { kind: 'help', topic: 'mean' },
      { kind: 'view', name: 'z' },
    ]);
    expect(result.errored).toBe(false);
  });

  test('still reports code that does not parse', async () => {
    const result = await runInConsole(webR, env, 'x <- )', false);
    expect(result.lines[0]).toEqual({ type: 'echo', text: '> x <- )' });
    expect(result.errored).toBe(true);
  });
});

describe('the panes', () => {
  test('the environment lists data, values and functions as RStudio does', async () => {
    await clearObjects(webR, env);
    await webR.evalRVoid('df <- data.frame(a = 1:4, b = letters[1:4]); v <- c(2.5, 3); f <- function(x, y) x', { env });
    expect(await listObjects(webR, env)).toEqual([
      { name: 'df', kind: 'data', description: '4 obs. of 2 variables' },
      { name: 'f', kind: 'function', description: 'function (x, y)' },
      { name: 'v', kind: 'value', description: 'num [1:2] 2.5 3' },
    ]);
  });

  test('clearing the environment removes every object', async () => {
    await clearObjects(webR, env);
    expect(await listObjects(webR, env)).toEqual([]);
  });

  test('the data viewer gets rows formatted by R', async () => {
    await webR.evalRVoid('df <- data.frame(a = c(1.5, NA, 3), b = factor(c("x", "y", "x")))', { env });
    expect(await previewData(webR, env, 'df', 2)).toEqual({
      rows: 3,
      shown: 2,
      columns: ['a', 'b'],
      cells: [['1.5', 'x'], ['NA', 'y']],
    });
    expect(await previewData(webR, env, 'nothing_here')).toBeNull();
  });

  test('files list folders first', async () => {
    await webR.FS.mkdir('/home/web_user/data');
    await webR.FS.writeFile('/home/web_user/data/a.csv', new TextEncoder().encode('x\n1\n'));
    const home = await listFiles(webR, '.');
    expect(home.find((f) => f.name === 'data')).toEqual({ name: 'data', folder: true, bytes: expect.any(Number) });
    expect(await listFiles(webR, 'data')).toEqual([{ name: 'a.csv', folder: false, bytes: 4 }]);
  });

  test('help pages come back as text, and unknown topics as null', async () => {
    const text = await helpText(webR, env, 'mean');
    expect(text).toContain('Arithmetic Mean');
    expect(text).toContain('Usage:');
    expect(await helpText(webR, env, 'stats::sd')).toContain('Standard Deviation');
    expect(await helpText(webR, env, 'no_such_topic_here')).toBeNull();
  });
});
