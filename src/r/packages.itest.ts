// @vitest-environment node
import { WebR, type RObject } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createLessonEnv } from './environments';
import { evaluateR } from './evaluate';
import { installPackageShims, listPackages, RECOMMENDED_NAMES, TIDYVERSE_CORE } from './packages';

let webR: WebR;
let env: RObject;

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
  env = await createLessonEnv(webR);
  await installPackageShims(webR, env);
}, 300_000);

afterAll(async () => {
  await webR.close();
});

const text = (r: { output: { data: string }[] }) => r.output.map((o) => o.data).join('\n');
const run = (code: string) => evaluateR(webR, code, { env });

describe("webR's package repository", () => {
  test('carries every recommended package, and everything each one needs', async () => {
    // A package the repository lacks, or one whose dependency it lacks, would
    // show an Install button in the Packages pane that can never succeed.
    const missing = await webR.evalRRaw(
      `(function(wanted) {
        contrib <- sprintf("%s/bin/emscripten/contrib/%s", getOption("webr_pkg_repos"), sub("\\\\.[^.]+$", "", as.character(getRversion())))
        info <- utils::available.packages(contriburl = contrib)
        if (!nrow(info)) stop("could not read the package list at ", contrib)
        deps <- tools::package_dependencies(wanted, db = info, which = c("Depends", "Imports", "LinkingTo"), recursive = TRUE)
        needed <- unique(c(wanted, unlist(deps, use.names = FALSE)))
        have <- c(rownames(info), rownames(utils::installed.packages()), "R")
        setdiff(needed, have)
      })(c(${[...RECOMMENDED_NAMES, ...TIDYVERSE_CORE].map((name) => JSON.stringify(name)).join(', ')}))`,
      'string[]',
    );
    expect(missing).toEqual([]);
  }, 120_000);
});

describe('packages in the playground', () => {
  test('library() installs a package that is missing, then attaches it', async () => {
    const result = await run('library(writexl)\nexists("write_xlsx")');
    expect(result.errored).toBe(false);
    expect(text(result)).toContain('Installing writexl');
    expect(text(result)).toContain('TRUE');
    const listed = (await listPackages(webR)).find((p) => p.name === 'writexl');
    expect(listed).toMatchObject({ attached: true, base: false });
  }, 300_000);

  test('install.packages() installs from the browser repository, not CRAN', async () => {
    const result = await run('install.packages("psych")\nlibrary(psych)\ndescribe(c(2, 4, 6))$mean');
    expect(result.errored).toBe(false);
    expect(text(result)).toContain('psych is installed');
    expect(text(result)).toMatch(/\b4\b/);
  }, 300_000);

  test('pkg::fn installs the package without attaching it', async () => {
    const result = await run('janitor::make_clean_names("My Score")\n"package:janitor" %in% search()');
    expect(result.errored).toBe(false);
    expect(text(result)).toContain('my_score');
    expect(text(result)).toContain('FALSE');
  }, 300_000);

  test('lavaan fits a model, although the browser cannot count its CPU cores', async () => {
    const result = await run(
      'library(lavaan)\nfit <- cfa("visual =~ x1 + x2 + x3", data = HolzingerSwineford1939)\nround(fitMeasures(fit, "cfi"), 2)',
    );
    expect(result.errored, text(result)).toBe(false);
    expect(text(result)).toContain('cfi');
  }, 300_000);

  test('library(tidyverse) attaches the core tidyverse', async () => {
    const result = await run('library(tidyverse)\nall(c("package:dplyr", "package:readr", "package:purrr") %in% search())');
    expect(result.errored).toBe(false);
    expect(text(result)).toContain('TRUE');
  }, 300_000);
});

describe('packages that cannot run in the browser', () => {
  test('say why, and what to use instead', async () => {
    const result = await run('library(xlsx)');
    expect(result.errored).toBe(true);
    expect(text(result)).toContain('xlsx cannot run in the browser');
    expect(text(result)).toContain('readxl');
  });

  test('a name that does not exist is an error that says so', async () => {
    const result = await run('library(notapackageatall)');
    expect(result.errored).toBe(true);
    expect(text(result)).toContain("no package called 'notapackageatall'");
  }, 120_000);

  test('require() returns FALSE with a warning instead of stopping', async () => {
    const result = await run('ok <- require(shiny)\nok');
    expect(result.errored).toBe(false);
    expect(text(result)).toContain('FALSE');
  });
});

describe('the shims', () => {
  test('stay out of the Environment pane and survive clearing it', async () => {
    await run('rm(list = ls())');
    expect(await webR.evalRRaw('ls(environment())', 'string[]', { env })).toEqual([]);
    const result = await run('stats::sd(c(1, 2, 3))');
    expect(text(result)).toContain('1');
  });

  test('are not installed twice', async () => {
    await installPackageShims(webR, env);
    const depth = await webR.evalRNumber(
      'n <- 0; e <- environment(); while (!identical(e, globalenv())) { n <- n + 1; e <- parent.env(e) }; n',
      { env },
    );
    expect(depth).toBe(2);
  });

  test('never reach a lesson', async () => {
    const lesson = await createLessonEnv(webR);
    const result = await evaluateR(webR, 'environmentName(environment(library))', { env: lesson });
    expect(text(result)).toContain('base');
  });
});
