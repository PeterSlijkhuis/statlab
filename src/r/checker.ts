import type { RCharacter, RObject, WebR } from 'webr';
import { createChildEnv, destroyEnv } from './environments';
import { evaluateR, type EvaluateOptions, type RunResult } from './evaluate';

export type ExerciseDef = {
  id: string;
  prompt: string;
  starterCode: string;
  /** Runs before the student's code: seeds, data, fixtures. */
  setupCode?: string;
  solution: string;
  /** Plausible wrong answers. Each MUST fail via pass = FALSE, not by erroring. */
  wrongAnswers: string[];
  /** Other correct routes a student might take. The validator requires every one to pass. */
  alternateSolutions?: string[];
  /** R snippet returning list(pass = <logical>, message = <character>). */
  check: string;
  hints: string[];
};

export type CheckStatus = 'pass' | 'fail' | 'student-error' | 'broken-check';

export type CheckOutcome = {
  status: CheckStatus;
  message: string;
  run: RunResult;
};

/**
 * Wraps the check so it returns a two-element character vector rather than an
 * R list. Reading a character vector back is dependency-free and cannot be
 * misread as a partial result.
 */
function wrapCheck(check: string): string {
  return `local({
  .statlab_result <- local({
${check}
  })
  if (!is.list(.statlab_result) ||
      is.null(.statlab_result$pass) ||
      !is.logical(.statlab_result$pass) ||
      length(.statlab_result$pass) != 1L ||
      is.na(.statlab_result$pass)) {
    stop("statlab: check did not return list(pass = <logical>, message = <character>)")
  }
  .statlab_message <- .statlab_result$message
  if (is.null(.statlab_message)) .statlab_message <- ""
  c(if (isTRUE(.statlab_result$pass)) "TRUE" else "FALSE", as.character(.statlab_message)[1])
})`;
}

export async function runExercise(
  webR: WebR,
  exercise: ExerciseDef,
  studentCode: string,
  parentEnv: RObject,
  graphics: EvaluateOptions['graphics'] = false,
): Promise<CheckOutcome> {
  // Fresh scope per run: nothing from a previous attempt survives.
  const env = await createChildEnv(webR, parentEnv);

  try {
    if (exercise.setupCode) {
      const setup = await evaluateR(webR, exercise.setupCode, { env });
      if (setup.errored) {
        return { status: 'broken-check', message: 'This exercise failed to set up.', run: setup };
      }
    }

    const run = await evaluateR(webR, studentCode, { env, graphics });
    if (run.errored) {
      return { status: 'student-error', message: 'Your code did not run.', run };
    }

    let raw: string[];
    try {
      const checkEnv = await createChildEnv(webR, env);
      try {
        const result = (await webR.evalR(wrapCheck(exercise.check), { env: checkEnv })) as RCharacter;
        raw = ((await result.toArray()) as (string | null)[]).map((v) => v ?? '');
        // Both frees swallow their own failures. The verdict is already
        // computed by this point, and a failed cleanup must never turn a
        // student's correct answer into "this exercise is broken".
        await webR.destroy(result).catch(() => {});
      } finally {
        await destroyEnv(webR, checkEnv).catch(() => {});
      }
    } catch (err) {
      return { status: 'broken-check', message: String(err), run };
    }

    if (raw.length < 2 || (raw[0] !== 'TRUE' && raw[0] !== 'FALSE')) {
      return { status: 'broken-check', message: 'Check returned an unreadable value.', run };
    }

    return raw[0] === 'TRUE'
      ? { status: 'pass', message: raw[1] || 'Correct.', run }
      : { status: 'fail', message: raw[1] || 'Not quite.', run };
  } finally {
    await destroyEnv(webR, env);
  }
}
