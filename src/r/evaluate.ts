import type { RObject, WebR } from 'webr';

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

    const output: RunOutput[] = captured.output.map((item) => ({
      type: item.type as RunOutput['type'],
      data: typeof item.data === 'string' ? item.data : String(item.data),
    }));

    return {
      output,
      images: captured.images ?? [],
      errored: output.some((o) => o.type === 'error'),
    };
  } finally {
    shelter.purge();
  }
}
