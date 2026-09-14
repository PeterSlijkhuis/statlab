// @vitest-environment node
import { WebR } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { evaluateR } from './evaluate';

let webR: WebR;

beforeAll(async () => {
  // No baseUrl: under Node, webR loads binaries from the installed package.
  webR = new WebR();
  await webR.init();
}, 300_000);

afterAll(async () => {
  await webR.close();
});

const text = (r: { output: { data: string }[] }) => r.output.map((o) => o.data).join('\n');

describe('evaluateR', () => {
  test('autoprints a bare expression', async () => {
    const result = await evaluateR(webR, '1 + 1');
    expect(text(result)).toContain('2');
    expect(result.errored).toBe(false);
  });

  test('captures an R error instead of throwing', async () => {
    const result = await evaluateR(webR, 'stop("boom")');
    expect(result.errored).toBe(true);
    expect(result.output.some((o) => o.type === 'error' && o.data.includes('boom'))).toBe(true);
  });

  test('captures warnings separately from errors', async () => {
    const result = await evaluateR(webR, 'warning("careful")');
    expect(result.errored).toBe(false);
    expect(result.output.some((o) => o.type === 'warning')).toBe(true);
  });

  test('captures stdout from explicit printing', async () => {
    const result = await evaluateR(webR, 'cat("hello\\n")');
    expect(text(result)).toContain('hello');
  });

  test('returns no images when graphics are disabled', async () => {
    const result = await evaluateR(webR, 'x <- 1');
    expect(result.images).toEqual([]);
  });
});
