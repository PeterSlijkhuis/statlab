<div align="center">

# StatLab

**Interactive statistics and R for psychology and business students**

University of Twente

[![Live site](https://img.shields.io/badge/live-peterslijkhuis.github.io%2Fstatlab-2ea44f?style=flat-square)](https://peterslijkhuis.github.io/statlab/)
[![Deploy](https://img.shields.io/github/actions/workflow/status/PeterSlijkhuis/statlab/deploy.yml?branch=main&style=flat-square&label=deploy)](https://github.com/PeterSlijkhuis/statlab/actions/workflows/deploy.yml)
[![R in the browser](https://img.shields.io/badge/R-webR%200.6.0-276DC3?style=flat-square&logo=r)](https://docs.r-wasm.org/webr/latest/)
[![Built with](https://img.shields.io/badge/built%20with-Vite%20%2B%20React%20%2B%20TypeScript-646CFF?style=flat-square)](https://vite.dev/)

**[Open StatLab](https://peterslijkhuis.github.io/statlab/)**

</div>

---

StatLab teaches introductory statistics by having students *run* it. Every code
block and every exercise executes real R in the browser through
[webR](https://docs.r-wasm.org/webr/latest/): no installation, no accounts, no
backend, and no data leaving the student's machine.

Statistics is taught through the linear model, in tidyverse style, following the
course team's own R workshops. `lm`, `lmer` and `glm` are one idea under many
names, so the t-test, ANOVA and the paired t-test arrive as special cases rather
than as separate recipes to memorise.

## The course

Fourteen modules, forty-two lessons, sixty-one graded exercises and six
interactive simulations.

### Foundations

| # | Module | What it covers | Exercises |
|---|---|---|---|
| 1 | First steps in R | Objects, functions, help, packages and `library()` | 5 |
| 2 | Working with data | `read.csv`, factors, the pipe, `select` / `filter` / `mutate`, wide vs long | 5 |
| 3 | Describing data | `group_by` and `summarise`, mean vs median, spotting surprises in a summary | 5 |
| 4 | Visualising data | ggplot2 as layers, up to an APA-ready figure | 4 |

### Inference

| # | Module | What it covers | Exercises | Simulation |
|---|---|---|---|---|
| 5 | The normal distribution | Density, z-scores, probabilities | 5 | `distribution` |
| 6 | Sampling | Sampling error, sampling distributions, the CLT | 3 | `clt` |
| 7 | Estimation | Standard error, confidence intervals, SD vs SE vs CI | 4 | `ci` |
| 8 | Hypothesis testing | NHST logic, p-values, Type I and II errors, power | 4 | `pvalue` |

### The linear model

| # | Module | What it covers | Exercises | Simulation |
|---|---|---|---|---|
| 9 | Correlation and simple regression | `lm(y ~ x)`, `tidy()` and `glance()`, correlation as a standardised slope | 5 | `correlation`, `leastsquares` |
| 10 | Multiple regression | Several predictors, each slope holding the others constant | 4 | |
| 11 | Categorical predictors | Dummy coding, the reference level, `emmeans` pairwise comparisons | 5 | |
| 12 | Interactions and factorial designs | `a * b`, sum-to-zero contrasts, Type III tests, cell means | 4 | |
| 13 | Repeated measures and nested data | `pivot_longer`, `lmer` with `(1 \| id)`, fixed vs random effects | 4 | |
| 14 | Binary outcomes | `glm(..., family = binomial)`, log odds, odds ratios | 4 | |

There is also a **Which model should I use?** decision guide at `/which-model`,
which walks from a question about the data to the R call that answers it, and
links each answer to the lesson that teaches it.

## How a lesson works

A lesson is MDX, so it reads as prose with interactive blocks dropped into it.

| Block | What the student does |
|---|---|
| `<Predict>` | Commits to an answer *before* seeing the result, so the surprise lands |
| `<CodeBlock>` | Runs prepared R and reads the output |
| `<Exercise>` | Writes R and has it graded, with hints on request |
| `<Simulation>` | Drags sliders and watches the sampling behaviour change |
| `<Quiz>` | Checks a concept, with a response written for every wrong choice |
| `<Interpret>` | Picks the sentence that would survive a reviewer |

Each lesson gets one R environment, which its code blocks build up in order, so
an exercise can use objects the lesson just created. Each exercise attempt runs
in a throwaway child of that environment, so one attempt never contaminates the
next.

## How exercises are graded

An exercise declares a `check`: an R snippet returning
`list(pass = <logical>, message = <character>)`.

Checks compare **values, not source text**, and read the student's objects only
through `has_answer()` and `answer()`, which look in the attempt environment
alone. That last part matters: a lesson's own code blocks create the very
objects an exercise asks for, so a check that read the surrounding environment
would pass an empty submission.

Four outcomes are kept apart, so a student is never told their answer is wrong
when something else broke:

| Outcome | Means |
|---|---|
| `pass` | The check is satisfied |
| `fail` | The code ran and the answer is not right, with a message saying why |
| `student-error` | The code did not run |
| `broken-check` | The check itself is at fault, which is ours to fix, not theirs |

Every exercise carries a reference solution, plausible wrong answers, and the
other correct routes a student might take. `npm run validate` runs all of them
in real R and requires the solutions to pass and the wrong answers to be
rejected *by the check* rather than by an error. It runs in CI before anything
is deployed, together with a static pass over the content and a check that the
course dataset still contains the effects the lessons teach against.

## Running it locally

Node 22 or newer.

```bash
npm ci        # installs dependencies and applies patches/webr+0.6.0.patch
npm run dev   # development server on http://localhost:5173
```

The first page load downloads R and the course packages from the webR CDN, so it
needs a network connection and takes a while. Later loads come from the browser
cache.

| Command | What it does |
|---|---|
| `npm run dev` | Vite development server |
| `npm run build` | Type check, then build to `dist/` |
| `npm test` | Unit tests, plus the integration tests that boot real R |
| `npm run validate` | Dataset criteria, static content checks, then every exercise and lesson code block in real R |
| `npm run validate:static` | The static content checks alone, in about two seconds |
| `npm run check:data` | Verifies the workplace dataset still has the effects the lessons teach |
| `npm run data` | Regenerates both datasets deterministically |
| `npm run e2e` | Playwright smoke tests against the built site |

`npm test` and `npm run validate` download R and packages from `webr.r-wasm.org`
and `repo.r-wasm.org`. Without access to both, the R integration tests fail and
the rest of the suite still runs.

### R packages

`dplyr`, `ggplot2`, `tidyr` and `broom` install when R starts. `emmeans`, `car`,
`lme4` and `lmerTest` are heavier and install on demand, when a student opens a
lesson that declares them in the module manifest. A lesson has to attach what it
uses with `library()`, exactly as a student would in RStudio, and a content test
fails the build if a lesson pipes before attaching `dplyr` or `tidyr`.

### Datasets

Both are original, fictional, and generated deterministically from a seed, then
committed:

| File | What it is |
|---|---|
| `wellbeing-population.csv` | 5000 students, the population Modules 5 to 8 sample from |
| `workplace.csv` | 480 employees across four departments and several sites, built so every model in Part 3 has a real effect to find |

`workplace.csv` is tuned, not random: `npm run check:data` asserts twelve
properties the lessons rely on, down to Engineering's mean wellbeing sitting
mid-table while its median is the highest in the company. Run it after any
change to `scripts/generate-datasets.mjs`.

## Deployment

GitHub Actions builds and deploys to GitHub Pages on every push to `main`:

> **https://peterslijkhuis.github.io/statlab/**

A failing type check, unit test, dataset check, content validation or smoke test
blocks the deploy. Vite is configured with `base: '/statlab/'` and the router
with a matching basename; both are needed or the deployed site renders blank.

Two things are set outside this repository:

1. **Pages deploys from GitHub Actions** (Settings, then Pages, then Source).
   Switching that to a branch breaks the workflow at its configure-pages step.
2. **The repository is public.** GitHub Pages does not serve a private
   repository on the free plan.

### A note on the webR patch

`patches/webr+0.6.0.patch` is applied by `patch-package` on install. It makes one
change to webR's worker: the Node code path wraps a resolved filesystem path in
`pathToFileURL` before importing it, because a Windows path such as `C:\...` is
rejected by Node's ESM loader. It affects only Node, where the content validator
runs, and never the browser.

## Repository layout

```
src/components/   lesson blocks (CodeBlock, Exercise, Quiz, Predict, Interpret)
src/content/      lessons (MDX), exercise definitions, the module manifest
src/pages/        Home, Lesson, Playground, "Which model should I use?"
src/r/            webR client, session setup, evaluation, exercise checking
src/sims/         interactive simulations and their seeded RNG
src/state/        progress in localStorage, exportable as JSON
public/data/      course datasets
scripts/          dataset generation and the dataset effect checker
docs/superpowers/ design specification and implementation plans
e2e/              Playwright smoke tests
```

The design specification in `docs/superpowers/specs/` is the reference for how
the runtime, the lesson blocks, exercise checking and the curriculum are meant
to work. Where this README and the specification disagree, the specification is
right and the README needs fixing.
