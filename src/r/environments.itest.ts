// @vitest-environment node
import { WebR } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createChildEnv, createLessonEnv, destroyEnv } from './environments';
import { evaluateR } from './evaluate';

let webR: WebR;

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
}, 300_000);

afterAll(async () => {
  await webR.close();
});

const text = (r: { output: { data: string }[] }) => r.output.map((o) => o.data).join('\n');

describe('lesson environments', () => {
  test('objects persist across evaluations in the same lesson', async () => {
    const env = await createLessonEnv(webR);
    await evaluateR(webR, 'x <- 42', { env });
    const result = await evaluateR(webR, 'x', { env });
    expect(text(result)).toContain('42');
    await destroyEnv(webR, env);
  });

  test('lessons cannot see each other objects', async () => {
    const a = await createLessonEnv(webR);
    const b = await createLessonEnv(webR);
    await evaluateR(webR, 'secret <- 99', { env: a });
    const result = await evaluateR(webR, 'secret', { env: b });
    expect(result.errored).toBe(true);
    await destroyEnv(webR, a);
    await destroyEnv(webR, b);
  });

  test('base R remains reachable from a lesson environment', async () => {
    const env = await createLessonEnv(webR);
    const result = await evaluateR(webR, 'mean(c(1, 2, 3))', { env });
    expect(text(result)).toContain('2');
    await destroyEnv(webR, env);
  });

  test('a child environment sees its parent objects but not the reverse', async () => {
    const parent = await createLessonEnv(webR);
    await evaluateR(webR, 'shared <- 7', { env: parent });
    const child = await createChildEnv(webR, parent);

    const visible = await evaluateR(webR, 'shared', { env: child });
    expect(text(visible)).toContain('7');

    await evaluateR(webR, 'attempt <- 1', { env: child });
    const leaked = await evaluateR(webR, 'attempt', { env: parent });
    expect(leaked.errored).toBe(true);

    await destroyEnv(webR, child);
    await destroyEnv(webR, parent);
  });
});
