import type { RObject, WebR } from 'webr';
import { CORE_PACKAGES, KNOWN_PACKAGES } from './session';
import { rString } from './workspace';

/**
 * Which R packages a student can use in the browser, and the R side of the
 * R Workspace's Packages pane.
 *
 * webR installs packages from its own binary repository (repo.r-wasm.org),
 * which carries most of CRAN, built for the browser. The course installs a
 * few itself (`KNOWN_PACKAGES` in session.ts); the catalogue below adds the
 * ones a student is most likely to reach for in their own analysis. Every
 * name in it is checked against the repository, dependencies included, by
 * packages.itest.ts.
 */

export type RecommendedPackage = { name: string; what: string };
export type PackageGroup = { title: string; packages: RecommendedPackage[] };

export const RECOMMENDED: PackageGroup[] = [
  {
    title: 'Reading and writing data',
    packages: [
      { name: 'readr', what: 'Read CSV and other text files, quickly' },
      { name: 'readxl', what: 'Read Excel files (.xls and .xlsx)' },
      { name: 'writexl', what: 'Save a data frame as an Excel file' },
      { name: 'haven', what: 'Read SPSS, Stata and SAS files' },
      { name: 'janitor', what: 'Clean up column names and count categories' },
    ],
  },
  {
    title: 'Tidying and transforming',
    packages: [
      { name: 'dplyr', what: 'Filter, select, group and summarise data' },
      { name: 'tidyr', what: 'Reshape data between wide and long' },
      { name: 'tibble', what: 'Tidy data frames that print neatly' },
      { name: 'stringr', what: 'Work with text' },
      { name: 'forcats', what: 'Work with categories (factors)' },
      { name: 'lubridate', what: 'Work with dates and times' },
      { name: 'purrr', what: 'Repeat a step over many columns or files' },
    ],
  },
  {
    title: 'Plots',
    packages: [
      { name: 'ggplot2', what: 'The grammar of graphics' },
      { name: 'patchwork', what: 'Put several ggplots side by side' },
      { name: 'scales', what: 'Axis labels as percentages, currency and more' },
    ],
  },
  {
    title: 'Describing data',
    packages: [
      { name: 'psych', what: 'describe(), correlations, reliability (alpha) and factor analysis' },
      { name: 'skimr', what: 'A quick overview of every column' },
    ],
  },
  {
    title: 'Models and tests',
    packages: [
      { name: 'broom', what: 'Model results as tidy tables' },
      { name: 'car', what: 'Type II and III ANOVA, Levene test, VIF' },
      { name: 'emmeans', what: 'Estimated marginal means and pairwise comparisons' },
      { name: 'lme4', what: 'Mixed-effects (multilevel) models' },
      { name: 'lmerTest', what: 'p-values for lme4 models' },
      { name: 'effectsize', what: "Cohen's d, eta squared and other effect sizes" },
      { name: 'performance', what: 'Model checks, R squared and model comparison' },
      { name: 'lavaan', what: 'Structural equation models and confirmatory factor analysis' },
    ],
  },
  {
    title: 'More models',
    packages: [
      { name: 'MASS', what: 'Ordinal and negative binomial regression' },
      { name: 'nnet', what: 'Multinomial regression' },
      { name: 'pscl', what: 'Zero-inflated count models' },
      { name: 'survival', what: 'Survival curves and Cox regression' },
      { name: 'glmnet', what: 'Lasso and ridge regression' },
      { name: 'randomForest', what: 'Random forests' },
    ],
  },
];

/**
 * Packages that do not work in the browser, each with the reason a student
 * sees when they try, and what to use instead where there is something.
 */
export const NOT_IN_BROWSER: Record<string, string> = {
  xlsx: 'it needs Java, which cannot run in a browser. Use readxl to read Excel files and writexl to save them.',
  rJava: 'Java cannot run in a browser.',
  ranger: 'it needs threads, which R in a browser does not have. Use randomForest instead.',
  rstan: 'it compiles each model to C++, and the browser has no compiler. Use R on your own computer.',
  brms: 'it compiles each model to C++ with Stan, and the browser has no compiler. Use R on your own computer.',
  BayesFactor: 'it needs deSolve, which the browser package repository does not carry. Use R on your own computer, or the BIC approximation from lesson 15.3.',
  cmdstanr: 'it compiles each model to C++ with Stan, and the browser has no compiler. Use R on your own computer.',
  shiny: 'a Shiny app needs a web server, which R in a browser cannot start. Use RStudio on your own computer.',
  rmarkdown: 'turning a document into HTML, Word or PDF needs Pandoc, which runs only on your own computer.',
  quarto: 'rendering needs the Quarto program, which runs only on your own computer.',
  devtools: 'it builds packages from source, and the browser has no compiler.',
  remotes: 'it builds packages from GitHub from source, and the browser has no compiler.',
};

