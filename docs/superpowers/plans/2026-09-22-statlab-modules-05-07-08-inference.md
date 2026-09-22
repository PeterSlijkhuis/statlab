# StatLab — Modules 5, 7 and 8: Inference

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write the three remaining Part 2 modules — the normal distribution, estimation, and hypothesis testing — as complete content against the frozen interfaces: nine lesson MDX files, thirteen checked exercises with negative and alternate fixtures, and the manifest entries that make them live.

**Overview:** `docs/superpowers/plans/2026-09-22-statlab-remaining-work-overview.md`

**Spec:** `docs/superpowers/specs/2026-09-14-statlab-r-statistics-webapp-design.md` §6, §7 (Modules 5, 7, 8), §7.1, §7.2

**Depends on:** the shell plan (merged); `content-platform` tasks P1, P3 and P4; `simulations` tasks S1 (`distribution`), S2 (`ci`) and S3 (`pvalue`).

Module 6 (Sampling) is already built and is the middle of this arc. This plan does not touch it. It does build directly on it: Module 7 starts from the standard error Module 6 derived, and Module 8 starts from the sampling distribution Module 6 constructed. Read `src/content/lessons/06-2-sampling-distribution.mdx` before writing a line of Module 7, and `06-3-central-limit-theorem.mdx` before writing Module 8 — the voice, the length and the predict → build → interpret arc of these nine lessons must be indistinguishable from those three.

## Global Constraints

The shell plan's Global Constraints and the overview's content constraints apply in full. These are additional, and specific to Part 2.

