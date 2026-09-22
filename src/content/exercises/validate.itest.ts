// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { WebR, type RCharacter } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ALL_EXERCISES } from './index';
import { ALL_LESSONS } from '../manifest';
import { runExercise } from '../../r/checker';
import { createLessonEnv, destroyEnv } from '../../r/environments';
import { evaluateR } from '../../r/evaluate';
import { installCoursePackages, mountDatasets } from '../../r/session';

let webR: WebR;
/** search() before any course package is attached. */
let bootSearch: string[];

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
  const search = await webR.evalR('search()');
  bootSearch = (await (search as RCharacter).toArray()) as string[];
  await webR.destroy(search);
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

    // Each group sits in its own describe: an empty table registers no tests,
    // and a describe with no tests fails ("No test found in suite") instead of
    // passing silently.
    describe('wrong answers', () => {
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
    });

    // Alternates are optional; a declared group must still register its tests.
    if (exercise.alternateSolutions?.length) {
      describe('alternate solutions', () => {
        test.each(exercise.alternateSolutions!.map((code, index) => [index, code] as const))(
          'alternate solution %i passes',
          async (_index, code) => {
            const outcome = await attempt(id, code);
            expect(outcome.status, `${id}: ${outcome.message}`).toBe('pass');
          },
          120_000,
        );
      });
    }
  },
);

// Read from disk rather than via `?raw`: the MDX plugin compiles `x.mdx?raw` too.
const readLesson = async (file: string) =>
  (await readFile(new URL(`../lessons/${file}.mdx`, import.meta.url), 'utf8')).replace(/\r\n?/g, '\n');

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
  test('its code blocks run in order without an R error, and its exercises grade correctly after them', async () => {
    const source = await readLesson(lesson.file);
    const blocks = codeBlocks(source);
    // Fails loudly if the pattern above stops matching how blocks are written.
    expect(blocks.length, `${lessonId}: a <CodeBlock> could not be extracted`).toBe(
      source.match(/<CodeBlock\b/g)?.length ?? 0,
    );

    // A lesson must attach its own packages: detach whatever earlier tests left
    // attached, so a missing library() fails here as it would in a fresh browser.
    await webR.evalRVoid(
      `for (name in setdiff(search(), c(${bootSearch.map((name) => JSON.stringify(name)).join(', ')}))) detach(name, character.only = TRUE, unload = FALSE)`,
    );

    const env = await createLessonEnv(webR);
    try {
      for (const block of blocks) {
        const result = await evaluateR(webR, block.code, { env, graphics: false });
        const errors = result.output.filter((o) => o.type === 'error').map((o) => o.data);
        expect(result.errored, `${lessonId}, block "${block.id}": ${errors.join('\n')}`).toBe(false);
      }

      // Grade as the app does: in the environment the lesson's blocks leave
      // behind, which already holds objects the exercises ask for.
      const problems: string[] = [];
      for (const exerciseId of lesson.exercises) {
        const exercise = ALL_EXERCISES.find((candidate) => candidate.id === exerciseId)!;
        const grade = async (label: string, code: string, expected: (status: string) => boolean) => {
          const outcome = await runExercise(webR, exercise, code, env, false);
          if (!expected(outcome.status)) problems.push(`${exerciseId}, ${label}: ${outcome.status}: ${outcome.message}`);
        };
        await grade('empty submission', '', (status) => status !== 'pass');
        await grade('unchanged starter code', exercise.starterCode, (status) => status !== 'pass');
        for (const [index, code] of exercise.wrongAnswers.entries()) {
          await grade(`wrong answer ${index}`, code, (status) => status === 'fail');
        }
        await grade('solution', exercise.solution, (status) => status === 'pass');
      }
      expect(problems, `${lessonId}: grading in the lesson environment`).toEqual([]);
    } finally {
      await destroyEnv(webR, env);
    }
  }, 300_000);
});
