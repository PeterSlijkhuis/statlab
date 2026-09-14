import type { RCharacter, RObject, WebR } from 'webr';

export type RunOutput = {
  type: 'stdout' | 'stderr' | 'message' | 'warning' | 'error';
  data: string;
};

export type RunResult = {
  output: RunOutput[];
  images: ImageBitmap[];
  errored: boolean;
};

export type EvaluateOptions = {
  /** Environment to evaluate in. Defaults to the R global environment. */
  env?: RObject;
  /**
   * Plot capture. Defaults to false: webr::canvas() requires OffscreenCanvas,
   * which Node does not provide, so the CI validator must never enable it.
   */
  graphics?: { width: number; height: number } | false;
};

/**
 * stdout and stderr arrive as plain strings. Conditions (error, warning,
 * message) arrive as R objects whose `$message` holds the text — `String()`
 * on one yields "[object Object]", which is what the student would see in
 * place of their error.
 */
async function conditionText(data: unknown): Promise<string> {
  if (typeof data === 'string') return data;
  try {
    const message = await (data as RObject).get('message');
    const parts = (await (message as RCharacter).toArray()) as (string | null)[];
    return parts.map((part) => part ?? '').join('').trimEnd();
  } catch {
    return 'An R condition was raised, but its message could not be read.';
  }
}

export async function evaluateR(
  webR: WebR,
  code: string,
  opts: EvaluateOptions = {},
): Promise<RunResult> {
  const { env, graphics = false } = opts;
  const shelter = await new webR.Shelter();

  try {
    const captured = await shelter.captureR(code, {
      withAutoprint: true,
      throwJsException: false,
      captureStreams: true,
      captureConditions: true,
      captureGraphics: graphics === false ? false : { width: graphics.width, height: graphics.height },
      ...(env ? { env } : {}),
    });

    const output: RunOutput[] = [];
    for (const item of captured.output) {
      output.push({
        type: item.type as RunOutput['type'],
        data: await conditionText(item.data),
      });
    }

    return {
      output,
      images: captured.images ?? [],
      errored: output.some((o) => o.type === 'error'),
    };
  } finally {
    shelter.purge();
  }
}
