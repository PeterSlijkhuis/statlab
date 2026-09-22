# StatLab

Interactive statistics and R for psychology and business students at the
**University of Twente**.

StatLab is a static site that runs real R in the browser through
[webR](https://docs.r-wasm.org/webr/latest/). A student reads a lesson, commits
to a prediction, edits and runs R, and gets their answers graded — with no
installation, no backend, no accounts, and no data leaving their machine.

Statistics is taught through the linear model, in tidyverse style, following the
course team's own R workshops: `lm`, `lmer` and `glm`, with t-tests, ANOVA and
chi-square shown as the same models under their traditional names.

## What is built so far

The curriculum in the design specification is fourteen modules. This repository
currently contains the application shell plus **Module 6 (Sampling)**; the
remaining modules are content work against an interface that is now frozen.

- **App shell** — sidebar with per-lesson progress, home page with "continue
  where you left off", R status and restart, an R playground, and a
  "Which model should I use?" decision guide covering `lm`, `lmer` and `glm`.
- **R runtime** — webR 0.6.0, pinned. One R environment per lesson, a throwaway
  child per exercise attempt, and course datasets mounted so
  `read.csv("data/...")` works as it does in any R session.
- **Lesson blocks** — `<Predict>`, `<CodeBlock>`, `<Exercise>`, `<Quiz>`,
  `<Interpret>` and `<Simulation>`, written as MDX.
- **Module 6** — three lessons, three graded exercises and the Central Limit
  Theorem simulation, against a 5000-student population dataset.
- **Progress** — kept in the browser's `localStorage`, exportable and importable
  as JSON.

## Running it locally

Node 22 or newer.

```bash
npm ci        # installs dependencies and applies patches/webr+0.6.0.patch
npm run dev   # development server
```

The first page load downloads R and the course packages (`dplyr`, `ggplot2`)
from the webR CDN, so it needs a network connection and takes a while. Later
loads are served from the browser cache.

| Command | What it does |
|---|---|
| `npm run dev` | Vite development server |
| `npm run build` | Type check, then build to `dist/` |
| `npm test` | Unit tests, plus the integration tests that boot real R |
| `npm run validate` | Runs every exercise and lesson code block in real R |
| `npm run e2e` | Playwright smoke tests against the built site |

`npm test` and `npm run validate` download R and the course packages from
`webr.r-wasm.org` and `repo.r-wasm.org`. On a machine without access to both,
the R integration tests fail with `Could not install dplyr, ggplot2`; the rest
of the suite still runs.

Datasets are generated deterministically and committed. Regenerating them
rewrites `public/data/wellbeing-population.csv`:

```bash
node scripts/generate-datasets.mjs
```

## How exercises are graded

An exercise declares a `check`: an R snippet returning
`list(pass = <logical>, message = <character>)`. Checks compare **values, not
source text**, and read the student's objects only through `has_answer()` and
`answer()`, which look in the attempt environment alone. That matters because a
lesson's own code blocks create the very objects an exercise asks for; without
it, an empty submission would pass.

Four outcomes are kept apart, so a student is never told their answer is wrong
when something else broke: `pass`, `fail`, *your code did not run*, and *this
check is broken*.

Every exercise carries a reference solution, plausible wrong answers, and any
other correct routes a student might take. `npm run validate` runs all of them
in real R and requires the solutions to pass and the wrong answers to be
rejected by the check rather than by an error. It runs in CI before anything is
deployed.

## Deployment

GitHub Actions builds and deploys to GitHub Pages on every push to `main`, at:

    https://peterslijkhuis.github.io/statlab/

A failing type check, unit test, content validation or smoke test blocks the
deploy. Vite is configured with `base: '/statlab/'` and the router with a
matching basename; both are needed or the deployed site renders blank.

Two things have to be set up outside this repository before the first deploy:

1. **Pages must be set to deploy from GitHub Actions** (Settings → Pages →
   Source).
2. **The repository must be public**, unless the account is on a paid plan.
   GitHub Pages does not serve a private repository on the free plan, so
   publishing to students is a deliberate, separate step.

### A note on the webR patch

`patches/webr+0.6.0.patch` is applied by `patch-package` on install. It makes a
single change to webR's worker: the Node code path wraps a resolved filesystem
path in `pathToFileURL` before importing it, because a Windows path such as
`C:\...` is rejected by Node's ESM loader. It affects only Node, where the
content validator runs, and not the browser.

## Repository layout

```
src/components/   lesson blocks (CodeBlock, Exercise, Quiz, …)
src/content/      lessons (MDX), exercise definitions, the module manifest
src/pages/        Home, Lesson, Playground, "Which model should I use?"
src/r/            webR client, session setup, evaluation, exercise checking
src/sims/         interactive simulations and their seeded RNG
src/state/        progress in localStorage
public/data/      course datasets
docs/superpowers/ design specification and implementation plan
e2e/              Playwright smoke tests
```

The design specification in `docs/superpowers/specs/` is the reference for how
the runtime, lesson blocks, exercise checking and curriculum are meant to work.
