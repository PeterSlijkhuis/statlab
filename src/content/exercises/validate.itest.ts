// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { WebR } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ALL_EXERCISES } from './index';
import { ALL_LESSONS } from '../manifest';
import { runExercise } from '../../r/checker';
import { createLessonEnv, destroyEnv } from '../../r/environments';
import { evaluateR } from '../../r/evaluate';
import { installCoursePackages, mountDatasets } from '../../r/session';

let webR: WebR;

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
  await installCoursePackages(webR);
  await mountDatasets(webR, async (name) =>
    new Uint8Array(await readFile(new URL(`../../../public/data/${name}`, import.meta.url))),
  );
}, 600_000);

afterAll(async () => {
  await webR.close();
});

async function attempt(exerciseId: string, code: string) {
  const exercise = ALL_EXERCISES.find((candidate) => candidate.id === exerciseId)!;
  const env = await createLessonEnv(webR);
  try {
    // Graphics stay off: webr::canvas() needs OffscreenCanvas, absent in Node.
    return await runExercise(webR, exercise, code, env, false);
  } finally {
    await destroyEnv(webR, env);
  }
}

describe.each(ALL_EXERCISES.map((exercise) => [exercise.id, exercise] as const))(
  'exercise %s',
  (id, exercise) => {
    test('the reference solution passes its own check', async () => {
      const outcome = await attempt(id, exercise.solution);
      expect(outcome.status, `${id}: ${outcome.message}`).toBe('pass');
    }, 120_000);

    test.each(exercise.wrongAnswers.map((code, index) => [index, code] as const))(
      'wrong answer %i is rejected by the check, not by an error',
      async (_index, code) => {
        const outcome = await attempt(id, code);
        // 'student-error' would mean the code merely failed to run, which
        // proves nothing about whether the check can discriminate.
        expect(outcome.status, `${id}: expected a check rejection, got ${outcome.status}: ${outcome.message}`).toBe(
          'fail',
        );
      },
      120_000,
    );

    if (exercise.alternateSolutions?.length) {
      test.each(exercise.alternateSolutions.map((code, index) => [index, code] as const))(
        'alternate solution %i passes',
        async (_index, code) => {
          const outcome = await attempt(id, code);
          expect(outcome.status, `${id}: ${outcome.message}`).toBe('pass');
        },
        120_000,
      );
    }
  },
);

// Read from disk rather than via `?raw`: the MDX plugin compiles `x.mdx?raw` too.
const readLesson = (file: string) => readFile(new URL(`../lessons/${file}.mdx`, import.meta.url), 'utf8');

/**
 * The code of each <CodeBlock id="…" code={`…`} /> in document order. Template
 * literal escapes (\`, \$, \\) are undone so R sees what the browser runs.
 */
function codeBlocks(source: string): { id: string; code: string }[] {
  return [...source.matchAll(/<CodeBlock\s+id="([^"]+)"\s+code=\{`((?:\\[\s\S]|[^`\\])*)`\}\s*\/>/g)].map(
    (match) => ({ id: match[1], code: match[2].replace(/\\([`$\\])/g, '$1') }),
  );
}

describe.each(ALL_LESSONS.map((lesson) => [lesson.id, lesson] as const))('lesson %s', (lessonId, lesson) => {
  test('its code blocks run in order without an R error', async () => {
    const source = await readLesson(lesson.file);
    const blocks = codeBlocks(source);
    // Fails loudly if the pattern above stops matching how blocks are written.
    expect(blocks.length, `${lessonId}: a <CodeBlock> could not be extracted`).toBe(
      source.match(/<CodeBlock\b/g)?.length ?? 0,
    );

    const env = await createLessonEnv(webR);
    try {
      for (const block of blocks) {
        const result = await evaluateR(webR, block.code, { env, graphics: false });
        const errors = result.output.filter((o) => o.type === 'error').map((o) => o.data);
        expect(result.errored, `${lessonId}, block "${block.id}": ${errors.join('\n')}`).toBe(false);
      }
    } finally {
      await destroyEnv(webR, env);
    }
  }, 300_000);
});