/**
 * `library(tidyverse)` attaches these, as the real tidyverse does. The
 * tidyverse package itself also pulls in web and database packages a student
 * never uses here, so the R Workspace attaches its core directly instead.
 */
export const TIDYVERSE_CORE = ['dplyr', 'readr', 'forcats', 'stringr', 'ggplot2', 'tibble', 'lubridate', 'tidyr', 'purrr'] as const;

/** Part of R itself: always there, in the browser too. */
export const BASE_PACKAGES = ['base', 'compiler', 'datasets', 'grDevices', 'graphics', 'grid', 'methods', 'parallel', 'splines', 'stats', 'stats4', 'tcltk', 'tools', 'utils'];

export const RECOMMENDED_NAMES: readonly string[] = [...new Set(RECOMMENDED.flatMap((group) => group.packages.map((p) => p.name)))];

/**
 * Whether a package runs in the R Workspace. `installed` means R has it before
 * the student does anything, `recommended` that it installs in one click,
 * `unavailable` that it cannot work in a browser. Anything else is
 * `unknown`: it may well install, since the repository carries most of CRAN.
 */
export type BrowserSupport = 'installed' | 'recommended' | 'unavailable' | 'unknown';

export function browserSupport(name: string): BrowserSupport {
  if ((CORE_PACKAGES as readonly string[]).includes(name) || BASE_PACKAGES.includes(name)) return 'installed';
  if (name in NOT_IN_BROWSER) return 'unavailable';
  if ((KNOWN_PACKAGES as readonly string[]).includes(name) || RECOMMENDED_NAMES.includes(name) || name === 'tidyverse') return 'recommended';
  return 'unknown';
}

/** An R named character vector literal. */
const rNamed = (entries: [string, string][]) =>
  `c(${entries.map(([name, value]) => `${rString(name)} = ${rString(value)}`).join(', ')})`;

/**
 * Makes `install.packages()`, `library()`, `require()`, `requireNamespace()`
 * and `pkg::fn` work in the R Workspace as they do on a computer: a package
 * that is missing is fetched from webR's repository, where R on a computer
 * would have needed it installed first. Without this, `install.packages()`
 * tries CRAN, which a browser cannot build from, and `library(psych)` fails.
 *
 * The replacements live in an environment slotted between the student's
 * environment and the global one, so they reach only code run in the
 * R Workspace, never a lesson, and never show in the Environment pane.
 */
export async function installPackageShims(webR: WebR, env: RObject): Promise<void> {
  await webR.evalRVoid(
    `(function(target, unavailable, tidyverse) {
      if (identical(attr(parent.env(target), "name"), "statlab_packages")) return(invisible())
      shims <- new.env(parent = parent.env(target))
      attr(shims, "name") <- "statlab_packages"

      installed <- function(pkg) isNamespaceLoaded(pkg) || length(find.package(pkg, quiet = TRUE)) > 0
      ensure <- function(pkgs) {
        for (pkg in pkgs) {
          if (installed(pkg)) next
          if (pkg == "tidyverse") { ensure(tidyverse); next }
          if (!is.na(unavailable[pkg])) {
            stop(sprintf("%s cannot run in the browser: %s", pkg, unavailable[[pkg]]), call. = FALSE)
          }
          message(sprintf("Installing %s for this browser session...", pkg))
          failed <- tryCatch({ suppressWarnings(webr::install(pkg, quiet = TRUE)); FALSE }, error = function(e) TRUE)
          if (failed) {
            stop(sprintf("could not download %s. Check your internet connection and try again.", pkg), call. = FALSE)
          }
          if (!installed(pkg)) {
            # webr::install only warns when the repository cannot be reached, so tell that apart from a wrong name.
            contrib <- sprintf("%s/bin/emscripten/contrib/%s", getOption("webr_pkg_repos"), sub("\\\\.[^.]+$", "", as.character(getRversion())))
            reachable <- tryCatch(nrow(suppressWarnings(utils::available.packages(contriburl = contrib))) > 0, error = function(e) FALSE)
            if (!reachable) {
              stop(sprintf("could not download %s. Check your internet connection and try again.", pkg), call. = FALSE)
            }
            stop(sprintf("there is no package called '%s' that runs in the browser. Check the spelling; if it is right, this one needs R on your own computer.", pkg), call. = FALSE)
          }
        }
        invisible(TRUE)
      }

      shims[["install.packages"]] <- function(pkgs, ...) {
        pkgs <- as.character(pkgs)
        ensure(pkgs)
        for (pkg in pkgs) message(sprintf("%s is installed. Load it with library(%s).", pkg, pkg))
        invisible(NULL)
      }

      shims[["library"]] <- function(package, ..., character.only = FALSE) {
        if (missing(package)) return(base::library(...))
        pkg <- if (character.only) package else as.character(substitute(package))
        if (identical(pkg, "tidyverse")) {
          ensure(tidyverse)
          fresh <- setdiff(tidyverse, sub("^package:", "", search()))
          for (p in tidyverse) suppressPackageStartupMessages(base::library(p, character.only = TRUE, warn.conflicts = FALSE))
          if (length(fresh)) message("Attaching core tidyverse packages: ", paste(fresh, collapse = ", "))
          return(invisible(.packages()))
        }
        ensure(pkg)
        base::library(pkg, character.only = TRUE, ...)
      }

      shims[["require"]] <- function(package, ..., character.only = FALSE) {
        pkg <- if (character.only) package else as.character(substitute(package))
        ok <- tryCatch(ensure(pkg), error = function(e) { warning(conditionMessage(e), call. = FALSE); FALSE })
        if (!isTRUE(ok)) return(invisible(FALSE))
        if (identical(pkg, "tidyverse")) {
          shims[["library"]]("tidyverse", character.only = TRUE)
          return(invisible(TRUE))
        }
        base::require(pkg, character.only = TRUE, ...)
      }

      shims[["requireNamespace"]] <- function(package, ..., quietly = TRUE) {
        if (!isTRUE(tryCatch(ensure(package), error = function(e) FALSE))) return(FALSE)
        base::requireNamespace(package, ..., quietly = quietly)
      }

      shims[["::"]] <- function(pkg, name) {
        pkg <- as.character(substitute(pkg))
        name <- as.character(substitute(name))
        ensure(pkg)
        getExportedValue(pkg, name)
      }

      parent.env(target) <- shims

      # WebAssembly R cannot count CPU cores, so detectCores() returns NA, and
      # packages that size a thread pool from it, lavaan among them, stop.
      # One core is the truth in a browser.
      if (is.na(parallel::detectCores())) local({
        ns <- asNamespace("parallel")
        unlockBinding("detectCores", ns)
        assign("detectCores", function(...) 1L, envir = ns)
        lockBinding("detectCores", ns)
      })
      invisible()
    })(environment(), ${rNamed(Object.entries(NOT_IN_BROWSER))}, ${`c(${TIDYVERSE_CORE.map(rString).join(', ')})`})`,
    { env },
  );
}

