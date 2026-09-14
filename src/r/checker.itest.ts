// @vitest-environment node
import { WebR } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { runExercise, type ExerciseDef } from './checker';
import { createLessonEnv, destroyEnv } from './environments';

let webR: WebR;

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
}, 300_000);

afterAll(async () => {
  await webR.close();
});

const exercise: ExerciseDef = {
  id: 'test-1',
  prompt: 'Assign the mean of x to m.',
  starterCode: 'm <- ',
  setupCode: 'x <- c(2, 4, 6, 8)',
  solution: 'm <- mean(x)',
  wrongAnswers: ['m <- median(x) + 1', 'm <- sum(x)'],
  check: `
    if (!exists("m", inherits = TRUE)) {
      list(pass = FALSE, message = "I could not find an object called m.")
    } else if (isTRUE(all.equal(m, 5, tolerance = 1e-6))) {
      list(pass = TRUE, message = "Correct.")
    } else {
      list(pass = FALSE, message = paste("m is", m, "but should be 5."))
    }
  `,
  hints: ['Use mean().'],
};

async function run(code: string) {
  const env = await createLessonEnv(webR);
  const outcome = await runExercise(webR, exercise, code, env);
  await destroyEnv(webR, env);
  return outcome;
}

describe('runExercise', () => {
  test('the reference solution passes', async () => {
    expect((await run(exercise.solution)).status).toBe('pass');
  });

  test('an alternative but correct route also passes', async () => {
    // Checks inspect values, never source text.
    expect((await run('m <- sum(x) / length(x)')).status).toBe('pass');
  });

  test('a float that differs below tolerance still passes', async () => {
    expect((await run('m <- 5 + 1e-12')).status).toBe('pass');
  });

  test('each declared wrong answer fails via the check, not an error', async () => {
    for (const wrong of exercise.wrongAnswers) {
      const outcome = await run(wrong);
      expect(outcome.status).toBe('fail');
    }
  });

  test('code that throws is reported as a student error, not a wrong answer', async () => {
    const outcome = await run('m <- undefined_function(x)');
    expect(outcome.status).toBe('student-error');
    expect(outcome.run.errored).toBe(true);
  });

  test('a broken check is reported as infrastructure, never as wrong', async () => {
    const broken = { ...exercise, check: 'stop("check is broken")' };
    const env = await createLessonEnv(webR);
    const outcome = await runExercise(webR, broken, exercise.solution, env);
    await destroyEnv(webR, env);
    expect(outcome.status).toBe('broken-check');
  });

  test('a check returning a malformed value is reported as broken', async () => {
    const broken = { ...exercise, check: '"not a list"' };
    const env = await createLessonEnv(webR);
    const outcome = await runExercise(webR, broken, exercise.solution, env);
    await destroyEnv(webR, env);
    expect(outcome.status).toBe('broken-check');
  });

  test('a previous attempt cannot make a later wrong answer pass', async () => {
    const env = await createLessonEnv(webR);
    await runExercise(webR, exercise, exercise.solution, env);
    const outcome = await runExercise(webR, exercise, 'y <- 1', env);
    await destroyEnv(webR, env);
    expect(outcome.status).toBe('fail');
  });
});
