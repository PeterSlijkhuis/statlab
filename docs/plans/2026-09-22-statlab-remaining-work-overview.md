# StatLab — Remaining Work Overview

**Date:** 2026-09-22
**Status:** Planning complete, ready for implementation
**Spec:** `docs/specs/2026-09-14-statlab-r-statistics-webapp-design.md` on `main` — fourteen modules, tidyverse style. Draft PR #2 reconciles it into one authoritative version; its §0 settles four inconsistencies and its §12 records where the code lags the spec. Read whichever of the two is current when you start.

This document is the index for everything the spec describes that the first
implementation plan deliberately left out. It carries the shared conventions,
the build order, and the decisions that each of the five plans below depends on.
Read it once before starting any of them.

**Status (2026-09-22):** Implemented. Every plan indexed here was built in PR #4, merged to `main` and deployed: fourteen modules, 42 lessons, 58 checked exercises, six simulations, both datasets, and the chooser renamed and linked to its lessons. CI is green, including all 58 exercises graded in real R.

**Where this plan was wrong.** PR #4's description is the authoritative list of
the eleven places the plans did not survive contact with running code. The ones
that matter most to a reader of these documents:

1. The Module 3 "Engineering's mean is mid-table, its median highest" surprise
   was **not** achievable from the generator this plan specifies. Wellbeing was
   linear with symmetric noise, so every department's median tracked its mean
   and no seed could separate them. Engineering now carries an unmeasured
   on-call rotation borne by about one engineer in five, which also forced
   Marketing's profile and the residual SD to change.
2. `normalCdf` and `tQuantile` as specified both missed their own stated
   tolerances. Hart's rational approximation replaced Numerical Recipes' erfc,
   and the Cornish-Fisher expansion gained a fifth term.
3. The `pvalue` simulation had no usable scale: with standard-normal groups
   every setting of the observed-difference slider read p = 0.000.
4. Four of the Modules 9 to 14 test assertions were themselves buggy, including
   one regex that stopped at the first nested close paren and would have passed
   vacuously.
5. The validator installed only the core packages, so every lesson needing
   `emmeans`, `car`, `lme4` or `lmerTest` failed to run: 45 of 49 CI failures
   from one cause.
6. Lessons 11-3 and 12-2 piped before attaching `dplyr`, and died on their first
   block in a fresh session. A content test now walks each lesson's blocks in
   order and catches it.

**Open question 3 is settled.** `lme4`, `lmerTest`, `emmeans` and `car` all
install under webR 0.6.0, so Module 13 keeps the shape the spec gives it.

## What exists today

`docs/plans/2026-09-14-statlab-shell-and-module-06.md` built, and
its checkboxes now record, the application shell and Module 6 complete:

- the webR runtime layer (`src/r/`): pinned client, evaluation wrapper,
  lesson and exercise environments, package install, dataset mounting, the
  exercise checker;
- every block component (`CodeBlock`, `Predict`, `Quiz`, `Interpret`,
  `Exercise`, `Simulation`), the shell (`Sidebar`, `RStatus`, `Home`,
  `Lesson`, `Playground`, `TestChooser`), and the progress store;
- the `clt` simulation and the seeded sampling engine behind it;
- Module 6 — three lessons, three checked exercises, negative fixtures;
- the content validator (static checks plus real R under Node) and the
  GitHub Pages workflow.

That work merged to `main` as PR #1 on 2026-09-22, and the site is live at
https://peterslijkhuis.github.io/statlab/. These plans build on its interfaces
and on the spec it brought with it.

## What these plans cover

| Plan | Covers | Spec |
|---|---|---|
| `2026-09-22-statlab-content-platform.md` | The interfaces the remaining content needs and does not yet have: per-lesson package installation, the workplace dataset, the fourteen-module manifest, validator extensions | §3.5, §7.2, §8 |
| `2026-09-22-statlab-simulations.md` | The five simulations other than `clt`: `distribution`, `ci`, `pvalue`, `correlation`, `leastsquares` | §6 |
| `2026-09-22-statlab-modules-01-04-foundations.md` | Modules 1–4 — R basics, data wrangling, descriptives, ggplot2 | §7 |
| `2026-09-22-statlab-modules-05-07-08-inference.md` | Modules 5, 7 and 8 — the normal distribution, estimation, hypothesis testing (Module 6 is already built) | §7 |
| `2026-09-22-statlab-modules-09-14-linear-model.md` | Modules 9–14 — regression, multiple regression, categorical predictors, interactions, repeated measures, binary outcomes | §7 |

## Build order