export type InstalledPackage = {
  name: string;
  version: string;
  title: string;
  /** Attached with library(), so it shows ticked, as in RStudio. */
  attached: boolean;
  /** Part of R itself, listed under "System library" in RStudio. */
  base: boolean;
};

/** Every package R has now, with whether it is attached. */
export async function listPackages(webR: WebR): Promise<InstalledPackage[]> {
  const rows = await webR.evalRRaw(
    `(function() {
      ip <- utils::installed.packages(fields = "Title")
      ip <- ip[!duplicated(ip[, "Package"]), , drop = FALSE]
      attached <- sub("^package:", "", grep("^package:", search(), value = TRUE))
      title <- gsub("\\\\s+", " ", ifelse(is.na(ip[, "Title"]), "", ip[, "Title"]))
      paste(ip[, "Package"], ip[, "Version"], ip[, "Package"] %in% attached, !is.na(ip[, "Priority"]) & ip[, "Priority"] == "base", title, sep = "\\t")
    })()`,
    'string[]',
  );
  return rows
    .map((row) => {
      const [name, version, attached, base, ...title] = row.split('\t');
      return { name, version, attached: attached === 'TRUE', base: base === 'TRUE', title: title.join('\t') };
    })
    .filter((p) => p.name !== 'translations' && p.name !== 'webr')
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Package names a script plainly asks for: `library(x)`, `require(x)`,
 * `install.packages("x")` or `c("x", "y")`, `requireNamespace("x")` and
 * `x::fn`. The R Workspace installs these before a run so the status pill can
 * show the download; anything written less plainly is still installed by the
 * shims, just without the pill.
 */
export function packagesIn(code: string): string[] {
  const found = new Set<string>();
  const name = /^[A-Za-z][A-Za-z0-9.]*$/;
  const add = (candidate: string) => {
    if (name.test(candidate)) found.add(candidate);
  };
  const withoutComments = code.replace(/#[^\n'"]*$/gm, '');
  for (const m of withoutComments.matchAll(/\b(?:library|require)\(\s*["'`]?([A-Za-z][A-Za-z0-9.]*)["'`]?\s*[,)]/g)) add(m[1]);
  for (const m of withoutComments.matchAll(/\brequireNamespace\(\s*["']([A-Za-z][A-Za-z0-9.]*)["']/g)) add(m[1]);
  for (const m of withoutComments.matchAll(/\binstall\.packages\(\s*(c\([^)]*\)|["'][^"']*["'])/g)) {
    for (const q of m[1].matchAll(/["']([^"']+)["']/g)) add(q[1]);
  }
  for (const m of withoutComments.matchAll(/(?<![\w.$@])([A-Za-z][A-Za-z0-9.]*):::?[A-Za-z.`]/g)) add(m[1]);
  return [...found];
}
