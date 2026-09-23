// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { WebR, type RCharacter } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createLessonEnv, destroyEnv } from '../r/environments';
import { evaluateR } from '../r/evaluate';
import { ensurePackages, installCoursePackages, mountDatasets, ON_DEMAND_PACKAGES } from '../r/session';
import { browserSupport } from '../r/packages';
import { allAnswers, packagesDownloaded, packagesMissingHere } from './modelTree';

/**
 * Every snippet in the model chooser, run in real R exactly as a student
 * pastes it into the R Workspace: with the course datasets in data/, after
 * installing the packages it names, as the workspace does on a first run.
 * Only a snippet whose package cannot run in any browser is skipped.
 */

/**
 * Keeps the bootstrap in the mediation snippet short enough for a test run.
 * The number of resamples changes the intervals' precision, not whether the
 * code works.
 */
/**
 * WebAssembly R cannot count CPU cores, so parallel::detectCores() returns NA
 * and lavaan's option check stops on it. The shim runs before lavaan loads,
 * so lavaan sees the patched function however it imports it. A desktop R, where students run
 * lavaan, returns a number, so the snippet itself needs nothing.
 */
const LAVAAN_SHIM = `if (is.na(parallel::detectCores())) local({
  ns <- asNamespace("parallel")
  unlockBinding("detectCores", ns)
  assign("detectCores", function(...) 1L, envir = ns)
  lockBinding("detectCores", ns)
})
`;

function forTest(rCode: string): string {
  const shim = /library\(lavaan\)|lavaan::/.test(rCode) ? LAVAAN_SHIM : '';
  return shim + rCode.replace('bootstrap = 1000', 'bootstrap = 50');
}

/**
 * Detaches every package attached since boot. Each snippet should run as it
 * would in a fresh session: MASS, attached by an earlier snippet, masks
 * dplyr's select() and would break later ones for a reason no student sees.
 */
const DETACH_ADDED = (boot: string[]) => `for (name in setdiff(search(), c(${boot.map((name) => JSON.stringify(name)).join(', ')}))) {
  if (startsWith(name, "package:")) detach(name, character.only = TRUE)
}`;

/** On failure, the calls that led to the error, so a CI log says where it came from. */
function traced(code: string): string {
  return `withCallingHandlers({
${code}
}, error = function(e) {
  calls <- vapply(sys.calls(), function(call) paste(deparse(call, nlines = 1L), collapse = ""), "")
  cat("CALLS:", paste(tail(calls, 12), collapse = "\n  <- "), "\n")
})`;
}

let webR: WebR;
/** search() at boot, before any package is attached. */
let bootSearch: string[];

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
  const search = await webR.evalR('search()');
  bootSearch = (await (search as RCharacter).toArray()) as string[];
  await webR.destroy(search);
  // What the R Workspace has: the core set at boot, the rest on demand.
  await installCoursePackages(webR);
  await ensurePackages(webR, ON_DEMAND_PACKAGES);
  await mountDatasets(webR, async (name) =>
    new Uint8Array(await readFile(new URL(`../../public/data/${name}`, import.meta.url))),
  );
}, 1_800_000);

afterAll(async () => {
  await webR.close();
});

const ANSWERS = allAnswers().map((entry) => entry.answer);

/** A snippet whose packages cannot work in any browser, such as brms, which compiles Stan models to C++. */
const needsDesktop = (answer: (typeof ANSWERS)[number]) =>
  packagesMissingHere(answer).some((name) => browserSupport(name) === 'unavailable');

describe.each(ANSWERS.map((answer) => [answer.id, answer] as const))('%s', (id, answer) => {
  test.skipIf(needsDesktop(answer))('runs without an error in real R', async () => {
    // What the R Workspace downloads on first use, and anything it could not.
    const extra = [...packagesDownloaded(answer), ...packagesMissingHere(answer)];
    if (extra.length) await ensurePackages(webR, extra);
    await webR.evalRVoid(DETACH_ADDED(bootSearch));
    const env = await createLessonEnv(webR);
    try {
      const code = forTest(answer.rCode);
      const result = await evaluateR(webR, code, { env });
      const errors = result.output.filter((line) => line.type === 'error').map((line) => line.data);
      let log = result.output.map((line) => line.data).join('\n');
      if (errors.length) {
        const rerun = await evaluateR(webR, traced(code), { env });
        log += `\n--- traced rerun ---\n${rerun.output.map((line) => line.data).join('\n')}`;
      }
      expect(errors, `${id}:\n${log}`).toEqual([]);
    } finally {
      await destroyEnv(webR, env);
    }
  }, 600_000);
});