The content platform is a hard prerequisite: Modules 2–4 and 9–14 read a dataset
that does not exist yet, and Modules 2, 9–14 attach packages the app does not
install yet. Simulations are a prerequisite for the four modules that embed one.

```
content-platform  ──┬──> modules-01-04
                    │
simulations ────────┼──> modules-05-07-08
                    │
                    └──> modules-09-14
```

Within `content-platform`, task P1 (packages) and P2 (dataset) are independent
of each other and can run in parallel. Within each module plan, one module is
one task, and the tasks are independent of each other once the platform is in
place — a module touches only its own manifest entry, its own exercise file, and
its own lesson files.

Recommended sequence for one worker: P1 → P2 → P3 → P4 → S0…S6 → M1…M4 →
M5, M7, M8 → M9…M14 → M15.

Three orderings inside that sequence are hard rather than merely convenient:

- **A module that embeds a simulation cannot land before that simulation is
  registered.** `content.test.ts` fails a `<Simulation name="…" />` whose name is
  not in the registry, so Module 5 waits on `distribution`, Module 7 on `ci`,
  Module 8 on `pvalue`, and Module 9 on both `correlation` and `leastsquares`.
- **M15, the chooser wiring, runs last.** It links each leaf to the lesson that
  teaches it through `findLesson`, which reads the *derived* `MODULES` — so a
  leaf pointing at a module whose lesson files do not exist yet links nowhere.
- **Module 13 waits on P1 step 8**, which is the step that establishes whether
  `lme4` and `lmerTest` install under webR 0.6.0 at all. See open question 3.

## Global constraints

Every task in every plan implicitly includes the Global Constraints section of
the shell plan (webR pin, PostMessage channel, forbidden R functions, evaluation
options, shelter discipline, tolerance-based comparison, value-based checks,
`webR.destroy(obj)`, condition unwrapping). They are not repeated in each plan.
These are the additional constraints that apply to content work.

- **Tidyverse style throughout** (spec §7.1). Pipes (`%>%`),
  `group_by`/`summarise`, ggplot2, and `broom::tidy`/`glance` to read model
  output. Base R appears only where the tidyverse has no equivalent — `t.test`,
  `exp`, `confint`, `pnorm`/`qnorm`, `replicate`, `sample`.
- **Never `library(tidyverse)` in content.** Lessons attach the packages they
  use by name. Module 1 explains the meta-package once, in prose, without
  running it.
- **Every lesson that attaches a package declares it** in its manifest entry, so
  the lesson page can install it before the first code block runs (plan
  `content-platform`, task P1). A lesson whose code calls `library(x)` without
  declaring `x` fails the validator.
- **One model, many names.** Regression, t-tests and ANOVA are taught as `lm`,
  repeated measures as `lmer`, binary outcomes as `glm`. Where a supervisor or
  journal expects the traditional test, the lesson shows the traditional call
  and demonstrates that its statistics match the model's. There are no separate
  lessons for t-tests, ANOVA or chi-square.
- **Always look at the descriptives.** Every model lesson pairs model output
  with `group_by` + `summarise` means and SDs, and at least one exercise per
  part hinges on a sign or direction that only the descriptives reveal.
- **Every inferential lesson ends with an `<Interpret>` block** whose correct
  option is an APA 7 sentence carrying the statistics the output actually
  supports, and whose distractors are the standard misinterpretations.
- **Original material.** Lessons follow the course workshops' approach and
  reporting style; their text, examples and datasets are written fresh.

## Naming conventions

Frozen by Module 6; every plan below follows them.

| Thing | Convention | Example |
|---|---|---|
| Module id | `module-NN`, zero-padded | `module-11` |
| Lesson id | `NN-k` | `11-2` |
| Lesson file | `src/content/lessons/NN-k-slug.mdx` | `11-2-dummy-coding.mdx` |
| Exercise file | `src/content/exercises/module-NN.ts` | `module-11.ts` |
| Exercise export | `moduleNN: ExerciseDef[]` | `module11` |
| Exercise id | `mN-k-a`, `-b`, … (module number unpadded) | `m11-2-a` |
| Block id | lowercase, hyphenated, unique within a lesson | `p-slope`, `q-dummy` |
| Simulation name | one lowercase word | `leastsquares` |

Block ids must be unique *within a lesson file* — progress is keyed by lesson id
plus block id, and a duplicate silently overwrites a saved draft or quiz answer.
`src/content/content.test.ts` enforces this.

## Interfaces these plans consume

All frozen by the shell plan. Quoted here so no task has to go looking.