- **One population, no new columns.** All nine lessons and all thirteen exercises read `public/data/wellbeing-population.csv` — the same 5000-student population Module 6 uses — with the columns it actually has: `id`, `programme` (Psychology/Business), `stress` (skewed), `sleep_hours`, `exam_score`. Nothing invents a column, and nothing modifies the file (the content-platform plan's constraint that it stay byte-identical is binding here too).
- **The `packages` field means "beyond the core set."** Task P1 installs `dplyr`, `ggplot2`, `tidyr`, `readr` and `broom` at boot and documents `LessonMeta.packages` as "packages this lesson's code attaches beyond the core set". The P3 table's `—` for Module 5, 07-1, 07-2 and all of Module 8 therefore means *no on-demand package*, not *no `library()` call*: those lessons still attach `dplyr` and `ggplot2` by name, exactly as Module 6 does, and `content.test.ts`'s "attaches no package it did not declare" rule passes them because it unions the lesson's declarations with `CORE_PACKAGES`. Lesson 07-3 declares `['dplyr', 'ggplot2']` because the P3 table does; the declaration is redundant against the core set and is kept because it documents that this is the one lesson in Part 2 whose figures are the point.
- **Base R is the right tool here more often than elsewhere.** `pnorm`, `qnorm`, `dnorm`, `rnorm`, `qt`, `pt`, `sample`, `replicate` and `t.test` have no tidyverse equivalent, so they are used directly (spec §7.1 names exactly this exemption). Everything that *does* have one — reading, summarising, grouping, plotting — is `dplyr` and `ggplot2`. Never `library(tidyverse)`.
- **Where `setupCode` hands the student a fixture, the check reads that fixture back through `answer()` and derives the expected value from it**, after guarding its shape (row count, length, centring, spread). Recomputing the fixture from its seed inside the check would fail a student who legitimately redrew it, and §5.2 says a correct route must pass.
- **Checks never call `exists()`, `get()` or `get0()`.** `src/content/exercises/index.test.ts` already fails on the regex `\b(exists|get|get0)\s*\(` anywhere in a `check` string. Use `has_answer("x")` and `answer("x")` only.
- **Numeric comparison is `isTRUE(all.equal(actual, expected, tolerance = …, check.attributes = FALSE))` on a value passed through `as.vector()`.** The default tolerance is `1e-6`. Three exercises loosen it, each with an R comment saying which legitimate route needs the slack and why the wrong answers still fall outside it.
- **Every one of these nine lessons is inferential** (`content.test.ts`'s `INFERENTIAL` regex `^(0[578]|1[0-4]|09)-` matches all of them), so every one ends with an `<Interpret>` whose correct option is an APA 7 sentence and whose distractors are the documented misinterpretations — for Module 7 "there is a 95% chance the true mean is in this interval", for Module 8 "p is the probability the null is true" and "p greater than .05 proves there is no effect".
- **Simulations are consumed by name only.** `distribution`, `ci` and `pvalue` are built by `docs/superpowers/plans/2026-09-22-statlab-simulations.md` (tasks S1, S2, S3). `<Simulation name="…" />` passes no props (overview decision 6). A module task here cannot start until its simulation is registered, because `content.test.ts` fails on an unregistered name.
- **Block ids are unique within a lesson file** and are written `id="…"` so the validator's `<CodeBlock id="…" code={` …` } />` extractor matches. Keep the attribute order and spacing shown in the MDX below; `validate.itest.ts` extracts code blocks with a literal regex and fails loudly if a block cannot be parsed.
- **No `readline`, `scan`, `menu` or `browser`** anywhere, including in exercise `setupCode` and `check`.

## File Structure

```
src/content/
  manifest.ts                              + module-05, module-07, module-08 entries in PLANNED_MODULES
  content.test.ts                          + Part 2 assertions (one block per module task)
  exercises/
    module-05.ts                           m5-1-a, m5-2-a, m5-2-b, m5-3-a, m5-3-b
    module-07.ts                           m7-1-a, m7-1-b, m7-2-a, m7-3-a
    module-08.ts                           m8-1-a, m8-2-a, m8-2-b, m8-3-a
  lessons/
    05-1-density-and-area.mdx              <Simulation name="distribution" />
    05-2-z-scores.mdx
    05-3-probabilities.mdx                 <Simulation name="distribution" />
    07-1-standard-error-to-interval.mdx
    07-2-what-95-percent-means.mdx         <Simulation name="ci" />
    07-3-error-bars.mdx                    declares dplyr, ggplot2
    08-1-null-distribution.mdx
    08-2-p-values-and-alpha.mdx            <Simulation name="pvalue" />
    08-3-errors-and-power.mdx              <Simulation name="pvalue" />
```

Reference values from `public/data/wellbeing-population.csv`, computed once and quoted by several checks below. Every figure in the lesson prose that is not produced live by a code block comes from this table.

| Quantity | Value |
|---|---|
| `mean(exam_score)` | 73.30516 |
| `sd(exam_score)` | 12.35566 |
| `mean(sleep_hours)` | 6.852458 |
| `sd(sleep_hours)` | 1.125478 |
| `mean(stress)` / `sd(stress)` / skewness | 11.8181 / 10.6425 / +1.16 |
| `pnorm(60, 73.30516, 12.35566)` | 0.140774 |
| `dnorm(60, 73.30516, 12.35566)` | 0.018082 |
| z for an exam score of 85 | 0.946517 |
| z for 9.1 hours of sleep | 1.996967 |
| `qnorm(0.90, 73.30516, 12.35566)` | 89.13958 |
| `pnorm(85, …) − pnorm(65, …)` | 0.577321 |
| mean `exam_score`, `sleep_hours >= 7` vs `< 7` | 76.57 (n = 2266) vs 70.60 (n = 2734); difference 5.98, d = 0.48 |
| mean `exam_score` by `programme` | Psychology 73.33 (n = 2488), Business 73.28 (n = 2512) — a genuinely true null |

That last row is the reason Module 8 can teach both halves of NHST honestly against one dataset: `sleep_hours` carries a real effect, `programme` carries none, and neither was arranged after the fact.

---

### Task M5: Module 5 — The normal distribution

**Files:**
- Create: `src/content/exercises/module-05.ts`, `src/content/lessons/05-1-density-and-area.mdx`, `src/content/lessons/05-2-z-scores.mdx`, `src/content/lessons/05-3-probabilities.mdx`
- Modify: `src/content/manifest.ts` (fill the `module-05` entry in `PLANNED_MODULES`), `src/content/exercises/index.ts` (already aggregates `module05` after P3), `src/content/content.test.ts`
- Test: `src/content/content.test.ts`, `src/content/exercises/index.test.ts`, `src/content/exercises/validate.itest.ts`

**Interfaces:**
- Consumes: `ExerciseDef` (`src/r/checker.ts`); `LessonMeta.packages` (content-platform P1); `PLANNED_MODULES` / `MODULES` (content-platform P3); the `distribution` simulation (simulations plan, task S1) — **Module 5 cannot be validated until `distribution` is in `src/sims/registry.ts`**; `data/wellbeing-population.csv` (mounted by `prepareSession`)
- Produces: `module05: ExerciseDef[]` with ids `m5-1-a`, `m5-2-a`, `m5-2-b`, `m5-3-a`, `m5-3-b`; three lesson files matching the `file` fields of the `module-05` manifest entry; a live `module-05` in `MODULES`

Module 5 is the one Part 2 module that is not about sampling. It is about a *model*: a curve with two numbers that stands in for a population, and the two functions that read probabilities off it in either direction. Module 6 then samples from a population that is emphatically not normal, and Module 8 builds a null distribution that is. Both need this first.

- [ ] **Step 1: Fill the `module-05` entry in `PLANNED_MODULES`**

In `src/content/manifest.ts`, replace the placeholder `module-05` entry created by content-platform task P3 with exactly this. Ids, titles, files and exercise ids are frozen by the P3 table; no `packages` field, because this module attaches nothing beyond the core set.

```ts
  {
    id: 'module-05',
    number: 5,
    title: 'The normal distribution',
    lessons: [
      {
        id: '05-1',
        title: 'Density and area',
        file: '05-1-density-and-area',
        exercises: ['m5-1-a'],
      },
      {
        id: '05-2',
        title: 'z-scores',
        file: '05-2-z-scores',
        exercises: ['m5-2-a', 'm5-2-b'],
      },
      {
        id: '05-3',
        title: 'Probabilities both ways',
        file: '05-3-probabilities',
        exercises: ['m5-3-a', 'm5-3-b'],
      },
    ],
  },
```

`MODULES` is derived from `PLANNED_MODULES` by keeping only modules whose lesson files all exist, so Module 5 appears in the sidebar the moment step 5 writes the third file — not before, and never as a dead link.

- [ ] **Step 2: Write `src/content/exercises/module-05.ts`**

Five exercises. None of them is random, but each carries `setupCode: 'set.seed(505)'` so that a student who sanity-checks an answer with `rnorm()` gets the same numbers on every attempt, and so that the validator's two suites agree.

````ts
import type { ExerciseDef } from '../../r/checker';

export const module05: ExerciseDef[] = [
  {
    id: 'm5-1-a',
    prompt:
      'Treat exam scores as normal, with the population mean and SD. What proportion of students score below 60? Store that probability in p_below_60.',
    starterCode:
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\n\n# pnorm() gives the area under the curve to the LEFT of a score.\np_below_60 <- ',
    setupCode: 'set.seed(505)',
    solution:
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\np_below_60 <- pnorm(60, mean = mu, sd = sigma)',
    wrongAnswers: [
      // The right tail: 1 - pnorm() instead of pnorm().
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\np_below_60 <- 1 - pnorm(60, mean = mu, sd = sigma)',
      // The height of the curve, not the area under it. This is the misconception the lesson is about.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\np_below_60 <- dnorm(60, mean = mu, sd = sigma)',
      // Forgot mean and sd, so 60 was read as a z-score on the standard normal.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\np_below_60 <- pnorm(60)',
    ],
    alternateSolutions: [
      // Standardise first, then use the standard normal.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\np_below_60 <- pnorm((60 - mu) / sigma)',
      // The upper tail, subtracted.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\np_below_60 <- 1 - pnorm(60, mean = mu, sd = sigma, lower.tail = FALSE)',
      // A dplyr pipeline that never names mu or sigma.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\np_below_60 <- population %>% summarise(p = pnorm(60, mean(exam_score), sd(exam_score))) %>% pull(p)',
    ],
    check: `
      if (!has_answer("p_below_60")) {
        list(pass = FALSE, message = "I could not find an object called p_below_60.")
      } else {
        # as.vector(): pull() is optional, and unlist()/colMeans() leave a named number.
        value <- as.vector(answer("p_below_60"))
        if (is.data.frame(value) || !is.numeric(value) || length(value) != 1L) {
          list(pass = FALSE, message = "p_below_60 should be a single number - a probability between 0 and 1. If you built it in a pipeline, pull() turns the one-cell result into a number.")
        } else {
          population <- read.csv("data/wellbeing-population.csv")
          mu <- mean(population$exam_score)
          sigma <- sd(population$exam_score)
          expected <- pnorm(60, mean = mu, sd = sigma)   # 0.140774
          # tolerance 1e-3, not 1e-6: a student who computes the SD with denominator N
          # rather than sd()'s n - 1 lands on 0.140750 - the same answer to every digit
          # anyone would report. The three wrong answers are 0.859, 0.018 and 1.000,
          # all far outside this band.
          if (isTRUE(all.equal(value, expected, tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = TRUE, message = paste0("Correct: ", round(expected, 4), ". Under this normal model about ", round(100 * expected), " out of every 100 students score below 60, and the actual count in the population is ", sum(population$exam_score < 60), " out of 5000 - the model is close, not exact."))
          } else if (isTRUE(all.equal(value, 1 - expected, tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That is the area to the RIGHT of 60, the students who scored above it. pnorm() already gives you the left tail: drop the 1 - .")
          } else if (isTRUE(all.equal(value, dnorm(60, mean = mu, sd = sigma), tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That is dnorm(): the HEIGHT of the density curve at 60, not the area under it. A height is not a probability. Use pnorm().")
          } else if (isTRUE(all.equal(value, pnorm(60), tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "pnorm(60) with no mean or sd uses the standard normal, where 60 means sixty standard deviations above zero - hence a probability of essentially 1. Pass mean = mu and sd = sigma, or standardise 60 first.")
          } else {
            list(pass = FALSE, message = paste0("p_below_60 is ", round(value, 4), " but should be ", round(expected, 4), "."))
          }
        }
      }
    `,
    hints: [
      'pnorm(q, mean, sd) returns the area under the normal curve to the left of q.',
      'The mean and SD you want are mu and sigma, computed from population$exam_score in the starter code.',
      'Put them together: pnorm(60, mean = mu, sd = sigma).',
    ],
  },
  {
    id: 'm5-2-a',
    prompt:
      'A student scored 85 on the exam. Express that as a z-score - how many standard deviations above the population mean it is - and store it in z_85.',
    starterCode:
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\n\n# z = (score - mean) / SD\nz_85 <- ',
    setupCode: 'set.seed(505)',
    solution:
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\nz_85 <- (85 - mu) / sigma',
    wrongAnswers: [
      // Subtracted but never divided: this is a raw difference, not a z-score.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\nz_85 <- 85 - mu',
      // Divided but never subtracted.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nsigma <- sd(population$exam_score)\nz_85 <- 85 / sigma',
      // Sign reversed: mean minus score.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\nz_85 <- (mu - 85) / sigma',
    ],
    alternateSolutions: [
      // No intermediate objects.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nz_85 <- (85 - mean(population$exam_score)) / sd(population$exam_score)',
      // A dplyr pipeline.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nz_85 <- population %>% summarise(z = (85 - mean(exam_score)) / sd(exam_score)) %>% pull(z)',
      // Round trip: the score to a probability and back onto the standard normal.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nz_85 <- qnorm(pnorm(85, mean(population$exam_score), sd(population$exam_score)))',
    ],
    check: `
      if (!has_answer("z_85")) {
        list(pass = FALSE, message = "I could not find an object called z_85.")
      } else {
        value <- as.vector(answer("z_85"))
        if (is.data.frame(value) || !is.numeric(value) || length(value) != 1L) {
          list(pass = FALSE, message = "z_85 should be a single number.")
        } else {
          population <- read.csv("data/wellbeing-population.csv")
          mu <- mean(population$exam_score)
          sigma <- sd(population$exam_score)
          expected <- (85 - mu) / sigma    # 0.946517
          # tolerance 1e-3 for the same reason as m5-1-a: an SD computed with
          # denominator N gives 0.946612, which rounds identically at two decimals.
          # The wrong answers are 11.69, 6.88 and -0.95.
          if (isTRUE(all.equal(value, expected, tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = TRUE, message = paste0("Correct: z = ", round(expected, 2), ". That student is just under one standard deviation above the mean, which puts them at about the ", round(100 * pnorm(expected)), "th percentile."))
          } else if (isTRUE(all.equal(value, -expected, tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "The sign is the wrong way round. z = (score - mean) / SD, so a score above the mean gives a positive z.")
          } else if (isTRUE(all.equal(value, 85 - mu, tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "You subtracted the mean but did not divide. Without dividing by the SD the answer is still in exam points, and the whole purpose of a z-score is to leave the original units behind.")
          } else if (isTRUE(all.equal(value, 85 / sigma, tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "You divided by the SD but did not subtract the mean. A z-score measures distance FROM the mean, so the subtraction comes first.")
          } else {
            list(pass = FALSE, message = paste0("z_85 is ", round(value, 3), " but should be ", round(expected, 3), "."))
          }
        }
      }
    `,
    hints: [
      'A z-score answers: how many SDs from the mean is this?',
      'Subtract before you divide: (85 - mu) is the distance in exam points, and dividing by sigma turns points into SDs.',
    ],
  },
  {
    id: 'm5-2-b',
    prompt:
      'Which is more unusual in this population: an exam score of 85, or sleeping 9.1 hours a night? Store the two z-scores in z_exam and z_sleep, each computed against its own column.',
    starterCode:
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\n\n# Each z-score uses the mean and SD of its OWN column.\nz_exam <- \nz_sleep <- ',
    setupCode: 'set.seed(505)',
    solution:
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nz_exam <- (85 - mean(population$exam_score)) / sd(population$exam_score)\nz_sleep <- (9.1 - mean(population$sleep_hours)) / sd(population$sleep_hours)',
    wrongAnswers: [
      // Sleep standardised against the exam scale.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nz_exam <- (85 - mean(population$exam_score)) / sd(population$exam_score)\nz_sleep <- (9.1 - mean(population$exam_score)) / sd(population$exam_score)',
      // The two measurements swapped between the two scales.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nz_exam <- (9.1 - mean(population$exam_score)) / sd(population$exam_score)\nz_sleep <- (85 - mean(population$sleep_hours)) / sd(population$sleep_hours)',
      // Sleep never divided by its SD.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nz_exam <- (85 - mean(population$exam_score)) / sd(population$exam_score)\nz_sleep <- 9.1 - mean(population$sleep_hours)',
    ],
    alternateSolutions: [
      // dplyr, both in one summarise.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nz <- population %>% summarise(e = (85 - mean(exam_score)) / sd(exam_score), s = (9.1 - mean(sleep_hours)) / sd(sleep_hours))\nz_exam <- z %>% pull(e)\nz_sleep <- z %>% pull(s)',
      // scale() on the column, then read off the standardised value of an appended score.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nz_exam <- (85 - mean(population$exam_score)) / sd(population$exam_score)\nz_sleep <- as.vector(scale(c(9.1, population$sleep_hours), center = mean(population$sleep_hours), scale = sd(population$sleep_hours)))[1]',
    ],
    check: `
      if (!has_answer("z_exam") || !has_answer("z_sleep")) {
        list(pass = FALSE, message = "I need both z_exam (for the exam score of 85) and z_sleep (for 9.1 hours of sleep).")
      } else {
        z_exam <- as.vector(answer("z_exam"))
        z_sleep <- as.vector(answer("z_sleep"))
        if (!is.numeric(z_exam) || length(z_exam) != 1L || !is.numeric(z_sleep) || length(z_sleep) != 1L) {
          list(pass = FALSE, message = "Both z_exam and z_sleep should be single numbers.")
        } else {
          population <- read.csv("data/wellbeing-population.csv")
          want_exam <- (85 - mean(population$exam_score)) / sd(population$exam_score)      # 0.946517
          want_sleep <- (9.1 - mean(population$sleep_hours)) / sd(population$sleep_hours)  # 1.996967
          # tolerance 1e-3 throughout, as in m5-2-a: an SD computed with denominator N
          # is within 1e-4 of sd(), and no wrong answer here is closer than 0.25.
          ok_exam <- isTRUE(all.equal(z_exam, want_exam, tolerance = 1e-3, check.attributes = FALSE))
          ok_sleep <- isTRUE(all.equal(z_sleep, want_sleep, tolerance = 1e-3, check.attributes = FALSE))
          if (ok_exam && ok_sleep) {
            list(pass = TRUE, message = paste0("Correct: z_exam = ", round(want_exam, 2), " and z_sleep = ", round(want_sleep, 2), ". The sleep figure is the more unusual of the two, even though 9.1 is a much smaller number than 85 - which is exactly what standardising is for."))
          } else if (ok_exam && isTRUE(all.equal(z_sleep, (9.1 - mean(population$exam_score)) / sd(population$exam_score), tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "z_sleep was standardised against the exam scale. Nine hours is not 5 SDs below anything - it is below the EXAM mean. Use mean(population$sleep_hours) and sd(population$sleep_hours).")
          } else if (ok_exam && isTRUE(all.equal(z_sleep, 9.1 - mean(population$sleep_hours), tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "z_sleep is still in hours: you subtracted the mean but did not divide by sd(population$sleep_hours).")
          } else if (isTRUE(all.equal(z_exam, want_sleep, tolerance = 1e-3, check.attributes = FALSE)) || isTRUE(all.equal(z_sleep, want_exam, tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "The two measurements are on the wrong scales. 85 is an exam score and 9.1 is a number of hours; each belongs with its own column's mean and SD.")
          } else if (!ok_exam) {
            list(pass = FALSE, message = paste0("z_exam is ", round(z_exam, 3), " but should be ", round(want_exam, 3), "."))
          } else {
            list(pass = FALSE, message = paste0("z_sleep is ", round(z_sleep, 3), " but should be ", round(want_sleep, 3), "."))
          }
        }
      }
    `,
    hints: [
      'Two separate z-scores, each with its own mean and SD: exam_score for the first, sleep_hours for the second.',
      'z_exam <- (85 - mean(population$exam_score)) / sd(population$exam_score).',
      'Now write the same line for 9.1 hours, replacing every exam_score with sleep_hours.',
    ],
  },
  {
    id: 'm5-3-a',
    prompt:
      'The exam board wants the cut-off for a distinction: the score that only the top 10 per cent of students exceed. Store it in top10_cutoff.',
    starterCode:
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\n\n# qnorm() turns a probability back into a score.\ntop10_cutoff <- ',
    setupCode: 'set.seed(505)',
    solution:
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\ntop10_cutoff <- qnorm(0.90, mean = mu, sd = sigma)',
    wrongAnswers: [
      // The wrong tail: the score only the bottom 10 per cent fall below.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\ntop10_cutoff <- qnorm(0.10, mean = mu, sd = sigma)',
      // Forgot mean and sd, so the answer is a z-score rather than an exam score.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\ntop10_cutoff <- qnorm(0.90)',
      // pnorm where qnorm was wanted: a probability treated as a score.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\ntop10_cutoff <- pnorm(0.90, mean = mu, sd = sigma)',
    ],
    alternateSolutions: [
      // Build it from the standard normal quantile.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\ntop10_cutoff <- mean(population$exam_score) + qnorm(0.90) * sd(population$exam_score)',
      // Ask for the upper tail instead.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\ntop10_cutoff <- qnorm(0.10, mean = mean(population$exam_score), sd = sd(population$exam_score), lower.tail = FALSE)',
      // dplyr.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\ntop10_cutoff <- population %>% summarise(q = qnorm(0.90, mean(exam_score), sd(exam_score))) %>% pull(q)',
    ],
    check: `
      if (!has_answer("top10_cutoff")) {
        list(pass = FALSE, message = "I could not find an object called top10_cutoff.")
      } else {
        value <- as.vector(answer("top10_cutoff"))
        if (is.data.frame(value) || !is.numeric(value) || length(value) != 1L) {
          list(pass = FALSE, message = "top10_cutoff should be a single number, on the exam scale.")
        } else {
          population <- read.csv("data/wellbeing-population.csv")
          mu <- mean(population$exam_score)
          sigma <- sd(population$exam_score)
          expected <- qnorm(0.90, mean = mu, sd = sigma)   # 89.13958
          # tolerance 1e-4: an SD computed with denominator N gives 89.13800, a
          # relative difference of 1.8e-5. The wrong answers are 57.5, 1.28 and
          # essentially 0, so nothing plausible sneaks through this band.
          if (isTRUE(all.equal(value, expected, tolerance = 1e-4, check.attributes = FALSE))) {
            list(pass = TRUE, message = paste0("Correct: ", round(expected, 2), ". In the actual population ", sum(population$exam_score > expected), " of 5000 students score above it - close to the 500 the model predicts."))
          } else if (isTRUE(all.equal(value, qnorm(0.10, mean = mu, sd = sigma), tolerance = 1e-4, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That is the bottom of the distribution: the score only 10 per cent of students fall BELOW. For the top 10 per cent you want the 90th percentile, qnorm(0.90, ...).")
          } else if (isTRUE(all.equal(value, qnorm(0.90), tolerance = 1e-4, check.attributes = FALSE))) {
            list(pass = FALSE, message = "qnorm(0.90) with no mean or sd gives 1.28, the cut-off on the STANDARD normal - a z-score, not an exam score. Pass mean = mu and sd = sigma, or convert with mu + 1.28 * sigma.")
          } else if (isTRUE(all.equal(value, pnorm(0.90, mean = mu, sd = sigma), tolerance = 1e-4, check.attributes = FALSE))) {
            list(pass = FALSE, message = "You used pnorm, which turns a score into a probability. Here you have the probability and want the score, so you need its inverse: qnorm.")
          } else {
            list(pass = FALSE, message = paste0("top10_cutoff is ", round(value, 2), " but should be ", round(expected, 2), "."))
          }
        }
      }
    `,
    hints: [
      'qnorm(p, mean, sd) is the inverse of pnorm: give it a probability, get back a score.',
      'The top 10 per cent start where 90 per cent of the area is already to the left.',
      'So the probability you pass to qnorm is 0.90, not 0.10.',
    ],
  },
  {
    id: 'm5-3-b',
    prompt:
      'What proportion of students score between 65 and 85? Store it in p_between, using the normal model with the population mean and SD.',
    starterCode:
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\n\n# An area between two scores is one area minus another.\np_between <- ',
    setupCode: 'set.seed(505)',
    solution:
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\np_between <- pnorm(85, mean = mu, sd = sigma) - pnorm(65, mean = mu, sd = sigma)',
    wrongAnswers: [
      // Added the two areas instead of subtracting: a "probability" above 1.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\np_between <- pnorm(85, mean = mu, sd = sigma) + pnorm(65, mean = mu, sd = sigma)',
      // Subtracted the wrong way round: a negative "probability".
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\np_between <- pnorm(65, mean = mu, sd = sigma) - pnorm(85, mean = mu, sd = sigma)',
      // Subtracted the scores first and asked for one tail of the difference.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\np_between <- pnorm(85 - 65, mean = mu, sd = sigma)',
    ],
    alternateSolutions: [
      // The two tails, removed from the whole.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\np_between <- 1 - pnorm(65, mean = mu, sd = sigma) - pnorm(85, mean = mu, sd = sigma, lower.tail = FALSE)',
      // Both cut-offs in one vectorised call.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\np_between <- diff(pnorm(c(65, 85), mean = mean(population$exam_score), sd = sd(population$exam_score)))',
      // Standardise both ends, then use the standard normal.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmu <- mean(population$exam_score)\nsigma <- sd(population$exam_score)\np_between <- pnorm((85 - mu) / sigma) - pnorm((65 - mu) / sigma)',
    ],
    check: `
      if (!has_answer("p_between")) {
        list(pass = FALSE, message = "I could not find an object called p_between.")
      } else {
        value <- as.vector(answer("p_between"))
        if (is.data.frame(value) || !is.numeric(value) || length(value) != 1L) {
          list(pass = FALSE, message = "p_between should be a single number - a probability between 0 and 1.")
        } else {
          population <- read.csv("data/wellbeing-population.csv")
          mu <- mean(population$exam_score)
          sigma <- sd(population$exam_score)
          lower <- pnorm(65, mean = mu, sd = sigma)
          upper <- pnorm(85, mean = mu, sd = sigma)
          expected <- upper - lower   # 0.577321
          # tolerance 1e-3, as in m5-1-a: the denominator-N SD gives 0.577290.
          if (isTRUE(all.equal(value, expected, tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = TRUE, message = paste0("Correct: ", round(expected, 4), ". Just under three students in five fall in that twenty-point band, and the actual population count is ", sum(population$exam_score > 65 & population$exam_score < 85), " of 5000."))
          } else if (value > 1) {
            list(pass = FALSE, message = "Your answer is greater than 1, so it cannot be a probability. You added the two areas; an area BETWEEN two points is the larger area minus the smaller one.")
          } else if (value < 0) {
            list(pass = FALSE, message = "Your answer is negative, so it cannot be a probability. Subtract the smaller area from the larger: pnorm(85, ...) - pnorm(65, ...).")
          } else if (isTRUE(all.equal(value, pnorm(20, mean = mu, sd = sigma), tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "You subtracted the scores and then looked up the difference. Look up each score separately, then subtract the two areas.")
          } else {
            list(pass = FALSE, message = paste0("p_between is ", round(value, 4), " but should be ", round(expected, 4), "."))
          }
        }
      }
    `,
    hints: [
      'pnorm(85, ...) is everything below 85. That includes the students below 65, whom you do not want.',
      'So take the area below 85 and remove the area below 65.',
      'p_between <- pnorm(85, mean = mu, sd = sigma) - pnorm(65, mean = mu, sd = sigma).',
    ],
  },
];
````

Every wrong answer above is a mistake seen in a real marking pile — the right tail for the left, a height for an area, a forgotten `mean`/`sd` so the standard normal is used by accident, the bottom decile for the top, `pnorm` where `qnorm` was meant, a z-score computed on the wrong column — and every one of them runs cleanly and fails through `pass = FALSE`, which is what the validator's negative-fixture rule requires.

- [ ] **Step 3: Write `src/content/lessons/05-1-density-and-area.mdx`**

````mdx
Module 6 will ask what happens when you take a sample. Before that, it is worth
being precise about the thing you are sampling *from*. Populations are messy,
but a great many of them are close enough to one particular shape that we can
describe the whole thing with two numbers and then answer questions about it
with arithmetic.

Our population of 5000 students has an exam score for everyone. Look at it.

<CodeBlock id="load" code={`library(dplyr)

population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)

population %>% summarise(mu = mean(exam_score), sigma = sd(exam_score), n = n())`} />

Two numbers: a mean of about 73.3 and a standard deviation of about 12.4. The
claim of this lesson is that those two numbers are almost the whole story.

<CodeBlock id="hist" code={`library(ggplot2)

population %>%
  ggplot(aes(x = exam_score)) +
  geom_histogram(bins = 40) +
  labs(x = "Exam score", y = "Number of students") +
  theme_classic()`} />

## A curve instead of bars

A histogram depends on how you chose the bins. Make them narrower and the bars
get shorter; make them wider and it gets lumpier. A **density curve** is what a
histogram settles down to when the bins get very narrow and the vertical axis is
rescaled so that the total area under it is exactly 1.

`dnorm()` gives the height of the normal density curve at any point. We can draw
it on top of the data — rescaling the histogram to density so the two are on the
same vertical axis.

<CodeBlock id="curve" code={`mu <- mean(population$exam_score)
sigma <- sd(population$exam_score)

population %>%
  ggplot(aes(x = exam_score)) +
  geom_histogram(aes(y = after_stat(density)), bins = 40) +
  stat_function(fun = dnorm, args = list(mean = mu, sd = sigma), linewidth = 1) +
  labs(x = "Exam score", y = "Density") +
  theme_classic()`} />

The curve is not the data. It is a *model* of the data: a smooth idealisation
with exactly two parameters. It fits here well enough to be useful, and the
rest of this module treats it as if it were the truth.

<Predict
  id="p-height"
  question="dnorm(73.3, mean = 73.3, sd = 12.4) returns 0.0323. What does that number tell you?"
  choices={[
    { text: 'About 3.2% of students score exactly 73.3', response: 'No student scores *exactly* 73.3 in any meaningful sense, and a density is not a percentage. Read on — this is the confusion the lesson exists to clear up.' },
    { text: 'The height of the curve at 73.3, which only becomes a probability once you multiply it by a width', correct: true, response: 'Exactly. A density is a height. Probability is height times width, which is to say area.' },
    { text: 'About 3.2% of students score below 73.3', response: 'That is what pnorm() would tell you, and the answer would be close to 50%, not 3.2%.' },
  ]}
/>

## Probability is area

This is the single idea of the lesson, and it is worth stating on its own line:

> Under a density curve, **probability is area** — never height.

The whole area under the curve is 1, because every student is somewhere. The
area to the left of a score is the proportion of students below it, and that is
what `pnorm()` returns.

<CodeBlock id="area" code={`pnorm(60, mean = mu, sd = sigma)    # proportion below 60
pnorm(85, mean = mu, sd = sigma)    # proportion below 85

# An area between two scores is one area minus the other.
pnorm(85, mean = mu, sd = sigma) - pnorm(65, mean = mu, sd = sigma)

# And the model can be checked against the population it describes.
mean(population$exam_score < 60)`} />

The last two lines matter. The model says about 14 per cent of students score
below 60; the population itself says about 15 per cent. Close, not identical —
which is what "the data are approximately normal" means in practice.

Notice also what the area of a single point must be. A point has no width, so
`pnorm(73.3) - pnorm(73.3)` is exactly zero: the probability of scoring
*exactly* 73.3 is zero under a continuous model. That is not a paradox. It is
the price of modelling a score as a real number rather than as a count.

## See it move

Drag the mean and the standard deviation and watch the shaded area respond. A
larger SD flattens the curve — the peak drops, because the total area must stay
at 1 however wide the curve spreads.

<Simulation name="distribution" />

<Quiz
  id="q-density"
  question="You double the standard deviation of a normal curve and leave the mean alone. What happens to the height of the curve at its peak?"
  choices={[
    { text: 'It doubles', response: 'The curve gets wider, and a wider curve with the same total area must be shorter, not taller.' },
    { text: 'It halves', correct: true, response: 'Right. The area under the curve is fixed at 1, so spreading it over twice the width halves the height everywhere near the middle.' },
    { text: 'It is unchanged', response: 'Then the total area would double, and the total area under a density curve is always exactly 1.' },
    { text: 'It depends on the mean', response: 'Shifting the mean slides the curve sideways without changing its shape at all.' },
  ]}
/>

<Exercise id="m5-1-a" />

<Interpret
  id="i-5-1"
  question="You are writing up the distribution of exam scores for a methods report. Which sentence reports what you have actually computed?"
  choices={[
    { text: 'Exam scores were approximately normally distributed (M = 73.31, SD = 12.36). Under this model, 14% of students are expected to score below 60.', correct: true, response: 'Correct. It names the model, gives the two parameters in APA form, and reports the tail area as an expected proportion rather than as a claim about any one student.' },
    { text: 'The density of exam scores at 60 was .018, so 1.8% of students scored 60.', response: 'That is dnorm(60), a height. Heights are not probabilities, and no student scores exactly 60 under a continuous model.' },
    { text: 'The probability that a student scored exactly 60 was .14.', response: '.14 is the area to the LEFT of 60, covering every score below it. The probability of any exact score under a continuous model is zero.' },
    { text: 'Exam scores were normally distributed (M = 73.31, SD = 12.36), so 14% of students scored below 60.', response: 'Two problems. "Were normally distributed" overstates it — the fit is close, not exact — and the 14% is what the model expects, while the population itself holds about 15%.' },
  ]}
/>
````

- [ ] **Step 4: Write `src/content/lessons/05-2-z-scores.mdx`**

````mdx
A student scored 85 on the exam. Another sleeps 9.1 hours a night. Which of
those is the more unusual? The numbers cannot be compared as they stand: 85 is a
score out of 100 and 9.1 is a number of hours, and they have different means and
different spreads. You need a common currency.

The common currency is the **standard deviation**. Count how many of them a
value sits from its own mean, and you get a number that no longer carries any
units at all.

> **z = (value − mean) / SD**

<CodeBlock id="setup" code={`library(dplyr)

population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)

population %>%
  summarise(
    exam_mu = mean(exam_score), exam_sd = sd(exam_score),
    sleep_mu = mean(sleep_hours), sleep_sd = sd(sleep_hours)
  )`} />

<Predict
  id="p-compare"
  question="Exam scores average 73.3 with an SD of 12.4; sleep averages 6.85 hours with an SD of 1.13. Which is further from its own mean: an exam score of 85, or 9.1 hours of sleep?"
  choices={[
    { text: 'The exam score, because 85 is a much bigger number', response: 'Size on the original scale tells you nothing: 85 out of 100 and 9.1 hours are not comparable quantities until you standardise.' },
    { text: 'The sleep figure', correct: true, response: 'Yes. 85 is under one SD above the exam mean; 9.1 hours is two SDs above the sleep mean. Run the next block to confirm it.' },
    { text: 'They are equally unusual, because both are above average', response: 'Being above average is not a quantity. How FAR above average, measured in SDs, is.' },
  ]}
/>

<CodeBlock id="z" code={`exam_mu <- mean(population$exam_score)
exam_sd <- sd(population$exam_score)
sleep_mu <- mean(population$sleep_hours)
sleep_sd <- sd(population$sleep_hours)

(85 - exam_mu) / exam_sd
(9.1 - sleep_mu) / sleep_sd`} />

An exam score of 85 is 0.95 SDs above the mean. Sleeping 9.1 hours is 2.00 SDs
above the mean. The sleeper is the outlier, and no amount of staring at "85" and
"9.1" would have told you that.

<Exercise id="m5-2-a" />

## Standardising a whole column

A z-score is not only for single values. Standardise a whole column and you get
a variable with a mean of 0 and an SD of 1 — the same distribution, relabelled.

<CodeBlock id="standardise" code={`library(ggplot2)

standardised <- population %>%
  mutate(z_exam = (exam_score - exam_mu) / exam_sd)

standardised %>% summarise(mean_z = mean(z_exam), sd_z = sd(z_exam))

standardised %>%
  ggplot(aes(x = z_exam)) +
  geom_histogram(bins = 40) +
  labs(x = "Exam score (z)", y = "Number of students") +
  theme_classic()`} />

Compare that histogram with the one in the last lesson. It is the same shape. It
has simply been slid so its centre is at 0 and squeezed so one SD is one unit.
Standardising never changes the shape of a distribution — a point worth keeping,
because students often expect it to "make the data normal". It does not.

## The 68–95–99.7 rule

For a normal distribution, the proportions within one, two and three SDs of the
mean are fixed. They are worth memorising, because they turn a z-score into an
intuition immediately.

<CodeBlock id="rule" code={`# What the normal model predicts.
pnorm(1) - pnorm(-1)
pnorm(2) - pnorm(-2)
pnorm(3) - pnorm(-3)

# What this population actually does.
standardised %>%
  summarise(
    within_1 = mean(abs(z_exam) < 1),
    within_2 = mean(abs(z_exam) < 2),
    within_3 = mean(abs(z_exam) < 3)
  )`} />

About 68 per cent within one SD, 95 per cent within two, 99.7 per cent within
three — and the population agrees to within a percentage point or so. Hold on to
the middle one. In two modules' time, "95 per cent of the distribution lies
within about two standard errors of the mean" becomes the confidence interval.

<Quiz
  id="q-z"
  question="A student's exam score has z = −1.5. Which statement is correct?"
  choices={[
    { text: 'They scored 1.5 points below the mean', response: 'A z-score is not in the original units. −1.5 means 1.5 standard deviations, which here is about 18.5 exam points.' },
    { text: 'They scored 1.5 standard deviations below the mean, placing them in roughly the bottom 7% of students', correct: true, response: 'Right: pnorm(-1.5) is .067, so about 7 students in 100 score below them.' },
    { text: 'They scored better than 1.5% of students', response: 'The −1.5 is a distance in SDs, not a percentage. Feed it to pnorm() to get a percentage.' },
    { text: 'Their score is invalid, because z-scores cannot be negative', response: 'Half of all z-scores are negative — every value below the mean has one.' },
  ]}
/>

<Exercise id="m5-2-b" />

<Interpret
  id="i-5-2"
  question="A supervisor asks you to describe, in a sentence fit for a report, the student who scored 85. Which one is right?"
  choices={[
    { text: 'The student scored 0.95 standard deviations above the population mean (M = 73.31, SD = 12.36, z = 0.95), placing them at approximately the 83rd percentile.', correct: true, response: 'Correct. It gives the parameters the z was computed from and converts the z into a percentile, which is what a reader actually wants.' },
    { text: 'The student scored better than 95% of their peers (z = 0.95).', response: 'The 0.95 is a distance in standard deviations, not a percentile. pnorm(0.95) = .83, so the figure is 83%, not 95%.' },
    { text: 'The student scored 95% of the population mean (z = 0.95).', response: 'A z-score is not a ratio to the mean. It is a count of standard deviations away from it.' },
    { text: 'The student score was significant (z = 0.95, p < .05).', response: 'Nothing has been tested. A z-score describes where one value sits in a distribution; it is not a hypothesis test, and 0.95 would not be significant in any case.' },
  ]}
/>
````

- [ ] **Step 5: Write `src/content/lessons/05-3-probabilities.mdx`**

````mdx
Two questions come up constantly, and they run in opposite directions.

1. *A student scored 85. What proportion of students did better?* You have a
   score and you want a probability. That is `pnorm()`.
2. *What score do you need to be in the top 10 per cent?* You have a probability
   and you want a score. That is `qnorm()`.

They are inverses of each other, and almost every mistake in this material is
using one where the other was meant.

<CodeBlock id="both" code={`library(dplyr)

population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)
mu <- mean(population$exam_score)
sigma <- sd(population$exam_score)

# Score in, probability out.
pnorm(85, mean = mu, sd = sigma)

# Probability in, score out.
qnorm(0.828, mean = mu, sd = sigma)

# Round trip: qnorm undoes pnorm.
qnorm(pnorm(85, mean = mu, sd = sigma), mean = mu, sd = sigma)`} />

<Predict
  id="p-cutoff"
  question="You want the exam score that only the top 10 per cent of students exceed. Which probability do you hand to qnorm()?"
  choices={[
    { text: '0.10, because the question says 10 per cent', response: 'qnorm() always works from the area on the LEFT. The area to the left of the top-10% cut-off is 90%, not 10%.' },
    { text: '0.90', correct: true, response: 'Right. The cut-off has 90 per cent of students below it and 10 per cent above, and qnorm() reads from the left by default.' },
    { text: '0.05, because the top 10 per cent is split between two tails', response: 'Nothing here is two-tailed. "The top 10 per cent" is one tail, on the right.' },
  ]}
/>

<CodeBlock id="cutoff" code={`qnorm(0.90, mean = mu, sd = sigma)

# Same answer, asked from the other side.
qnorm(0.10, mean = mu, sd = sigma, lower.tail = FALSE)

# Check it against the population the model describes.
mean(population$exam_score > qnorm(0.90, mean = mu, sd = sigma))`} />

The model puts the distinction cut-off at 89.1, and just under 10 per cent of
the actual 5000 students clear it. Two numbers — a mean and an SD — were enough
to answer a question nobody had asked when the data were collected.

<Exercise id="m5-3-a" />

## The middle 95 per cent

One pair of cut-offs is going to follow you through the rest of this course:
the two that leave 2.5 per cent in each tail and 95 per cent in the middle.

<CodeBlock id="middle" code={`# On the standard normal, in z units.
qnorm(c(0.025, 0.975))

# On the exam scale.
qnorm(c(0.025, 0.975), mean = mu, sd = sigma)

# Which is the same as going 1.96 SDs either side of the mean.
mu + c(-1, 1) * 1.96 * sigma`} />

`qnorm(0.975)` is 1.959964, and it is the reason 1.96 appears in every
statistics textbook ever printed. It is not a magic constant. It is the point on
the standard normal curve with 2.5 per cent of the area beyond it, and if you
wanted the middle 99 per cent instead you would ask for `qnorm(0.995)` and get
2.58.

Drag the shaded region in the simulation until it holds the middle 95 per cent,
and read the z values off the axis. They will be about ±1.96 whatever mean and
SD you set, because in z units the curve is always the same curve.

<Simulation name="distribution" />

<Exercise id="m5-3-b" />

<Quiz
  id="q-tails"
  question="You want the two scores that enclose the middle 50 per cent of students. Which call gives them?"
  choices={[
    { text: 'qnorm(c(0.25, 0.75), mean = mu, sd = sigma)', correct: true, response: 'Right: 25 per cent of the area is below the first and 25 per cent above the second, leaving half the students between them.' },
    { text: 'qnorm(c(0.50, 0.50), mean = mu, sd = sigma)', response: 'Both of those are the median. An interval needs two different cut-offs.' },
    { text: 'pnorm(c(0.25, 0.75), mean = mu, sd = sigma)', response: 'pnorm goes the wrong way: it would treat 0.25 and 0.75 as exam scores and return two probabilities near zero.' },
    { text: 'qnorm(c(0.025, 0.975), mean = mu, sd = sigma)', response: 'That is the middle 95 per cent. For the middle 50 you want a quarter of the area in each tail.' },
  ]}
/>

<Interpret
  id="i-5-3"
  question="The exam board asks you to justify a distinction cut-off of 89. Which sentence reports the calculation honestly?"
  choices={[
    { text: 'Modelling exam scores as normal (M = 73.31, SD = 12.36), the 90th percentile falls at 89.14; 10% of students would be expected to score above that cut-off.', correct: true, response: 'Correct. It names the model and its parameters, gives the quantile, and states the consequence as an expectation rather than a certainty.' },
    { text: 'The top 10% of students scored 89.14.', response: 'A cut-off is not a group, and 89.14 is not anyone’s score. It is the boundary above which the top decile falls.' },
    { text: 'The probability of scoring above 89 was 1.28.', response: '1.28 is qnorm(0.90) on the standard normal — a z-score. Probabilities cannot exceed 1.' },
    { text: 'Exactly 500 of the 5000 students scored above 89.14, because 10% of 5000 is 500.', response: 'That is what the model predicts, not what the data did. Counting the actual population gives a number close to 500 but not equal to it.' },
  ]}
/>
````

- [ ] **Step 6: Add Module 5 assertions to `src/content/content.test.ts`**

Append a module block. These encode the three things that would ship silently:
a lesson that stops teaching the area idea, a simulation that quietly moved, and
an exercise list that drifted from the P3 table.

```ts
describe('Module 5', () => {
  const lessons = ['05-1-density-and-area', '05-2-z-scores', '05-3-probabilities'];

  test('its three lesson files exist and are live in MODULES', () => {
    for (const file of lessons) expect(sources[`./lessons/${file}.mdx`], `missing ${file}`).toBeDefined();
    expect(MODULES.map((m) => m.id)).toContain('module-05');
  });

  test('the distribution simulation is embedded, and only where planned', () => {
    // 05-2 deliberately has none: standardising is arithmetic, not a picture.
    expect(sources['./lessons/05-1-density-and-area.mdx']).toMatch(/<Simulation name="distribution" \/>/);
    expect(sources['./lessons/05-3-probabilities.mdx']).toMatch(/<Simulation name="distribution" \/>/);
    expect(sources['./lessons/05-2-z-scores.mdx']).not.toMatch(/<Simulation\b/);
  });

  test('no Module 5 lesson attaches a package beyond the core set', () => {
    // The P3 table gives Module 5 no `packages`, so anything outside CORE_PACKAGES
    // would never be installed for a student who opens this lesson first.
    for (const file of lessons) {
      for (const match of sources[`./lessons/${file}.mdx`].matchAll(/library\((\w+)\)/g)) {
        expect(['dplyr', 'ggplot2'], `${file} attaches ${match[1]}`).toContain(match[1]);
      }
    }
  });

  test('every Module 5 exercise compares with a stated tolerance', () => {
    // A check that reaches for == on a double is the defect this catches.
    for (const exercise of module05) {
      expect(exercise.check, `${exercise.id} has no all.equal comparison`).toMatch(/all\.equal\(/);
      expect(exercise.check, `${exercise.id} compares doubles with ==`).not.toMatch(/==\s*(expected|want_)/);
    }
  });

  test('Module 5 defines exactly the exercises the manifest lists', () => {
    const planned = PLANNED_MODULES.find((m) => m.id === 'module-05')!;
    expect(module05.map((e) => e.id)).toEqual(planned.lessons.flatMap((l) => l.exercises));
  });
});
```

Import `module05` from `./exercises/module-05` and `MODULES`/`PLANNED_MODULES` from `./manifest` at the top of the file.

- [ ] **Step 7: Run the validator**

Run: `npm run validate`

Expected, on the Module 5 portion:

```
 ✓ src/content/content.test.ts  (18 tests)
 ✓ src/content/exercises/index.test.ts  (9 tests)
 ✓ src/content/exercises/validate.itest.ts
   ✓ exercise m5-1-a > the reference solution passes its own check
   ✓ exercise m5-1-a > wrong answers > wrong answer 0 is rejected by the check, not by an error
   ✓ exercise m5-1-a > wrong answers > wrong answer 1 is rejected by the check, not by an error
   ✓ exercise m5-1-a > wrong answers > wrong answer 2 is rejected by the check, not by an error
   ✓ exercise m5-1-a > alternate solutions > alternate solution 0 passes
   …
   ✓ lesson 05-1 > its code blocks run in order without an R error, and its exercises grade correctly after them
   ✓ lesson 05-2 > its code blocks run in order without an R error, and its exercises grade correctly after them
   ✓ lesson 05-3 > its code blocks run in order without an R error, and its exercises grade correctly after them
```

Two failure modes are worth naming in advance, because both look like content
bugs and are not:

- **`stat_function` not found.** `ggplot2` is attached in the `curve` block of
  05-1 but `mu`/`sigma` are created there too; if you reorder the blocks so the
  `library(ggplot2)` call moves after its first use, the lesson suite fails on
  that block only. Keep the attach in the first block that plots.
- **A wrong answer reported as `student-error`.** That means the code threw
  rather than being rejected by the check, which proves nothing (spec §8.1). The
  usual cause in this module is a wrong answer that omits a `mu`/`sigma` line
  the expression still references. Every wrong answer above carries its own
  `read.csv` and its own parameter lines for exactly that reason.

- [ ] **Step 8: Verify Module 5 in the browser**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/05-1`.

Expected:
- Module 5 appears in the sidebar above Module 6, with three lessons.
- The histogram, the overlaid density curve and the standardised histogram all
  draw; the density overlay sits on the bars rather than beside them.
- `<Simulation name="distribution" />` renders on 05-1 and 05-3 and responds to
  its mean and SD controls; the shaded area updates without an R round trip.
- Each `<Predict>` refuses to reveal its response until a choice is made.
- `m5-1-a`: submitting `dnorm(60, mu, sigma)` returns the "that is a height, not
  an area" message rather than a generic failure, and submitting the solution
  marks the exercise complete in the sidebar.
- Reloading the page keeps the completion marks and the edited code drafts.

- [ ] **Step 9: Commit**

```bash
git add src/content/lessons/05-1-density-and-area.mdx src/content/lessons/05-2-z-scores.mdx src/content/lessons/05-3-probabilities.mdx src/content/exercises/module-05.ts src/content/manifest.ts src/content/content.test.ts
git commit -m "feat: Module 5, the normal distribution"
```

---

### Task M7: Module 7 — Estimation

**Files:**
- Create: `src/content/exercises/module-07.ts`, `src/content/lessons/07-1-standard-error-to-interval.mdx`, `src/content/lessons/07-2-what-95-percent-means.mdx`, `src/content/lessons/07-3-error-bars.mdx`
- Modify: `src/content/manifest.ts`, `src/content/exercises/index.ts` (already aggregates `module07` after P3), `src/content/content.test.ts`
- Test: `src/content/content.test.ts`, `src/content/exercises/index.test.ts`, `src/content/exercises/validate.itest.ts`

**Interfaces:**
- Consumes: `ExerciseDef`; `LessonMeta.packages` (content-platform P1) — 07-3 is the first Part 2 lesson to declare any; the `ci` simulation (simulations plan, task S2) — **Module 7 cannot be validated until `ci` is registered**; Module 6's standard error, `σ/√n`, which lesson 07-1 opens by breaking
- Produces: `module07: ExerciseDef[]` with ids `m7-1-a`, `m7-1-b`, `m7-2-a`, `m7-3-a`; three lesson files; a live `module-07` in `MODULES`

Module 6 ended with **SE = σ/√n** and a population whose σ we could simply
compute. Module 7 begins by taking that away: in a real study you have one
sample and no σ, so you estimate it with `s`, pay for the estimate with a
`t` distribution instead of a normal one, and end up with an interval. The
second lesson then attacks the sentence that this interval is almost always
described with, and the third shows how the same three numbers produce three
completely different-looking figures.

- [ ] **Step 1: Fill the `module-07` entry in `PLANNED_MODULES`**

```ts
  {
    id: 'module-07',
    number: 7,
    title: 'Estimation',
    lessons: [
      {
        id: '07-1',
        title: 'From standard error to interval',
        file: '07-1-standard-error-to-interval',
        exercises: ['m7-1-a', 'm7-1-b'],
      },
      {
        id: '07-2',
        title: 'What 95 % actually means',
        file: '07-2-what-95-percent-means',
        exercises: ['m7-2-a'],
      },
      {
        id: '07-3',
        title: 'SD, SE and CI error bars',
        file: '07-3-error-bars',
        exercises: ['m7-3-a'],
        packages: ['dplyr', 'ggplot2'],
      },
    ],
  },
```

- [ ] **Step 2: Write `src/content/exercises/module-07.ts`**

Three of the four exercises take a fixture from `setupCode`: a seeded study drawn
from the population. The checks read that fixture back with `answer()` and derive
the expected value from it, so a student who redraws the study with their own
seed still passes as long as their arithmetic is right.

````ts
import type { ExerciseDef } from '../../r/checker';

/** A seeded study of 50 students, shared by the two exercises in lesson 07-1. */
const STUDY_50 =
  'set.seed(2607)\n' +
  'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\n' +
  'study <- population[sample(nrow(population), 50), ]';

export const module07: ExerciseDef[] = [
  {
    id: 'm7-1-a',
    prompt:
      'study holds one sample of 50 students - all you would have in a real project. Estimate how much the mean exam score of such a study bounces around from sample to sample, and store that standard error in se_mean.',
    starterCode:
      '# study is already in your environment: 50 students, drawn at random.\nnrow(study)\n\n# Standard error = the SD you can actually measure, over the square root of n.\nse_mean <- ',
    setupCode: STUDY_50,
    solution: 'se_mean <- sd(study$exam_score) / sqrt(nrow(study))',
    wrongAnswers: [
      // The SD of the students, not of the mean. The commonest error in the module.
      'se_mean <- sd(study$exam_score)',
      // Divided by n rather than by the square root of n.
      'se_mean <- sd(study$exam_score) / nrow(study)',
      // Used the population SD, which a real study does not have.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nse_mean <- sd(population$exam_score) / sqrt(50)',
    ],
    alternateSolutions: [
      // The sample size written out.
      'se_mean <- sd(study$exam_score) / sqrt(50)',
      // From the variance.
      'se_mean <- sqrt(var(study$exam_score) / nrow(study))',
      // A dplyr pipeline.
      'library(dplyr)\nse_mean <- study %>% summarise(se = sd(exam_score) / sqrt(n())) %>% pull(se)',
      // t.test() reports the same quantity as stderr.
      'se_mean <- as.vector(t.test(study$exam_score)$stderr)',
    ],
    check: `
      if (!has_answer("study")) {
        list(pass = FALSE, message = "The study object has gone missing. Press Reset and try again - the exercise provides it for you.")
      } else if (!has_answer("se_mean")) {
        list(pass = FALSE, message = "I could not find an object called se_mean.")
      } else {
        study <- answer("study")
        value <- as.vector(answer("se_mean"))
        if (!is.data.frame(study) || !("exam_score" %in% names(study))) {
          list(pass = FALSE, message = "study should still be the data frame of 50 students, with its exam_score column.")
        } else if (nrow(study) != 50L) {
          list(pass = FALSE, message = paste0("study now has ", nrow(study), " rows. This exercise is about a study of 50; press Reset to get it back."))
        } else if (is.data.frame(value) || !is.numeric(value) || length(value) != 1L) {
          list(pass = FALSE, message = "se_mean should be a single number.")
        } else {
          s <- sd(study$exam_score)
          expected <- s / sqrt(nrow(study))
          population <- read.csv("data/wellbeing-population.csv")
          sigma <- sd(population$exam_score)
          if (isTRUE(all.equal(value, expected, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = TRUE, message = paste0("Correct: ", round(expected, 3), ". Individual students vary by about ", round(s, 1), " exam points, but the MEAN of 50 of them varies by only about ", round(expected, 2), "."))
          } else if (isTRUE(all.equal(value, s, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That is the standard deviation of the 50 students - how much they differ from each other. The standard error is how much the MEAN of 50 would differ from study to study. Divide by the square root of n.")
          } else if (isTRUE(all.equal(value, s / nrow(study), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "You divided by n. The standard error divides by the square root of n, which is why quadrupling a sample only halves the error.")
          } else if (isTRUE(all.equal(value, sigma / sqrt(50), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That used the SD of all 5000 students. A real study has only its own 50, so the standard error has to be built from sd(study$exam_score).")
          } else {
            list(pass = FALSE, message = paste0("se_mean is ", round(value, 3), " but should be ", round(expected, 3), "."))
          }
        }
      }
    `,
    hints: [
      'The formula is the same one as in Module 6, with one substitution: s in place of sigma.',
      'sd(study$exam_score) is s; nrow(study) is n.',
      'se_mean <- sd(study$exam_score) / sqrt(nrow(study)).',
    ],
  },
  {
    id: 'm7-1-b',
    prompt:
      'Turn that estimate into a 95 % confidence interval for the population mean exam score. Store the two endpoints in ci_95, lower first.',
    starterCode:
      '# study is already in your environment.\nsample_mean <- mean(study$exam_score)\nse_mean <- sd(study$exam_score) / sqrt(nrow(study))\n\n# The multiplier comes from the t distribution with n - 1 degrees of freedom.\nci_95 <- ',
    setupCode: STUDY_50,
    solution:
      'sample_mean <- mean(study$exam_score)\nse_mean <- sd(study$exam_score) / sqrt(nrow(study))\nci_95 <- sample_mean + c(-1, 1) * qt(0.975, df = nrow(study) - 1) * se_mean',
    wrongAnswers: [
      // 1.96 from the normal: right idea, wrong distribution.
      'sample_mean <- mean(study$exam_score)\nse_mean <- sd(study$exam_score) / sqrt(nrow(study))\nci_95 <- sample_mean + c(-1, 1) * 1.96 * se_mean',
      // Forgot the multiplier: one standard error either side is about 68 per cent, not 95.
      'sample_mean <- mean(study$exam_score)\nse_mean <- sd(study$exam_score) / sqrt(nrow(study))\nci_95 <- sample_mean + c(-1, 1) * se_mean',
      // Used the SD rather than the SE, giving an interval for a student instead of for the mean.
      'sample_mean <- mean(study$exam_score)\nci_95 <- sample_mean + c(-1, 1) * qt(0.975, df = nrow(study) - 1) * sd(study$exam_score)',
      // Degrees of freedom left at n rather than n - 1 is a near miss, so instead:
      // a 90 per cent interval, which is the wrong interval entirely.
      'sample_mean <- mean(study$exam_score)\nse_mean <- sd(study$exam_score) / sqrt(nrow(study))\nci_95 <- sample_mean + c(-1, 1) * qt(0.95, df = nrow(study) - 1) * se_mean',
    ],
    alternateSolutions: [
      // Both quantiles in one vectorised call.
      'sample_mean <- mean(study$exam_score)\nse_mean <- sd(study$exam_score) / sqrt(nrow(study))\nci_95 <- sample_mean + qt(c(0.025, 0.975), df = nrow(study) - 1) * se_mean',
      // Endpoints written out one at a time.
      'm <- mean(study$exam_score)\ns <- sd(study$exam_score) / sqrt(50)\nci_95 <- c(m - qt(0.975, 49) * s, m + qt(0.975, 49) * s)',
      // t.test() computes exactly this interval; its conf.int carries attributes,
      // which the check drops with as.vector().
      'ci_95 <- t.test(study$exam_score)$conf.int',
    ],
    check: `
      if (!has_answer("study")) {
        list(pass = FALSE, message = "The study object has gone missing. Press Reset and try again.")
      } else if (!has_answer("ci_95")) {
        list(pass = FALSE, message = "I could not find an object called ci_95.")
      } else {
        study <- answer("study")
        # as.vector(): t.test()$conf.int is a numeric with a conf.level attribute.
        value <- as.vector(answer("ci_95"))
        if (!is.data.frame(study) || nrow(study) != 50L) {
          list(pass = FALSE, message = "study should still be the data frame of 50 students. Press Reset to get it back.")
        } else if (!is.numeric(value) || length(value) != 2L) {
          list(pass = FALSE, message = "ci_95 should be two numbers: the lower and the upper end of the interval.")
        } else {
          x <- study$exam_score
          m <- mean(x)
          se <- sd(x) / sqrt(length(x))
          expected <- m + c(-1, 1) * qt(0.975, df = length(x) - 1) * se
          # sort(): an interval written upper-first is the same interval.
          value <- sort(value)
          if (isTRUE(all.equal(value, expected, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = TRUE, message = paste0("Correct: [", round(expected[1], 2), ", ", round(expected[2], 2), "]. The population mean is 73.31, so this interval does contain it - which about 19 intervals in 20 will."))
          } else if (isTRUE(all.equal(value, sort(m + c(-1, 1) * 1.96 * se), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "You used 1.96, which comes from the normal distribution and assumes you KNOW the SD. You estimated it from 50 students, so the multiplier is qt(0.975, df = 49) = 2.01 - a slightly wider interval, and that extra width is the price of not knowing sigma.")
          } else if (isTRUE(all.equal(value, sort(m + c(-1, 1) * se), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "One standard error either side of the mean covers about 68 per cent, not 95. Multiply the standard error by qt(0.975, df = 49).")
          } else if (isTRUE(all.equal(value, sort(m + c(-1, 1) * qt(0.975, df = length(x) - 1) * sd(x)), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That interval is built from the SD, so it describes where an individual STUDENT falls. A confidence interval for the mean is built from the standard error.")
          } else if (isTRUE(all.equal(value, sort(m + c(-1, 1) * qt(0.95, df = length(x) - 1) * se), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That is a 90 per cent interval. For 95 per cent you need 2.5 per cent in each tail, so the quantile is 0.975, not 0.95.")
          } else {
            list(pass = FALSE, message = paste0("ci_95 is [", round(value[1], 2), ", ", round(value[2], 2), "] but should be [", round(expected[1], 2), ", ", round(expected[2], 2), "]."))
          }
        }
      }
    `,
    hints: [
      'An interval is the estimate plus and minus a multiple of its standard error.',
      'The multiple for 95 per cent, when the SD was estimated from n observations, is qt(0.975, df = n - 1).',
      'c(-1, 1) * something gives you both endpoints at once: sample_mean + c(-1, 1) * qt(0.975, df = 49) * se_mean.',
    ],
  },
  {
    id: 'm7-2-a',
    prompt:
      'Run 100 studies of 40 students each, build a 95 % confidence interval from every one of them, and count how many of those 100 intervals contain the true population mean mu. Store the count in captured.',
    starterCode:
      '# population and mu are already in your environment.\nmu\n\n# Each study: draw 40 exam scores, build an interval, ask whether it contains mu.\ncaptured <- ',
    setupCode:
      'set.seed(72)\n' +
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\n' +
      'mu <- mean(population$exam_score)',
    solution:
      'hits <- replicate(100, {\n  s <- sample(population$exam_score, 40)\n  ci <- mean(s) + c(-1, 1) * qt(0.975, df = 39) * sd(s) / sqrt(40)\n  ci[1] <= mu && ci[2] >= mu\n})\ncaptured <- sum(hits)',
    wrongAnswers: [
      // Tested each interval against its own sample mean, which it always contains.
      'hits <- replicate(100, {\n  s <- sample(population$exam_score, 40)\n  ci <- mean(s) + c(-1, 1) * qt(0.975, df = 39) * sd(s) / sqrt(40)\n  ci[1] <= mean(s) && ci[2] >= mean(s)\n})\ncaptured <- sum(hits)',
      // Counted the misses rather than the hits.
      'hits <- replicate(100, {\n  s <- sample(population$exam_score, 40)\n  ci <- mean(s) + c(-1, 1) * qt(0.975, df = 39) * sd(s) / sqrt(40)\n  ci[1] <= mu && ci[2] >= mu\n})\ncaptured <- 100 - sum(hits)',
      // Reported the proportion where a count was asked for.
      'hits <- replicate(100, {\n  s <- sample(population$exam_score, 40)\n  ci <- mean(s) + c(-1, 1) * qt(0.975, df = 39) * sd(s) / sqrt(40)\n  ci[1] <= mu && ci[2] >= mu\n})\ncaptured <- mean(hits)',
      // Tested against a made-up value instead of the population mean.
      'hits <- replicate(100, {\n  s <- sample(population$exam_score, 40)\n  ci <- mean(s) + c(-1, 1) * qt(0.975, df = 39) * sd(s) / sqrt(40)\n  ci[1] <= 70 && ci[2] >= 70\n})\ncaptured <- sum(hits)',
    ],
    alternateSolutions: [
      // A for loop over a preallocated vector.
      'hits <- logical(100)\nfor (i in 1:100) {\n  s <- sample(population$exam_score, 40)\n  se <- sd(s) / sqrt(40)\n  hits[i] <- abs(mean(s) - mu) <= qt(0.975, df = 39) * se\n}\ncaptured <- sum(hits)',
      // t.test() builds the interval.
      'hits <- replicate(100, {\n  ci <- t.test(sample(population$exam_score, 40))$conf.int\n  mu >= ci[1] && mu <= ci[2]\n})\ncaptured <- sum(hits)',
      // Collect the endpoints first, then compare them vectorised.
      'ends <- replicate(100, {\n  s <- sample(population$exam_score, 40)\n  mean(s) + c(-1, 1) * qt(0.975, df = 39) * sd(s) / sqrt(40)\n})\ncaptured <- sum(ends[1, ] <= mu & ends[2, ] >= mu)',
    ],
    check: `
      if (!has_answer("captured")) {
        list(pass = FALSE, message = "I could not find an object called captured.")
      } else {
        value <- as.vector(answer("captured"))
        if (!is.numeric(value) && !is.logical(value)) {
          list(pass = FALSE, message = "captured should be a number: how many of the 100 intervals contained mu.")
        } else if (length(value) != 1L) {
          list(pass = FALSE, message = paste0("captured has ", length(value), " values. It should be one number - the count over all 100 studies, so sum() the results rather than keeping them."))
        } else {
          value <- as.numeric(value)
          # A band, not a value: a 95 per cent procedure captures mu about 95 times
          # in 100, and the count has an SD of about 2.2, so anything from 86 up is
          # an honest result. Every wrong answer below lands at 100, 5, 0.95 or ~63.
          if (value > 0 && value < 1) {
            list(pass = FALSE, message = paste0("That is the PROPORTION (", round(value, 2), "). The exercise asks for the count out of 100, so use sum() rather than mean()."))
          } else if (isTRUE(all.equal(value, 100, tolerance = 1e-9))) {
            list(pass = FALSE, message = "All 100 intervals captured it, which cannot happen by chance with a 95 per cent procedure. You almost certainly compared each interval against its own sample mean, which sits in the middle of it by construction. Compare against mu, the population mean.")
          } else if (value >= 86 && value <= 99) {
            list(pass = TRUE, message = paste0(value, " of your 100 intervals contained mu. Not 95, and it never is exactly 95 - but close, and it would settle on 95 over enough studies. The 95 per cent describes the PROCEDURE, not any one interval."))
          } else if (value <= 14) {
            list(pass = FALSE, message = paste0("Only ", value, " intervals captured mu. If you counted the ones that MISSED, take 100 minus your count - the misses are the 5 per cent, not the 95."))
          } else {
            list(pass = FALSE, message = paste0(value, " of 100 is too few for a 95 per cent procedure. Check the value you are testing against (it should be mu, the population mean) and the quantile in qt() (0.975, not 0.95)."))
          }
        }
      }
    `,
    hints: [
      'replicate(100, expr) runs expr 100 times. The expr you want returns TRUE or FALSE: did this interval contain mu?',
      'Inside it: draw a sample, compute its mean and standard error, build the interval with qt(0.975, df = 39).',
      'An interval contains mu when ci[1] <= mu && ci[2] >= mu. sum() of 100 TRUE/FALSE values is the count.',
    ],
  },
  {
    id: 'm7-3-a',
    prompt:
      'Build the summary table an error-bar figure needs. From study, produce summary_table with one row per programme and the columns mean_exam, sd_exam, n, se and ci, where ci is the half-width of a 95 % confidence interval.',
    starterCode:
      'library(dplyr)\n\n# study is already in your environment: 120 students.\nsummary_table <- study %>%\n  group_by(programme) %>%\n  summarise(mean_exam = mean(exam_score), sd_exam = sd(exam_score), n = n()) %>%\n  mutate(se = , ci = )',
    setupCode:
      'set.seed(73)\n' +
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\n' +
      'study <- population[sample(nrow(population), 120), ]',
    solution:
      'library(dplyr)\nsummary_table <- study %>%\n  group_by(programme) %>%\n  summarise(mean_exam = mean(exam_score), sd_exam = sd(exam_score), n = n()) %>%\n  mutate(se = sd_exam / sqrt(n), ci = qt(0.975, df = n - 1) * se)',
    wrongAnswers: [
      // Divided by n rather than sqrt(n).
      'library(dplyr)\nsummary_table <- study %>%\n  group_by(programme) %>%\n  summarise(mean_exam = mean(exam_score), sd_exam = sd(exam_score), n = n()) %>%\n  mutate(se = sd_exam / n, ci = qt(0.975, df = n - 1) * se)',
      // Never divided at all: the SE column is the SD again.
      'library(dplyr)\nsummary_table <- study %>%\n  group_by(programme) %>%\n  summarise(mean_exam = mean(exam_score), sd_exam = sd(exam_score), n = n()) %>%\n  mutate(se = sd_exam, ci = qt(0.975, df = n - 1) * se)',
      // 1.96 from the normal instead of the t quantile.
      'library(dplyr)\nsummary_table <- study %>%\n  group_by(programme) %>%\n  summarise(mean_exam = mean(exam_score), sd_exam = sd(exam_score), n = n()) %>%\n  mutate(se = sd_exam / sqrt(n), ci = 1.96 * se)',
      // Forgot group_by, so the two programmes are pooled into one row.
      'library(dplyr)\nsummary_table <- study %>%\n  summarise(programme = "All", mean_exam = mean(exam_score), sd_exam = sd(exam_score), n = n()) %>%\n  mutate(se = sd_exam / sqrt(n), ci = qt(0.975, df = n - 1) * se)',
    ],
    alternateSolutions: [
      // Everything inside summarise, with no mutate at all.
      'library(dplyr)\nsummary_table <- study %>%\n  group_by(programme) %>%\n  summarise(\n    mean_exam = mean(exam_score), sd_exam = sd(exam_score), n = n(),\n    se = sd(exam_score) / sqrt(n()),\n    ci = qt(0.975, df = n() - 1) * sd(exam_score) / sqrt(n())\n  )',
      // The t quantile passed positionally.
      'library(dplyr)\nsummary_table <- study %>%\n  group_by(programme) %>%\n  summarise(mean_exam = mean(exam_score), sd_exam = sd(exam_score), n = n(), .groups = "drop") %>%\n  mutate(se = sd_exam / sqrt(n), ci = qt(0.975, n - 1) * se)',
      // Base R: the check reads values, so a route with no pipe at all must pass.
      'agg <- aggregate(exam_score ~ programme, data = study, FUN = function(x) c(m = mean(x), s = sd(x), k = length(x)))\nsummary_table <- data.frame(\n  programme = agg$programme,\n  mean_exam = agg$exam_score[, "m"],\n  sd_exam = agg$exam_score[, "s"],\n  n = agg$exam_score[, "k"]\n)\nsummary_table$se <- summary_table$sd_exam / sqrt(summary_table$n)\nsummary_table$ci <- qt(0.975, df = summary_table$n - 1) * summary_table$se',
    ],
    check: `
      if (!has_answer("study")) {
        list(pass = FALSE, message = "The study object has gone missing. Press Reset and try again.")
      } else if (!has_answer("summary_table")) {
        list(pass = FALSE, message = "I could not find an object called summary_table.")
      } else {
        study <- answer("study")
        # as.data.frame(): a grouped tibble indexes differently from a data frame.
        tbl <- as.data.frame(answer("summary_table"))
        wanted <- c("programme", "mean_exam", "sd_exam", "n", "se", "ci")
        missing <- setdiff(wanted, names(tbl))
        if (length(missing) > 0L) {
          list(pass = FALSE, message = paste0("summary_table is missing the column(s): ", paste(missing, collapse = ", "), "."))
        } else if (nrow(tbl) != 2L) {
          list(pass = FALSE, message = paste0("summary_table has ", nrow(tbl), " row(s). There are two programmes, so it needs two - did group_by(programme) get left out?"))
        } else {
          order_tbl <- order(as.character(tbl$programme))
          tbl <- tbl[order_tbl, ]
          groups <- split(study$exam_score, as.character(study$programme))
          groups <- groups[order(names(groups))]
          want_mean <- vapply(groups, mean, numeric(1))
          want_sd <- vapply(groups, sd, numeric(1))
          want_n <- vapply(groups, length, numeric(1))
          want_se <- want_sd / sqrt(want_n)
          want_ci <- qt(0.975, df = want_n - 1) * want_se
          same <- function(a, b) isTRUE(all.equal(as.vector(a), as.vector(b), tolerance = 1e-6, check.attributes = FALSE))
          if (!identical(as.character(tbl$programme), names(groups))) {
            list(pass = FALSE, message = paste0("The programme column should hold ", paste(names(groups), collapse = " and "), ", one row each."))
          } else if (!same(tbl$n, want_n)) {
            list(pass = FALSE, message = "The n column does not match the number of students in each programme. n() counts the rows in the group.")
          } else if (!same(tbl$mean_exam, want_mean) || !same(tbl$sd_exam, want_sd)) {
            list(pass = FALSE, message = "mean_exam and sd_exam should be the mean and SD of exam_score within each programme.")
          } else if (same(tbl$se, want_sd)) {
            list(pass = FALSE, message = "Your se column is the SD again. The standard error divides the SD by the square root of the group size.")
          } else if (same(tbl$se, want_sd / want_n)) {
            list(pass = FALSE, message = "You divided the SD by n. The standard error divides by sqrt(n).")
          } else if (!same(tbl$se, want_se)) {
            list(pass = FALSE, message = "The se column should be sd_exam / sqrt(n), computed within each programme.")
          } else if (same(tbl$ci, 1.96 * want_se)) {
            list(pass = FALSE, message = "You used 1.96. Each group's SD was estimated from about 60 students, so the multiplier is qt(0.975, df = n - 1) - close to 2.00 here, but it is the t quantile that belongs in the formula.")
          } else if (!same(tbl$ci, want_ci)) {
            list(pass = FALSE, message = "The ci column should be the half-width of the 95 per cent interval: qt(0.975, df = n - 1) * se.")
          } else {
            list(pass = TRUE, message = paste0("Correct. The SD bars would be about ", round(mean(want_sd), 1), " points long, the SE bars about ", round(mean(want_se), 1), ", and the CI bars about ", round(mean(want_ci), 1), " - three honest figures from one table, which is why a caption must say which one it is."))
          }
        }
      }
    `,
    hints: [
      'group_by(programme) then summarise() gives you one row per programme.',
      'mutate() adds columns computed from the ones summarise() just made: se = sd_exam / sqrt(n).',
      'The CI half-width is the standard error times the t quantile: ci = qt(0.975, df = n - 1) * se.',
    ],
  },
];
````

- [ ] **Step 3: Write `src/content/lessons/07-1-standard-error-to-interval.mdx`**

````mdx
Module 6 finished with a formula: the standard error of the mean is **σ/√n**.
It also quietly cheated. We had all 5000 students, so σ was there for the
taking. No real study has that. You have one sample, you have no idea what σ is,
and you still have to say how precise your estimate is.

This lesson is about what you do instead, and what it costs.

<CodeBlock id="study" code={`library(dplyr)

population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)

set.seed(2607)
study <- population[sample(nrow(population), 50), ]

study %>% summarise(mean_exam = mean(exam_score), sd_exam = sd(exam_score), n = n())`} />

From here on, pretend the `population` object does not exist. You have `study`:
fifty students, a mean, and a standard deviation. Everything must be built from
those.

## s in place of σ

The substitution is the obvious one. You cannot have σ, so you use `s`, the
standard deviation of your own fifty students, and the standard error becomes
**s/√n**.

<CodeBlock id="se" code={`sample_mean <- mean(study$exam_score)
se_mean <- sd(study$exam_score) / sqrt(nrow(study))

sample_mean
se_mean`} />

Two numbers that do different jobs, and confusing them is the single most common
error in this module:

- **`sd(study$exam_score)`** says how much *students* differ from each other. It
  is a fact about people, and collecting more of them does not shrink it.
- **`se_mean`** says how much the *sample mean* would differ from study to
  study. It is a fact about the procedure, and it shrinks as √n grows.

<Exercise id="m7-1-a" />

<Predict
  id="p-price"
  question="You estimated the SD from 50 students rather than knowing it. What should that cost you?"
  choices={[
    { text: 'Nothing, because 50 is a reasonably large sample', response: 'It costs something at every n. The cost is small at 50 and large at 5, but it is never zero.' },
    { text: 'A slightly wider interval, to allow for the fact that s is itself uncertain', correct: true, response: 'Exactly. The t distribution has heavier tails than the normal, which pushes the multiplier above 1.96.' },
    { text: 'A narrower interval, because the sample SD is smaller than the population SD', response: 'It is not systematically smaller, and uncertainty never buys you precision.' },
  ]}
/>

## Why t, and not 1.96

Module 5 found 1.96: the point with 2.5 per cent of a normal curve beyond it.
That number is correct when you *know* σ. When you have estimated it, the right
curve is Student's **t** with `n − 1` degrees of freedom — same shape, fatter
tails — and its 97.5th percentile is bigger.

<CodeBlock id="tvsz" code={`qnorm(0.975)            # if sigma were known
qt(0.975, df = 49)      # 50 students, sigma estimated
qt(0.975, df = 9)       # 10 students
qt(0.975, df = 4)       # 5 students`} />

At 50 students the penalty is 2.01 against 1.96 — about 2.5 per cent wider. At
five students it is 2.78, and the interval is forty per cent wider. The smaller
your sample, the less you know about how variable your data are, and the more
you pay for that ignorance.

## The interval

The estimate, plus and minus a multiple of its standard error.

<CodeBlock id="ci" code={`ci_95 <- sample_mean + c(-1, 1) * qt(0.975, df = nrow(study) - 1) * se_mean
ci_95

# t.test() computes the same interval, which is worth knowing
# because that is where you will usually read it off.
t.test(study$exam_score)$conf.int`} />

> **Change the sample size.** Go back to the `study` block, change `50` to
> `200`, and run everything again. The interval should be about half as wide,
> because the standard error fell by √4.

<Exercise id="m7-1-b" />

<Quiz
  id="q-se-sd"
  question="A journal asks you to report 'the variability of exam scores in your sample'. Which number do you give?"
  choices={[
    { text: 'The standard error, because it is the more precise quantity', response: 'It is smaller, which is not the same as more appropriate. The standard error describes the mean, not the students.' },
    { text: 'The standard deviation, because the question is about how much students differ', correct: true, response: 'Right. SD describes the data; SE describes the estimate. The question asked about the data.' },
    { text: 'Either, since they differ only by a constant', response: 'They differ by √n, which is not a constant across studies, and they answer different questions.' },
    { text: 'The confidence interval, because it contains both', response: 'A CI is a statement about the population mean. It says nothing directly about how spread out the students are.' },
  ]}
/>

<Interpret
  id="i-7-1"
  question="Your study of 50 students gave M = 73.9, SD = 12.1, and a 95% confidence interval of [70.5, 77.3]. Which sentence reports it correctly?"
  choices={[
    { text: 'Mean exam score was 73.9 (SD = 12.1, n = 50), 95% CI [70.5, 77.3]. The interval was produced by a procedure that captures the population mean in 95% of studies.', correct: true, response: 'Correct. It reports the estimate, its spread, its sample size and the interval, and locates the 95% in the procedure rather than in this one interval.' },
    { text: 'There is a 95% chance that the population mean lies between 70.5 and 77.3.', response: 'The population mean is a fixed number: it is either in this interval or it is not. The 95% describes how often the method works, not this interval. The next lesson is entirely about this sentence.' },
    { text: '95% of students scored between 70.5 and 77.3.', response: 'That would need the SD, not the SE. With SD = 12.1, the middle 95% of students spans roughly 50 to 98 - far wider.' },
    { text: 'The sample mean of 73.9 is accurate to within 3.4 points.', response: '"Accurate to within" claims a guarantee the interval does not give. One study in twenty produces an interval that misses the population mean entirely.' },
  ]}
/>
````

- [ ] **Step 4: Write `src/content/lessons/07-2-what-95-percent-means.mdx`**

````mdx
Here is a sentence that appears in published papers, in textbooks, and in about
nine out of ten student reports:

> *"We are 95% confident that the true mean lies between 70.5 and 77.3, so
> there is a 95% chance it is in that range."*

The first half is standard usage. The second half is wrong, and this lesson is
about why — not as a piece of pedantry, but because the correct version is what
makes the interval useful.

<Predict
  id="p-meaning"
  question="You compute one 95% confidence interval from one study. What is the probability that the population mean lies inside it?"
  choices={[
    { text: '95%', response: 'This is the intuitive answer and it is the one the lesson exists to correct. Keep reading — then come back and see whether you still believe it.' },
    { text: 'Either 0 or 1, and you cannot tell which', correct: true, response: 'Yes. The population mean is a fixed number and your interval is fixed once computed, so it either contains it or it does not. The 95% is a property of the method across many studies.' },
    { text: 'It depends on the sample size', response: 'Sample size changes the WIDTH of the interval, not whether this particular one happens to contain the mean.' },
  ]}
/>

## A hundred studies

We have a luxury no researcher has: we can run the study a hundred times and
check every answer against the truth.

<CodeBlock id="many" code={`library(dplyr)

population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)
mu <- mean(population$exam_score)

set.seed(72)
intervals <- replicate(100, {
  s <- sample(population$exam_score, 40)
  ci <- mean(s) + c(-1, 1) * qt(0.975, df = 39) * sd(s) / sqrt(40)
  c(lower = ci[1], upper = ci[2])
})

intervals <- as.data.frame(t(intervals))
intervals$study <- 1:100
intervals$captured <- intervals$lower <= mu & intervals$upper >= mu

sum(intervals$captured)`} />

Around 95 of the hundred contain μ. Around five do not. Now look at them.

<CodeBlock id="plot" code={`library(ggplot2)

intervals %>%
  ggplot(aes(x = study, y = (lower + upper) / 2, colour = captured)) +
  geom_errorbar(aes(ymin = lower, ymax = upper), width = 0) +
  geom_hline(yintercept = mu, linetype = "dashed") +
  labs(x = "Study", y = "95% CI for mean exam score", colour = "Contains mu") +
  theme_classic()`} />

Every one of those intervals was computed correctly, by the same method, from an
honest random sample. The five that miss are not mistakes. They are the five per
cent, and there is nothing about them — no warning sign, no wider width, no
flag — that distinguishes them from the other ninety-five. A researcher holding
one of those five has no way to know.

That is the whole point. **The 95 per cent lives in the procedure, not in the
interval.** Run the method forever and 95 per cent of the intervals it produces
will contain the parameter. Run it once and you get one interval, which either
does or does not.

## See it run

Draw a hundred intervals and watch the misses appear. Draw another hundred and
watch a different five miss.

<Simulation name="ci" />

<Exercise id="m7-2-a" />

## What you may and may not say

Three sentences, ranked:

1. **"95% CI [70.5, 77.3]."** Always safe. Report the interval and let it speak.
2. **"We are 95% confident the population mean lies in [70.5, 77.3]."**
   Standard usage. "Confident" is a term of art here meaning "produced by a
   procedure with 95 per cent coverage", and every reader in the field takes it
   that way.
3. **"There is a 95% chance the population mean lies in [70.5, 77.3]."** Wrong.
   It puts the randomness in the parameter, which does not vary, instead of in
   the interval, which does.

A practical consequence, and the reason this is not just philosophy: a *wide*
interval is informative. It tells you the study could not pin the mean down, and
that is a finding about the study's precision — one you cannot read off a p-value
at all.

<Quiz
  id="q-95"
  question="Two studies of the same question report 95% CIs of [2, 8] and [4.8, 5.2]. What do you learn?"
  choices={[
    { text: 'The second study is more likely to be correct', response: 'Both procedures have the same 95 per cent coverage. Neither is more likely to have captured the parameter.' },
    { text: 'Both were produced by a procedure with the same 95% coverage, but the second estimated the parameter far more precisely', correct: true, response: 'Right. Coverage is a property of the method and is identical; width is a property of the study, and the second one is much more informative.' },
    { text: 'The first study has a 95% chance of containing the parameter and the second has a higher chance', response: 'Neither interval has a probability attached to it once it is computed. Width does not change coverage.' },
    { text: 'The studies disagree, because the intervals have different widths', response: 'They agree rather well: both are consistent with a parameter near 5. One is simply more precise.' },
  ]}
/>

<Interpret
  id="i-7-2"
  question="A reviewer asks you to explain, in the paper, what your confidence interval means. Which sentence goes in?"
  choices={[
    { text: 'Mean exam score was 73.9, 95% CI [70.5, 77.3]. Intervals constructed this way contain the population mean in 95% of repeated samples.', correct: true, response: 'Correct, and this is the form a methods reviewer is looking for: the coverage is attributed to the construction, across repeated samples.' },
    { text: 'There is a 95% chance that the true mean is in this interval.', response: 'The classic misstatement. The true mean is fixed; this interval is fixed once computed. The 95% describes the procedure over repeated samples, not this one result.' },
    { text: '95% of our sample scored between 70.5 and 77.3.', response: 'That describes students, and would need the SD. The interval describes the precision of the mean.' },
    { text: 'We can be 95% certain that a replication would produce a mean inside this interval.', response: 'A prediction interval for a future study mean is a different and wider interval. A confidence interval is about the parameter, not about the next sample.' },
  ]}
/>
````

- [ ] **Step 5: Write `src/content/lessons/07-3-error-bars.mdx`**

````mdx
Open any journal and you will find figures with little vertical bars on top of
the bars or points. Open three journals and you will find that the bars mean
three different things. This lesson builds all three from one table, so you can
see how much the choice changes the picture — and why a caption that does not say
which one it is, is not a caption.

<CodeBlock id="table" code={`library(dplyr)

population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)

set.seed(73)
study <- population[sample(nrow(population), 120), ]

summary_table <- study %>%
  group_by(programme) %>%
  summarise(mean_exam = mean(exam_score), sd_exam = sd(exam_score), n = n()) %>%
  mutate(se = sd_exam / sqrt(n), ci = qt(0.975, df = n - 1) * se)

summary_table`} />

Three columns, three lengths, one dataset:

- **`sd_exam`** — how much students differ from each other. About 12 points.
- **`se`** — how much the group mean would differ from study to study. About
  1.6 points, because it is the SD divided by √60.
- **`ci`** — the half-width of the 95 per cent interval: the standard error
  times `qt(0.975, df = n - 1)`, so a shade over twice the SE.

<Predict
  id="p-bars"
  question="The same two means are about to be drawn three times, with SD bars, SE bars and CI bars. Which figure will make the two programmes look most similar?"
  choices={[
    { text: 'The SD bars, because they are the longest', correct: true, response: 'Yes. SD bars are about eight times longer than SE bars here, so any gap between the means disappears inside them.' },
    { text: 'The SE bars, because they are the shortest', response: 'Short bars make a gap look large, not small. SE bars will make the two groups look as different as they ever will.' },
    { text: 'All three, because the means are the same in every figure', response: 'The means are identical, but a reader judges a difference by comparing it with the bars. Change the bars and you change the impression.' },
  ]}
/>

<CodeBlock id="bars" code={`library(ggplot2)

bars <- bind_rows(
  summary_table %>% mutate(kind = "SD", half = sd_exam),
  summary_table %>% mutate(kind = "SE", half = se),
  summary_table %>% mutate(kind = "95% CI", half = ci)
)

bars %>%
  mutate(kind = factor(kind, levels = c("SD", "SE", "95% CI"))) %>%
  ggplot(aes(x = programme, y = mean_exam)) +
  geom_point(size = 2) +
  geom_errorbar(aes(ymin = mean_exam - half, ymax = mean_exam + half), width = 0.15) +
  facet_wrap(~ kind) +
  labs(x = NULL, y = "Mean exam score") +
  theme_classic()`} />

Three honest figures. Identical data, identical means, and a reader would draw
three different conclusions from them. Nobody falsified anything; somebody chose
a bar.

## Which one to use

- **SD bars** when the figure is about the *data*: how spread out the
  observations are. Common in descriptive figures and in clinical work.
- **SE bars** when the figure is about the *precision of the means*. Widely used
  and widely misread, because a reader who assumes CIs will read a 68 per cent
  bar as a 95 per cent one and see differences that are not there.
- **CI bars** when the figure is meant to support an inference. This is the
  default for an APA figure, and it is the one to prefer unless you have a
  reason not to.

Whichever you pick, **the caption must say so**. "Error bars show 95% CIs" is
six words and is the difference between a figure a reader can use and one they
have to guess at.

One caution while we are here, because it is the next mistake after choosing the
bars: overlapping confidence intervals do **not** mean "no difference", and
non-overlapping ones do not prove a difference either. Two 95 per cent intervals
can overlap while the difference between the means is significant. The interval
for a *difference* is a different interval, and Module 8 computes it.

<Exercise id="m7-3-a" />

<Quiz
  id="q-bars"
  question="A figure shows two means with error bars of about ±1.6 points and no caption explaining them. The group SDs are around 12 and each group has about 60 people. What are the bars almost certainly showing?"
  choices={[
    { text: 'Standard deviations', response: 'The SDs are about 12, so SD bars would be roughly eight times longer than the ones drawn.' },
    { text: 'Standard errors', correct: true, response: 'Right: 12/√60 is about 1.6. You could reconstruct it because n and the SD happened to be reported — which is exactly the guessing a caption saves a reader from.' },
    { text: '95% confidence intervals', response: 'Those would be about 2.0 times the standard error, so roughly ±3.2 points here.' },
    { text: 'The range of the data', response: 'Exam scores run from the twenties to 100. A range bar would cover most of the figure.' },
  ]}
/>

<Interpret
  id="i-7-3"
  question="Your figure shows Psychology at M = 74.8, 95% CI [71.8, 77.9] and Business at M = 72.1, 95% CI [68.8, 75.4]. Which caption and reading is right?"
  choices={[
    { text: 'Mean exam score by programme. Error bars show 95% confidence intervals. Psychology, M = 74.8, 95% CI [71.8, 77.9]; Business, M = 72.1, 95% CI [68.8, 75.4].', correct: true, response: 'Correct. It names what the bars are and reports both means with their intervals, which is what APA asks for and what lets a reader check the figure against the text.' },
    { text: 'Mean exam score by programme. The intervals overlap, so the two programmes do not differ.', response: 'Overlapping 95% intervals do not establish the absence of a difference. The question is about the interval for the DIFFERENCE, which is not drawn here.' },
    { text: 'Mean exam score by programme. Error bars show the range within which 95% of students in each programme scored.', response: 'That would be built from the SD and would span roughly 50 to 98. These bars are built from the standard error and describe the means.' },
    { text: 'Mean exam score by programme, with standard error bars.', response: 'The bars shown are about twice the standard error, because they are CI bars. Labelling them SE would understate the uncertainty by half.' },
  ]}
/>
````

- [ ] **Step 6: Add Module 7 assertions to `src/content/content.test.ts`**

```ts
describe('Module 7', () => {
  const lessons = [
    '07-1-standard-error-to-interval',
    '07-2-what-95-percent-means',
    '07-3-error-bars',
  ];

  test('its three lesson files exist and are live in MODULES', () => {
    for (const file of lessons) expect(sources[`./lessons/${file}.mdx`], `missing ${file}`).toBeDefined();
    expect(MODULES.map((m) => m.id)).toContain('module-07');
  });

  test('the ci simulation is embedded in 07-2', () => {
    expect(sources['./lessons/07-2-what-95-percent-means.mdx']).toMatch(/<Simulation name="ci" \/>/);
  });

  test('07-3 is the only Module 7 lesson that declares packages', () => {
    const module = PLANNED_MODULES.find((m) => m.id === 'module-07')!;
    expect(module.lessons.map((l) => l.packages ?? [])).toEqual([[], [], ['dplyr', 'ggplot2']]);
  });

  test('every Module 7 lesson distinguishes SD from SE in prose', () => {
    // The module exists to separate these two. A lesson that never names both
    // has lost the thread, and no other test would notice.
    for (const file of lessons) {
      const source = sources[`./lessons/${file}.mdx`];
      expect(source, `${file} never mentions the standard error`).toMatch(/standard error/i);
    }
  });

  test('no Module 7 exercise builds an interval with a hard-coded 1.96', () => {
    // 1.96 is the normal quantile and belongs only in a wrong answer or a
    // teaching message; a solution must reach for qt().
    for (const exercise of module07) {
      expect(exercise.solution, `${exercise.id} uses 1.96 in its solution`).not.toMatch(/1\.96/);
      for (const alternate of exercise.alternateSolutions ?? []) {
        expect(alternate, `${exercise.id} has an alternate using 1.96`).not.toMatch(/1\.96/);
      }
    }
  });

  test('Module 7 defines exactly the exercises the manifest lists', () => {
    const planned = PLANNED_MODULES.find((m) => m.id === 'module-07')!;
    expect(module07.map((e) => e.id)).toEqual(planned.lessons.flatMap((l) => l.exercises));
  });
});
```

- [ ] **Step 7: Run the validator**

Run: `npm run validate`

Expected:

```
 ✓ src/content/content.test.ts  (24 tests)
 ✓ src/content/exercises/index.test.ts  (9 tests)
 ✓ src/content/exercises/validate.itest.ts
   ✓ exercise m7-1-a > the reference solution passes its own check
   ✓ exercise m7-1-a > wrong answers > wrong answer 0..2 rejected by the check, not by an error
   ✓ exercise m7-1-a > alternate solutions > alternate solution 0..3 passes
   ✓ exercise m7-1-b > … (4 wrong answers, 3 alternates)
   ✓ exercise m7-2-a > … (4 wrong answers, 3 alternates)
   ✓ exercise m7-3-a > … (4 wrong answers, 3 alternates)
   ✓ lesson 07-1 > its code blocks run in order without an R error, and its exercises grade correctly after them
   ✓ lesson 07-2 > …
   ✓ lesson 07-3 > …
```

Two seed-dependent results must be inspected, not assumed, the first time this
runs:

- **`m7-2-a` with `set.seed(72)` must not capture exactly 100 of 100.** The
  check rejects 100 as "you compared against the sample mean", which would then
  fail the reference solution. A 95 per cent procedure produces 100 hits about
  0.6 per cent of the time, so this is unlikely but not impossible. If it
  happens, change the seed in `setupCode` — not the band, and not the 100-hit
  branch, which is the only thing that catches the commonest wrong answer.
- **The `many` block in 07-2 must produce between 88 and 99 captures**, because
  the prose says "around 95 of the hundred". If the seed gives 86, change the
  seed rather than the sentence.

Record the observed count in the commit message so a later reader can tell
whether a change moved it.

- [ ] **Step 8: Verify Module 7 in the browser**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/07-1`.

Expected:
- Modules 5, 6 and 7 all appear in the sidebar, in order.
- 07-1: the `tvsz` block prints four numbers that increase as df falls; editing
  `50` to `200` in the `study` block and re-running the later blocks roughly
  halves the interval width, as the prose promises.
- 07-2: the hundred-interval plot draws with the missing intervals in a
  different colour, and `<Simulation name="ci" />` redraws a fresh hundred on
  demand.
- 07-3: opening the lesson shows the install pill only if `dplyr`/`ggplot2` are
  somehow absent — both are core, so the lesson should reach *ready* without a
  second install; the three-panel facet renders with visibly different bar
  lengths.
- `m7-1-b`: submitting the `1.96` version returns the "that comes from the
  normal distribution" message, not a generic failure.

- [ ] **Step 9: Commit**

```bash
git add src/content/lessons/07-1-standard-error-to-interval.mdx src/content/lessons/07-2-what-95-percent-means.mdx src/content/lessons/07-3-error-bars.mdx src/content/exercises/module-07.ts src/content/manifest.ts src/content/content.test.ts
git commit -m "feat: Module 7, estimation and confidence intervals"
```

---

### Task M8: Module 8 — Hypothesis testing

**Files:**
- Create: `src/content/exercises/module-08.ts`, `src/content/lessons/08-1-null-distribution.mdx`, `src/content/lessons/08-2-p-values-and-alpha.mdx`, `src/content/lessons/08-3-errors-and-power.mdx`
- Modify: `src/content/manifest.ts`, `src/content/exercises/index.ts` (already aggregates `module08` after P3), `src/content/content.test.ts`
- Test: `src/content/content.test.ts`, `src/content/exercises/index.test.ts`, `src/content/exercises/validate.itest.ts`

**Interfaces:**
- Consumes: `ExerciseDef`; the `pvalue` simulation (simulations plan, task S3) — **Module 8 cannot be validated until `pvalue` is registered**; Module 6's sampling distribution, of which the null distribution is a special case; Module 7's standard error and `t` quantile, which `t.test` reuses
- Produces: `module08: ExerciseDef[]` with ids `m8-1-a`, `m8-2-a`, `m8-2-b`, `m8-3-a`; three lesson files; a live `module-08` in `MODULES`

This module has to teach NHST logic honestly, which means saying plainly what a
p-value is not. Three commitments shape all three lessons:

1. **The null distribution is built by simulation before any formula appears.**
   Students shuffle labels 2000 times and watch a distribution form. `t.test`
   arrives afterwards, as a shortcut that agrees with the shuffling.
2. **The p-value is a tail area of that distribution, and nothing else.** It is
   not the probability the null is true, it is not the probability the result
   was chance, and a large one does not prove the null.
3. **α is a decision threshold someone chose**, and the two ways of being wrong
   are symmetric. Power is what a non-significant result has to be read against.

The dataset supports all of that without any arrangement after the fact:
`sleep_hours` carries a real 6-point effect on `exam_score`, and `programme`
carries none at all.

- [ ] **Step 1: Fill the `module-08` entry in `PLANNED_MODULES`**

```ts
  {
    id: 'module-08',
    number: 8,
    title: 'Hypothesis testing',
    lessons: [
      {
        id: '08-1',
        title: 'The null distribution',
        file: '08-1-null-distribution',
        exercises: ['m8-1-a'],
      },
      {
        id: '08-2',
        title: 'p-values and α',
        file: '08-2-p-values-and-alpha',
        exercises: ['m8-2-a', 'm8-2-b'],
      },
      {
        id: '08-3',
        title: 'Two errors, and power',
        file: '08-3-errors-and-power',
        exercises: ['m8-3-a'],
      },
    ],
  },
```

- [ ] **Step 2: Write `src/content/exercises/module-08.ts`**

````ts
import type { ExerciseDef } from '../../r/checker';

/**
 * A seeded study of 60 students, split by whether they sleep seven hours or
 * more, with the observed difference in mean exam score. Shared by m8-1-a,
 * m8-2-a and m8-2-b so all three grade against the same study.
 */
const STUDY_60 =
  'set.seed(8241)\n' +
  'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\n' +
  'population$sleep_group <- ifelse(population$sleep_hours >= 7, "7 or more", "under 7")\n' +
  'study <- population[sample(nrow(population), 60), ]\n' +
  'observed <- mean(study$exam_score[study$sleep_group == "7 or more"]) -\n' +
  '  mean(study$exam_score[study$sleep_group == "under 7"])';

/** The same study, plus the 2000-shuffle null distribution m8-2-a reads a p-value off. */
const NULL_2000 =
  `${STUDY_60}\n` +
  'set.seed(81)\n' +
  'null_diffs <- replicate(2000, {\n' +
  '  shuffled <- sample(study$exam_score)\n' +
  '  mean(shuffled[study$sleep_group == "7 or more"]) -\n' +
  '    mean(shuffled[study$sleep_group == "under 7"])\n' +
  '})';

export const module08: ExerciseDef[] = [
  {
    id: 'm8-1-a',
    prompt:
      'Build the null distribution for the difference in mean exam score between the two sleep groups. Shuffle the exam scores across the 60 students 2000 times, recompute the difference each time, and store the 2000 differences in null_diffs.',
    starterCode:
      '# study and observed are already in your environment.\nobserved\n\n# Each replicate: shuffle the scores, then take the same difference again.\nnull_diffs <- replicate(2000, {\n  shuffled <- sample(study$exam_score)\n  \n})',
    setupCode: `${STUDY_60}\nset.seed(81)`,
    solution:
      'null_diffs <- replicate(2000, {\n  shuffled <- sample(study$exam_score)\n  mean(shuffled[study$sleep_group == "7 or more"]) -\n    mean(shuffled[study$sleep_group == "under 7"])\n})',
    wrongAnswers: [
      // Never shuffled: 2000 copies of the observed difference.
      'null_diffs <- replicate(2000, {\n  mean(study$exam_score[study$sleep_group == "7 or more"]) -\n    mean(study$exam_score[study$sleep_group == "under 7"])\n})',
      // Recorded one group’s mean instead of the difference between them.
      'null_diffs <- replicate(2000, {\n  shuffled <- sample(study$exam_score)\n  mean(shuffled[study$sleep_group == "7 or more"])\n})',
      // Two hundred replicates, not two thousand.
      'null_diffs <- replicate(200, {\n  shuffled <- sample(study$exam_score)\n  mean(shuffled[study$sleep_group == "7 or more"]) -\n    mean(shuffled[study$sleep_group == "under 7"])\n})',
      // Shuffled within each group, which changes nothing at all.
      'null_diffs <- replicate(2000, {\n  a <- sample(study$exam_score[study$sleep_group == "7 or more"])\n  b <- sample(study$exam_score[study$sleep_group == "under 7"])\n  mean(a) - mean(b)\n})',
    ],
    alternateSolutions: [
      // Shuffle the labels rather than the scores: the same null model.
      'null_diffs <- replicate(2000, {\n  labels <- sample(study$sleep_group)\n  mean(study$exam_score[labels == "7 or more"]) -\n    mean(study$exam_score[labels == "under 7"])\n})',
      // A for loop over a preallocated vector.
      'null_diffs <- numeric(2000)\nfor (i in 1:2000) {\n  shuffled <- sample(study$exam_score)\n  null_diffs[i] <- mean(shuffled[study$sleep_group == "7 or more"]) -\n    mean(shuffled[study$sleep_group == "under 7"])\n}',
      // tapply + diff. This reverses the sign, and the check is deliberately
      // sign-agnostic because the null distribution is symmetric about zero.
      'null_diffs <- replicate(2000, {\n  as.vector(diff(tapply(sample(study$exam_score), study$sleep_group, mean)))\n})',
    ],
    check: `
      if (!has_answer("study")) {
        list(pass = FALSE, message = "The study object has gone missing. Press Reset and try again.")
      } else if (!has_answer("null_diffs")) {
        list(pass = FALSE, message = "I could not find an object called null_diffs.")
      } else {
        study <- answer("study")
        values <- as.vector(answer("null_diffs"))
        if (!is.numeric(values)) {
          list(pass = FALSE, message = "null_diffs should be 2000 numbers: one difference per shuffle.")
        } else if (length(values) != 2000L) {
          list(pass = FALSE, message = paste0("null_diffs has ", length(values), " values, but the exercise asks for 2000 shuffles."))
        } else {
          a <- study$exam_score[study$sleep_group == "7 or more"]
          b <- study$exam_score[study$sleep_group == "under 7"]
          pooled <- sqrt(((length(a) - 1) * var(a) + (length(b) - 1) * var(b)) / (length(a) + length(b) - 2))
          expected_sd <- pooled * sqrt(1 / length(a) + 1 / length(b))
          spread <- sd(values)
          centre <- mean(values)
          if (spread < 1e-9) {
            list(pass = FALSE, message = "All 2000 of your values are identical, so the difference never moved. Either sample() is outside the replicate() expression, or you shuffled within each group - and reordering a group does not change its mean. Shuffle all 60 scores across the two groups, inside replicate().")
          } else if (abs(centre) > 1) {
            list(pass = FALSE, message = paste0("Your values centre on ", round(centre, 1), ". A null distribution for a DIFFERENCE has to sit on zero, because under the null the labels carry no information. Did you record one group's mean rather than the gap between the two?"))
          } else if (abs(spread - expected_sd) > 0.3 * expected_sd) {
            list(pass = FALSE, message = paste0("Your shuffled differences vary by ", round(spread, 2), ", but for these group sizes they should vary by about ", round(expected_sd, 2), ". Shuffle the scores across ALL 60 students, not within each group."))
          } else {
            observed <- mean(a) - mean(b)
            beyond <- mean(abs(values) >= abs(observed))
            # The check never looks at the sign of the differences: a route that
            # reverses the group order produces the mirror image of this
            # distribution, which is the same distribution.
            list(pass = TRUE, message = paste0("Your null distribution centres on ", round(centre, 2), " and has a spread of ", round(spread, 2), ". The difference you actually observed was ", round(observed, 2), ", and ", round(100 * beyond, 1), " per cent of the shuffles reached that far. That percentage is the p-value, and the next lesson computes it properly."))
          }
        }
      }
    `,
    hints: [
      'Under the null, which group a score belongs to is arbitrary - so shuffling the labels should change nothing systematic.',
      'Inside replicate(), sample(study$exam_score) reorders all 60 scores. The sleep_group column stays where it is.',
      'Then take the same difference as before, but from shuffled rather than from study$exam_score.',
    ],
  },
  {
    id: 'm8-2-a',
    prompt:
      'You have observed (the difference your study found) and null_diffs (2000 differences produced when the labels meant nothing). Compute the two-tailed p-value - the proportion of shuffles at least as far from zero as the observed difference - and store it in p_perm.',
    starterCode:
      '# observed and null_diffs are already in your environment.\nobserved\nlength(null_diffs)\n\n# "At least as far from zero" means comparing absolute values.\np_perm <- ',
    setupCode: NULL_2000,
    solution: 'p_perm <- mean(abs(null_diffs) >= abs(observed))',
    wrongAnswers: [
      // One tail only, which halves the p-value.
      'p_perm <- mean(null_diffs >= observed)',
      // The wrong side of the comparison: the middle rather than the tails.
      'p_perm <- mean(abs(null_diffs) <= abs(observed))',
      // A count, not a proportion.
      'p_perm <- sum(abs(null_diffs) >= abs(observed))',
      // The centre of the null distribution, which is about zero whatever the data say.
      'p_perm <- mean(null_diffs)',
    ],
    alternateSolutions: [
      // The proportion written out as a count over a length.
      'p_perm <- sum(abs(null_diffs) >= abs(observed)) / length(null_diffs)',
      // The two tails added separately.
      'p_perm <- mean(null_diffs <= -abs(observed)) + mean(null_diffs >= abs(observed))',
      // The complement of the middle.
      'p_perm <- 1 - mean(abs(null_diffs) < abs(observed))',
    ],
    check: `
      if (!has_answer("null_diffs") || !has_answer("observed")) {
        list(pass = FALSE, message = "null_diffs or observed has gone missing. Press Reset and try again.")
      } else if (!has_answer("p_perm")) {
        list(pass = FALSE, message = "I could not find an object called p_perm.")
      } else {
        values <- as.vector(answer("null_diffs"))
        observed <- as.vector(answer("observed"))
        value <- as.vector(answer("p_perm"))
        if (!is.numeric(values) || length(values) < 100L || !is.numeric(observed) || length(observed) != 1L) {
          list(pass = FALSE, message = "null_diffs should be the 2000 shuffled differences and observed a single number. Press Reset to restore them.")
        } else if (is.data.frame(value) || !is.numeric(value) || length(value) != 1L) {
          list(pass = FALSE, message = "p_perm should be a single number between 0 and 1.")
        } else {
          expected <- mean(abs(values) >= abs(observed))
          one_tail <- mean(values >= abs(observed))
          # tolerance 1e-3 rather than 1e-6: a route that adds the two tails
          # separately counts a shuffle landing exactly on -|observed| or
          # +|observed| once, as this does, but floating-point equality at a
          # boundary is not something to grade on. One shuffle in 2000 is 5e-4,
          # so 1e-3 absorbs a boundary tie and nothing larger.
          if (isTRUE(all.equal(value, expected, tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = TRUE, message = paste0("Correct: p = ", format.pval(expected, digits = 3), ". Out of 2000 shuffles in which the sleep labels meant nothing at all, ", sum(abs(values) >= abs(observed)), " produced a difference at least as large as the one your study found."))
          } else if (isTRUE(all.equal(value, one_tail, tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That is the upper tail only, so it is about half of the answer. A two-tailed p-value counts shuffles that are extreme in EITHER direction: compare abs(null_diffs) with abs(observed).")
          } else if (isTRUE(all.equal(value, 1 - expected, tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "You counted the shuffles that were LESS extreme than your result - the middle of the null distribution rather than its tails. Flip the comparison to >= .")
          } else if (isTRUE(all.equal(value, expected * length(values), tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("That is the count (", round(value), " shuffles), not the proportion. Divide by length(null_diffs), or use mean() instead of sum()."))
          } else if (abs(value) < 0.3 && isTRUE(all.equal(value, mean(values), tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That is the average of the null differences, which sits at zero by construction and says nothing about your result. A p-value is a tail AREA: the proportion of shuffles at least as extreme as what you saw.")
          } else {
            list(pass = FALSE, message = paste0("p_perm is ", round(value, 4), " but should be ", round(expected, 4), "."))
          }
        }
      }
    `,
    hints: [
      'abs(null_diffs) >= abs(observed) gives 2000 TRUE/FALSE values: was this shuffle at least as extreme as the real result?',
      'The mean of a TRUE/FALSE vector is the proportion of TRUEs.',
      'p_perm <- mean(abs(null_diffs) >= abs(observed)).',
    ],
  },
  {
    id: 'm8-2-b',
    prompt:
      'The shuffling is the idea; t.test() is the shortcut. Run an independent-samples t-test of exam_score by sleep_group on study, assuming equal variances, and store its p-value in p_t.',
    starterCode:
      '# study is already in your environment.\ntable(study$sleep_group)\n\n# t.test(outcome ~ group, data = ..., var.equal = TRUE) returns a list.\n# Its p-value is one element of that list.\np_t <- ',
    setupCode: STUDY_60,
    solution: 'p_t <- t.test(exam_score ~ sleep_group, data = study, var.equal = TRUE)$p.value',
    wrongAnswers: [
      // Welch's test: R's default, and a different p-value.
      'p_t <- t.test(exam_score ~ sleep_group, data = study)$p.value',
      // The t statistic rather than the p-value.
      'p_t <- as.vector(t.test(exam_score ~ sleep_group, data = study, var.equal = TRUE)$statistic)',
      // A one-sample test of the whole sample against zero.
      'p_t <- t.test(study$exam_score)$p.value',
      // A one-tailed test, which halves the p-value.
      'p_t <- t.test(exam_score ~ sleep_group, data = study, var.equal = TRUE, alternative = "greater")$p.value',
    ],
    alternateSolutions: [
      // The two-vector form of the same test.
      'a <- study$exam_score[study$sleep_group == "7 or more"]\nb <- study$exam_score[study$sleep_group == "under 7"]\np_t <- t.test(a, b, var.equal = TRUE)$p.value',
      // The groups the other way round: same p-value, opposite sign on the estimate.
      'p_t <- t.test(exam_score ~ sleep_group, data = study, var.equal = TRUE, alternative = "two.sided")$p.value',
      // Built by hand from the pooled standard error and the t distribution.
      'a <- study$exam_score[study$sleep_group == "7 or more"]\nb <- study$exam_score[study$sleep_group == "under 7"]\nn1 <- length(a)\nn2 <- length(b)\npooled <- sqrt(((n1 - 1) * var(a) + (n2 - 1) * var(b)) / (n1 + n2 - 2))\nt_stat <- (mean(a) - mean(b)) / (pooled * sqrt(1 / n1 + 1 / n2))\np_t <- 2 * pt(-abs(t_stat), df = n1 + n2 - 2)',
    ],
    check: `
      if (!has_answer("study")) {
        list(pass = FALSE, message = "The study object has gone missing. Press Reset and try again.")
      } else if (!has_answer("p_t")) {
        list(pass = FALSE, message = "I could not find an object called p_t.")
      } else {
        study <- answer("study")
        # as.vector(): $p.value is unnamed, but $statistic is named "t", and a
        # student who reached for the wrong element should still be told which.
        value <- as.vector(answer("p_t"))
        if (!is.data.frame(study) || !("sleep_group" %in% names(study))) {
          list(pass = FALSE, message = "study should still hold its sleep_group column. Press Reset to restore it.")
        } else if (is.data.frame(value) || !is.numeric(value) || length(value) != 1L) {
          list(pass = FALSE, message = "p_t should be a single number: the p-value out of the test.")
        } else {
          pooled_test <- t.test(exam_score ~ sleep_group, data = study, var.equal = TRUE)
          expected <- as.vector(pooled_test$p.value)
          welch <- as.vector(t.test(exam_score ~ sleep_group, data = study)$p.value)
          t_stat <- as.vector(pooled_test$statistic)
          if (isTRUE(all.equal(value, expected, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = TRUE, message = paste0("Correct: p = ", format.pval(expected, digits = 3), ", from t(", round(as.vector(pooled_test$parameter)), ") = ", round(t_stat, 2), ". Compare it with the p-value your 2000 shuffles gave - two entirely different routes to nearly the same number."))
          } else if (isTRUE(all.equal(value, welch, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That is Welch's test, which is what t.test() runs by default and which does not assume the two groups have equal variances. This exercise asks for the pooled version, so pass var.equal = TRUE. (Welch is often the better default in real work - the point here is to know which one you ran.)")
          } else if (isTRUE(all.equal(value, expected / 2, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That is a one-tailed p-value. Unless you committed to a direction before seeing the data, report the two-tailed test - which is t.test()'s default.")
          } else if (isTRUE(all.equal(value, t_stat, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("That is the t statistic (", round(t_stat, 2), "), not the p-value. The element you want is $p.value."))
          } else if (value < 1e-10) {
            list(pass = FALSE, message = "That p-value is effectively zero, which usually means a one-sample test: t.test(study$exam_score) asks whether the mean exam score differs from ZERO, and of course it does. You want the two groups compared with each other.")
          } else {
            list(pass = FALSE, message = paste0("p_t is ", round(value, 5), " but should be ", round(expected, 5), "."))
          }
        }
      }
    `,
    hints: [
      'The formula interface is outcome ~ group: t.test(exam_score ~ sleep_group, data = study).',
      'Add var.equal = TRUE to get the pooled test rather than R’s default Welch version.',
      'The result is a list; $p.value pulls the p-value out of it.',
    ],
  },
  {
    id: 'm8-3-a',
    prompt:
      'Estimate the power of a study that samples 100 students and tests whether their mean exam score differs from 70, at alpha = .05. Simulate 1000 such studies and store the proportion that reject the null in power_estimate.',
    starterCode:
      '# population is already in your environment.\n# One study: draw 100 students, test their mean against 70, keep the p-value.\np_values <- replicate(1000, {\n  \n})\n\npower_estimate <- ',
    setupCode:
      'set.seed(83)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)',
    solution:
      'p_values <- replicate(1000, {\n  s <- sample(population$exam_score, 100)\n  t.test(s, mu = 70)$p.value\n})\npower_estimate <- mean(p_values < 0.05)',
    wrongAnswers: [
      // Counted the studies that FAILED to reject.
      'p_values <- replicate(1000, {\n  s <- sample(population$exam_score, 100)\n  t.test(s, mu = 70)$p.value\n})\npower_estimate <- mean(p_values > 0.05)',
      // Tested against the true population mean, so this is alpha, not power.
      'p_values <- replicate(1000, {\n  s <- sample(population$exam_score, 100)\n  t.test(s, mu = mean(population$exam_score))$p.value\n})\npower_estimate <- mean(p_values < 0.05)',
      // Averaged the p-values instead of counting rejections.
      'p_values <- replicate(1000, {\n  s <- sample(population$exam_score, 100)\n  t.test(s, mu = 70)$p.value\n})\npower_estimate <- mean(p_values)',
      // Ten students per study rather than a hundred: an honest power estimate
      // for the wrong design, and far below the band.
      'p_values <- replicate(1000, {\n  s <- sample(population$exam_score, 10)\n  t.test(s, mu = 70)$p.value\n})\npower_estimate <- mean(p_values < 0.05)',
    ],
    alternateSolutions: [
      // A count over the number of studies.
      'p_values <- replicate(1000, t.test(sample(population$exam_score, 100), mu = 70)$p.value)\npower_estimate <- sum(p_values < 0.05) / 1000',
      // A for loop.
      'p_values <- numeric(1000)\nfor (i in 1:1000) {\n  p_values[i] <- t.test(sample(population$exam_score, 100), mu = 70)$p.value\n}\npower_estimate <- mean(p_values < 0.05)',
      // Decide inside the replicate and average the decisions.
      'rejected <- replicate(1000, {\n  s <- sample(population$exam_score, 100)\n  t.test(s, mu = 70)$p.value < 0.05\n})\npower_estimate <- mean(rejected)',
    ],
    check: `
      if (!has_answer("power_estimate")) {
        list(pass = FALSE, message = "I could not find an object called power_estimate.")
      } else {
        value <- as.vector(answer("power_estimate"))
        if (is.data.frame(value) || !is.numeric(value) || length(value) != 1L) {
          list(pass = FALSE, message = "power_estimate should be a single number between 0 and 1.")
        } else if (value < 0 || value > 1) {
          list(pass = FALSE, message = "power_estimate is a proportion of studies, so it has to lie between 0 and 1. If you have a count, divide it by 1000.")
        } else {
          # A band, not a value: power here is estimated by simulation, and every
          # legitimate route draws its own random numbers. The true value for
          # n = 100 against mu = 70 is about .76, and 1000 replicates give a
          # standard error of about .013, so .67 to .85 is four standard errors
          # either way. The wrong answers land at about .24 (the complement),
          # .05 (alpha), .06 (the mean p-value) and .12 (n = 10).
          if (value >= 0.67 && value <= 0.85) {
            list(pass = TRUE, message = paste0("About ", round(100 * value), " studies in 100 would detect this effect. That is the power of the design - and it means roughly ", round(100 * (1 - value)), " in 100 would miss it and report a non-significant result, even though the effect is genuinely there."))
          } else if (value >= 0.15 && value <= 0.33) {
            list(pass = FALSE, message = "That is the proportion of studies that FAILED to reject - the Type II error rate. Power is its complement: count p_values below alpha, not above it.")
          } else if (value <= 0.10) {
            list(pass = FALSE, message = "That is close to alpha, the rejection rate you get when the null is TRUE. Power is the rejection rate when the null is FALSE, so the test has to be against mu = 70 - a value the population mean is genuinely not equal to. (If you averaged the p-values instead of counting rejections, that also lands here.)")
          } else if (value < 0.67) {
            list(pass = FALSE, message = paste0("A power of ", round(value, 2), " is too low for this design. Check the sample size inside replicate(): the exercise specifies 100 students per study, and power climbs steeply with n."))
          } else {
            list(pass = FALSE, message = paste0("A power of ", round(value, 2), " is higher than this design can deliver. Check that alpha is 0.05 and that each study samples 100 students."))
          }
        }
      }
    `,
    hints: [
      't.test(s, mu = 70) tests one sample against a hypothesised mean of 70.',
      'Inside replicate(), draw the sample and return the p-value: t.test(sample(population$exam_score, 100), mu = 70)$p.value.',
      'A study "rejects" when its p-value is below .05, and mean() of 1000 TRUE/FALSE values is the proportion that did.',
    ],
  },
];
````

- [ ] **Step 3: Write `src/content/lessons/08-1-null-distribution.mdx`**

````mdx
A study finds that students who sleep seven hours or more score higher on the
exam than students who sleep less. The gap is about six points. Before anyone
can say whether that means anything, one question has to be answered:

> **How big a gap would this study have produced if sleep made no difference at
> all?**

That is the entire logic of a hypothesis test, and everything else in this
module is machinery for answering it.

<CodeBlock id="study" code={`library(dplyr)

population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)
population$sleep_group <- ifelse(population$sleep_hours >= 7, "7 or more", "under 7")

set.seed(8241)
study <- population[sample(nrow(population), 60), ]

study %>%
  group_by(sleep_group) %>%
  summarise(mean_exam = mean(exam_score), sd_exam = sd(exam_score), n = n())`} />

<CodeBlock id="observed" code={`observed <- mean(study$exam_score[study$sleep_group == "7 or more"]) -
  mean(study$exam_score[study$sleep_group == "under 7"])

observed`} />

Keep that number. It is what actually happened, and it is not in dispute. The
question is what to make of it.

<Predict
  id="p-null"
  question="Suppose sleep genuinely had no effect on exam scores. What difference would you expect this study to find between the two groups?"
  choices={[
    { text: 'Exactly zero', response: 'Only on average, over many studies. Module 6 showed that any one sample lands near the truth rather than on it.' },
    { text: 'Zero on average, but rarely zero in any one study', correct: true, response: 'Exactly. Sampling error puts a gap there even when nothing is going on, and the size of that gap is what we need to know.' },
    { text: 'Something too unpredictable to say anything about', response: 'It is random, but its distribution is not a mystery - we can build it, and that is what the rest of the lesson does.' },
  ]}
/>

## Building the null model

Here is the trick. If sleep really made no difference, then which label a
student carries — "7 or more" or "under 7" — would be irrelevant to their exam
score. The labels would be interchangeable.

So make them interchangeable. Shuffle the sixty exam scores across the sixty
students, keep the labels where they are, and take the difference again. That is
one study from a world where the null hypothesis is exactly true.

<CodeBlock id="one-shuffle" code={`set.seed(3)
shuffled <- sample(study$exam_score)

mean(shuffled[study$sleep_group == "7 or more"]) -
  mean(shuffled[study$sleep_group == "under 7"])`} />

Not zero. Run it with another seed and you get a different not-zero. Do it two
thousand times and you have the **null distribution**: every difference this
study could have produced if sleep meant nothing.

<CodeBlock id="null" code={`library(ggplot2)

set.seed(81)
null_diffs <- replicate(2000, {
  shuffled <- sample(study$exam_score)
  mean(shuffled[study$sleep_group == "7 or more"]) -
    mean(shuffled[study$sleep_group == "under 7"])
})

tibble(difference = null_diffs) %>%
  ggplot(aes(x = difference)) +
  geom_histogram(bins = 40) +
  geom_vline(xintercept = observed, linetype = "dashed", linewidth = 1) +
  labs(x = "Difference in mean exam score under the null", y = "Shuffles") +
  theme_classic()`} />

It is centred on zero, it is roughly normal — Module 6 said it would be — and
the dashed line is what your study actually found. The whole of hypothesis
testing is looking at that picture and asking how surprising the dashed line is.

## What this distribution is, and is not

- It is **not** the distribution of exam scores. It is the distribution of a
  *difference between two means*, which is a much narrower thing.
- It is **not** built from any assumption about sleep. It is built from the
  assumption that sleep does not matter — which is the hypothesis being put on
  trial, not one being believed.
- A value in its far tail does **not** prove the null is false. It says the
  result would be unusual if the null were true. Those are different statements,
  and the next lesson is careful about the difference.

<Exercise id="m8-1-a" />

<Quiz
  id="q-null"
  question="Why are the exam scores shuffled rather than redrawn from the population?"
  choices={[
    { text: 'Because shuffling is faster than sampling', response: 'Speed is not the reason, and at this size neither is noticeably slow.' },
    { text: 'Because it keeps the actual 60 scores and asks only whether the labels carry information', correct: true, response: 'Right. Shuffling holds everything about the data fixed except the one thing under test - which group each score belongs to.' },
    { text: 'Because sampling from the population would be cheating, since we would be using data we do not have', response: 'A fair point about real research, but it is not the reason shuffling works. In a real study you have no population to draw from at all - and shuffling still works.' },
    { text: 'Because the population is not normally distributed', response: 'The shuffling approach makes no normality assumption either way. That is one of its attractions, not a reason it is required here.' },
  ]}
/>

<Interpret
  id="i-8-1"
  question="How should the null distribution you just built be described in a results section?"
  choices={[
    { text: 'Students sleeping seven hours or more scored higher (M = 76.4) than those sleeping less (M = 70.7). In 2000 random reallocations of the sleep labels, 1.3% of reallocations produced a difference at least this large in absolute value.', correct: true, response: 'Correct. It reports the observed means, names the procedure and the number of reallocations, and states the tail proportion as a property of the reallocations - not as a probability about the hypothesis.' },
    { text: 'The null distribution shows that the observed difference was due to chance.', response: 'The null distribution shows what chance ALONE would produce. The observed difference sitting in its tail is evidence against that account, not for it.' },
    { text: 'The null distribution of exam scores was approximately normal, centred on zero.', response: 'Exam scores centre on 73, not on zero. What centres on zero is the distribution of the DIFFERENCE between two group means under the null.' },
    { text: 'Because the observed difference fell in the tail of the null distribution, the null hypothesis is false.', response: 'Falls in the tail means "would be unusual if the null were true". Unusual things happen; one study in twenty produces a tail result with no effect present at all.' },
  ]}
/>
````

- [ ] **Step 4: Write `src/content/lessons/08-2-p-values-and-alpha.mdx`**

````mdx
The null distribution is built; the observed difference is a dashed line in its
tail. Turning that picture into a number takes one line of code, and
interpreting the number takes the rest of the lesson.

<CodeBlock id="rebuild" code={`library(dplyr)

population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)
population$sleep_group <- ifelse(population$sleep_hours >= 7, "7 or more", "under 7")

set.seed(8241)
study <- population[sample(nrow(population), 60), ]
observed <- mean(study$exam_score[study$sleep_group == "7 or more"]) -
  mean(study$exam_score[study$sleep_group == "under 7"])

set.seed(81)
null_diffs <- replicate(2000, {
  shuffled <- sample(study$exam_score)
  mean(shuffled[study$sleep_group == "7 or more"]) -
    mean(shuffled[study$sleep_group == "under 7"])
})

observed`} />

<Predict
  id="p-tail"
  question="You are about to count the shuffles that were 'at least as extreme' as the observed difference. Which shuffles count?"
  choices={[
    { text: 'Only those with a difference larger than the observed one, in the same direction', response: 'That is a one-tailed count, and it halves the answer. You would only use it if you had committed to a direction before collecting data.' },
    { text: 'Those at least as far from zero as the observed difference, in either direction', correct: true, response: 'Yes. Unless you predicted the direction in advance, a difference of the same size the other way is equally surprising, so both tails count.' },
    { text: 'All of them, since every shuffle is a possible result', response: 'Then the answer would always be 1. The point is to count the extreme ones.' },
  ]}
/>

<CodeBlock id="pval" code={`p_perm <- mean(abs(null_diffs) >= abs(observed))
p_perm

# The same thing, counted rather than averaged.
sum(abs(null_diffs) >= abs(observed))`} />

That is a **p-value**: the proportion of results at least as extreme as yours,
*computed in a world where the null hypothesis is true*.

## What a p-value is not

Three sentences that are all wrong, all common, and all worth being able to
refute:

1. **"p is the probability the null hypothesis is true."** No. The p-value is
   computed *assuming* the null is true — that assumption is an input, so the
   answer cannot be a verdict on it. Getting the probability of a hypothesis
   from data requires a prior, which is a different framework.
2. **"p is the probability the result was due to chance."** Same error in
   different clothes. Chance is assumed, not measured.
3. **"A large p proves there is no effect."** A large p means the data are
   compatible with the null. They are usually compatible with plenty of other
   things too, including a real effect the study was too small to see. That is
   the subject of the next lesson.

What a p-value *does* say is narrow and useful: **if nothing were going on, data
this extreme would turn up this often.**

<Simulation name="pvalue" />

<Exercise id="m8-2-a" />

## α, and where it came from

Nobody reports a p-value and stops. They compare it with a threshold, **α**,
fixed before the data are seen, and call the result "significant" when the
p-value falls below it.

α is a choice, not a discovery. Setting `α = .05` says: *I am willing to be
wrong, and claim an effect when there is none, one time in twenty.* Choose `.01`
and you will make that mistake less often — at the cost of missing real effects
more often. The next lesson prices that trade.

Two things follow that students regularly get wrong:

- α is chosen **in advance**. Moving it after seeing the p-value converts a
  decision rule into a rationalisation.
- `.05` has no mathematical standing whatsoever. It is a convention that stuck.
  A result with `p = .049` and one with `p = .051` are the same result.

## The shortcut

Shuffling two thousand times is the honest construction, and it is how the idea
should be learned. In practice a formula gets you there in one line, because the
Central Limit Theorem already told us what the null distribution looks like.

<CodeBlock id="ttest" code={`t.test(exam_score ~ sleep_group, data = study, var.equal = TRUE)`} />

Read the output against what you built. The `t` statistic is the observed
difference divided by its standard error — Module 7's standard error, applied to
a difference. The degrees of freedom are `n − 2`. The p-value should sit very
close to `p_perm`, because both are measuring the same tail area, one by
simulating it and one by looking it up.

<Exercise id="m8-2-b" />

## Reporting it

APA 7 wants the test, its degrees of freedom, the statistic, the p-value and an
interval. Report `p` to three decimals with no leading zero, and when it is
smaller than .001 write `p < .001` — never `p = 0`. A simulation with 2000
shuffles cannot distinguish a p-value of .0004 from one of .00000001, and
neither can a reader.

<Quiz
  id="q-alpha"
  question="A study reports p = .06 with alpha set at .05. Which conclusion is defensible?"
  choices={[
    { text: 'The effect is not significant at the .05 level; the data are compatible with no effect, but do not establish it', correct: true, response: 'Right, and the second clause is the part usually left out. Failing to reject is not the same as accepting.' },
    { text: 'There is no effect', response: 'A non-significant result does not establish the null. With a small sample it is exactly what a real effect often looks like.' },
    { text: 'The effect is marginally significant', response: 'Either the threshold was .05 or it was not. "Marginally significant" moves alpha after the fact, which is the one thing a fixed threshold exists to prevent.' },
    { text: 'There is a 6% chance the null hypothesis is true', response: 'The p-value is computed ASSUMING the null is true. It cannot also be the probability that it is.' },
  ]}
/>

<Interpret
  id="i-8-2"
  question="Your test gave t(58) = 2.34, p = .023, with a 95% CI for the difference of [0.8, 10.6]. Which sentence belongs in the results section?"
  choices={[
    { text: 'Students sleeping seven hours or more scored higher on the exam than those sleeping less, t(58) = 2.34, p = .023, 95% CI [0.8, 10.6].', correct: true, response: 'Correct APA 7: direction of the effect, the test with its degrees of freedom, the exact p to three decimals with no leading zero, and the interval for the difference.' },
    { text: 'There is a 2.3% probability that the null hypothesis is true, t(58) = 2.34, p = .023.', response: 'The p-value is computed assuming the null is true, so it cannot be the probability that the null is true. This is the single most common misreading in the literature.' },
    { text: 'There is a 97.7% probability that the effect is real, t(58) = 2.34, p = .023.', response: 'The same error inverted. 1 - p is not the probability that an effect exists.' },
    { text: 'Sleep had a significant effect on exam scores, p = .023, proving that sleep improves performance.', response: 'Two problems: "proving" overstates any single p-value, and this is an observational comparison, so it cannot establish that sleep caused the difference.' },
  ]}
/>
````

- [ ] **Step 5: Write `src/content/lessons/08-3-errors-and-power.mdx`**

> **No markdown tables.** The MDX pipeline runs `@mdx-js/rollup` without
> `remark-gfm`, so a pipe table renders as literal text. The two-by-two of
> errors below is written as a list for that reason; do not "tidy" it into a
> table.

````mdx
A hypothesis test makes a decision, and a decision can be wrong in two
directions. Both have names, and only one of them gets talked about.

- The null is **true** and you **reject** it — a **Type I error**. You announce
  an effect that is not there. Its long-run rate is exactly α, because that is
  what α was defined to be.
- The null is **false** and you **fail to reject** it — a **Type II error**. You
  miss a real effect. Its rate is called β.
- The null is **false** and you **do** reject it — a hit. Its rate, `1 − β`, is
  the study's **power**.
- The null is **true** and you fail to reject it — the fourth cell, which needs
  no name because nothing happened.

The first is the error the whole apparatus is built to control. The second is
the one that quietly wrecks literatures, because nobody publishes it and nobody
counts it.

## Type I: the null really is true

In this population, `programme` has no relationship with `exam_score` at all —
Psychology and Business average within a tenth of a point of each other. So run
a thousand studies comparing them and count how often the test cries wolf.

<CodeBlock id="typeone" code={`library(dplyr)

population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)

set.seed(801)
false_alarms <- replicate(1000, {
  s <- population[sample(nrow(population), 120), ]
  t.test(exam_score ~ programme, data = s, var.equal = TRUE)$p.value < 0.05
})

mean(false_alarms)`} />

About .05. Not approximately for some reason, and not by luck: α *is* the Type I
error rate. Setting it at .05 is a decision to publish a false positive one
study in twenty, and nothing about a single significant result tells you which
kind you are holding.

<Predict
  id="p-power"
  question="Now the null is false: mean exam score is really 73.3, and we will test it against 70. Out of 1000 studies of 100 students each at alpha = .05, how many do you expect to come out significant?"
  choices={[
    { text: 'All 1000, because the effect is real', response: 'A real effect does not guarantee detection. With this much noise and 100 students, a good fraction of studies will miss it.' },
    { text: 'About 750', correct: true, response: 'Close to right. The design has about 76% power here - which means roughly one study in four fails to find an effect that is genuinely present.' },
    { text: 'About 50, matching alpha', response: 'That is the rate when the null is TRUE. When it is false the rejection rate is power, and power is far higher than alpha for a detectable effect.' },
  ]}
/>

<CodeBlock id="power" code={`set.seed(83)
p_values <- replicate(1000, {
  s <- sample(population$exam_score, 100)
  t.test(s, mu = 70)$p.value
})

mean(p_values < 0.05)`} />

Roughly three quarters. Which means roughly a quarter of these studies —
correctly run, correctly analysed, with a genuine effect present — report
nothing. Had one of them been your thesis, you would have concluded there was no
effect, and you would have been wrong.

## Power is a property of the design

Three things move it, and only one of them is usually under your control.

<CodeBlock id="curve" code={`library(ggplot2)

set.seed(84)
power_at <- function(n) {
  mean(replicate(400, t.test(sample(population$exam_score, n), mu = 70)$p.value < 0.05))
}

sizes <- c(20, 40, 60, 100, 150, 200)
curve_data <- tibble(n = sizes, power = vapply(sizes, power_at, numeric(1)))

curve_data

curve_data %>%
  ggplot(aes(x = n, y = power)) +
  geom_line() +
  geom_point() +
  geom_hline(yintercept = 0.8, linetype = "dashed") +
  labs(x = "Students per study", y = "Power") +
  theme_classic()`} />

- **Sample size.** The one you control. Power climbs steeply and then flattens;
  the conventional target of .80 needs about 120 students here.
- **Effect size.** Set by the world. A bigger gap is easier to see, and this one
  is modest.
- **α.** Lowering it to .01 to be safer about false positives lowers power at
  the same time. The two errors trade against each other; you cannot reduce both
  without more data.

Slide α in the simulation and watch both tails move at once — the shaded
rejection region grows and shrinks, and so does the chance of missing a real
effect.

<Simulation name="pvalue" />

<Exercise id="m8-3-a" />

## What to do with a non-significant result

Say what it is. "We did not detect an effect" is honest; "there is no effect" is
not, unless the study had the power to have seen one. A non-significant result
from an underpowered study is uninformative, and a confidence interval says so
much better than a p-value does — a wide interval that includes zero tells the
reader plainly that the study could not distinguish "nothing" from "quite a lot".

<Quiz
  id="q-power"
  question="A study with 20 people per group reports p = .21 for an effect that later meta-analyses put at d = 0.5. What went wrong?"
  choices={[
    { text: 'Nothing went wrong; the study simply had about 30% power and this was one of the 70%', correct: true, response: 'Right. With n = 20 per group and d = 0.5, most correctly-run studies miss the effect. The result is uninformative, not mistaken.' },
    { text: 'The analysis must have been done incorrectly', response: 'No error is needed. Underpowered studies miss real effects most of the time, by design.' },
    { text: 'The effect does not exist, and the meta-analysis is wrong', response: 'One small non-significant study is very weak evidence against a pooled estimate from many.' },
    { text: 'The alpha level should have been raised to .20 so the result would be significant', response: 'Choosing alpha after seeing p abandons the error control that alpha exists to provide.' },
  ]}
/>

<Interpret
  id="i-8-3"
  question="Your study of 20 students per group found a 5.7-point difference, t(38) = 1.31, p = .198, 95% CI [-3.1, 14.5], and a power analysis puts the design at about 30% power for an effect this size. What goes in the paper?"
  choices={[
    { text: 'The difference was not statistically significant, t(38) = 1.31, p = .198, 95% CI [-3.1, 14.5]. With approximately 30% power for an effect of this size, the study cannot distinguish a null effect from a substantial one, and the result should be treated as inconclusive.', correct: true, response: 'Correct. It reports the test in APA form, gives the interval, and reads the non-significant result against the power the design actually had.' },
    { text: 'There was no effect of sleep on exam scores, p = .198.', response: 'A p above .05 does not prove there is no effect. The confidence interval here runs up to 14.5 points, so the data are perfectly compatible with a large effect.' },
    { text: 'There is a 19.8% probability that the null hypothesis is true, p = .198.', response: 'The p-value is computed assuming the null is true. It is never the probability that the null is true, whether it is large or small.' },
    { text: 'The difference approached significance, t(38) = 1.31, p = .198, and would likely reach it with a larger sample.', response: '"Approached significance" at p = .198 is wishful. And while a larger sample would indeed have more power, promising that it would reach significance assumes the effect you have not yet demonstrated.' },
  ]}
/>
````

- [ ] **Step 6: Add Module 8 assertions to `src/content/content.test.ts`**

```ts
describe('Module 8', () => {
  const lessons = ['08-1-null-distribution', '08-2-p-values-and-alpha', '08-3-errors-and-power'];

  test('its three lesson files exist and are live in MODULES', () => {
    for (const file of lessons) expect(sources[`./lessons/${file}.mdx`], `missing ${file}`).toBeDefined();
    expect(MODULES.map((m) => m.id)).toContain('module-08');
  });

  test('the pvalue simulation is embedded in 08-2 and 08-3', () => {
    expect(sources['./lessons/08-2-p-values-and-alpha.mdx']).toMatch(/<Simulation name="pvalue" \/>/);
    expect(sources['./lessons/08-3-errors-and-power.mdx']).toMatch(/<Simulation name="pvalue" \/>/);
  });

  test('no Module 8 lesson contains a markdown table', () => {
    // MDX runs without remark-gfm, so a pipe table renders as literal text.
    // 08-3 is the lesson that wants one, for the two-by-two of errors.
    for (const file of lessons) {
      expect(sources[`./lessons/${file}.mdx`], `${file} has a pipe table`).not.toMatch(/^\s*\|.*\|\s*$/m);
    }
  });

  test('every Module 8 Interpret block carries the two standard misreadings', () => {
    // Spec §4.1: distractors are drawn from the standard misinterpretations.
    // These two are the ones the module exists to kill, so their absence is a
    // content regression no other test would catch.
    const all = lessons.map((file) => sources[`./lessons/${file}.mdx`]).join('\n');
    expect(all, 'no Interpret offers "p is the probability the null is true"').toMatch(
      /probability that the null hypothesis is true/,
    );
    expect(all, 'no Interpret offers "a large p proves no effect"').toMatch(/no effect of .*p = \./);
  });

  test('Module 8 defines exactly the exercises the manifest lists', () => {
    const planned = PLANNED_MODULES.find((m) => m.id === 'module-08')!;
    expect(module08.map((e) => e.id)).toEqual(planned.lessons.flatMap((l) => l.exercises));
  });

  test('Part 2 is complete: Modules 5 to 8 are all live', () => {
    const live = MODULES.map((m) => m.id);
    for (const id of ['module-05', 'module-06', 'module-07', 'module-08']) {
      expect(live, `${id} is not live`).toContain(id);
    }
  });
});
```

- [ ] **Step 7: Run the validator**

Run: `npm run validate`

Expected:

```
 ✓ src/content/content.test.ts  (30 tests)
 ✓ src/content/exercises/index.test.ts  (9 tests)
 ✓ src/content/exercises/validate.itest.ts
   ✓ exercise m8-1-a > the reference solution passes its own check
   ✓ exercise m8-1-a > wrong answers > wrong answer 0..3 rejected by the check, not by an error
   ✓ exercise m8-1-a > alternate solutions > alternate solution 0..2 passes
   ✓ exercise m8-2-a > … (4 wrong answers, 3 alternates)
   ✓ exercise m8-2-b > … (4 wrong answers, 3 alternates)
   ✓ exercise m8-3-a > … (4 wrong answers, 3 alternates)
   ✓ lesson 08-1 > its code blocks run in order without an R error, and its exercises grade correctly after them
   ✓ lesson 08-2 > …
   ✓ lesson 08-3 > …
```

Three things must be checked by eye the first time, because each is
seed-dependent and each would ship as a silently wrong lesson:

- **The permutation p-value for `set.seed(8241)` must land between .002 and .30.**
  `m8-2-a`'s wrong answers are the one-tailed p (about half of it), `1 − p`, and
  the count. At a p of exactly 0 the first two collapse onto the right answer
  and the negative fixtures stop proving anything; near .5 the second does. Run
  `mean(abs(null_diffs) >= abs(observed))` in the playground and read it. If it
  is outside the band, **change the seed in `STUDY_60`, not the sample size** —
  the sample size is what makes the effect visible without making it certain —
  and re-run this step. Record the value you got in the commit message.
- **The Type I block in 08-3 must print between .035 and .065.** The prose says
  "about .05". If the seed gives .08, change the seed.
- **The power block in 08-3 must print between .70 and .82**, matching both the
  prose ("roughly three quarters") and `m8-3-a`'s acceptance band.

Runtime: `m8-3-a` runs 1000 `t.test` calls per fixture, and it has nine fixtures
across the two validator suites, so this exercise alone is roughly 18,000
`t.test` calls under webR. Expect this module to add two to four minutes to
`npm run validate`. If it pushes the whole suite past the 20-minute budget named
in content-platform task P4 step 5, split `validate` there rather than reducing
the replication count here — 1000 is what makes the band in the check tight
enough to reject the complement.

- [ ] **Step 8: Verify Module 8 in the browser**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/08-1`.

Expected:
- All of Modules 5 to 8 appear in the sidebar, in order, and "continue where you
  left off" on the home page lands on the first incomplete lesson.
- 08-1: the null-distribution histogram draws with the dashed observed line
  visible inside the plotted range — if the line is off the edge of the axis,
  the seed produced an implausibly extreme study and step 7's band check will
  already have flagged it.
- 08-2: `<Simulation name="pvalue" />` shades a tail, and moving its α control
  moves the shaded region; the `ttest` block's p-value is visibly close to
  `p_perm` from the block above it.
- 08-3: the `curve` block takes a few seconds (2400 t-tests) and then plots a
  rising power curve crossing the dashed .80 line near n = 120.
- `m8-3-a`: submitting `mean(p_values > 0.05)` returns the "that is the Type II
  error rate" message; submitting a test against the true population mean
  returns the "that is alpha" message.

- [ ] **Step 9: Commit**

```bash
git add src/content/lessons/08-1-null-distribution.mdx src/content/lessons/08-2-p-values-and-alpha.mdx src/content/lessons/08-3-errors-and-power.mdx src/content/exercises/module-08.ts src/content/manifest.ts src/content/content.test.ts
git commit -m "feat: Module 8, hypothesis testing, p-values and power"
```

---

## Self-Review

Run against the spec after all three tasks are complete.

**Spec coverage**

| Spec section | Covered by |
|---|---|
| §3.2 Forbidden R functions | Global Constraints; `index.test.ts` and `content.test.ts` already enforce it over every new file |
| §3.5 Packages declared per lesson | M7 step 1 (`07-3` declares `dplyr`, `ggplot2`); M5 and M8 declare none, and M7 step 6 asserts that shape |
| §4.1 `<Predict>` before the reveal | Every lesson: `p-height`, `p-compare`, `p-cutoff`, `p-price`, `p-meaning`, `p-bars`, `p-null`, `p-tail`, `p-power` |
| §4.1 `<CodeBlock>` with an invited modification | 07-1 (`study`, change 50 to 200); 05-3 and 08-3 invite the same through the simulations |
| §4.1 `<Exercise>` auto-checked | M5 step 2 (5), M7 step 2 (4), M8 step 2 (4) |
| §4.1 `<Quiz>` | `q-density`, `q-z`, `q-tails`, `q-se-sd`, `q-95`, `q-bars`, `q-null`, `q-alpha`, `q-power` |
| §4.1 `<Interpret>` closes every inferential lesson | All nine: `i-5-1`, `i-5-2`, `i-5-3`, `i-7-1`, `i-7-2`, `i-7-3`, `i-8-1`, `i-8-2`, `i-8-3` |
| §4.2 Pedagogical spine (question → assumptions → model → computation → interpretation → report) | 08-1 opens on the question, 08-2 runs computation and report, 08-3 supplies the assumption check a non-significant result needs |
| §5.1 `ExerciseDef` contract, `setupCode` seeds | M5/M7/M8 step 2; every exercise involving randomness seeds in `setupCode` |
| §5.2 Value-based checks, tolerance, hints | Every `check` above; three loosen the tolerance with a stated reason |
| §6 `distribution` | M5 steps 3, 5 (embedded in 05-1 and 05-3) |
| §6 `ci` | M7 step 4 (embedded in 07-2) |
| §6 `pvalue` | M8 steps 4, 5 (embedded in 08-2 and 08-3) |
| §7 Curriculum, Module 5 | Task M5 |
| §7 Curriculum, Module 7 | Task M7 |
| §7 Curriculum, Module 8 | Task M8 |
| §7.1 Tidyverse style, no `library(tidyverse)` | Global Constraints; M5 step 6 asserts the attach list |
| §7.1 Always look at the descriptives | 07-3's summary table; 08-1's `group_by(sleep_group)` block before any test; `m7-3-a` and `m8-1-a` both hinge on group means |
| §7.1 APA 7 reporting | Every `<Interpret>` correct option |
| §7.2 `wellbeing-population.csv` for Modules 5–8 | Global Constraints; the reference-values table; every lesson and exercise |
| §8.1 Solutions pass, wrong answers fail via `pass = FALSE`, alternates pass | Every exercise carries 3–4 wrong answers and 3–4 alternates; M5/M7/M8 step 7 |
| §8.2 Static content checks | M5/M7/M8 step 6 |
| §8.3 Smoke behaviour | M5/M7/M8 step 8 |

**Deliberate deviations, and why**

1. **Module 5, 07-1, 07-2 and all of Module 8 attach `dplyr` and `ggplot2`
   although the P3 table gives them no `packages`.** The field is documented as
   "packages this lesson's code attaches *beyond the core set*", and both are in
   `CORE_PACKAGES`, so this is consistent with the table rather than a departure
   from it — and it keeps the nine lessons visually continuous with Module 6,
   which plots with ggplot2 throughout. The alternative, base graphics in Part 2
   and ggplot2 everywhere else, would have made Module 6 look like a different
   course. M5 step 6 pins the attach list to exactly these two so the licence
   cannot quietly widen.

2. **`<Simulation name="distribution" />` appears twice in Module 5 and
   `pvalue` twice in Module 8.** The P3 table lists one simulation per module,
   not one per lesson, and Module 6 already embeds `clt` in two lessons. The
   second appearance is a different exercise of the same component (reading a
   cut-off off a shaded area in 05-3; sliding α in 08-3), not decoration.

3. **Module 8's worked example is a randomisation test, not a `t`-test.** Spec
   §7.1 says there are no separate lessons for t-tests, and there is not one
   here: the `t`-test arrives in 08-2 as a shortcut that reproduces a number the
   students already built by shuffling, which is exactly the "show the
   traditional call and demonstrate that its statistics match" pattern §7.1 asks
   for. Building the null by simulation first is also what makes "p is a tail
   area of a distribution you constructed" a fact the student has seen rather
   than a claim they have been told.

4. **`m7-2-a`, `m8-1-a` and `m8-3-a` grade against a band rather than a value.**
   Each estimates a quantity by simulation, and any legitimate route consumes
   random numbers in its own order, so an exact match would reject correct code —
   the failure mode §5.2 names explicitly. Each band is set at roughly four
   standard errors of the simulated statistic, and each check states in an R
   comment where the wrong answers fall relative to it. `m6-2-a` set this
   precedent with its 25 per cent SE band.

5. **Three checks loosen the tolerance from `1e-6`.** `m5-1-a`, `m5-2-a`,
   `m5-2-b` and `m5-3-b` use `1e-3` and `m5-3-a` uses `1e-4`, because a student
   who computes the SD with denominator *N* rather than `sd()`'s *n* − 1 differs
   in the fifth significant figure, and failing that is failing arithmetic that
   is not wrong. `m8-2-a` uses `1e-3` because a route that adds the two tails
   separately can count a boundary shuffle differently, and one shuffle in 2000
   is 5 × 10⁻⁴. Every one says so in a comment beside the comparison, as §5.2
   requires.

6. **Module 8 uses two different comparisons from one dataset.** `sleep_hours`
   carries a real effect and `programme` carries none. Both were properties of
   the committed population before this plan was written — neither was selected
   after seeing a p-value — and having both is what lets 08-3 demonstrate the
   Type I rate and the power of a design against the same 5000 students.

**Open question carried forward**

`m8-2-a`'s negative fixtures depend on the seeded study producing a p-value away
from 0 and from .5 (M8 step 7). The band is wide and the step says what to do,
but a worker who changes `STUDY_60`'s seed must re-read that step rather than
assume the fixtures still discriminate. If the seed proves fragile in practice —
if two or three seeds in a row land outside the band — the fallback is to raise
the study to 90 students, which moves the typical p-value down to about .01 and
narrows the spread, at the cost of making the result look more foregone than a
real 60-person study would.