```ts
// src/r/checker.ts
export type ExerciseDef = {
  id: string;
  prompt: string;
  starterCode: string;
  setupCode?: string;              // runs before the student's code
  solution: string;
  wrongAnswers: string[];          // each MUST fail via pass = FALSE, not by erroring
  alternateSolutions?: string[];   // each MUST pass
  check: string;                   // R returning list(pass = <logical>, message = <character>)
  hints: string[];
};

// src/content/manifest.ts
export type LessonMeta = { id: string; title: string; file: string; exercises: string[] };
export type ModuleMeta = { id: string; number: number; title: string; lessons: LessonMeta[] };
```

Inside a `check`, the student's objects are reachable **only** through
`has_answer(name)` and `answer(name)`, which look in the attempt environment and
never inherit from the lesson environment above it. A check that writes
`exists("x")` or bare `x` reads the lesson's own objects and will pass an empty
submission; the validator catches this, but write checks the right way from the
start:

```r
if (!has_answer("model")) {
  list(pass = FALSE, message = "I could not find an object called model.")
} else {
  model <- answer("model")
  ...
}
```

> **Note.** Module 6's three checks already use `has_answer`/`answer`, and its
> validator suite grades each of them a second time in the environment the
> lesson leaves behind. Copy that pattern, including the second grading pass.

Components available in MDX (`src/content/mdxComponents.tsx`): `CodeBlock`,
`Exercise`, `Interpret`, `Predict`, `Quiz`, `Simulation`. Using any other
capitalised tag fails the content test.

## Decisions taken in these plans

Recorded here because a reviewer will want the list in one place.

1. **Three lessons per module**, as in Module 6. It keeps a sitting short enough
   to finish and gives each module a predict → build → interpret arc.
2. **One dataset for Parts 1 and 3** (`workplace.csv`), one for Part 2
   (`wellbeing-population.csv`, already built). Students learn one codebook
   rather than fourteen, and the workplace study is designed so every model in
   Part 3 has a real effect to find.
3. **`workplace.csv` is a single wide file**, including both engagement time
   points as columns. Module 2 and Module 13 both need `pivot_longer` to have
   something to do.
4. **Packages are declared per lesson and installed on demand**, extending the
   core install rather than front-loading 90 MB at boot (spec §3.5).
5. **Exercise count: two per lesson in Parts 1 and 3, one to two in Part 2.**
   Module 6 set the floor at one; the modelling modules need two, because the
   model-fitting step and the reading-the-output step fail in different ways.
6. **Simulations carry no props.** The registry is `Record<string, ComponentType>`
   and `<Simulation name="…" />` passes nothing, so every simulation owns its own
   controls and defaults.

## Open questions

1. **Settled: the spec version.** These plans are written against the amended
   spec — fourteen modules, tidyverse, a linear-model-centred curriculum. That
   was an open choice when they were drafted; it is not any more. PR #1 merged
   on 2026-09-22 and brought the amendment onto `main`, and draft PR #2
   reconciles the two live versions into one document that takes the amendment
   as its base. Nothing in these plans depends on the superseded twelve-module,
   base-R version.
2. **Package download budget.** Spec §3.5 measures the core set at about 40 MB
   and the modelling packages at about 49 MB beyond it. A student who works
   through Module 13 downloads both. This is planned as an on-demand install
   with a visible progress state; if it proves too slow on campus wifi, the
   fallback is to self-host the webR binary repository, which §3.1 already
   anticipates as a one-line change.
3. **Settled: `lme4`/`lmerTest` under webR.** Module 13 depended on them being
   installable from the webR binary repository at v0.6.0, and the fallback was
   to teach the paired *t*-test and the long-format reshape only. PR #4's CI run
   installed `lme4`, `lmerTest`, `emmeans` and `car` under webR 0.6.0 and ran
   every Module 13 exercise against them, so Module 13 keeps the shape the spec
   gives it and the fallback is not needed.

## Self-review

Run this after all five plans are implemented, against spec §7 and §10.

| Spec section | Covered by |
|---|---|
| §3.5 Packages, on-demand install | content-platform P1 |
| §6 Simulations (five remaining) | simulations S1–S5 |
| §7 Curriculum, Modules 1–4 | modules-01-04 M1–M4 |
| §7 Curriculum, Modules 5, 7, 8 | modules-05-07-08 M5, M7, M8 |
| §7 Curriculum, Modules 9–14 | modules-09-14 M9–M14 |
| §7.1 Teaching approach | Global constraints above; every module task |
| §7.2 Workplace dataset | content-platform P2 |
| §8.1 Content validation | content-platform P4; every module task's validate step |
| §4.2 Chooser links to every leaf's lesson | modules-09-14 M14 step "wire the chooser" |
