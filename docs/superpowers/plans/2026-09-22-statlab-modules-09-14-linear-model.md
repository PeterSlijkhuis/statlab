# StatLab — Modules 9–14: The Linear Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write Part 3 of the curriculum — the six modules that teach one model under many names. Correlation and simple regression, multiple regression, categorical predictors, interactions, repeated measures, and binary outcomes, all fitted to `public/data/workplace.csv`, all reported in APA 7 style, and then wire every leaf of the "Which model should I use?" chooser to the lesson that now teaches it.

**Overview:** `docs/superpowers/plans/2026-09-22-statlab-remaining-work-overview.md`

**Spec:** `docs/superpowers/specs/2026-09-14-statlab-r-statistics-webapp-design.md` §4.2, §7 (Modules 9–14), §7.1, §7.2

**Depends on:** the shell plan, merged to `main` as PR #1 on 2026-09-22; `content-platform` tasks P1–P4 complete (packages, `workplace.csv`, the fourteen-module manifest, the validator rules); `simulations` tasks S4 (`correlation`) and S5 (`leastsquares`), which Module 9 embeds.

**Status (2026-09-22):** Implemented and merged in PR #4. All eighteen lessons and twenty-six exercises are live, and the chooser is renamed to `ModelChooser.tsx` at `/which-model` with all eight leaves linked. Every step is ticked except the seven browser checks.

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

## Global Constraints

The shell plan's Global Constraints and the overview's content constraints apply in full and are not repeated. These six modules are where spec §7.1 stops being a style note and starts deciding what each lesson contains, so its rules are restated here in the operational form this plan needs.

- **One model, many names.** There is no t-test lesson, no ANOVA lesson and no chi-square lesson in this plan, and none may be added. Every analysis here is `lm`, `lmer` or `glm`. Where a supervisor or a journal expects the traditional name, the lesson **shows the traditional call and then demonstrates that its statistics match the model's** — not as an aside, but as a code block whose output the student compares number by number. Three of these equivalences are load-bearing and each has its own lesson: `lm(y ~ two_level_factor)` against `t.test(y ~ g, var.equal = TRUE)` (M11), `lmer(y ~ time + (1 | id))` against `t.test(a, b, paired = TRUE)` (M13), and `lm(y ~ a * b)` under `car::Anova(type = "III")` against the factorial ANOVA table (M12).
- **`var.equal = TRUE` is not optional** in the M11 comparison. `t.test`'s default is Welch's unequal-variance test, which does not reproduce the linear model. A lesson that omits it shows two nearly-equal numbers and teaches the student that "nearly equal" is what equivalence means.
- **Always look at the descriptives.** Every lesson that prints model output prints `group_by(...) %>% summarise(...)` means, SDs and *n* beside it, in a code block the student can see without scrolling past the model. Per spec §7.1 and the overview, **at least one exercise in every module hinges on a sign or a direction that only the descriptives reveal**; those are `m9-3-b`, `m10-2-b`, `m11-2-b`, `m12-2-a`, `m13-1-a` and `m14-1-a`.
- **APA 7 in every `<Interpret>`.** All eighteen lessons here are inferential, so all eighteen end with `<Interpret>`, whose correct option is a reportable sentence carrying the statistics named in the question — *b*, *SE*, *t*(df), *p*, *R²*, *F*(df1, df2), *OR* and its 95 % CI as the model provides them. The `<Interpret>` question states the statistics inline in one sentence rather than quoting a printed table: `ChoiceBlock` renders the question inside a single `<p>`, so newlines collapse and a pasted output block reads as a run-on line.
- **Distractors are the standard misinterpretations**, drawn from this list and not invented: a non-significant coefficient read as proof of no effect; "controlling for" read as causal; an odds ratio read as a risk ratio; a main effect read without its interaction; the intercept read as a group mean; *R²* read as effect size for a single predictor; a *p*-value read as the probability the null is true.
- **Checks recompute, never hard-code.** `public/data/workplace.csv` is generated by content-platform task P2 and its exact values are not knowable while this plan is written. Every check therefore reads the CSV itself, refits the reference model, and compares the student's value with that — so a regenerated dataset changes no check. No check in this plan contains a numeric literal taken from the data.
- **Checks use base R, and namespace-qualify everything else.** A check runs after the student's code, so whatever they attached is on the search path — but a check must not depend on that. Checks call `lm`, `glm`, `coef`, `confint`, `aggregate`, `t.test` and `predict` unqualified (they are in `stats`), and write `car::Anova`, `emmeans::emmeans` and `lmerTest::lmer` with their namespace. Never `library()` inside a check.
- **Checks read student objects only through `has_answer("x")` and `answer("x")`.** `exists()` and a bare `x` reach into the lesson environment, where the lesson's own code blocks have already created the very object the exercise asks for, and would pass an empty submission. `src/content/content.test.ts` rejects `exists(` in a check (content-platform P4 step 4).
- **Every numeric comparison is** `isTRUE(all.equal(as.vector(actual), expected, tolerance = 1e-6, check.attributes = FALSE))`. A correct route through `coef(m)["autonomy"]`, `tidy() %>% pull()`, `unlist()` or `as.matrix()` leaves names, a `dim` or a one-cell data frame behind; `as.vector()` plus `check.attributes = FALSE` is what stops a right answer being marked wrong for its attributes. Two exercises need a looser tolerance and say why in a comment at the comparison (`m13-3-a`, `m14-3-a`).
- **Where a check needs the model itself, it verifies the class before reading coefficients.** `inherits(model, "lm")` for M9–M12, `inherits(model, "merMod")` for M13, and for M14 `inherits(model, "glm")` **and** `family(model)$family == "binomial"` — a `glm` fitted without `family = binomial` is a gaussian fit that runs perfectly and answers a different question, and it is the most common M14 mistake. Reading `coef()` off an object of the wrong class either errors (which the validator counts as no evidence at all) or silently returns the wrong numbers.
- **Every wrong answer fails through the check, never by erroring.** The validator distinguishes `student-error` from `pass = FALSE` and only the latter satisfies a negative fixture (spec §8.1). Each wrong answer below is R that runs cleanly and produces a defensible-looking object holding the wrong number: the formula the wrong way round, a model without its interaction term, the intercept read as a group mean, the coefficient exponentiated where the odds ratio was wanted, `adjust = "none"` where Tukey was wanted, `type = "II"` where type III was wanted, `var.equal` left at its default.
- **Check messages teach.** A failing message names what the student's object holds, what it should hold, and the one sentence of statistics that distinguishes them. A passing message reports the number they found and what it means in the units of the workplace study.
- **Manifest `packages` arrays are copied verbatim from the content-platform plan's task P3 table** and may not be edited here. Inside a lesson, `library()` is restricted to that lesson's `packages` plus `CORE_PACKAGES` (`dplyr`, `ggplot2`, `tidyr`, `broom`) — exactly the set the validator allows (content-platform P3 step 4). In practice that means `emmeans`, `car` and `lmerTest` may be attached **only** in `11-3`, `12-2`, `13-2` and `13-3`; a lesson that attaches one it did not declare works for the student who arrives from the lesson that did install it, and fails for everyone else.
- **A lesson may only attach the packages its P3 entry declares.** The validator's undeclared-package rule reads the R inside `<CodeBlock>` literals (content-platform P3 step 4), so naming a package in prose is allowed; calling `library()` on an undeclared one in a code block is not. Lesson `12-3` is where this matters: it names `emmeans` in prose and points back to `11-3`, and must never attach it.
- **Data is loaded one way only:** `d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)`. `stringsAsFactors = TRUE` is what makes `department`, `site`, `remote`, `training` and `mentoring` factors, which is what makes `lm` dummy-code them instead of erroring.
- **Only the columns in the P2 codebook exist:** `employee_id`, `department`, `site`, `remote`, `tenure_years`, `workload`, `autonomy`, `training`, `mentoring`, `wellbeing`, `engagement_t1`, `engagement_t2`, `performance`, `left_company`. No lesson or check may invent one.
- **Forbidden everywhere:** `readline`, `scan`, `menu`, `browser` — they hang rather than error on the PostMessage channel (spec §3.2).
- **Block ids are unique within a lesson file.** Progress is keyed by lesson id plus block id, so a duplicate silently overwrites a saved draft or a recorded answer. Ids in this plan are prefixed by kind (`c-` code, `p-` predict, `q-` quiz, `i-` interpret) to make a collision visible while writing.

## File Structure

```
src/
  content/
    manifest.ts                               + PLANNED_MODULES entries 9-14 (M9-M14 step 1)
    exercises/
      module-09.ts                            5 ExerciseDefs   m9-1-a … m9-3-b
      module-10.ts                            4 ExerciseDefs   m10-1-a … m10-3-a
      module-11.ts                            5 ExerciseDefs   m11-1-a … m11-3-a
      module-12.ts                            4 ExerciseDefs   m12-1-a … m12-3-a
      module-13.ts                            4 ExerciseDefs   m13-1-a … m13-3-a
      module-14.ts                            4 ExerciseDefs   m14-1-a … m14-3-a
      index.test.ts                           + one describe block per module
    lessons/
      09-1-seeing-association.mdx             09-2-fitting-a-line.mdx
      09-3-reading-model-output.mdx
      10-1-two-predictors.mdx                 10-2-holding-constant.mdx
      10-3-model-fit-and-reporting.mdx
      11-1-two-groups.mdx                     11-2-dummy-coding.mdx
      11-3-pairwise-comparisons.mdx
      12-1-what-an-interaction-is.mdx         12-2-factorial-and-type-iii.mdx
      12-3-interaction-plots.mdx
      13-1-why-independence-breaks.mdx        13-2-random-intercepts.mdx
      13-3-nesting-and-paired-t.mdx
      14-1-why-not-a-linear-model.mdx         14-2-glm-and-log-odds.mdx
      14-3-odds-ratios-and-reporting.mdx
  pages/
    TestChooser.tsx                           + lessonId on all eight leaves (M15)
    TestChooser.test.tsx                      + the leaf-to-lesson assertions (M15)
```

---

### Task M9: Correlation and simple regression

**Files:**
- Create: `src/content/lessons/09-1-seeing-association.mdx`, `src/content/lessons/09-2-fitting-a-line.mdx`, `src/content/lessons/09-3-reading-model-output.mdx`
- Modify: `src/content/manifest.ts` (`PLANNED_MODULES`), `src/content/exercises/module-09.ts`, `src/content/exercises/index.test.ts`
- Test: `src/content/content.test.ts`, `src/content/exercises/index.test.ts`, `src/content/exercises/validate.itest.ts`

**Interfaces:**
- Consumes: `ExerciseDef` (`src/r/checker.ts`); `LessonMeta.packages` (content-platform P1); `data/workplace.csv` (content-platform P2); the `correlation` and `leastsquares` simulations (simulations plan S4, S5) — **both must be registered before this task's lessons will render**, because `content.test.ts` fails on a `<Simulation name>` that is not in `SIMULATION_NAMES`.
- Produces: `module09: ExerciseDef[]` with ids `m9-1-a`, `m9-2-a`, `m9-2-b`, `m9-3-a`, `m9-3-b`; three lesson files; `module-09` live in `MODULES`.

Module 9 is where Part 3 starts, and it carries a load the later modules do not: it has to make "a model" mean something concrete before any of the extensions land. So the arc is see it (a scatterplot and a correlation), fit it (`lm`, one predictor, a fitted line), read it (`tidy`, `glance`, and the six-step chain from spec §4.2 named explicitly for the first time).

- [x] **Step 1: Add the Module 9 entry to `PLANNED_MODULES`**

In `src/content/manifest.ts`, the Module 9 entry of `PLANNED_MODULES` must read exactly this. Content-platform task P3 declared all fourteen modules from the same table, so for a worker following the recommended sequence this step is a verification rather than an edit — but verify it character for character, because a wrong `file` silently keeps the module out of `MODULES` and a wrong exercise id fails `content.test.ts` with a message about the MDX rather than about the manifest. The same applies to step 1 of tasks M10 through M14.

```ts
  {
    id: 'module-09',
    number: 9,
    title: 'Correlation and simple regression',
    lessons: [
      {
        id: '09-1',
        title: 'Seeing association',
        file: '09-1-seeing-association',
        exercises: ['m9-1-a'],
        packages: ['dplyr', 'ggplot2'],
      },
      {
        id: '09-2',
        title: 'Fitting a line',
        file: '09-2-fitting-a-line',
        exercises: ['m9-2-a', 'm9-2-b'],
        packages: ['broom'],
      },
      {
        id: '09-3',
        title: 'Reading the model',
        file: '09-3-reading-model-output',
        exercises: ['m9-3-a', 'm9-3-b'],
        packages: ['broom'],
      },
    ],
  },
```

- [x] **Step 2: Write `src/content/exercises/module-09.ts`**

```ts
import type { ExerciseDef } from '../../r/checker';

export const module09: ExerciseDef[] = [
  {
    id: 'm9-1-a',
    prompt:
      'Two questions in one. How strongly does autonomy go with wellbeing, and how strongly does workload? Store the Pearson correlation between autonomy and wellbeing in r_autonomy, and between workload and wellbeing in r_workload. Look at the summary table first: you should be able to say which of the two will be negative before you compute either.',
    starterCode:
      'library(dplyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\n# Never correlate what you have not looked at.\nd %>% summarise(\n  mean_autonomy = mean(autonomy), mean_workload = mean(workload),\n  mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing)\n)\n\nr_autonomy <- \nr_workload <- ',
    solution:
      'library(dplyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nr_autonomy <- cor(d$autonomy, d$wellbeing)\nr_workload <- cor(d$workload, d$wellbeing)',
    wrongAnswers: [
      // The second line never got edited: both hold the autonomy correlation.
      'library(dplyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nr_autonomy <- cor(d$autonomy, d$wellbeing)\nr_workload <- cor(d$autonomy, d$wellbeing)',
      // abs() applied "to tidy it up", which deletes the finding.
      'library(dplyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nr_autonomy <- cor(d$autonomy, d$wellbeing)\nr_workload <- abs(cor(d$workload, d$wellbeing))',
      // Covariance rather than correlation: right direction, meaningless size.
      'library(dplyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nr_autonomy <- cov(d$autonomy, d$wellbeing)\nr_workload <- cov(d$workload, d$wellbeing)',
      // The two predictors correlated with each other instead of with the outcome.
      'library(dplyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nr_autonomy <- cor(d$autonomy, d$wellbeing)\nr_workload <- cor(d$workload, d$autonomy)',
    ],
    alternateSolutions: [
      // dplyr route, one number pulled out of a one-row summary.
      'library(dplyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nr_autonomy <- d %>% summarise(r = cor(autonomy, wellbeing)) %>% pull(r)\nr_workload <- d %>% summarise(r = cor(workload, wellbeing)) %>% pull(r)',
      // with() avoids repeating d$ and leaves a bare number.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nr_autonomy <- with(d, cor(autonomy, wellbeing))\nr_workload <- with(d, cor(workload, wellbeing))',
      // A correlation matrix, read off by position: leaves no names behind.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm <- cor(d[, c("autonomy", "workload", "wellbeing")])\nr_autonomy <- m["autonomy", "wellbeing"]\nr_workload <- m["workload", "wellbeing"]',
    ],
    check: `
      if (!has_answer("r_autonomy") || !has_answer("r_workload")) {
        list(pass = FALSE, message = "I need both r_autonomy and r_workload.")
      } else {
        r_a <- as.vector(answer("r_autonomy"))
        r_w <- as.vector(answer("r_workload"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        exp_a <- cor(d$autonomy, d$wellbeing)
        exp_w <- cor(d$workload, d$wellbeing)
        if (!is.numeric(r_a) || length(r_a) != 1L || !is.numeric(r_w) || length(r_w) != 1L) {
          list(pass = FALSE, message = "Each answer should be a single number. summarise() gives a one-row table; pull() turns it into a number.")
        } else if (isTRUE(all.equal(r_w, exp_a, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Both of your answers are the autonomy correlation - the second line still says autonomy. Change it to workload.")
        } else if (isTRUE(all.equal(r_w, abs(exp_w), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("You dropped the sign. r is ", round(exp_w, 3), ", and the minus sign is the entire finding: the busier the employee, the lower the reported wellbeing. abs() throws away the direction."))
        } else if (isTRUE(all.equal(r_a, cov(d$autonomy, d$wellbeing), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "That is the covariance. It has the right sign but its size depends on the units, so it cannot be compared across variables. cor() divides by both SDs, which fixes the answer between -1 and 1.")
        } else if (!isTRUE(all.equal(r_a, exp_a, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("r_autonomy is ", round(r_a, 3), ", but cor(d$autonomy, d$wellbeing) is ", round(exp_a, 3), "."))
        } else if (!isTRUE(all.equal(r_w, exp_w, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("r_workload is ", round(r_w, 3), ", but cor(d$workload, d$wellbeing) is ", round(exp_w, 3), ". Check that you correlated workload with wellbeing, and not with autonomy."))
        } else {
          list(pass = TRUE, message = paste0("Autonomy r = ", round(exp_a, 3), "; workload r = ", round(exp_w, 3), ". Same outcome, opposite directions. A correlation is only ever a description of these 480 employees - it is not evidence that giving someone autonomy would raise their wellbeing."))
        }
      }
    `,
    hints: [
      'cor(x, y) takes two vectors: cor(d$autonomy, d$wellbeing).',
      'Do the same for workload, and keep the sign exactly as R gives it.',
      'If you prefer pipes: d %>% summarise(r = cor(autonomy, wellbeing)) %>% pull(r).',
    ],
  },
  {
    id: 'm9-2-a',
    prompt:
      'Fit the linear model that predicts wellbeing from autonomy. Store the fitted model in model, and the autonomy coefficient - the slope - in slope.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\n# The outcome goes on the left of the tilde, the predictor on the right.\nmodel <- \nslope <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\nslope <- model %>% tidy() %>% filter(term == "autonomy") %>% pull(estimate)',
    wrongAnswers: [
      // The formula reversed: a perfectly valid model of the wrong thing.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(autonomy ~ wellbeing, data = d)\nslope <- model %>% tidy() %>% filter(term == "wellbeing") %>% pull(estimate)',
      // The intercept read off as the slope.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\nslope <- model %>% tidy() %>% slice(1) %>% pull(estimate)',
      // The wrong predictor.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ workload, data = d)\nslope <- model %>% tidy() %>% filter(term == "workload") %>% pull(estimate)',
      // The correlation offered as the slope.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\nslope <- cor(d$autonomy, d$wellbeing)',
    ],
    alternateSolutions: [
      // Base R: coef() leaves a named number, which as.vector() in the check strips.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\nslope <- coef(model)["autonomy"]',
      // Position rather than name.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\nslope <- coef(model)[[2]]',
      // The coefficient table from summary(), a 1x1 matrix after the subset.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\nslope <- summary(model)$coefficients["autonomy", "Estimate", drop = FALSE]',
    ],
    check: `
      if (!has_answer("model") || !has_answer("slope")) {
        list(pass = FALSE, message = "I need both model (the fitted lm) and slope (its autonomy coefficient).")
      } else {
        model <- answer("model")
        slope <- as.vector(answer("slope"))
        if (!inherits(model, "lm")) {
          list(pass = FALSE, message = "model is not a fitted linear model. Build it with lm(wellbeing ~ autonomy, data = d) and store the whole result, not just a number from it.")
        } else {
          d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
          reference <- lm(wellbeing ~ autonomy, data = d)
          b <- as.vector(coef(reference)["autonomy"])
          a <- as.vector(coef(reference)["(Intercept)"])
          outcome <- as.character(formula(model))[2]
          if (!identical(outcome, "wellbeing")) {
            list(pass = FALSE, message = paste0("Your model predicts ", outcome, ", not wellbeing. In y ~ x the outcome goes on the left of the tilde. Swapping the two fits a different line: it minimises the wrong residuals and gives a different slope."))
          } else if (!("autonomy" %in% names(coef(model)))) {
            list(pass = FALSE, message = paste0("Your model has no autonomy coefficient. Its predictors are: ", paste(names(coef(model))[-1], collapse = ", "), "."))
          } else if (!is.numeric(slope) || length(slope) != 1L) {
            list(pass = FALSE, message = "slope should be a single number. tidy() gives a table with one row per coefficient - filter to the autonomy row, then pull(estimate).")
          } else if (isTRUE(all.equal(slope, a, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("That is the intercept, ", round(a, 2), ": predicted wellbeing for an employee with autonomy = 0. The slope is the autonomy row, ", round(b, 2), "."))
          } else if (isTRUE(all.equal(slope, cor(d$autonomy, d$wellbeing), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That is the correlation, not the slope. The correlation is unit-free; the slope is in the units of the data - points of wellbeing per one point of autonomy.")
          } else if (!isTRUE(all.equal(slope, b, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("slope is ", round(slope, 4), ", but the autonomy coefficient is ", round(b, 4), "."))
          } else {
            list(pass = TRUE, message = paste0("b = ", round(b, 2), ". Each extra point of autonomy goes with ", round(b, 2), " more points of wellbeing on average. The intercept is ", round(a, 2), " - the prediction at autonomy = 0, which no employee in this study has, so read it as where the line starts rather than as a finding."))
          }
        }
      }
    `,
    hints: [
      'lm(outcome ~ predictor, data = d) fits the model. Store the whole thing in model.',
      'model %>% tidy() gives one row per coefficient, with columns term, estimate, std.error, statistic and p.value.',
      'filter(term == "autonomy") %>% pull(estimate) takes the slope out of that table as a plain number.',
    ],
  },
  {
    id: 'm9-2-b',
    prompt:
      'Use the fitted model to predict the wellbeing of an employee whose autonomy is 8. Store that single predicted value in pred_8.',
    starterCode:
      'library(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\n\n# predict() wants a data frame whose column has the same name as the predictor.\npred_8 <- ',
    solution:
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\npred_8 <- predict(model, newdata = data.frame(autonomy = 8))',
    wrongAnswers: [
      // The intercept forgotten: a slope times 8 is a change, not a prediction.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\npred_8 <- coef(model)[2] * 8',
      // The 8 forgotten: the prediction at autonomy = 1.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\npred_8 <- coef(model)[1] + coef(model)[2]',
      // The observed mean of employees near autonomy 8, which is not what the line says.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\npred_8 <- mean(d$wellbeing[round(d$autonomy) == 8])',
    ],
    alternateSolutions: [
      // The arithmetic, done by hand.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\npred_8 <- coef(model)[[1]] + coef(model)[[2]] * 8',
      // broom route: augment() on new data.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\npred_8 <- model %>% augment(newdata = data.frame(autonomy = 8)) %>% pull(.fitted)',
    ],
    check: `
      if (!has_answer("pred_8")) {
        list(pass = FALSE, message = "I could not find an object called pred_8.")
      } else {
        pred <- as.vector(answer("pred_8"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- lm(wellbeing ~ autonomy, data = d)
        expected <- as.vector(predict(reference, newdata = data.frame(autonomy = 8)))
        a <- as.vector(coef(reference)["(Intercept)"])
        b <- as.vector(coef(reference)["autonomy"])
        if (!is.numeric(pred) || length(pred) != 1L) {
          list(pass = FALSE, message = "pred_8 should be a single number. Give predict() a newdata frame with exactly one row.")
        } else if (isTRUE(all.equal(pred, b * 8, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("You multiplied the slope by 8 but left out the intercept. The line is wellbeing = ", round(a, 2), " + ", round(b, 2), " x autonomy, and every prediction starts from that intercept."))
        } else if (isTRUE(all.equal(pred, a + b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "That is the prediction at autonomy = 1: you added one slope rather than eight. Multiply the slope by the autonomy value you want.")
        } else if (!isTRUE(all.equal(pred, expected, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("pred_8 is ", round(pred, 3), ", but the model predicts ", round(expected, 3), " at autonomy = 8. Note that the model's prediction is the height of the line there, not the average of the employees who happen to score 8."))
        } else {
          list(pass = TRUE, message = paste0("The model predicts ", round(expected, 2), " points of wellbeing at autonomy = 8. That is a prediction about the average employee at that level, not about any particular one: the residual SD around this line is about ", round(sigma(reference), 2), " points."))
        }
      }
    `,
    hints: [
      'predict(model, newdata = ...) takes a data frame of predictor values.',
      'The data frame needs one column named exactly like the predictor: data.frame(autonomy = 8).',
      'By hand it is intercept + slope * 8, which is coef(model)[[1]] + coef(model)[[2]] * 8.',
    ],
  },
  {
    id: 'm9-3-a',
    prompt:
      'Read the model output into three numbers: the t statistic for the autonomy slope in t_slope, its p value in p_slope, and the proportion of variance the model explains in r2.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\n\nmodel %>% tidy()\nmodel %>% glance()\n\nt_slope <- \np_slope <- \nr2 <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\nt_slope <- model %>% tidy() %>% filter(term == "autonomy") %>% pull(statistic)\np_slope <- model %>% tidy() %>% filter(term == "autonomy") %>% pull(p.value)\nr2 <- model %>% glance() %>% pull(r.squared)',
    wrongAnswers: [
      // The intercept row read instead of the slope row.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\nt_slope <- model %>% tidy() %>% slice(1) %>% pull(statistic)\np_slope <- model %>% tidy() %>% slice(1) %>% pull(p.value)\nr2 <- model %>% glance() %>% pull(r.squared)',
      // Adjusted R-squared handed in as R-squared.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\nt_slope <- model %>% tidy() %>% filter(term == "autonomy") %>% pull(statistic)\np_slope <- model %>% tidy() %>% filter(term == "autonomy") %>% pull(p.value)\nr2 <- model %>% glance() %>% pull(adj.r.squared)',
      // The estimate mistaken for the test statistic.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\nt_slope <- model %>% tidy() %>% filter(term == "autonomy") %>% pull(estimate)\np_slope <- model %>% tidy() %>% filter(term == "autonomy") %>% pull(p.value)\nr2 <- model %>% glance() %>% pull(r.squared)',
      // r2 filled with the correlation rather than its square.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\nt_slope <- model %>% tidy() %>% filter(term == "autonomy") %>% pull(statistic)\np_slope <- model %>% tidy() %>% filter(term == "autonomy") %>% pull(p.value)\nr2 <- cor(d$autonomy, d$wellbeing)',
    ],
    alternateSolutions: [
      // Base R: the coefficient matrix and summary()$r.squared.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\ns <- summary(model)\nt_slope <- s$coefficients["autonomy", "t value"]\np_slope <- s$coefficients["autonomy", "Pr(>|t|)"]\nr2 <- s$r.squared',
      // R-squared as the squared correlation - the same number, a different route.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel <- lm(wellbeing ~ autonomy, data = d)\ncoefs <- model %>% tidy()\nt_slope <- coefs$statistic[coefs$term == "autonomy"]\np_slope <- coefs$p.value[coefs$term == "autonomy"]\nr2 <- cor(d$autonomy, d$wellbeing)^2',
    ],
    check: `
      if (!has_answer("t_slope") || !has_answer("p_slope") || !has_answer("r2")) {
        list(pass = FALSE, message = "I need all three: t_slope, p_slope and r2.")
      } else {
        t_value <- as.vector(answer("t_slope"))
        p_value <- as.vector(answer("p_slope"))
        r2 <- as.vector(answer("r2"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- summary(lm(wellbeing ~ autonomy, data = d))
        exp_t <- as.vector(reference$coefficients["autonomy", "t value"])
        exp_p <- as.vector(reference$coefficients["autonomy", "Pr(>|t|)"])
        exp_b <- as.vector(reference$coefficients["autonomy", "Estimate"])
        int_t <- as.vector(reference$coefficients["(Intercept)", "t value"])
        exp_r2 <- as.vector(reference$r.squared)
        if (!is.numeric(t_value) || length(t_value) != 1L || !is.numeric(p_value) || length(p_value) != 1L || !is.numeric(r2) || length(r2) != 1L) {
          list(pass = FALSE, message = "Each of the three should be a single number. pull() takes one column out of a tidy() or glance() table as a plain vector.")
        } else if (isTRUE(all.equal(t_value, int_t, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "That is the intercept's t, which tests whether the line passes through zero at autonomy = 0 - a question nobody asked. Filter tidy() to the autonomy row.")
        } else if (isTRUE(all.equal(t_value, exp_b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You pulled estimate rather than statistic. In tidy(), estimate is b, std.error is its SE, and statistic is t = b / SE.")
        } else if (isTRUE(all.equal(r2, sqrt(exp_r2), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is r, the correlation (", round(sqrt(exp_r2), 3), "). R-squared is its square, ", round(exp_r2, 3), " - the share of the variance in wellbeing the model accounts for."))
        } else if (isTRUE(all.equal(r2, as.vector(reference$adj.r.squared), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "That is adjusted R-squared, which penalises the number of predictors. glance() has both: pull r.squared.")
        } else if (!isTRUE(all.equal(t_value, exp_t, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("t_slope is ", round(t_value, 3), " but should be ", round(exp_t, 3), "."))
        } else if (!isTRUE(all.equal(p_value, exp_p, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "p_slope is not the p value of the autonomy row. In tidy() that column is called p.value.")
        } else if (!isTRUE(all.equal(r2, exp_r2, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("r2 is ", round(r2, 4), " but glance()'s r.squared is ", round(exp_r2, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("t(", reference$df[2], ") = ", round(exp_t, 2), ", p ", if (exp_p < 0.001) "< .001" else paste0("= ", format(round(exp_p, 3), nsmall = 3)), ", R-squared = ", round(exp_r2, 3), ". In a simple regression that t and the model F test say exactly the same thing, because there is only one predictor to test."))
        }
      }
    `,
    hints: [
      'tidy() names the columns estimate, std.error, statistic and p.value. The t statistic is statistic.',
      'glance() returns one row for the whole model, with r.squared and adj.r.squared among its columns.',
      'filter(term == "autonomy") first, so you read the slope row rather than the intercept row.',
    ],
  },
  {
    id: 'm9-3-b',
    prompt:
      'Workload now. Fit the model predicting wellbeing from workload and store it in model_wl. Then build wl_means: the mean wellbeing in each third of workload, from the lightest third to the heaviest, as a table with one row per third.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nmodel_wl <- \n\n# ntile(workload, 3) labels each employee 1, 2 or 3 by how heavy their workload is.\nwl_means <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_wl <- lm(wellbeing ~ workload, data = d)\nwl_means <- d %>%\n  mutate(third = ntile(workload, 3)) %>%\n  group_by(third) %>%\n  summarise(mean_wellbeing = mean(wellbeing))',
    wrongAnswers: [
      // Autonomy fitted again: a positive slope where a negative one belongs.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_wl <- lm(wellbeing ~ autonomy, data = d)\nwl_means <- d %>%\n  mutate(third = ntile(workload, 3)) %>%\n  group_by(third) %>%\n  summarise(mean_wellbeing = mean(wellbeing))',
      // The thirds taken on the outcome instead of the predictor.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_wl <- lm(wellbeing ~ workload, data = d)\nwl_means <- d %>%\n  mutate(third = ntile(wellbeing, 3)) %>%\n  group_by(third) %>%\n  summarise(mean_wellbeing = mean(wellbeing))',
      // The formula reversed.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_wl <- lm(workload ~ wellbeing, data = d)\nwl_means <- d %>%\n  mutate(third = ntile(workload, 3)) %>%\n  group_by(third) %>%\n  summarise(mean_wellbeing = mean(wellbeing))',
      // Two halves rather than three thirds.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_wl <- lm(wellbeing ~ workload, data = d)\nwl_means <- d %>%\n  mutate(third = ntile(workload, 2)) %>%\n  group_by(third) %>%\n  summarise(mean_wellbeing = mean(wellbeing))',
    ],
    alternateSolutions: [
      // Base R: cut() on the quantiles, then aggregate().
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_wl <- lm(wellbeing ~ workload, data = d)\nbreaks <- quantile(d$workload, probs = c(0, 1/3, 2/3, 1))\nd$third <- cut(d$workload, breaks = breaks, include.lowest = TRUE, labels = FALSE)\nwl_means <- aggregate(wellbeing ~ third, data = d, FUN = mean)',
      // The same table with an extra column of SDs, which is still one row per third.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_wl <- lm(wellbeing ~ workload, data = d)\nwl_means <- d %>%\n  mutate(third = ntile(workload, 3)) %>%\n  group_by(third) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
    ],
    check: `
      if (!has_answer("model_wl") || !has_answer("wl_means")) {
        list(pass = FALSE, message = "I need both model_wl (the fitted lm) and wl_means (the table of means).")
      } else {
        model_wl <- answer("model_wl")
        wl_means <- answer("wl_means")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- lm(wellbeing ~ workload, data = d)
        b <- as.vector(coef(reference)["workload"])
        breaks <- quantile(d$workload, probs = c(0, 1/3, 2/3, 1))
        third <- cut(d$workload, breaks = breaks, include.lowest = TRUE, labels = FALSE)
        expected <- as.vector(tapply(d$wellbeing, third, mean))
        if (!inherits(model_wl, "lm")) {
          list(pass = FALSE, message = "model_wl is not a fitted linear model. Use lm(wellbeing ~ workload, data = d).")
        } else if (!identical(as.character(formula(model_wl))[2], "wellbeing")) {
          list(pass = FALSE, message = paste0("model_wl predicts ", as.character(formula(model_wl))[2], ". Wellbeing is the outcome here, so it belongs on the left of the tilde."))
        } else if (!("workload" %in% names(coef(model_wl)))) {
          list(pass = FALSE, message = "model_wl has no workload coefficient. The predictor for this exercise is workload, not autonomy.")
        } else if (!isTRUE(all.equal(as.vector(coef(model_wl)["workload"]), b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "model_wl is fitted to different data from d. Fit it to the whole workplace dataset.")
        } else if (!is.data.frame(wl_means)) {
          list(pass = FALSE, message = "wl_means should be a table - the result of group_by() %>% summarise(), or of aggregate().")
        } else if (nrow(wl_means) != 3L) {
          list(pass = FALSE, message = paste0("wl_means has ", nrow(wl_means), " rows. ntile(workload, 3) splits the employees into three groups, so the table should have three."))
        } else {
          numeric_cols <- vapply(wl_means, is.numeric, logical(1))
          means_col <- NULL
          for (nm in names(wl_means)[numeric_cols]) {
            if (isTRUE(all.equal(as.vector(wl_means[[nm]]), expected, tolerance = 1e-6, check.attributes = FALSE))) means_col <- nm
          }
          if (is.null(means_col)) {
            list(pass = FALSE, message = paste0("No column of wl_means holds the mean wellbeing of the three workload thirds, which are ", paste(round(expected, 1), collapse = ", "), ". Check that you split on workload rather than on wellbeing."))
          } else if (b >= 0) {
            list(pass = FALSE, message = "Your model's workload slope is not negative, which contradicts the table: mean wellbeing falls as workload rises. Check which variable you put on the right of the tilde.")
          } else {
            list(pass = TRUE, message = paste0("b = ", round(b, 2), " per point of workload, and the table says the same thing in plain means: ", round(expected[1], 1), " in the lightest third down to ", round(expected[3], 1), " in the heaviest, a drop of ", round(expected[1] - expected[3], 1), " points. The sign of b is the finding, and the means are how you check you have not read it backwards."))
          }
        }
      }
    `,
    hints: [
      'mutate(third = ntile(workload, 3)) adds a column labelling each employee 1, 2 or 3.',
      'Then group_by(third) %>% summarise(mean_wellbeing = mean(wellbeing)).',
      'Fit the model with lm(wellbeing ~ workload, data = d) - wellbeing is the outcome, so it goes first.',
    ],
  },
];
```

Every wrong answer here is a mistake a student actually makes — the formula reversed, the intercept read as the slope, `abs()` applied to a correlation, adjusted *R²* handed in as *R²*, the thirds taken on the outcome — and every one of them runs without error, so the validator's negative fixtures test what it is supposed to test.

- [x] **Step 3: Write `src/content/lessons/09-1-seeing-association.mdx`**

````mdx
Part 3 of this course is about one idea with several names. Regression, the
*t*-test, ANOVA — statistics textbooks put them in separate chapters, and in R
they are one function. From here to Module 14 you will fit models with `lm()`,
`lmer()` and `glm()`, and everything else is a special case of one of the three.

The data for all six modules is a workplace study: 480 employees across four
departments and six sites, each with a workload rating, an autonomy rating, a
wellbeing score, engagement measured twice, a performance rating, and a record
of whether they left the company.

<CodeBlock id="c-load" code={`library(dplyr)
library(ggplot2)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

glimpse(d)`} />

`stringsAsFactors = TRUE` matters more here than it did in Module 2. It is what
turns `department`, `site`, `remote`, `training` and `mentoring` into factors,
and from Module 11 onwards a factor is what tells `lm()` to compare groups
rather than to treat a label as a number.

## Start with the descriptives, always

Before any model, look at what you have. Means and SDs for the variables you are
about to relate to each other, and the *n* they are computed from.

<CodeBlock id="c-descriptives" code={`d %>%
  summarise(
    n = n(),
    mean_autonomy = mean(autonomy), sd_autonomy = sd(autonomy),
    mean_workload = mean(workload), sd_workload = sd(workload),
    mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing)
  )`} />

This is not a formality, and it is not something to do once and forget. Every
model output you meet in Part 3 is a number whose sign and size you can only
sanity-check against the means. When the model says something surprising, the
descriptives are where you find out whether it is a discovery or a typo.

<Predict
  id="p-direction"
  question="Autonomy is how much control an employee has over their own work; workload is how much of it there is. Before plotting anything: which way will each relate to wellbeing?"
  choices={[
    { text: 'Both positive: more of anything at work goes with feeling better', response: 'Two variables can point in opposite directions, and here they do. Autonomy is a resource; workload is a demand.' },
    { text: 'Autonomy positive, workload negative', correct: true, response: 'That is the demand-resource pattern the study was designed around, and the plots below show it.' },
    { text: 'Both negative: work is a cost', response: 'Workload behaves that way, but autonomy does not. Control over your own work is a resource, not a demand.' },
    { text: 'Neither: wellbeing is a personality trait and nothing at work moves it', response: 'Then both scatterplots would be shapeless clouds. They are not - look at the next two blocks.' },
  ]}
/>

## Seeing it

A scatterplot, one point per employee, with the straight line that best summarises
the cloud drawn through it. `geom_smooth(method = lm)` fits exactly the line the
next lesson fits with `lm()`.

<CodeBlock id="c-scatter-autonomy" code={`d %>%
  ggplot(aes(x = autonomy, y = wellbeing)) +
  geom_point(alpha = 0.4) +
  geom_smooth(method = lm, se = FALSE) +
  labs(x = "Autonomy (1-10)", y = "Wellbeing", title = "Autonomy and wellbeing") +
  theme_classic()`} />

<CodeBlock id="c-scatter-workload" code={`d %>%
  ggplot(aes(x = workload, y = wellbeing)) +
  geom_point(alpha = 0.4) +
  geom_smooth(method = lm, se = FALSE) +
  labs(x = "Workload (1-10)", y = "Wellbeing", title = "Workload and wellbeing") +
  theme_classic()`} />

> **Change the y variable.** Edit either block to use `performance` instead of
> `wellbeing` and run it again. The relationships are not the same, and noticing
> that now will save you an embarrassing sentence in Module 10.

## Measuring it

The correlation *r* puts a number on how tightly the points hug a straight line.
It runs from −1 through 0 to +1, it has no units, and it is symmetric: the
correlation of autonomy with wellbeing is the correlation of wellbeing with
autonomy.

<CodeBlock id="c-cor" code={`d %>%
  summarise(
    r_autonomy = cor(autonomy, wellbeing),
    r_workload = cor(workload, wellbeing),
    r_tenure   = cor(tenure_years, wellbeing)
  )`} />

Three things *r* is not, each of which has ended up in a published paper:

1. **It is not a slope.** *r* is unit-free. If you rescaled wellbeing from 0–100
   to 0–1, *r* would not move and the slope would shrink by a factor of 100.
2. **It is not a percentage.** *r* = .50 does not mean half of anything. Its
   square does: *r*² = .25 is the share of the variance the line accounts for.
3. **It is not a cause.** Every sentence in this module about autonomy and
   wellbeing is a statement about how they vary together in these 480 people.

## Guess before you compute

Drag the slider until the cloud looks like the one you just plotted, then reveal
the number. Most people over-estimate weak correlations and under-estimate strong
ones, and the only cure is practice.

<Simulation name="correlation" />

<Exercise id="m9-1-a" />

<Quiz
  id="q-r-meaning"
  question="A study reports r = -.42 between workload and wellbeing, n = 480. Which statement is supported?"
  choices={[
    { text: 'Reducing workload would raise wellbeing by .42 points.', response: 'Two errors at once: r is not in points, and a correlation from observational data does not license a claim about what would happen if you intervened.' },
    { text: 'Employees with heavier workloads tend to report lower wellbeing, and about 18 % of the variance in wellbeing is shared with workload.', correct: true, response: 'Correct. The direction comes from the sign, and .42 squared is about .18 - the shared variance.' },
    { text: '42 % of the variance in wellbeing is explained by workload.', response: 'That is r squared, not r. Square it first: .42 squared is about .18.' },
    { text: 'Workload and wellbeing are unrelated in 58 % of employees.', response: 'A correlation describes the whole sample at once. It does not split people into a related group and an unrelated one.' },
  ]}
/>

<Interpret
  id="i-9-1"
  question="A colleague sends you this line for their results section: they found r = -.42 between workload and wellbeing across 480 employees, p < .001. Which sentence reports it correctly in APA 7 style?"
  choices={[
    { text: 'Workload was negatively correlated with wellbeing, r(478) = -.42, p < .001.', correct: true, response: 'Correct. Pearson r takes n - 2 degrees of freedom, the sign is kept, and the leading zero is dropped from a statistic that cannot exceed 1.' },
    { text: 'Workload reduced wellbeing, r(478) = -.42, p < .001.', response: '"Reduced" is a causal claim. Nothing was manipulated here; employees with heavier workloads simply reported lower wellbeing.' },
    { text: 'Workload was negatively correlated with wellbeing, r(480) = -0.42, p = .000.', response: 'Two reporting errors: df for r is n - 2, and a p value is never written as .000 - report p < .001.' },
    { text: 'There was a significant correlation between workload and wellbeing, r(478) = -.42, p < .001, showing that 42 % of wellbeing is due to workload.', response: 'The first half is fine; the tail is wrong twice over. r squared is about .18, and "due to" is causal.' },
  ]}
/>
````

- [x] **Step 4: Write `src/content/lessons/09-2-fitting-a-line.mdx`**

````mdx
A correlation says how tightly the points follow a line. It does not say which
line. For that you need a model — and the model is where the rest of this course
lives.

<CodeBlock id="c-load" code={`library(dplyr)
library(broom)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

d %>% summarise(mean_autonomy = mean(autonomy), mean_wellbeing = mean(wellbeing), n = n())`} />

## Which line?

A line through a cloud of points is a prediction rule: give it an autonomy
score, it returns a predicted wellbeing score. For each employee, the gap
between what the line predicted and what they actually reported is a
**residual**.

Infinitely many lines are available. The one R fits is the one that makes the
**sum of the squared residuals** as small as it can be — the least-squares line.
Squaring is what stops a line from paying for a large miss above with a large
miss below, and it is why a single far-out point can pull the line noticeably.

<Predict
  id="p-outlier"
  question="You drag one point far above the cloud, on the right-hand edge. What happens to the least-squares line?"
  choices={[
    { text: 'Nothing: one point out of 480 cannot matter', response: 'It can, and the further from the middle of x it sits, the more it matters. Try it in the simulation below.' },
    { text: 'The line tilts towards it, and the more so the further out along x it sits', correct: true, response: 'Exactly. Squared residuals grow fast, and leverage grows with distance from the mean of x.' },
    { text: 'The line moves up but keeps its slope', response: 'That is what would happen for a point at the middle of x. Out at the edge, the slope moves too.' },
  ]}
/>

<Simulation name="leastsquares" />

## Fitting it

<CodeBlock id="c-fit" code={`model <- lm(wellbeing ~ autonomy, data = d)

model`} />

Read the formula out loud: **wellbeing is modelled by autonomy**. The outcome
goes on the left of the tilde, the predictor on the right. Everything in Part 3
is a variation on that one line: add a second predictor, make a predictor a
factor, multiply two predictors together, add a random intercept, change the
family. The formula is the model.

Printing the model alone gives the two coefficients and nothing else. `tidy()`
turns them into a proper table:

<CodeBlock id="c-tidy" code={`model %>% tidy()`} />

- **`(Intercept)`** is the predicted wellbeing of an employee whose autonomy is
  0. No one in this study scores 0 on a 1–10 scale, so the intercept here is
  where the line starts, not a fact about anybody.
- **`autonomy`** is the slope *b*: the predicted change in wellbeing for each
  extra point of autonomy.

<Exercise id="m9-2-a" />

## Using the line

`predict()` runs the model forwards. Give it autonomy values, get predicted
wellbeing back.

<CodeBlock id="c-predict" code={`new_people <- data.frame(autonomy = c(3, 5, 8))

new_people %>%
  mutate(predicted_wellbeing = predict(model, newdata = new_people))`} />

Those three numbers are evenly spaced, because the model is a straight line and a
straight line has one slope everywhere. That is an assumption, not a discovery —
the scatterplot in the previous lesson is where you check it is reasonable.

## Residuals: what the line missed

<CodeBlock id="c-resid" code={`model %>%
  augment() %>%
  select(wellbeing, autonomy, .fitted, .resid) %>%
  head(8)`} />

`.fitted` is the height of the line, `.resid` is the observed value minus the
fitted one. A residual is not an error in the data; it is everything about that
employee's wellbeing that autonomy does not account for — which, here, is most of
it.

<Exercise id="m9-2-b" />

<Quiz
  id="q-least-squares"
  question="Why does the fitting criterion square the residuals rather than take their absolute values?"
  choices={[
    { text: 'To make every residual positive, which absolute values would not do', response: 'Absolute values also make every residual positive. That is not the reason.' },
    { text: 'To penalise large misses much more than small ones, which gives one line with a closed-form solution', correct: true, response: 'Right. Squaring makes a miss of 4 cost sixteen times a miss of 1, and it makes the best line computable in one step rather than by search.' },
    { text: 'Because residuals are normally distributed', response: 'Normality of residuals is an assumption used for the p values, not the reason for the fitting criterion.' },
    { text: 'Because the outcome is squared in the formula', response: 'Nothing in the formula is squared. wellbeing ~ autonomy is linear in both.' },
  ]}
/>

<Interpret
  id="i-9-2"
  question="A model of wellbeing on autonomy gives an intercept of 54.10 and a slope of 2.24 (SE = 0.20). A colleague writes: 'Employees with no autonomy have a wellbeing score of 54.10.' What is wrong, and what should be said instead?"
  choices={[
    { text: 'Nothing is wrong; 54.10 is the predicted score at autonomy = 0.', response: 'Arithmetically the intercept is that prediction, but autonomy is measured from 1 to 10, so the claim extrapolates beyond every observation in the study.' },
    { text: 'Autonomy was a significant predictor of wellbeing, b = 2.24, SE = 0.20; the intercept (54.10) is the predicted value at autonomy = 0, which lies outside the observed 1-10 range and should not be interpreted as a group of employees.', correct: true, response: 'Correct. The intercept is reported as part of the fitted line and explicitly not interpreted, because no employee was observed there.' },
    { text: 'The intercept is the mean wellbeing of the sample.', response: 'That is only true when the predictor is centred. Here the intercept is the prediction at autonomy = 0, which is not the average employee.' },
    { text: 'The intercept should be dropped from the model because it cannot be interpreted.', response: 'Removing the intercept forces the line through the origin, which would badly distort the slope. An uninterpretable intercept is kept and left uninterpreted.' },
  ]}
/>
````

- [x] **Step 5: Write `src/content/lessons/09-3-reading-model-output.mdx`**

````mdx
You can fit a model. Now read one — and report it, which is a separate skill and
the one examiners actually grade.

Every inferential analysis in this course follows the same six steps, and from
here on each lesson names them:

> **Question → Assumptions → Choice of model → Computation → Interpretation → Report**

<CodeBlock id="c-fit" code={`library(dplyr)
library(broom)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

d %>% summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())

model <- lm(wellbeing ~ autonomy, data = d)
model %>% tidy()`} />

## The coefficient table, column by column

- **`estimate`** — *b*, the slope. In the units of the data: points of wellbeing
  per point of autonomy.
- **`std.error`** — how much *b* would bounce around across repeated samples.
  This is the standard error from Module 7, applied to a slope.
- **`statistic`** — *t* = `estimate` / `std.error`. How many standard errors the
  slope sits from zero.
- **`p.value`** — the probability of a *t* at least this extreme if the true
  slope were exactly zero. Module 8's definition, unchanged.

Notice what the *p* value is attached to: **a slope of zero**, meaning a flat
line, meaning autonomy tells you nothing about wellbeing. That is the null
hypothesis being tested, and it is the only one being tested.

## The whole model

<CodeBlock id="c-glance" code={`model %>% glance()`} />

`glance()` returns one row about the model rather than one row per coefficient.
Three columns matter now:

- **`r.squared`** — the share of the variance in wellbeing the model accounts
  for. With one predictor it is exactly the squared correlation.
- **`statistic` and `p.value`** — the model *F* test, with `df` and `df.residual`
  degrees of freedom. With a single predictor, *F* = *t*², and its *p* is the
  slope's *p*. Two numbers, one fact.
- **`sigma`** — the residual standard deviation: the typical size of a miss.

<CodeBlock id="c-equivalence" code={`t_value <- model %>% tidy() %>% filter(term == "autonomy") %>% pull(statistic)
f_value <- model %>% glance() %>% pull(statistic)

c(t_squared = t_value^2, F = f_value)

r_value <- cor(d$autonomy, d$wellbeing)
c(r_squared = r_value^2, R_squared = model %>% glance() %>% pull(r.squared))`} />

Both pairs should agree to every decimal R prints. This is the first of several
places in Part 3 where two traditions give the same answer through different
arithmetic — correlation and regression here, the *t*-test and `lm` in Module 11,
the paired *t*-test and `lmer` in Module 13.

<Predict
  id="p-r2"
  question="R-squared for this model is about .21. What does that leave?"
  choices={[
    { text: 'The 79 % of employees the model gets wrong', response: 'R-squared is not a count of people. It is a share of variance, and the model is a bit wrong about nearly everybody.' },
    { text: 'The 79 % of the variance in wellbeing that autonomy does not account for - other causes, and measurement noise', correct: true, response: 'Exactly. In Module 10 you will hand some of that 79 % to workload and tenure.' },
    { text: 'The probability the model is wrong', response: 'R-squared is a description of fit in this sample, not a probability about the model.' },
  ]}
/>

<Exercise id="m9-3-a" />

## Assumptions, checked by eye

Step 2 of the chain. For a linear model, four things, in the order they go wrong:

1. **Linearity** — the pattern is roughly straight. Check on the scatterplot.
2. **Similar spread** — the residuals do not fan out. Check on a residuals-versus-fitted plot.
3. **No extreme outliers** — a handful of far-out points can carry the slope.
4. **Roughly normal residuals** — matters mainly at small *n*; at 480 the
   Central Limit Theorem from Module 6 does the work.

<CodeBlock id="c-assumptions" code={`model %>%
  augment() %>%
  ggplot2::ggplot(ggplot2::aes(x = .fitted, y = .resid)) +
  ggplot2::geom_point(alpha = 0.4) +
  ggplot2::geom_hline(yintercept = 0) +
  ggplot2::labs(x = "Fitted wellbeing", y = "Residual") +
  ggplot2::theme_classic()`} />

A shapeless band of about the same height across the plot is what you want. A
funnel means the spread changes with the prediction; a curve means a straight
line was the wrong shape.

## The other direction

<Exercise id="m9-3-b" />

## Reporting it

An APA 7 report of a simple regression carries the model, its fit, and the
coefficient: *F*(1, 478), *R*², then *b* with its *SE*, *t* and *p*. Never a
*p* value alone, and never a bare "significant".

<Quiz
  id="q-p-meaning"
  question="The autonomy slope has p < .001. Which statement is a correct reading of that p value?"
  choices={[
    { text: 'There is less than a 0.1 % chance that autonomy is unrelated to wellbeing.', response: 'That is a probability about the hypothesis. A p value is a probability about data, computed while assuming the null is true.' },
    { text: 'If the true slope were zero, a slope at least this far from zero would turn up in fewer than 1 in 1000 samples.', correct: true, response: 'Correct - a statement about data under an assumed null, which is all a p value ever is.' },
    { text: 'The result will replicate more than 99.9 % of the time.', response: 'Replication probability depends on the true effect size and the new study\'s power, not on this p value.' },
    { text: 'The effect of autonomy is large.', response: 'p answers "how surprising under the null", not "how big". With n = 480, a small slope can reach p < .001.' },
  ]}
/>

<Interpret
  id="i-9-3"
  question="Your model gives F(1, 478) = 126.30, R-squared = .209, and for autonomy b = 2.24, SE = 0.20, t(478) = 11.24, p < .001. Which write-up is correct APA 7?"
  choices={[
    { text: 'Autonomy significantly predicted wellbeing (p < .001), explaining 20.9 % of employees.', response: 'Two problems: a p value on its own is not a report, and R-squared is a share of variance, not a share of employees.' },
    { text: 'A simple linear regression showed that autonomy significantly predicted wellbeing, F(1, 478) = 126.30, p < .001, R-squared = .209. Each additional point of autonomy was associated with a 2.24-point increase in wellbeing, b = 2.24, SE = 0.20, t(478) = 11.24, p < .001.', correct: true, response: 'Correct. The model test, the fit and the coefficient are all there, and "was associated with" keeps the claim at the level the design supports.' },
    { text: 'Autonomy caused a 2.24-point increase in wellbeing, b = 2.24, SE = 0.20, t(478) = 11.24, p < .001.', response: 'The statistics are right and the verb is not. Nothing was manipulated or randomised, so the design cannot support "caused".' },
    { text: 'There was a strong relationship between autonomy and wellbeing, R-squared = .209, p < .001.', response: 'The coefficient is missing, and with R-squared = .209 the relationship is moderate. A reader cannot recover the slope or its precision from this sentence.' },
  ]}
/>
````

- [x] **Step 6: Add Module 9 assertions to `src/content/exercises/index.test.ts`**

Append a `describe` block of its own, so the six module tasks append to this file without colliding.

```ts
describe('Module 9', () => {
  const module9 = ALL_EXERCISES.filter((exercise) => exercise.id.startsWith('m9-'));

  test('defines all five exercises', () => {
    expect(module9.map((exercise) => exercise.id)).toEqual([
      'm9-1-a', 'm9-2-a', 'm9-2-b', 'm9-3-a', 'm9-3-b',
    ]);
  });

  test('every check reads the workplace dataset rather than hard-coding its values', () => {
    // The CSV is generated (content-platform P2). A check holding a literal from
    // it silently starts failing the day the generator is reseeded.
    for (const exercise of module9) {
      expect(exercise.check, `${exercise.id}`).toContain('read.csv("data/workplace.csv"');
    }
  });

  test('every check that inspects a model verifies its class first', () => {
    for (const exercise of module9) {
      if (!/answer\("model/.test(exercise.check)) continue;
      expect(exercise.check, `${exercise.id} reads a model without an inherits() guard`)
        .toMatch(/inherits\([^,]+, "lm"\)/);
    }
  });

  test('every numeric comparison drops attributes', () => {
    // coef(m)["autonomy"] is named, summary()$coefficients[...] can be a matrix,
    // and summarise() without pull() is a one-cell tibble. All three are correct.
    for (const exercise of module9) {
      for (const call of exercise.check.matchAll(/all\.equal\([^)]*\)/g)) {
        expect(call[0], `${exercise.id}: ${call[0]}`).toContain('check.attributes = FALSE');
      }
    }
  });
});
```

- [x] **Step 7: Run the static content tests**

Run: `npx vitest run src/content/content.test.ts src/content/exercises/index.test.ts`

Expected: PASS. In particular `every planned lesson has a unique id and file`, `every referenced exercise is defined`, `each lesson lists exactly the exercises its MDX contains`, `block ids are unique within each lesson`, `every referenced simulation is registered` (this is where a missing `correlation` or `leastsquares` simulation shows up), `every inferential lesson closes with an Interpret block`, and `every declared package is one the course knows how to install` must all be green. `MODULES` now contains Module 6 and Module 9.

- [x] **Step 8: Run the R validator over Module 9**

Run: `npx vitest run src/content/exercises/validate.itest.ts -t "m9-"`

Expected output, per exercise: `the reference solution passes its own check` PASS; `wrong answer N is rejected by the check, not by an error` PASS for all four (or three) of them; `alternate solution N passes the check` PASS for each; and the lesson-environment suite's `neither an empty submission nor the unchanged starter code passes`. A `student-error` verdict on a wrong answer is a **failure**, not a pass: it means the fixture proved nothing, and the wrong answer must be rewritten as code that runs.

Then the full lesson run: `npx vitest run src/content/exercises/validate.itest.ts -t "09-"`, which executes every code block of the three lessons in order in one fresh lesson environment. Expected: no R error, and in particular no "could not find function" — that is what an undeclared package looks like from inside the validator.

- [ ] **Step 9: Verify Module 9 in the browser**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/09-1`.

Expected: the sidebar lists Module 9 with its three lessons; R boots and the status pill reports the core install; `glimpse(d)` prints 480 rows and 14 columns; both scatterplots draw with a fitted line; the `correlation` simulation responds to its slider; `09-2` draws the `leastsquares` simulation and `augment()` prints `.fitted` and `.resid`; every `<Exercise>` runs, shows its hints one at a time, and reports a teaching message on a deliberately wrong answer; every `<Interpret>` records an answer. Navigate `09-1 → 09-2 → 09-3` with the next-lesson control and confirm objects from earlier blocks are still alive within a lesson and gone between lessons.

- [x] **Step 10: Commit**

```bash
git add src/content/manifest.ts src/content/exercises/module-09.ts src/content/exercises/index.test.ts src/content/lessons/09-1-seeing-association.mdx src/content/lessons/09-2-fitting-a-line.mdx src/content/lessons/09-3-reading-model-output.mdx
git commit -m "feat: Module 9, correlation and simple regression"
```

---

### Task M10: Multiple regression

**Files:**
- Create: `src/content/lessons/10-1-two-predictors.mdx`, `src/content/lessons/10-2-holding-constant.mdx`, `src/content/lessons/10-3-model-fit-and-reporting.mdx`
- Modify: `src/content/manifest.ts` (`PLANNED_MODULES`), `src/content/exercises/module-10.ts`, `src/content/exercises/index.test.ts`
- Test: `src/content/content.test.ts`, `src/content/exercises/index.test.ts`, `src/content/exercises/validate.itest.ts`

**Interfaces:**
- Consumes: `ExerciseDef`; `LessonMeta.packages` (content-platform P1); `data/workplace.csv` (content-platform P2); Module 9's vocabulary — `lm`, `tidy`, `glance`, slope, intercept, residual — which these lessons assume without re-teaching.
- Produces: `module10: ExerciseDef[]` with ids `m10-1-a`, `m10-2-a`, `m10-2-b`, `m10-3-a`; three lesson files; `module-10` live in `MODULES`.

The whole module turns on one phrase and its limits: **holding the others constant**. That phrase is what makes a *b* in a multiple regression different from the same *b* fitted alone, and misreading it as a causal control is the single most common error in student theses. The module earns the phrase in `10-2` by fitting both models and showing the coefficient move, and then spends the `<Interpret>` blocks taking the causal reading away again.

- [x] **Step 1: Add the Module 10 entry to `PLANNED_MODULES`**

```ts
  {
    id: 'module-10',
    number: 10,
    title: 'Multiple regression',
    lessons: [
      {
        id: '10-1',
        title: 'A second predictor',
        file: '10-1-two-predictors',
        exercises: ['m10-1-a'],
        packages: ['broom'],
      },
      {
        id: '10-2',
        title: 'Holding the others constant',
        file: '10-2-holding-constant',
        exercises: ['m10-2-a', 'm10-2-b'],
        packages: ['broom', 'dplyr'],
      },
      {
        id: '10-3',
        title: 'Model fit, and the APA report',
        file: '10-3-model-fit-and-reporting',
        exercises: ['m10-3-a'],
        packages: ['broom'],
      },
    ],
  },
```

- [x] **Step 2: Write `src/content/exercises/module-10.ts`**

```ts
import type { ExerciseDef } from '../../r/checker';

export const module10: ExerciseDef[] = [
  {
    id: 'm10-1-a',
    prompt:
      'Fit the model that predicts wellbeing from autonomy and workload together. Store it in model2 and store the workload coefficient in b_workload.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\n# A plus sign adds a predictor. It does not multiply them together - that is Module 12.\nmodel2 <- \nb_workload <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel2 <- lm(wellbeing ~ autonomy + workload, data = d)\nb_workload <- model2 %>% tidy() %>% filter(term == "workload") %>% pull(estimate)',
    wrongAnswers: [
      // * instead of +: an interaction model, whose workload coefficient means
      // something else entirely (the workload slope at autonomy = 0).
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel2 <- lm(wellbeing ~ autonomy * workload, data = d)\nb_workload <- model2 %>% tidy() %>% filter(term == "workload") %>% pull(estimate)',
      // The second row of the table read as "the second predictor".
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel2 <- lm(wellbeing ~ autonomy + workload, data = d)\nb_workload <- model2 %>% tidy() %>% slice(2) %>% pull(estimate)',
      // Only one predictor in the model, so the coefficient is the unadjusted one.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel2 <- lm(wellbeing ~ workload, data = d)\nb_workload <- model2 %>% tidy() %>% filter(term == "workload") %>% pull(estimate)',
      // Two separate models stitched together, which is not a multiple regression.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel2 <- lm(wellbeing ~ autonomy, data = d)\nb_workload <- lm(wellbeing ~ workload, data = d) %>% tidy() %>% filter(term == "workload") %>% pull(estimate)',
    ],
    alternateSolutions: [
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel2 <- lm(wellbeing ~ autonomy + workload, data = d)\nb_workload <- coef(model2)["workload"]',
      // Predictors in the other order: the same model, a different row order.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel2 <- lm(wellbeing ~ workload + autonomy, data = d)\nb_workload <- model2 %>% tidy() %>% filter(term == "workload") %>% pull(estimate)',
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel2 <- lm(wellbeing ~ autonomy + workload, data = d)\nb_workload <- summary(model2)$coefficients["workload", "Estimate"]',
    ],
    check: `
      if (!has_answer("model2") || !has_answer("b_workload")) {
        list(pass = FALSE, message = "I need both model2 (the two-predictor lm) and b_workload (its workload coefficient).")
      } else {
        model2 <- answer("model2")
        b <- as.vector(answer("b_workload"))
        if (!inherits(model2, "lm")) {
          list(pass = FALSE, message = "model2 is not a fitted linear model. Use lm(wellbeing ~ autonomy + workload, data = d).")
        } else {
          d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
          reference <- lm(wellbeing ~ autonomy + workload, data = d)
          exp_workload <- as.vector(coef(reference)["workload"])
          exp_autonomy <- as.vector(coef(reference)["autonomy"])
          alone <- as.vector(coef(lm(wellbeing ~ workload, data = d))["workload"])
          terms_in <- names(coef(model2))
          if (!identical(sort(terms_in), sort(c("(Intercept)", "autonomy", "workload")))) {
            list(pass = FALSE, message = paste0("model2 should have exactly two predictors, autonomy and workload. Yours has: ", paste(setdiff(terms_in, "(Intercept)"), collapse = ", "), ". A star between predictors adds an interaction term as well; a plus sign is what you want here."))
          } else if (!is.numeric(b) || length(b) != 1L) {
            list(pass = FALSE, message = "b_workload should be a single number: filter tidy() to the workload row and pull(estimate).")
          } else if (isTRUE(all.equal(b, exp_autonomy, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That is the autonomy coefficient. tidy() lists the intercept first, so slice(2) is the first predictor, not the second. Filter on the term name instead of the row number.")
          } else if (isTRUE(all.equal(b, alone, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("That is workload's coefficient when it is the only predictor (", round(alone, 3), "). With autonomy in the model it is ", round(exp_workload, 3), " - close, but a different quantity."))
          } else if (!isTRUE(all.equal(b, exp_workload, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("b_workload is ", round(b, 4), " but the workload coefficient of this model is ", round(exp_workload, 4), "."))
          } else {
            list(pass = TRUE, message = paste0("b = ", round(exp_workload, 2), " for workload and ", round(exp_autonomy, 2), " for autonomy. Each is the predicted change in wellbeing for one extra point of that variable among employees who match on the other one."))
          }
        }
      }
    `,
    hints: [
      'Predictors are added with a plus: lm(wellbeing ~ autonomy + workload, data = d).',
      'tidy() now returns three rows: the intercept, autonomy and workload.',
      'filter(term == "workload") %>% pull(estimate) picks the one you want by name rather than by position.',
    ],
  },
  {
    id: 'm10-2-a',
    prompt:
      'Fit autonomy alone, then autonomy alongside workload and tenure_years. Store the autonomy coefficient from the first model in b_simple and from the second in b_adjusted, so you can see how much adding the other predictors moves it.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nb_simple <- \nb_adjusted <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsimple <- lm(wellbeing ~ autonomy, data = d)\nfull <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)\nb_simple <- simple %>% tidy() %>% filter(term == "autonomy") %>% pull(estimate)\nb_adjusted <- full %>% tidy() %>% filter(term == "autonomy") %>% pull(estimate)',
    wrongAnswers: [
      // Both read off the same model: the comparison collapses.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nfull <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)\nb_simple <- full %>% tidy() %>% filter(term == "autonomy") %>% pull(estimate)\nb_adjusted <- full %>% tidy() %>% filter(term == "autonomy") %>% pull(estimate)',
      // The two the wrong way round.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsimple <- lm(wellbeing ~ autonomy, data = d)\nfull <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)\nb_simple <- full %>% tidy() %>% filter(term == "autonomy") %>% pull(estimate)\nb_adjusted <- simple %>% tidy() %>% filter(term == "autonomy") %>% pull(estimate)',
      // A predictor missing from the adjusted model.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsimple <- lm(wellbeing ~ autonomy, data = d)\nfull <- lm(wellbeing ~ autonomy + workload, data = d)\nb_simple <- simple %>% tidy() %>% filter(term == "autonomy") %>% pull(estimate)\nb_adjusted <- full %>% tidy() %>% filter(term == "autonomy") %>% pull(estimate)',
      // Standardised coefficients in the second slot: a different scale, not an adjustment.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsimple <- lm(wellbeing ~ autonomy, data = d)\nz <- lm(scale(wellbeing) ~ scale(autonomy) + scale(workload) + scale(tenure_years), data = d)\nb_simple <- simple %>% tidy() %>% filter(term == "autonomy") %>% pull(estimate)\nb_adjusted <- z %>% tidy() %>% slice(2) %>% pull(estimate)',
    ],
    alternateSolutions: [
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nb_simple <- coef(lm(wellbeing ~ autonomy, data = d))["autonomy"]\nb_adjusted <- coef(lm(wellbeing ~ autonomy + workload + tenure_years, data = d))["autonomy"]',
      // update() builds the second model from the first.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsimple <- lm(wellbeing ~ autonomy, data = d)\nfull <- update(simple, . ~ . + workload + tenure_years)\nb_simple <- coef(simple)[[2]]\nb_adjusted <- full %>% tidy() %>% filter(term == "autonomy") %>% pull(estimate)',
    ],
    check: `
      if (!has_answer("b_simple") || !has_answer("b_adjusted")) {
        list(pass = FALSE, message = "I need both b_simple and b_adjusted.")
      } else {
        b_simple <- as.vector(answer("b_simple"))
        b_adjusted <- as.vector(answer("b_adjusted"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        exp_simple <- as.vector(coef(lm(wellbeing ~ autonomy, data = d))["autonomy"])
        exp_adjusted <- as.vector(coef(lm(wellbeing ~ autonomy + workload + tenure_years, data = d))["autonomy"])
        if (!is.numeric(b_simple) || length(b_simple) != 1L || !is.numeric(b_adjusted) || length(b_adjusted) != 1L) {
          list(pass = FALSE, message = "Both answers should be single numbers.")
        } else if (isTRUE(all.equal(b_simple, b_adjusted, tolerance = 1e-12, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Your two numbers are identical, so they came from the same model. b_simple comes from lm(wellbeing ~ autonomy), b_adjusted from the model that also contains workload and tenure_years.")
        } else if (isTRUE(all.equal(b_simple, exp_adjusted, tolerance = 1e-6, check.attributes = FALSE)) && isTRUE(all.equal(b_adjusted, exp_simple, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You have them the wrong way round. b_simple is from the one-predictor model; b_adjusted is from the model with all three.")
        } else if (!isTRUE(all.equal(b_simple, exp_simple, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("b_simple is ", round(b_simple, 4), " but lm(wellbeing ~ autonomy) gives ", round(exp_simple, 4), "."))
        } else if (!isTRUE(all.equal(b_adjusted, exp_adjusted, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("b_adjusted is ", round(b_adjusted, 4), " but the model with autonomy, workload and tenure_years gives ", round(exp_adjusted, 4), ". Check that all three predictors are in it and that you did not standardise anything - a scaled coefficient is in SD units, which is a change of scale rather than an adjustment."))
        } else {
          list(pass = TRUE, message = paste0("Alone: ", round(exp_simple, 3), ". Alongside workload and tenure: ", round(exp_adjusted, 3), " - a change of ", round(exp_adjusted - exp_simple, 3), ". The coefficient moved because autonomy is not independent of the others; how far it moves is how much of its apparent effect they account for."))
        }
      }
    `,
    hints: [
      'Fit two models and keep both: one with autonomy alone, one with all three predictors.',
      'Pull the autonomy row out of each with filter(term == "autonomy") %>% pull(estimate).',
      'Do not standardise anything. Both numbers should be in the original units.',
    ],
  },
  {
    id: 'm10-2-b',
    prompt:
      'Add remote working to the model. Store the fitted model in model_remote, its remote coefficient in b_remote, and the group means and SDs in remote_means, one row per level of remote. The coefficient and the means have to tell the same story - make sure you can see that they do.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nlevels(d$remote)\n\nmodel_remote <- \nb_remote <- \nremote_means <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ autonomy + workload + remote, data = d)\nb_remote <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(estimate)\nremote_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
    wrongAnswers: [
      // The intercept read as a group mean - the classic categorical-predictor error.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ autonomy + workload + remote, data = d)\nb_remote <- model_remote %>% tidy() %>% slice(1) %>% pull(estimate)\nremote_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
      // The reference level flipped, so the coefficient changes sign.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$remote <- relevel(d$remote, ref = "Yes")\nmodel_remote <- lm(wellbeing ~ autonomy + workload + remote, data = d)\nb_remote <- model_remote %>% tidy() %>% filter(term == "remoteNo") %>% pull(estimate)\nremote_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
      // remote never made it into the model.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ autonomy + workload, data = d)\nb_remote <- model_remote %>% tidy() %>% filter(term == "workload") %>% pull(estimate)\nremote_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
      // The means grouped by the wrong variable.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ autonomy + workload + remote, data = d)\nb_remote <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(estimate)\nremote_means <- d %>%\n  group_by(training) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
    ],
    alternateSolutions: [
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ autonomy + workload + remote, data = d)\nb_remote <- coef(model_remote)["remoteYes"]\nremote_means <- aggregate(wellbeing ~ remote, data = d, FUN = function(x) c(mean = mean(x), sd = sd(x), n = length(x)))',
      // Predictors in a different order, and the means built with across().
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote + autonomy + workload, data = d)\nb_remote <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(estimate)\nremote_means <- d %>%\n  group_by(remote) %>%\n  summarise(across(wellbeing, list(mean = mean, sd = sd)), n = n())',
    ],
    check: `
      if (!has_answer("model_remote") || !has_answer("b_remote") || !has_answer("remote_means")) {
        list(pass = FALSE, message = "I need all three: model_remote, b_remote and remote_means.")
      } else {
        model_remote <- answer("model_remote")
        b <- as.vector(answer("b_remote"))
        means_tbl <- answer("remote_means")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- lm(wellbeing ~ autonomy + workload + remote, data = d)
        exp_b <- as.vector(coef(reference)["remoteYes"])
        intercept <- as.vector(coef(reference)["(Intercept)"])
        raw <- tapply(d$wellbeing, d$remote, mean)
        raw_gap <- as.vector(raw[["Yes"]] - raw[["No"]])
        if (!inherits(model_remote, "lm")) {
          list(pass = FALSE, message = "model_remote is not a fitted linear model.")
        } else if (!("remoteYes" %in% names(coef(model_remote)))) {
          list(pass = FALSE, message = paste0("model_remote has no remoteYes coefficient; its predictors are ", paste(setdiff(names(coef(model_remote)), "(Intercept)"), collapse = ", "), ". Add remote to the formula. R names the coefficient after the level it is NOT using as the reference."))
        } else if (!is.numeric(b) || length(b) != 1L) {
          list(pass = FALSE, message = "b_remote should be a single number.")
        } else if (isTRUE(all.equal(b, intercept, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the intercept (", round(intercept, 2), "). With a factor in the model the intercept is not a group mean either - it is the prediction for the reference level at autonomy = 0 and workload = 0. The remote coefficient is the remoteYes row."))
        } else if (isTRUE(all.equal(b, -exp_b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("Your coefficient has the opposite sign, which happens when the reference level is flipped: you are reporting office-based relative to remote. levels(d$remote) is No then Yes, so the default coefficient is remoteYes: remote minus office-based, which is ", round(exp_b, 2), "."))
        } else if (!isTRUE(all.equal(b, exp_b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("b_remote is ", round(b, 4), " but the remoteYes coefficient is ", round(exp_b, 4), "."))
        } else if (!is.data.frame(means_tbl) || nrow(means_tbl) != 2L) {
          list(pass = FALSE, message = "remote_means should be a two-row table, one row per level of remote. Group by remote, not by another factor.")
        } else {
          group_col <- NULL
          for (nm in names(means_tbl)) {
            if (identical(sort(as.character(unique(means_tbl[[nm]]))), c("No", "Yes"))) group_col <- nm
          }
          if (is.null(group_col)) {
            list(pass = FALSE, message = "remote_means has no column holding the two levels No and Yes. Check which variable you grouped by.")
          } else {
            mean_col <- NULL
            for (nm in names(means_tbl)) {
              value <- means_tbl[[nm]]
              if (is.numeric(value) && length(value) == 2L &&
                  isTRUE(all.equal(sort(as.vector(value)), sort(as.vector(raw)), tolerance = 1e-6, check.attributes = FALSE))) mean_col <- nm
            }
            if (is.null(mean_col)) {
              list(pass = FALSE, message = paste0("No column of remote_means holds the two mean wellbeing scores, which are ", round(raw[["No"]], 1), " for office-based and ", round(raw[["Yes"]], 1), " for remote."))
            } else {
              list(pass = TRUE, message = paste0("b = ", round(exp_b, 2), ": remote employees score ", round(exp_b, 2), " points higher than office-based employees with the same autonomy and workload. The raw gap in the means is ", round(raw_gap, 2), " - the same direction, a different size, because the raw gap does not hold anything constant. When those two disagree in sign, believe the means first and go looking for what changed."))
            }
          }
        }
      }
    `,
    hints: [
      'A factor predictor goes into the formula by name: lm(wellbeing ~ autonomy + workload + remote, data = d).',
      'R names the coefficient after the non-reference level, so look for the term remoteYes in tidy().',
      'group_by(remote) %>% summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n()) gives the descriptives.',
    ],
  },
  {
    id: 'm10-3-a',
    prompt:
      'Get the three numbers an APA report of this model needs. Fit wellbeing on autonomy, workload and tenure_years, then store R-squared in r2, the model F statistic in f_value, and the residual degrees of freedom in df_resid.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel3 <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)\n\nmodel3 %>% glance()\n\nr2 <- \nf_value <- \ndf_resid <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel3 <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)\nr2 <- model3 %>% glance() %>% pull(r.squared)\nf_value <- model3 %>% glance() %>% pull(statistic)\ndf_resid <- model3 %>% glance() %>% pull(df.residual)',
    wrongAnswers: [
      // Adjusted R-squared reported as R-squared.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel3 <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)\nr2 <- model3 %>% glance() %>% pull(adj.r.squared)\nf_value <- model3 %>% glance() %>% pull(statistic)\ndf_resid <- model3 %>% glance() %>% pull(df.residual)',
      // A coefficient t offered as the model F.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel3 <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)\nr2 <- model3 %>% glance() %>% pull(r.squared)\nf_value <- model3 %>% tidy() %>% filter(term == "autonomy") %>% pull(statistic)\ndf_resid <- model3 %>% glance() %>% pull(df.residual)',
      // n reported as the residual df.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel3 <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)\nr2 <- model3 %>% glance() %>% pull(r.squared)\nf_value <- model3 %>% glance() %>% pull(statistic)\ndf_resid <- nrow(d)',
      // The numerator df reported as the residual df.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel3 <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)\nr2 <- model3 %>% glance() %>% pull(r.squared)\nf_value <- model3 %>% glance() %>% pull(statistic)\ndf_resid <- model3 %>% glance() %>% pull(df)',
    ],
    alternateSolutions: [
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel3 <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)\ns <- summary(model3)\nr2 <- s$r.squared\nf_value <- s$fstatistic[["value"]]\ndf_resid <- s$fstatistic[["dendf"]]',
      // df.residual() is its own generic, and glance() is pulled once into a variable.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel3 <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)\nfit <- model3 %>% glance()\nr2 <- fit$r.squared\nf_value <- fit$statistic\ndf_resid <- df.residual(model3)',
    ],
    check: `
      if (!has_answer("r2") || !has_answer("f_value") || !has_answer("df_resid")) {
        list(pass = FALSE, message = "I need all three: r2, f_value and df_resid.")
      } else {
        r2 <- as.vector(answer("r2"))
        f_value <- as.vector(answer("f_value"))
        df_resid <- as.vector(answer("df_resid"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- summary(lm(wellbeing ~ autonomy + workload + tenure_years, data = d))
        exp_r2 <- as.vector(reference$r.squared)
        exp_adj <- as.vector(reference$adj.r.squared)
        exp_f <- as.vector(reference$fstatistic[["value"]])
        exp_num <- as.vector(reference$fstatistic[["numdf"]])
        exp_den <- as.vector(reference$fstatistic[["dendf"]])
        if (!is.numeric(r2) || length(r2) != 1L || !is.numeric(f_value) || length(f_value) != 1L || !is.numeric(df_resid) || length(df_resid) != 1L) {
          list(pass = FALSE, message = "All three should be single numbers.")
        } else if (isTRUE(all.equal(r2, exp_adj, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is adjusted R-squared (", round(exp_adj, 4), "), which discounts R-squared for the number of predictors. glance() has both; pull r.squared, which is ", round(exp_r2, 4), "."))
        } else if (!isTRUE(all.equal(r2, exp_r2, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("r2 is ", round(r2, 4), " but should be ", round(exp_r2, 4), "."))
        } else if (isTRUE(all.equal(f_value^2, exp_f, tolerance = 1e-4, check.attributes = FALSE)) || (exp_f > 60 && abs(f_value) < 30)) {
          list(pass = FALSE, message = paste0("f_value looks like a coefficient's t statistic rather than the model's F. The model F tests all three predictors at once and is in glance()'s statistic column: ", round(exp_f, 2), "."))
        } else if (!isTRUE(all.equal(f_value, exp_f, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("f_value is ", round(f_value, 3), " but the model F is ", round(exp_f, 3), "."))
        } else if (isTRUE(all.equal(df_resid, nrow(d), tolerance = 1e-9, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is n, not the residual degrees of freedom. The model estimates four things (an intercept and three slopes), so df_resid is ", nrow(d), " - 4 = ", exp_den, "."))
        } else if (isTRUE(all.equal(df_resid, exp_num, tolerance = 1e-9, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the numerator df - the number of predictors (", exp_num, "). APA reports F with both: F(", exp_num, ", ", exp_den, ")."))
        } else if (!isTRUE(all.equal(df_resid, exp_den, tolerance = 1e-9, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("df_resid is ", df_resid, " but should be ", exp_den, "."))
        } else {
          list(pass = TRUE, message = paste0("F(", exp_num, ", ", exp_den, ") = ", round(exp_f, 2), ", R-squared = ", round(exp_r2, 3), ". Those are the three numbers the first sentence of an APA regression report needs; the coefficients go in the sentences after it."))
        }
      }
    `,
    hints: [
      'glance() returns one row for the whole model, with r.squared, statistic, p.value and df.residual among its columns.',
      'The model F is the statistic column of glance() - not a t from tidy().',
      'df.residual is n minus the number of estimated coefficients, the intercept included.',
    ],
  },
];
```

> The `f_value` check uses `abs(f_value) < 30` as a second guard rather than an exact comparison with a particular *t*. Any of the three coefficient *t*s is a plausible wrong answer, they change if the dataset is regenerated, and every one of them is far smaller than this model's *F*. The guard names the mistake instead of only reporting a mismatch.

- [x] **Step 3: Write `src/content/lessons/10-1-two-predictors.mdx`**

````mdx
Module 9 ended with a model that accounted for about a fifth of the variance in
wellbeing. That is a fifth explained and four fifths not, and some of those four
fifths are sitting in the dataset in plain sight.

<CodeBlock id="c-load" code={`library(dplyr)
library(broom)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

d %>% summarise(
  n = n(),
  mean_autonomy = mean(autonomy), sd_autonomy = sd(autonomy),
  mean_workload = mean(workload), sd_workload = sd(workload),
  mean_tenure = mean(tenure_years), sd_tenure = sd(tenure_years),
  mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing)
)`} />

## Adding a predictor

One character changes: a plus sign.

<CodeBlock id="c-fit-two" code={`model1 <- lm(wellbeing ~ autonomy, data = d)
model2 <- lm(wellbeing ~ autonomy + workload, data = d)

model2 %>% tidy()`} />

The table now has three rows. Each slope answers the same question it did
before — how much does predicted wellbeing change per unit of this predictor —
with one clause added: **among employees who have the same value on the other
predictor**.

<Predict
  id="p-move"
  question="Compare the autonomy coefficient in model2 with the one in model1. What will have happened to it?"
  choices={[
    { text: 'Exactly the same number: adding a predictor cannot change another one', response: 'It can, and it almost always does. It stays the same only when the two predictors are perfectly uncorrelated.' },
    { text: 'A bit different, because autonomy and workload are not independent of each other', correct: true, response: 'Right. The size of the shift depends on how strongly the two predictors go together in this sample.' },
    { text: 'Reduced to zero, because workload is the real cause', response: 'A coefficient can shrink substantially, but here both predictors carry their own information.' },
  ]}
/>

<CodeBlock id="c-compare" code={`bind_rows(
  model1 %>% tidy() %>% mutate(model = "autonomy only"),
  model2 %>% tidy() %>% mutate(model = "autonomy + workload")
) %>%
  filter(term == "autonomy") %>%
  select(model, term, estimate, std.error)`} />

## Why coefficients move

Fitting `wellbeing ~ autonomy` alone asks: how does wellbeing differ between
employees who differ in autonomy? Those employees also differ in workload,
tenure and everything else, so the answer quietly includes whatever those
differences contribute.

Adding workload to the model asks a narrower question: among employees with the
**same** workload, how does wellbeing differ with autonomy? The coefficient moves
by exactly as much as the answers to those two questions differ.

<CodeBlock id="c-predcor" code={`d %>% summarise(
  r_autonomy_workload = cor(autonomy, workload),
  r_autonomy_tenure = cor(autonomy, tenure_years),
  r_workload_tenure = cor(workload, tenure_years)
)`} />

Predictors that barely correlate with each other barely move each other's
coefficients. Predictors that correlate strongly — above about .8, say — start to
compete for the same variance, their standard errors inflate, and the individual
*b*s become unstable even while the model as a whole fits well. That is
**multicollinearity**, and the first sign of it is a coefficient that flips sign
when you add a variable.

<Exercise id="m10-1-a" />

## A third predictor

<CodeBlock id="c-three" code={`model3 <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)

model3 %>% tidy()
model3 %>% glance() %>% select(r.squared, adj.r.squared, statistic, df, df.residual, p.value)`} />

*R*² can only rise when you add a predictor, even a useless one — it is the share
of variance the fitted model accounts for, and an extra column always lets the
fit wriggle a little closer. **Adjusted *R*²** subtracts a penalty for each
predictor, so it can fall. When the two are far apart you have paid for
predictors that bought you nothing.

<Quiz
  id="q-adding"
  question="You add a predictor that is pure noise, unrelated to everything. What happens?"
  choices={[
    { text: 'R-squared falls slightly and adjusted R-squared falls more', response: 'R-squared cannot fall when a predictor is added. It rises, if only by a rounding error.' },
    { text: 'R-squared rises slightly; adjusted R-squared falls', correct: true, response: 'Correct, and that gap is exactly what adjusted R-squared exists to show you.' },
    { text: 'Both stay exactly the same', response: 'Only if the noise variable were perfectly uncorrelated with the residuals in this sample, which never quite happens.' },
    { text: 'The model becomes invalid', response: 'It stays a valid model. It is just a slightly worse one, and adjusted R-squared is how it tells you so.' },
  ]}
/>

<Interpret
  id="i-10-1"
  question="In a model with autonomy alone the autonomy slope is b = 2.24; with workload added it is b = 2.31. A colleague writes: 'Adding workload proved that autonomy has a causal effect of 2.31 on wellbeing.' Which reading is right?"
  choices={[
    { text: 'The colleague is right: controlling for workload removes the confounding.', response: 'Adjusting for one measured variable removes that variable, not confounding in general. Everything unmeasured is still in there.' },
    { text: 'With workload in the model, b = 2.31 is the predicted difference in wellbeing per point of autonomy among employees with the same workload. It is an adjusted association, not a causal effect, because workload is the only confounder that has been accounted for.', correct: true, response: 'Correct. "Holding constant" is arithmetic about this model and these variables, not a substitute for an experiment.' },
    { text: 'The coefficient barely changed, so autonomy and workload measure the same thing.', response: 'A coefficient that barely moves means the two predictors are close to independent - the opposite of measuring the same thing.' },
    { text: 'The change from 2.24 to 2.31 means workload suppresses the effect of autonomy, which should be reported as the main finding.', response: 'A shift that small is not a finding on its own. Report both coefficients and let the reader see the shift.' },
  ]}
/>
````

- [x] **Step 4: Write `src/content/lessons/10-2-holding-constant.mdx`**

````mdx
"Holding the others constant" is the phrase that makes multiple regression
useful and the phrase that gets students into trouble. This lesson earns it and
then fences it in.

<CodeBlock id="c-load" code={`library(dplyr)
library(broom)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

model3 <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)
model3 %>% tidy()`} />

## What the phrase means arithmetically

Take the workload coefficient. Here is the same number, computed a completely
different way: strip autonomy and tenure out of both workload and wellbeing, then
regress what is left of one on what is left of the other.

<CodeBlock id="c-partial" code={`resid_wellbeing <- residuals(lm(wellbeing ~ autonomy + tenure_years, data = d))
resid_workload  <- residuals(lm(workload ~ autonomy + tenure_years, data = d))

coef(lm(resid_wellbeing ~ resid_workload))[2]
coef(model3)["workload"]`} />

Those two numbers agree. That is what a multiple regression coefficient *is*: the
relationship between the parts of the outcome and the predictor that the other
predictors cannot account for. Nothing was held fixed in the world; something
was subtracted out on paper.

<Predict
  id="p-holding"
  question="The model says b = -3.09 for workload, holding autonomy and tenure constant. Which claim does that licence?"
  choices={[
    { text: 'Cutting the workload of an employee by one point would raise their wellbeing by about 3 points', response: 'That is a claim about an intervention. This design observed employees; it never changed the workload of anyone.' },
    { text: 'Among employees with the same autonomy and tenure, one point more workload goes with about 3 points less wellbeing', correct: true, response: 'Exactly - a comparison between people, in the data as collected.' },
    { text: 'Workload is three times as important as autonomy', response: 'The two are on the same 1-10 scale here, so the sizes are comparable, but "three times as important" is not what a ratio of slopes measures.' },
  ]}
/>

## Seeing the coefficient move

<Exercise id="m10-2-a" />

## A factor among the predictors

Predictors do not have to be numbers. Put a two-level factor in the formula and
`lm()` codes it for you.

<CodeBlock id="c-remote" code={`levels(d$remote)

model_remote <- lm(wellbeing ~ autonomy + workload + remote, data = d)
model_remote %>% tidy()`} />

The coefficient is called `remoteYes`, not `remote`. R took the first level —
`No` — as the **reference**, and the coefficient is how much the other level
differs from it. Module 11 is about nothing else; for now, notice that a factor
costs one coefficient per level beyond the first.

And look at the means beside it, every time:

<CodeBlock id="c-remote-means" code={`d %>%
  group_by(remote) %>%
  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())`} />

The raw gap between those two means and the `remoteYes` coefficient are different
numbers, and they should be: the coefficient is the gap among employees matched
on autonomy and workload, the raw means are the gap among everybody. If they ever
point in **opposite** directions, something important is going on — the
adjustment has reversed the comparison — and you report both, not just the one
you prefer.

<Exercise id="m10-2-b" />

## What the phrase does not mean

1. **Not causal.** Adjusting for workload removes workload. It does nothing about
   the confounders you did not measure, and in this study that is most of them.
2. **Not an intervention.** "If we reduced workload" is a claim about a world
   where somebody acted. This model describes a world where nobody did.
3. **Not a licence to add everything.** Adjusting for a variable that sits
   *between* the predictor and the outcome on the causal path removes part of the
   very effect you are trying to see.

<Quiz
  id="q-controlling"
  question="You are studying whether autonomy predicts performance, and you add engagement_t2 to the model as a control. Engagement is plausibly one of the ways autonomy improves performance. What have you done?"
  choices={[
    { text: 'Improved the model by removing a confounder', response: 'A confounder causes both the predictor and the outcome. Engagement here is caused by the predictor, which is a different animal.' },
    { text: 'Removed part of the effect you were trying to measure, because you adjusted for a variable on the causal path', correct: true, response: 'Correct. Adjusting for a mediator answers "the effect of autonomy other than through engagement", which is rarely the question asked.' },
    { text: 'Nothing: extra predictors are always safe', response: 'They are not. Which variables to adjust for is a question about causal structure, and no statistic in the output can answer it for you.' },
    { text: 'Created multicollinearity, which invalidates the model', response: 'The correlation involved is nowhere near high enough for that, and the problem here is not collinearity but what the adjustment means.' },
  ]}
/>

<Interpret
  id="i-10-2"
  question="Your model gives, for remote working, b = 1.87, SE = 0.52, t(476) = 3.60, p < .001, with autonomy and workload also in the model. Which sentence reports it correctly?"
  choices={[
    { text: 'Remote working caused a 1.87-point increase in wellbeing, b = 1.87, SE = 0.52, t(476) = 3.60, p < .001.', response: 'Employees were not assigned to remote working; they chose it or their role imposed it. The statistics are right and the verb is not.' },
    { text: 'Controlling for autonomy and workload, remote employees reported higher wellbeing than office-based employees, b = 1.87, SE = 0.52, t(476) = 3.60, p < .001.', correct: true, response: 'Correct: the comparison is named, the reference group is explicit, and "reported higher" stays at the level the design supports.' },
    { text: 'Remote working was significantly associated with wellbeing, p < .001.', response: 'A p value alone is not a report. The reader cannot tell the direction, the size or the precision from this sentence.' },
    { text: 'Remote employees scored 1.87 points higher on wellbeing than office-based employees, b = 1.87, SE = 0.52, t(476) = 3.60, p < .001.', response: 'This drops the adjustment. 1.87 is the difference among employees matched on autonomy and workload, not the raw difference between the two groups.' },
  ]}
/>
````

- [x] **Step 5: Write `src/content/lessons/10-3-model-fit-and-reporting.mdx`**

````mdx
Two models, two questions. Does the set of predictors, taken together, do better
than nothing? And does each predictor pull its weight? The first is the model *F*
test; the second is the coefficient table.

<CodeBlock id="c-fit" code={`library(dplyr)
library(broom)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

model3 <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)

model3 %>% glance() %>% select(r.squared, adj.r.squared, sigma, statistic, df, df.residual, p.value)`} />

- **`statistic`** is *F*, and **`df`** and **`df.residual`** are its two degrees
  of freedom: the number of predictors, and *n* minus the number of estimated
  coefficients. APA writes them together: *F*(3, 476).
- Its null hypothesis is that **every** slope is zero at once. Rejecting it says
  at least one predictor is doing something, and nothing about which.
- **`sigma`** is the residual SD — the typical miss, in points of wellbeing.
  Compare it with the SD of wellbeing itself to see how much the model bought.

<CodeBlock id="c-sigma" code={`c(
  sd_wellbeing = sd(d$wellbeing),
  residual_sd = glance(model3)$sigma
)`} />

<Predict
  id="p-f"
  question="The model F is highly significant, but one of the three coefficients has p = .38. What follows?"
  choices={[
    { text: 'The model is invalid and the non-significant predictor must be removed', response: 'Neither. The F test and the individual t tests answer different questions, and dropping predictors by their p values is a good way to get an unreplicable model.' },
    { text: 'The predictors together account for variance, and that one predictor adds little once the others are in the model', correct: true, response: 'Right, and the second half is the careful phrasing: a coefficient is always conditional on the rest of the model.' },
    { text: 'That predictor has no relationship with wellbeing', response: 'A non-significant coefficient is not evidence of no relationship. It may correlate with the outcome perfectly well on its own and share that variance with another predictor.' },
  ]}
/>

<Exercise id="m10-3-a" />

## Comparing two models directly

When one model's predictors are a subset of another's, `anova()` tests whether
the extra ones are worth their degrees of freedom.

<CodeBlock id="c-nested" code={`small <- lm(wellbeing ~ autonomy, data = d)
large <- lm(wellbeing ~ autonomy + workload + tenure_years, data = d)

anova(small, large) %>% tidy()

bind_rows(
  small %>% glance() %>% mutate(model = "autonomy"),
  large %>% glance() %>% mutate(model = "autonomy + workload + tenure")
) %>% select(model, r.squared, adj.r.squared, sigma)`} />

The *F* in that table tests the increase in *R*² against what you would expect
from adding two arbitrary predictors. This is the same machinery Module 12 uses
to test an interaction: fit with, fit without, compare.

## The APA report

A multiple regression is reported in two moves. First the model:

> A multiple linear regression with autonomy, workload and tenure as predictors
> accounted for a significant share of the variance in wellbeing, *F*(3, 476) =
> 61.42, *p* < .001, *R*² = .279, adjusted *R*² = .274.

Then each coefficient, with its *SE*, *t* and *p*, and a sentence saying what it
means in the units of the study. Conventions worth getting right the first time:

- Drop the leading zero from statistics that cannot exceed 1: *p* = .032,
  *R*² = .279. Keep it where a value can: *b* = 0.35.
- Two decimals for *b*, *SE*, *t* and *F*; three for *p*, down to *p* < .001.
- Never *p* = .000.
- Report *b* and its *SE* or its 95 % CI, not a *p* value on its own.
- Say "was associated with", not "caused" or "led to", unless something was
  randomised.

<CodeBlock id="c-ci" code={`model3 %>% tidy(conf.int = TRUE) %>% select(term, estimate, std.error, statistic, p.value, conf.low, conf.high)`} />

<Quiz
  id="q-apa"
  question="Which of these is written correctly for an APA 7 results section?"
  choices={[
    { text: 'F(3, 476) = 61.42, p = .000, R2 = 0.279', response: 'Three errors: p is never .000, R-squared drops its leading zero, and the superscript matters.' },
    { text: 'F(3, 476) = 61.42, p < .001, R-squared = .279', correct: true, response: 'Correct: both degrees of freedom, p at its floor, and no leading zero on a statistic bounded by 1.' },
    { text: 'F(476) = 61.42, p < .001, R-squared = .279', response: 'An F test has two degrees of freedom and both are reported.' },
    { text: 'The regression was significant (p < .05).', response: 'No statistics, no degrees of freedom, no effect size. A reader can do nothing with this.' },
  ]}
/>

<Interpret
  id="i-10-3"
  question="Your model gives F(3, 476) = 61.42, p < .001, R-squared = .279; autonomy b = 2.31, SE = 0.20, t = 11.55, p < .001; workload b = -3.09, SE = 0.28, t = -11.04, p < .001; tenure b = 0.09, SE = 0.10, t = 0.90, p = .368. Which write-up is correct?"
  choices={[
    { text: 'The three predictors accounted for a significant share of the variance in wellbeing, F(3, 476) = 61.42, p < .001, R-squared = .279. Autonomy (b = 2.31, SE = 0.20, t = 11.55, p < .001) and workload (b = -3.09, SE = 0.28, t = -11.04, p < .001) were each associated with wellbeing, whereas tenure was not once the other two were in the model (b = 0.09, SE = 0.10, t = 0.90, p = .368).', correct: true, response: 'Correct. Every coefficient is reported, including the non-significant one, and "once the other two were in the model" keeps its claim conditional.' },
    { text: '... Tenure had no effect on wellbeing (p = .368).', response: 'A p of .368 does not establish the absence of an effect. Its confidence interval almost certainly includes values that would matter.' },
    { text: '... The model explains 27.9 % of employees, F(3, 476) = 61.42, p < .001.', response: 'R-squared is a share of variance, not a share of people.' },
    { text: 'Autonomy was the strongest predictor of wellbeing because it had the largest t value, t = 11.55.', response: 'Workload actually has the larger coefficient on the same scale, and a t value compares an estimate with its own precision - it does not rank importance.' },
  ]}
/>
````

- [x] **Step 6: Add Module 10 assertions to `src/content/exercises/index.test.ts`**

```ts
describe('Module 10', () => {
  const module10 = ALL_EXERCISES.filter((exercise) => exercise.id.startsWith('m10-'));

  test('defines all four exercises', () => {
    expect(module10.map((exercise) => exercise.id)).toEqual([
      'm10-1-a', 'm10-2-a', 'm10-2-b', 'm10-3-a',
    ]);
  });

  test('every solution fits a model with more than one predictor', () => {
    // A Module 10 exercise that can be answered from a simple regression is a
    // Module 9 exercise with a different id.
    for (const exercise of module10) {
      expect(exercise.solution, `${exercise.id}`).toMatch(/lm\([^)]*~[^)]*\+/);
    }
  });

  test('at least one exercise pairs a coefficient with group descriptives', () => {
    // Spec 7.1: every model lesson shows the means beside the model.
    const withMeans = module10.filter((exercise) => /group_by\(/.test(exercise.solution));
    expect(withMeans.map((exercise) => exercise.id)).toContain('m10-2-b');
  });
});
```

- [x] **Step 7: Run the static content tests**

Run: `npx vitest run src/content/content.test.ts src/content/exercises/index.test.ts`
Expected: PASS, with `MODULES` now containing Modules 6, 9 and 10, and `10-1`, `10-2`, `10-3` each carrying an `<Interpret>`.

- [x] **Step 8: Run the R validator over Module 10**

Run: `npx vitest run src/content/exercises/validate.itest.ts -t "m10-"`
Expected: four solutions pass, fifteen wrong answers all reported as `fail` (never `student-error`), nine alternate solutions pass.

Then: `npx vitest run src/content/exercises/validate.itest.ts -t "10-"` for the lesson code blocks. Expected: no R error. Watch `10-2`'s residual-on-residual block in particular — it fits three models in one block and is the slowest block in the module.

- [ ] **Step 9: Verify Module 10 in the browser**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/10-2`.
Expected: `coef(lm(resid_wellbeing ~ resid_workload))[2]` and `coef(model3)["workload"]` print the same number to every digit shown — this is the block that makes "holding constant" concrete and it is worth watching run. `tidy(conf.int = TRUE)` in `10-3` prints `conf.low` and `conf.high` without a warning. All four exercises accept their solution and reject a deliberately wrong answer with a message that names the mistake.

- [x] **Step 10: Commit**

```bash
git add src/content/manifest.ts src/content/exercises/module-10.ts src/content/exercises/index.test.ts src/content/lessons/10-1-two-predictors.mdx src/content/lessons/10-2-holding-constant.mdx src/content/lessons/10-3-model-fit-and-reporting.mdx
git commit -m "feat: Module 10, multiple regression"
```

---

### Task M11: Categorical predictors

**Files:**
- Create: `src/content/lessons/11-1-two-groups.mdx`, `src/content/lessons/11-2-dummy-coding.mdx`, `src/content/lessons/11-3-pairwise-comparisons.mdx`
- Modify: `src/content/manifest.ts` (`PLANNED_MODULES`), `src/content/exercises/module-11.ts`, `src/content/exercises/index.test.ts`
- Test: `src/content/content.test.ts`, `src/content/exercises/index.test.ts`, `src/content/exercises/validate.itest.ts`

**Interfaces:**
- Consumes: `ExerciseDef`; `data/workplace.csv`; `emmeans`, which lesson `11-3` declares and content-platform P1 installs on demand — the first on-demand install a student meets, so `RStatus` must show the pill (content-platform P1 step 6) or the lesson looks frozen for the thirty seconds the download takes.
- Produces: `module11: ExerciseDef[]` with ids `m11-1-a`, `m11-1-b`, `m11-2-a`, `m11-2-b`, `m11-3-a`; three lesson files; `module-11` live in `MODULES`.

This is the module spec §7.1 is aimed at. A student who has been taught the *t*-test and ANOVA as separate procedures has to see, in running code, that `lm` reproduces both — the same *t*, the same *p*, the same *F* — before "one model, many names" is anything more than a slogan. Two rules make or break it: `t.test` needs `var.equal = TRUE` to match the model, and `t.test(y ~ g)` subtracts the groups the other way round from `lm`, so the *t*s match in size and differ in sign. Both are taught explicitly rather than smoothed over.

The reference level is alphabetical. `remote` has levels `No`, `Yes`, so the coefficient is `remoteYes`. `department` has levels `Engineering`, `Marketing`, `Sales`, `Support`, so **Engineering is the reference** and there is no `departmentEngineering` coefficient at all. Checks derive this with `levels(d$department)[1]` rather than assuming it.

- [x] **Step 1: Add the Module 11 entry to `PLANNED_MODULES`**

```ts
  {
    id: 'module-11',
    number: 11,
    title: 'Categorical predictors',
    lessons: [
      {
        id: '11-1',
        title: 'Two groups',
        file: '11-1-two-groups',
        exercises: ['m11-1-a', 'm11-1-b'],
        packages: ['broom', 'dplyr'],
      },
      {
        id: '11-2',
        title: 'Three or more, and dummy coding',
        file: '11-2-dummy-coding',
        exercises: ['m11-2-a', 'm11-2-b'],
        packages: ['broom', 'dplyr'],
      },
      {
        id: '11-3',
        title: 'Which groups differ',
        file: '11-3-pairwise-comparisons',
        exercises: ['m11-3-a'],
        packages: ['broom', 'emmeans'],
      },
    ],
  },
```

- [x] **Step 2: Write `src/content/exercises/module-11.ts`**

```ts
import type { ExerciseDef } from '../../r/checker';

export const module11: ExerciseDef[] = [
  {
    id: 'm11-1-a',
    prompt:
      'Fit wellbeing on remote as the only predictor. Store the model in model_remote, the remote coefficient in b_remote, and the two group means, SDs and group sizes in group_means. Then satisfy yourself that b_remote is exactly the difference between the two means in your table, in that order.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nlevels(d$remote)\n\nmodel_remote <- \nb_remote <- \ngroup_means <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nb_remote <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(estimate)\ngroup_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
    wrongAnswers: [
      // The intercept read as the effect. It is the reference group's mean.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nb_remote <- model_remote %>% tidy() %>% slice(1) %>% pull(estimate)\ngroup_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
      // The difference taken the other way round: office-based minus remote.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nb_remote <- mean(d$wellbeing[d$remote == "No"]) - mean(d$wellbeing[d$remote == "Yes"])\ngroup_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
      // A different predictor entirely.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ autonomy, data = d)\nb_remote <- model_remote %>% tidy() %>% slice(2) %>% pull(estimate)\ngroup_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
      // The table grouped by the wrong factor, so it cannot check the coefficient.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nb_remote <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(estimate)\ngroup_means <- d %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
    ],
    alternateSolutions: [
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nb_remote <- coef(model_remote)[["remoteYes"]]\ngroup_means <- aggregate(wellbeing ~ remote, data = d, FUN = function(x) c(mean = mean(x), sd = sd(x), n = length(x)))',
      // The coefficient computed from the means instead of read off the model.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\ngroup_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())\nb_remote <- group_means$mean_wellbeing[group_means$remote == "Yes"] - group_means$mean_wellbeing[group_means$remote == "No"]',
    ],
    check: `
      if (!has_answer("model_remote") || !has_answer("b_remote") || !has_answer("group_means")) {
        list(pass = FALSE, message = "I need all three: model_remote, b_remote and group_means.")
      } else {
        model_remote <- answer("model_remote")
        b <- as.vector(answer("b_remote"))
        tbl <- answer("group_means")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- lm(wellbeing ~ remote, data = d)
        exp_b <- as.vector(coef(reference)["remoteYes"])
        intercept <- as.vector(coef(reference)["(Intercept)"])
        raw <- tapply(d$wellbeing, d$remote, mean)
        if (!inherits(model_remote, "lm")) {
          list(pass = FALSE, message = "model_remote is not a fitted linear model.")
        } else if (!("remoteYes" %in% names(coef(model_remote)))) {
          list(pass = FALSE, message = paste0("model_remote has no remoteYes coefficient; its predictors are ", paste(setdiff(names(coef(model_remote)), "(Intercept)"), collapse = ", "), ". The predictor for this exercise is remote."))
        } else if (!is.numeric(b) || length(b) != 1L) {
          list(pass = FALSE, message = "b_remote should be a single number.")
        } else if (isTRUE(all.equal(b, intercept, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the intercept, ", round(intercept, 2), ", which with a single two-level factor is the mean of the reference group - office-based employees. It is not the difference between the groups, and it is not the grand mean, which is ", round(mean(d$wellbeing), 2), "."))
        } else if (isTRUE(all.equal(b, -exp_b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("Right size, wrong direction. levels(d$remote) is No then Yes, so R takes No as the reference and remoteYes is Yes minus No, which is ", round(exp_b, 2), ". You have computed No minus Yes."))
        } else if (!isTRUE(all.equal(b, exp_b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("b_remote is ", round(b, 4), " but the remoteYes coefficient is ", round(exp_b, 4), "."))
        } else if (!is.data.frame(tbl) || nrow(tbl) != 2L) {
          list(pass = FALSE, message = "group_means should have exactly two rows, one for each level of remote. Check which variable you grouped by.")
        } else {
          has_levels <- FALSE
          for (nm in names(tbl)) {
            if (identical(sort(as.character(unique(tbl[[nm]]))), c("No", "Yes"))) has_levels <- TRUE
          }
          if (!has_levels) {
            list(pass = FALSE, message = "group_means has no column holding the levels No and Yes, so it is not grouped by remote.")
          } else {
            list(pass = TRUE, message = paste0("Intercept ", round(intercept, 2), " is the office-based mean (", round(raw[["No"]], 2), "), and b = ", round(exp_b, 2), " carries you to the remote mean (", round(raw[["Yes"]], 2), "). With one two-level factor and nothing else in the model, the coefficients are the group means rewritten."))
          }
        }
      }
    `,
    hints: [
      'A factor goes into the formula by name: lm(wellbeing ~ remote, data = d).',
      'levels(d$remote) shows which level R will use as the reference - the first one.',
      'The coefficient is named after the other level, so filter(term == "remoteYes").',
    ],
  },
  {
    id: 'm11-1-b',
    prompt:
      'Show that the model reproduces the independent-samples t-test. Store the t statistic for remoteYes from the model in t_model, and the t statistic from the equal-variance t-test in t_ttest. The two should be identical in size. Work out for yourself why the signs differ.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\n\nt_model <- \n# t.test defaults to Welch, which does NOT match the model. Ask for the pooled version.\nt_ttest <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(statistic)\nt_ttest <- t.test(wellbeing ~ remote, data = d, var.equal = TRUE)$statistic',
    wrongAnswers: [
      // Welch: close, and not the same test.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(statistic)\nt_ttest <- t.test(wellbeing ~ remote, data = d)$statistic',
      // The intercept row read as the group comparison.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- model_remote %>% tidy() %>% slice(1) %>% pull(statistic)\nt_ttest <- t.test(wellbeing ~ remote, data = d, var.equal = TRUE)$statistic',
      // The p value handed in where the t statistic was asked for.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(p.value)\nt_ttest <- t.test(wellbeing ~ remote, data = d, var.equal = TRUE)$p.value',
      // A paired test on two unrelated groups of different sizes would error, so
      // instead: the one-sample test against zero, which runs and means nothing here.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(statistic)\nt_ttest <- t.test(d$wellbeing)$statistic',
    ],
    alternateSolutions: [
      // Base R on both sides.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- summary(model_remote)$coefficients["remoteYes", "t value"]\nt_ttest <- t.test(d$wellbeing[d$remote == "No"], d$wellbeing[d$remote == "Yes"], var.equal = TRUE)$statistic',
      // The t-test written with the groups the other way round, which flips its
      // sign back into agreement with the model. Still a correct answer to the ask.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(statistic)\nt_ttest <- t.test(d$wellbeing[d$remote == "Yes"], d$wellbeing[d$remote == "No"], var.equal = TRUE)$statistic',
    ],
    check: `
      if (!has_answer("t_model") || !has_answer("t_ttest")) {
        list(pass = FALSE, message = "I need both t_model and t_ttest.")
      } else {
        t_model <- as.vector(answer("t_model"))
        t_ttest <- as.vector(answer("t_ttest"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- summary(lm(wellbeing ~ remote, data = d))
        exp_t <- as.vector(reference$coefficients["remoteYes", "t value"])
        int_t <- as.vector(reference$coefficients["(Intercept)", "t value"])
        welch <- as.vector(t.test(wellbeing ~ remote, data = d)$statistic)
        if (!is.numeric(t_model) || length(t_model) != 1L || !is.numeric(t_ttest) || length(t_ttest) != 1L) {
          list(pass = FALSE, message = "Both should be single numbers.")
        } else if (isTRUE(all.equal(t_model, int_t, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "t_model is the intercept's t, which tests whether the office-based mean differs from zero - true of every wellbeing score in the study and of no interest. Filter tidy() to the remoteYes row.")
        } else if (abs(t_model) < 1e-3 || abs(t_ttest) < 1e-3) {
          list(pass = FALSE, message = "One of your two values looks like a p value rather than a t statistic. In tidy() the t is the statistic column; from t.test() it is the $statistic element.")
        } else if (!isTRUE(all.equal(abs(t_model), abs(exp_t), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("t_model is ", round(t_model, 4), " but the remoteYes t is ", round(exp_t, 4), "."))
        } else if (isTRUE(all.equal(abs(t_ttest), abs(welch), tolerance = 1e-9, check.attributes = FALSE)) && !isTRUE(all.equal(abs(welch), abs(exp_t), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is Welch's t (", round(welch, 4), "), which t.test() runs by default. Welch does not pool the two variances, so it is not the test the linear model runs. Add var.equal = TRUE and you get ", round(exp_t, 4), "."))
        } else if (!isTRUE(all.equal(abs(t_ttest), abs(exp_t), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("t_ttest is ", round(t_ttest, 4), " but the equal-variance t-test on wellbeing by remote gives ", round(abs(exp_t), 4), " in size. Check that you compared the two remote groups and not something else."))
        } else {
          same_sign <- if (t_model * t_ttest > 0) "the same sign" else "opposite signs"
          list(pass = TRUE, message = paste0("Both are ", round(abs(exp_t), 4), " in size, and yours have ", same_sign, ". t.test(y ~ g) subtracts the first level from the second, and lm codes the second relative to the first, so the sign flips whenever you write them in that order. The test is the same test; only the direction of the subtraction differs."))
        }
      }
    `,
    hints: [
      'The model t is the statistic column of the remoteYes row in tidy().',
      't.test(wellbeing ~ remote, data = d, var.equal = TRUE) runs the pooled-variance test; without var.equal you get Welch, which is a different test.',
      'The result of t.test() is a list; its t statistic is in $statistic.',
    ],
  },
  {
    id: 'm11-2-a',
    prompt:
      'Fit wellbeing on department, which has four levels. Store the model in model_dept, the name of the level R used as the reference in reference_level, and the coefficient for the Support department in b_support.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nlevels(d$department)\n\nmodel_dept <- \nreference_level <- \nb_support <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nreference_level <- levels(d$department)[1]\nb_support <- model_dept %>% tidy() %>% filter(term == "departmentSupport") %>% pull(estimate)',
    wrongAnswers: [
      // The intercept read as Support's mean - the named mistake of this module.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nreference_level <- levels(d$department)[1]\nb_support <- model_dept %>% tidy() %>% slice(1) %>% pull(estimate)',
      // The Support group mean offered as the coefficient.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nreference_level <- levels(d$department)[1]\nb_support <- mean(d$wellbeing[d$department == "Support"])',
      // The reference guessed rather than read off the factor.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nreference_level <- "Support"\nb_support <- model_dept %>% tidy() %>% filter(term == "departmentSupport") %>% pull(estimate)',
      // department treated as a number, which collapses four groups into one slope.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$department_num <- as.numeric(d$department)\nmodel_dept <- lm(wellbeing ~ department_num, data = d)\nreference_level <- levels(d$department)[1]\nb_support <- model_dept %>% tidy() %>% slice(2) %>% pull(estimate)',
    ],
    alternateSolutions: [
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nreference_level <- levels(d$department)[[1]]\nb_support <- coef(model_dept)["departmentSupport"]',
      // The reference recovered from the model rather than from the data.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nreference_level <- model_dept$xlevels$department[1]\nb_support <- model_dept %>% tidy() %>% filter(term == "departmentSupport") %>% pull(estimate)',
    ],
    check: `
      if (!has_answer("model_dept") || !has_answer("reference_level") || !has_answer("b_support")) {
        list(pass = FALSE, message = "I need all three: model_dept, reference_level and b_support.")
      } else {
        model_dept <- answer("model_dept")
        ref <- as.vector(answer("reference_level"))
        b <- as.vector(answer("b_support"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- lm(wellbeing ~ department, data = d)
        exp_ref <- levels(d$department)[1]
        exp_b <- as.vector(coef(reference)["departmentSupport"])
        intercept <- as.vector(coef(reference)["(Intercept)"])
        means <- tapply(d$wellbeing, d$department, mean)
        if (!inherits(model_dept, "lm")) {
          list(pass = FALSE, message = "model_dept is not a fitted linear model.")
        } else if (length(coef(model_dept)) != 4L || !("departmentSupport" %in% names(coef(model_dept)))) {
          list(pass = FALSE, message = paste0("A four-level factor costs three coefficients plus an intercept, so the model should have four in all. Yours has ", length(coef(model_dept)), ": ", paste(names(coef(model_dept)), collapse = ", "), ". If you converted department to a number, R fitted one straight line across four labels whose order carries no meaning."))
        } else if (!is.character(ref) || length(ref) != 1L) {
          list(pass = FALSE, message = "reference_level should be a single piece of text: the name of the level R left out of the coefficient list.")
        } else if (!identical(ref, exp_ref)) {
          list(pass = FALSE, message = paste0("reference_level is \\"", ref, "\\", but R takes the FIRST level of the factor, which is \\"", exp_ref, "\\". Factor levels are alphabetical unless you change them, and the reference is the one with no coefficient of its own."))
        } else if (!is.numeric(b) || length(b) != 1L) {
          list(pass = FALSE, message = "b_support should be a single number.")
        } else if (isTRUE(all.equal(b, intercept, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the intercept, ", round(intercept, 2), ". With one factor and nothing else in the model the intercept is the mean of the reference department (", exp_ref, "), not of Support and not of everybody."))
        } else if (isTRUE(all.equal(b, as.vector(means[["Support"]]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is Support's own mean (", round(means[["Support"]], 2), "). The coefficient is a difference: Support's mean minus the reference department's, which is ", round(exp_b, 2), "."))
        } else if (!isTRUE(all.equal(b, exp_b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("b_support is ", round(b, 4), " but the departmentSupport coefficient is ", round(exp_b, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("The reference is ", exp_ref, ", whose mean is the intercept, ", round(intercept, 2), ". b = ", round(exp_b, 2), " for Support means its mean is ", round(means[["Support"]], 2), ". Every coefficient in this model is a comparison with ", exp_ref, " - so none of them compares Marketing with Sales, which is what lesson 11-3 is for."))
        }
      }
    `,
    hints: [
      'levels(d$department) lists the levels in the order R uses; the first is the reference.',
      'lm(wellbeing ~ department, data = d) produces three coefficients for four groups.',
      'The coefficient names are the factor name glued to the level name: departmentSupport.',
    ],
  },
  {
    id: 'm11-2-b',
    prompt:
      'Build dept_summary: one row per department with the mean, the median, the SD and the n of wellbeing. Then store in top_by_median the name of the department with the highest MEDIAN wellbeing. It is not the department with the highest mean, and working out why is the point of the exercise.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\ndept_summary <- \ntop_by_median <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- d %>%\n  group_by(department) %>%\n  summarise(\n    mean_wellbeing = mean(wellbeing),\n    median_wellbeing = median(wellbeing),\n    sd_wellbeing = sd(wellbeing),\n    n = n()\n  )\ntop_by_median <- dept_summary %>%\n  arrange(desc(median_wellbeing)) %>%\n  slice(1) %>%\n  pull(department) %>%\n  as.character()',
    wrongAnswers: [
      // Sorted on the mean instead of the median: the whole trap.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- d %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), sd_wellbeing = sd(wellbeing), n = n())\ntop_by_median <- dept_summary %>%\n  arrange(desc(mean_wellbeing)) %>%\n  slice(1) %>%\n  pull(department) %>%\n  as.character()',
      // The table has no median column at all.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- d %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())\ntop_by_median <- dept_summary %>%\n  arrange(desc(mean_wellbeing)) %>%\n  slice(1) %>%\n  pull(department) %>%\n  as.character()',
      // Grouped by site rather than department.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- d %>%\n  group_by(site) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), sd_wellbeing = sd(wellbeing), n = n())\ntop_by_median <- dept_summary %>%\n  arrange(desc(median_wellbeing)) %>%\n  slice(1) %>%\n  pull(site) %>%\n  as.character()',
      // The lowest median rather than the highest.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- d %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), sd_wellbeing = sd(wellbeing), n = n())\ntop_by_median <- dept_summary %>%\n  arrange(median_wellbeing) %>%\n  slice(1) %>%\n  pull(department) %>%\n  as.character()',
    ],
    alternateSolutions: [
      // Base R throughout.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- aggregate(wellbeing ~ department, data = d,\n  FUN = function(x) c(mean = mean(x), median = median(x), sd = sd(x), n = length(x)))\nmedians <- tapply(d$wellbeing, d$department, median)\ntop_by_median <- names(which.max(medians))',
      // which.max() on the summarised column instead of arrange() + slice().
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- d %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), sd_wellbeing = sd(wellbeing), n = n())\ntop_by_median <- as.character(dept_summary$department[which.max(dept_summary$median_wellbeing)])',
    ],
    check: `
      if (!has_answer("dept_summary") || !has_answer("top_by_median")) {
        list(pass = FALSE, message = "I need both dept_summary and top_by_median.")
      } else {
        tbl <- answer("dept_summary")
        top <- as.vector(answer("top_by_median"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        means <- tapply(d$wellbeing, d$department, mean)
        medians <- tapply(d$wellbeing, d$department, median)
        exp_top <- names(which.max(medians))
        exp_top_mean <- names(which.max(means))
        if (!is.data.frame(tbl) || nrow(tbl) != nlevels(d$department)) {
          list(pass = FALSE, message = paste0("dept_summary should have one row per department, so ", nlevels(d$department), " rows. Yours has ", if (is.data.frame(tbl)) nrow(tbl) else 0, ". Check which variable you grouped by."))
        } else {
          has_median <- FALSE
          for (nm in names(tbl)) {
            value <- tbl[[nm]]
            if (is.numeric(value) && length(value) == nrow(tbl) &&
                isTRUE(all.equal(sort(as.vector(value)), sort(as.vector(medians)), tolerance = 1e-6, check.attributes = FALSE))) has_median <- TRUE
          }
          if (!has_median) {
            list(pass = FALSE, message = "dept_summary has no column of medians. Add median_wellbeing = median(wellbeing) to your summarise() - you cannot answer the second half from means alone.")
          } else if (!is.character(top) || length(top) != 1L) {
            list(pass = FALSE, message = "top_by_median should be a single department name as text. pull() on a factor column gives a factor; wrap it in as.character().")
          } else if (identical(top, exp_top_mean) && !identical(exp_top_mean, exp_top)) {
            list(pass = FALSE, message = paste0("\\"", exp_top_mean, "\\" has the highest MEAN. The highest MEDIAN is a different department, and that is the finding: one department has both the heaviest workload and the most autonomy, so its wellbeing scores are pulled apart at both ends. Its mean lands mid-table while its typical employee is the best off in the company."))
          } else if (!identical(top, exp_top)) {
            list(pass = FALSE, message = paste0("top_by_median is \\"", top, "\\" but the highest median belongs to \\"", exp_top, "\\". Sort on the median column, descending."))
          } else {
            list(pass = TRUE, message = paste0(exp_top, " has the highest median (", round(medians[[exp_top]], 1), ") while ", exp_top_mean, " has the highest mean (", round(means[[exp_top_mean]], 1), "). A model of wellbeing on department compares MEANS, so it will rank ", exp_top_mean, " top and say nothing about this. That is why every model in Part 3 is read next to the descriptives."))
          }
        }
      }
    `,
    hints: [
      'group_by(department) %>% summarise(...) with both mean(wellbeing) and median(wellbeing).',
      'arrange(desc(median_wellbeing)) %>% slice(1) puts the top row first and keeps only it.',
      'pull(department) on a factor gives a factor; as.character() turns it into plain text.',
    ],
  },
  {
    id: 'm11-3-a',
    prompt:
      'The overall F says at least two departments differ. Find out which. Store the Tukey-adjusted pairwise comparisons in pairs_tbl as a data frame, and the number of those comparisons whose adjusted p value is below .05 in n_significant.',
    starterCode:
      'library(broom)\nlibrary(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\n\npairs_tbl <- \nn_significant <- ',
    solution:
      'library(broom)\nlibrary(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\ncomparisons <- emmeans(model_dept, pairwise ~ department, adjust = "tukey")\npairs_tbl <- as.data.frame(comparisons$contrasts)\nn_significant <- sum(pairs_tbl$p.value < 0.05)',
    wrongAnswers: [
      // No adjustment: six tests at .05 each, and a different p column.
      'library(broom)\nlibrary(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\ncomparisons <- emmeans(model_dept, pairwise ~ department, adjust = "none")\npairs_tbl <- as.data.frame(comparisons$contrasts)\nn_significant <- sum(pairs_tbl$p.value < 0.05)',
      // Bonferroni instead of Tukey: also adjusted, also not what was asked.
      'library(broom)\nlibrary(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\ncomparisons <- emmeans(model_dept, pairwise ~ department, adjust = "bonferroni")\npairs_tbl <- as.data.frame(comparisons$contrasts)\nn_significant <- sum(pairs_tbl$p.value < 0.05)',
      // The estimated marginal means rather than the comparisons between them.
      'library(broom)\nlibrary(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\ncomparisons <- emmeans(model_dept, pairwise ~ department, adjust = "tukey")\npairs_tbl <- as.data.frame(comparisons$emmeans)\nn_significant <- sum(pairs_tbl$p.value < 0.05, na.rm = TRUE)',
      // Pairwise on the two-level factor, which gives a single comparison.
      'library(broom)\nlibrary(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\ncomparisons <- emmeans(model_remote, pairwise ~ remote, adjust = "tukey")\npairs_tbl <- as.data.frame(comparisons$contrasts)\nn_significant <- sum(pairs_tbl$p.value < 0.05)',
    ],
    alternateSolutions: [
      // contrast() rather than the pairwise formula.
      'library(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nemm <- emmeans(model_dept, ~ department)\npairs_tbl <- as.data.frame(contrast(emm, method = "pairwise", adjust = "tukey"))\nn_significant <- length(which(pairs_tbl$p.value < 0.05))',
      // Tukey by its other name: emmeans treats "mvt"-free pairwise as Tukey by default.
      'library(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\npairs_tbl <- as.data.frame(emmeans(model_dept, pairwise ~ department)$contrasts)\nn_significant <- sum(pairs_tbl$p.value < 0.05)',
    ],
    check: `
      if (!has_answer("pairs_tbl") || !has_answer("n_significant")) {
        list(pass = FALSE, message = "I need both pairs_tbl and n_significant.")
      } else {
        tbl <- answer("pairs_tbl")
        n_sig <- as.vector(answer("n_significant"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- lm(wellbeing ~ department, data = d)
        emm <- emmeans::emmeans(reference, ~ department)
        tukey <- as.data.frame(emmeans::contrast(emm, method = "pairwise", adjust = "tukey"))
        none <- as.data.frame(emmeans::contrast(emm, method = "pairwise", adjust = "none"))
        exp_n <- sum(tukey$p.value < 0.05)
        if (!is.data.frame(tbl)) {
          list(pass = FALSE, message = "pairs_tbl should be a data frame. as.data.frame() on the contrasts element of the emmeans result turns it into one.")
        } else if (!("p.value" %in% names(tbl)) || !("estimate" %in% names(tbl))) {
          list(pass = FALSE, message = paste0("pairs_tbl has columns ", paste(names(tbl), collapse = ", "), ". The comparisons table has estimate, SE, df, t.ratio and p.value - you may have taken the emmeans element (the group means) instead of the contrasts element."))
        } else if (nrow(tbl) != nrow(tukey)) {
          list(pass = FALSE, message = paste0("Four departments give ", nrow(tukey), " pairwise comparisons; pairs_tbl has ", nrow(tbl), ". Check that you ran the comparisons on department."))
        } else if (isTRUE(all.equal(sort(as.vector(tbl$p.value)), sort(as.vector(none$p.value)), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Those p values are unadjusted. Six comparisons at .05 each give about a 26 % chance of at least one false positive, which is exactly what the adjustment is for. Pass adjust = \\"tukey\\".")
        } else if (!isTRUE(all.equal(sort(as.vector(tbl$p.value)), sort(as.vector(tukey$p.value)), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Your p values are adjusted, but not with Tukey's method. Tukey is the one designed for all pairwise comparisons after a linear model; Bonferroni is more conservative here. Pass adjust = \\"tukey\\".")
        } else if (!is.numeric(n_sig) || length(n_sig) != 1L) {
          list(pass = FALSE, message = "n_significant should be a single number: how many rows of pairs_tbl have p.value below .05.")
        } else if (!isTRUE(all.equal(as.numeric(n_sig), as.numeric(exp_n), tolerance = 1e-9, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_significant is ", n_sig, " but ", exp_n, " of the ", nrow(tukey), " Tukey-adjusted comparisons fall below .05."))
        } else {
          biggest <- tukey[which.max(abs(tukey$estimate)), ]
          list(pass = TRUE, message = paste0(exp_n, " of ", nrow(tukey), " comparisons survive the Tukey adjustment. The largest gap is ", as.character(biggest$contrast), ", a difference of ", round(abs(biggest$estimate), 2), " points. Report the comparison, its difference and its adjusted p - never just the overall F, which tells a reader only that something differs somewhere."))
        }
      }
    `,
    hints: [
      'emmeans(model, pairwise ~ department, adjust = "tukey") returns a list with an emmeans element and a contrasts element.',
      'The comparisons are in the contrasts element; as.data.frame() makes it a plain table.',
      'sum(pairs_tbl$p.value < 0.05) counts the rows below .05, because sum() over TRUE and FALSE counts the TRUEs.',
    ],
  },
];
```

> **`m11-2-b`'s first wrong answer depends on the dataset.** It sorts by the mean and must therefore land on a different department from the median. Content-platform task P2 step 4 verifies exactly that ("Engineering's mean wellbeing is neither highest nor lowest while its median is highest") before `workplace.csv` is committed. If the generator is ever reseeded and that property is lost, this fixture stops being a wrong answer and the validator will say so by passing it — investigate the dataset, not the check.

- [x] **Step 3: Write `src/content/lessons/11-1-two-groups.mdx`**

````mdx
You have almost certainly been taught the independent-samples *t*-test as its own
procedure, with its own formula and its own place in a flowchart. This lesson
shows you that it is a linear model with one two-level predictor, and that R will
give you the same *t* and the same *p* either way.

<CodeBlock id="c-load" code={`library(dplyr)
library(broom)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

d %>%
  group_by(remote) %>%
  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())`} />

Descriptives first, as always. Two groups, two means, two SDs and two group
sizes: everything that follows is an answer to "is that gap bigger than sampling
error would produce".

<Predict
  id="p-coef"
  question="You are about to fit lm(wellbeing ~ remote). The model will have an intercept and one coefficient. What will the intercept be?"
  choices={[
    { text: 'The mean of all 480 employees', response: 'That would be true with sum-to-zero coding, which Module 12 uses. R\'s default is different.' },
    { text: 'The mean of the office-based employees, because No is the first level', correct: true, response: 'Exactly. The intercept is the reference group\'s mean, and the coefficient is how far the other group sits from it.' },
    { text: 'Zero, because remote is not a number', response: 'R turns the factor into a 0/1 column for you. The intercept is the prediction when that column is 0.' },
    { text: 'The difference between the two means', response: 'That is the coefficient, not the intercept.' },
  ]}
/>

## The model

<CodeBlock id="c-fit" code={`model_remote <- lm(wellbeing ~ remote, data = d)

model_remote %>% tidy()`} />

Behind the scenes R built a column that is 0 for `No` and 1 for `Yes` — a **dummy
variable** — and fitted the same straight line as Module 9. With x only ever 0 or
1, the line has just two heights:

- intercept = predicted wellbeing when the dummy is 0 = the office-based mean;
- intercept + `remoteYes` = predicted wellbeing when the dummy is 1 = the remote mean.

<CodeBlock id="c-means-match" code={`coef(model_remote)

d %>%
  group_by(remote) %>%
  summarise(mean_wellbeing = mean(wellbeing)) %>%
  mutate(from_model = c(coef(model_remote)[[1]], sum(coef(model_remote))))`} />

## The same test under its old name

<CodeBlock id="c-ttest" code={`t.test(wellbeing ~ remote, data = d, var.equal = TRUE)

model_remote %>% tidy() %>% filter(term == "remoteYes")`} />

Compare them number by number: the same *t* in size, the same degrees of freedom,
the same *p*. Two details matter and both bite students:

1. **`var.equal = TRUE` is required.** Without it `t.test()` runs Welch's test,
   which estimates the two variances separately and will not match the model. The
   numbers come out close, and close is not the same.
2. **The sign flips.** `t.test(y ~ g)` computes the first level minus the second;
   `lm` codes the second relative to the first. Same comparison, opposite
   subtraction. Read the group means and you will never report it backwards.

<Exercise id="m11-1-a" />

<Exercise id="m11-1-b" />

## Assumptions, and when to worry

The model assumes similar spread in the two groups and roughly normal residuals.
Look at the SDs you printed at the top: if one is more than about twice the
other, and the groups are also unequal in size, the pooled test is the wrong
tool and Welch's version is the honest one. Normality matters mainly at small
*n*; with 480 employees the Central Limit Theorem from Module 6 covers moderate
skew.

For a small sample with clear skew or extreme outliers, the rank-based
alternative is the Mann-Whitney test, `wilcox.test(wellbeing ~ remote, data = d)`
— one line in the chooser, and not what this course teaches as its default.

<Quiz
  id="q-equivalence"
  question="Why does this course teach lm() rather than t.test() for a two-group comparison?"
  choices={[
    { text: 'Because t.test() is outdated and no longer recommended', response: 'It is neither. It is a perfectly good function that answers one specific question.' },
    { text: 'Because the same framework then extends to more groups, several predictors, covariates and interactions without learning a new procedure each time', correct: true, response: 'Right. The t-test is the end of its own road; lm() is the beginning of Modules 10 to 14.' },
    { text: 'Because lm() makes fewer assumptions', response: 'The assumptions are identical - they are the same model.' },
    { text: 'Because lm() gives a smaller p value', response: 'It gives exactly the same p value, which is the point of this lesson.' },
  ]}
/>

<Interpret
  id="i-11-1"
  question="Your output gives office-based M = 62.41 (SD = 8.92, n = 298) and remote M = 64.28 (SD = 8.64, n = 182), with b = 1.87, SE = 0.83, t(478) = 2.25, p = .025. Which sentence reports it correctly in APA 7?"
  choices={[
    { text: 'Remote employees reported higher wellbeing (M = 64.28, SD = 8.64) than office-based employees (M = 62.41, SD = 8.92), b = 1.87, SE = 0.83, t(478) = 2.25, p = .025.', correct: true, response: 'Correct. The means and SDs come first, the direction is explicit, and the coefficient is the difference between those means.' },
    { text: 'There was a significant difference between remote and office-based employees, t(478) = 2.25, p = .025.', response: 'No means, no SDs, no direction. A reader cannot tell which group was higher or by how much.' },
    { text: 'Working remotely increased wellbeing by 1.87 points, t(478) = 2.25, p = .025.', response: 'Nobody was assigned to remote working, so "increased" claims more than the design supports.' },
    { text: 'Remote employees reported higher wellbeing, t(478) = 2.25, p = .025, a large effect.', response: 'A difference of 1.87 points against SDs near 8.8 is about 0.21 SD - small. p does not measure effect size.' },
  ]}
/>
````

- [x] **Step 4: Write `src/content/lessons/11-2-dummy-coding.mdx`**

````mdx
Two groups needed one dummy variable. Four groups need three, and understanding
which three is the difference between reading your own output and guessing at it.

<CodeBlock id="c-load" code={`library(dplyr)
library(broom)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

levels(d$department)

d %>%
  group_by(department) %>%
  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())`} />

R orders factor levels alphabetically unless you tell it otherwise, so the
reference here is **Engineering**. Nothing about Engineering makes it the natural
baseline; it simply sorts first. If a different department is the sensible
comparison for your research question, say so with
`relevel(d$department, ref = "Sales")` and report which one you chose.

<Predict
  id="p-count"
  question="How many coefficients will lm(wellbeing ~ department) produce for four departments?"
  choices={[
    { text: 'Four, one per department', response: 'That would be one too many: with an intercept as well, the model could not tell them apart.' },
    { text: 'Three, plus an intercept', correct: true, response: 'Right - k levels cost k - 1 coefficients. The missing one is the reference, and the intercept carries it.' },
    { text: 'One, because department is one variable', response: 'One variable, but three dummy columns. A factor is not a single slope.' },
    { text: 'Five, one per department plus an intercept', response: 'Five parameters cannot be estimated from four group means. The model would be unidentifiable.' },
  ]}
/>

## The model

<CodeBlock id="c-fit" code={`model_dept <- lm(wellbeing ~ department, data = d)

model_dept %>% tidy()`} />

Read that table carefully, because every row means something different from what
a beginner expects:

- **`(Intercept)`** is Engineering's mean. Not the grand mean, not a baseline in
  any deeper sense — one group's mean.
- **`departmentMarketing`** is Marketing's mean **minus Engineering's**. The *t*
  and *p* beside it test that one comparison, not Marketing against everybody.
- There is no `departmentEngineering` row. Its comparison with itself would be
  zero.

<CodeBlock id="c-rebuild" code={`b <- coef(model_dept)

data.frame(
  department = levels(d$department),
  from_model = c(b[[1]], b[[1]] + b[[2]], b[[1]] + b[[3]], b[[1]] + b[[4]]),
  observed = as.vector(tapply(d$wellbeing, d$department, mean))
)`} />

Four coefficients, four group means, nothing lost. A one-factor linear model is
the group means written in a different coordinate system.

<Exercise id="m11-2-a" />

## The overall test

The three *t*s test three specific comparisons with Engineering. To ask whether
department matters **at all** you need one test of all three coefficients at
once — which is the model *F* from Module 10, and which is what a one-way ANOVA
reports.

<CodeBlock id="c-f" code={`model_dept %>% glance() %>% select(r.squared, statistic, df, df.residual, p.value)

summary(aov(wellbeing ~ department, data = d))`} />

Same *F*, same degrees of freedom, same *p*. "One-way ANOVA" is the traditional
name for the *F* test of a linear model with one factor, and if a supervisor asks
for one, this is it.

## When the mean is the wrong summary

<Exercise id="m11-2-b" />

The model you just fitted compares **means**, because that is what least squares
does. When a group's distribution is skewed or pulled apart at both ends, its
mean and its typical member part company, and the model will faithfully report a
difference in means that no employee would recognise. Report the medians beside
the means whenever they disagree, and say which one your conclusion rests on.

<Quiz
  id="q-reference"
  question="You refit the model after relevel(d$department, ref = 'Support'). What changes?"
  choices={[
    { text: 'The overall F and R-squared change', response: 'Neither moves. Recoding a factor rewrites the same fitted values in different coordinates.' },
    { text: 'The coefficients and their p values change, because they now compare each department with Support', correct: true, response: 'Correct - and the model fit, the fitted values and the residuals are all identical.' },
    { text: 'Nothing changes at all', response: 'The coefficient table changes completely. Only the fit is invariant.' },
    { text: 'The model becomes invalid because Support is not alphabetically first', response: 'Any level can be the reference. Alphabetical is a default, not a rule.' },
  ]}
/>

<Interpret
  id="i-11-2"
  question="For the four-department model you have F(3, 476) = 9.84, p < .001, R-squared = .058; the Marketing coefficient is b = -1.22, SE = 1.12, t = -1.09, p = .276. Which reading is correct?"
  choices={[
    { text: 'Wellbeing differed across departments, F(3, 476) = 9.84, p < .001, R-squared = .058. Marketing did not differ significantly from the reference department, Engineering, b = -1.22, SE = 1.12, t(476) = -1.09, p = .276.', correct: true, response: 'Correct. The omnibus test and the single comparison are reported separately, and the comparison names its reference group.' },
    { text: 'Marketing employees have the same wellbeing as Engineering employees, p = .276.', response: 'A non-significant comparison is not evidence of equality. The confidence interval here spans roughly -3.4 to +1.0, which is not "the same".' },
    { text: 'Department explains 5.8 % of wellbeing, and Marketing is the worst department, b = -1.22.', response: 'R-squared is a share of variance, not of wellbeing, and one non-significant coefficient relative to one reference group does not rank the four departments.' },
    { text: 'Wellbeing differed across departments, F(3, 476) = 9.84, p < .001, so every department differs from every other.', response: 'The omnibus F says at least one difference exists somewhere. Which ones is the question lesson 11-3 answers.' },
  ]}
/>
````

- [x] **Step 5: Write `src/content/lessons/11-3-pairwise-comparisons.mdx`**

````mdx
The overall *F* said that wellbeing differs somewhere among the four departments.
It did not say where, and the coefficient table only compares each department
with Engineering. Marketing against Sales is nowhere in the output.

> **This lesson installs `emmeans`.** The first code block may wait a few seconds
> while it downloads; the status pill at the top of the page shows what is
> happening. It is cached afterwards.

<CodeBlock id="c-load" code={`library(broom)
library(emmeans)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

model_dept <- lm(wellbeing ~ department, data = d)
model_dept %>% glance() %>% select(statistic, df, df.residual, p.value)`} />

## Estimated marginal means

`emmeans()` asks the model for its predicted mean at each level of a factor.

<CodeBlock id="c-emm" code={`emm <- emmeans(model_dept, ~ department)
emm`} />

With department as the only predictor these match the raw group means exactly.
They stop matching as soon as the model contains anything else — then they are
the predicted means with the other predictors held at their average, which is
what makes `emmeans` worth learning rather than just averaging by hand.

<Predict
  id="p-multiple"
  question="Four departments give six pairwise comparisons. If you tested each at the .05 level with no adjustment, what is the chance of at least one false positive when no department really differs?"
  choices={[
    { text: 'Still 5 %, because each test is at 5 %', response: 'Each test is, but you are running six of them. The chance that at least one misfires is much higher.' },
    { text: 'About 26 %', correct: true, response: 'Right: 1 - .95 to the power of 6 is about .26. One comparison in four studies would look real and be noise.' },
    { text: 'About 30 %, which is six times 5 %', response: 'Close to the right ballpark but by the wrong arithmetic - probabilities of independent events do not add.' },
    { text: '100 %, because you tested everything', response: 'Testing more raises the risk, it does not guarantee a false positive.' },
  ]}
/>

## All six comparisons, adjusted

<CodeBlock id="c-pairwise" code={`comparisons <- emmeans(model_dept, pairwise ~ department, adjust = "tukey")

comparisons$contrasts`} />

Each row is one comparison: the difference between two estimated means, its
standard error, a *t* ratio, and a *p* value adjusted so that the chance of **any**
false positive across all six stays near .05. Tukey's method is designed for
exactly this situation — every pair, after a linear model — and is less
conservative than Bonferroni for the same guarantee.

<CodeBlock id="c-compare-adjust" code={`library(dplyr)

bind_rows(
  as.data.frame(emmeans(model_dept, pairwise ~ department, adjust = "none")$contrasts) %>%
    mutate(adjustment = "none"),
  as.data.frame(comparisons$contrasts) %>% mutate(adjustment = "tukey")
) %>%
  select(adjustment, contrast, estimate, p.value) %>%
  arrange(contrast, adjustment)`} />

Every adjusted *p* is larger than its unadjusted twin, and the estimates never
move. Adjustment changes what counts as surprising, not what was measured.

<Exercise id="m11-3-a" />

## Confidence intervals, which report better than p values

<CodeBlock id="c-ci" code={`confint(comparisons$contrasts)`} />

A difference of 3.2 points with an interval from 0.4 to 6.0 and a difference of
3.2 points with an interval from 2.9 to 3.5 have the same *p*-value story and
completely different scientific ones. Report the interval.

<Quiz
  id="q-tukey"
  question="A reviewer asks why you used Tukey rather than simply reporting all six unadjusted tests."
  choices={[
    { text: 'Because Tukey gives smaller p values, so more results are significant', response: 'The opposite: adjusted p values are always larger. Adjustment costs power and buys control of the error rate.' },
    { text: 'Because six tests at .05 each give roughly a one-in-four chance of at least one false positive, and Tukey holds that risk near .05 across the whole family', correct: true, response: 'Correct, and that is exactly how to phrase it to a reviewer.' },
    { text: 'Because the data are not normally distributed', response: 'Tukey adjusts for multiplicity. It has nothing to do with the shape of the data.' },
    { text: 'Because the overall F was significant, which requires a post-hoc test', response: 'A significant F does not require anything. It tells you a difference exists; you then decide which comparisons your question needs.' },
  ]}
/>

<Interpret
  id="i-11-3"
  question="Your Tukey table shows Engineering - Support = 4.12, SE = 1.15, t(476) = 3.58, adjusted p = .002, and Marketing - Sales = 1.03, SE = 1.21, t(476) = 0.85, adjusted p = .830. Which write-up is correct APA 7?"
  choices={[
    { text: 'Tukey-adjusted pairwise comparisons showed that wellbeing was higher in Engineering than in Support, M difference = 4.12, SE = 1.15, t(476) = 3.58, p = .002, whereas Marketing and Sales did not differ reliably, M difference = 1.03, SE = 1.21, t(476) = 0.85, p = .830.', correct: true, response: 'Correct: the adjustment is named, both comparisons are reported with their statistics, and the null result is described as "did not differ reliably" rather than as equality.' },
    { text: 'Engineering scored significantly higher than Support (p = .002) and Marketing and Sales were equal (p = .830).', response: 'Two problems: bare p values with no differences or SEs, and "equal", which a non-significant comparison never establishes.' },
    { text: 'All pairwise comparisons were conducted; Engineering differed from Support, t(476) = 3.58, p < .05.', response: 'The adjustment is not named, the difference and its SE are missing, and an adjusted p of .002 should be reported exactly.' },
    { text: 'Engineering had the highest wellbeing of the four departments, t(476) = 3.58, p = .002.', response: 'One comparison against one department does not make Engineering highest overall - and the medians in lesson 11-2 tell a different story about "highest" anyway.' },
  ]}
/>
````

- [x] **Step 6: Add Module 11 assertions to `src/content/exercises/index.test.ts`**

```ts
describe('Module 11', () => {
  const module11 = ALL_EXERCISES.filter((exercise) => exercise.id.startsWith('m11-'));

  test('defines all five exercises', () => {
    expect(module11.map((exercise) => exercise.id)).toEqual([
      'm11-1-a', 'm11-1-b', 'm11-2-a', 'm11-2-b', 'm11-3-a',
    ]);
  });

  test('the t-test equivalence exercise pools the variances', () => {
    // Welch is t.test()'s default and does not reproduce the linear model, so a
    // solution without var.equal = TRUE would be teaching the wrong equivalence.
    const equivalence = module11.find((exercise) => exercise.id === 'm11-1-b')!;
    expect(equivalence.solution).toContain('var.equal = TRUE');
    expect(equivalence.wrongAnswers.some((code) => /t\.test\([^)]*\)\$statistic/.test(code) && !code.includes('var.equal'))).toBe(true);
  });

  test('the pairwise exercise asks for a Tukey adjustment and rejects none', () => {
    const pairwise = module11.find((exercise) => exercise.id === 'm11-3-a')!;
    expect(pairwise.solution).toContain('adjust = "tukey"');
    expect(pairwise.wrongAnswers.some((code) => code.includes('adjust = "none"'))).toBe(true);
  });

  test('no check assumes a particular reference level', () => {
    // department sorts Engineering, Marketing, Sales, Support - but a check that
    // hard-codes that breaks the moment a level is renamed.
    const dummy = module11.find((exercise) => exercise.id === 'm11-2-a')!;
    expect(dummy.check).toContain('levels(d$department)[1]');
  });
});
```

- [x] **Step 7: Run the static content tests**

Run: `npx vitest run src/content/content.test.ts src/content/exercises/index.test.ts`
Expected: PASS. The rule that matters most here is `a live lesson attaches no package it did not declare` — `11-3` is the only Module 11 lesson allowed to call `library(emmeans)`, and if `11-1` or `11-2` picks it up by copy-paste this is the test that says so.

- [x] **Step 8: Run the R validator over Module 11**

Run: `npx vitest run src/content/exercises/validate.itest.ts -t "m11-"`
Expected: five solutions pass, twenty wrong answers all `fail`, ten alternate solutions pass. `m11-3-a` is the slowest: its check fits the model and runs `emmeans` twice, and `emmeans` has to be installed in the validator's webR instance first.

> If `m11-3-a` reports `broken-check` with a message about `emmeans`, the validator booted without it. `validate.itest.ts` calls `installCoursePackages`, which installs only the core set; extend its `beforeAll` to `await ensurePackages(webR, ['emmeans', 'car', 'lmerTest'])` so the validator has every package any lesson declares. Do this once, here, and Modules 12 and 13 inherit it.

Then: `npx vitest run src/content/exercises/validate.itest.ts -t "11-"`. Expected: no R error. `summary(aov(...))` in `11-2` must print an *F* identical to `glance()`'s.

- [ ] **Step 9: Verify Module 11 in the browser**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/11-1`.
Expected: the `t.test` block and the `tidy()` block print *t*s equal in size and opposite in sign, and the lesson prose says so before the student notices it as a bug. On `11-3`, the status pill reads "Installing emmeans" and then clears, the first code block runs afterwards rather than erroring, and navigating away to `11-2` and back does not re-download it. `confint(comparisons$contrasts)` prints six intervals.

- [x] **Step 10: Commit**

```bash
git add src/content/manifest.ts src/content/exercises/module-11.ts src/content/exercises/index.test.ts src/content/exercises/validate.itest.ts src/content/lessons/11-1-two-groups.mdx src/content/lessons/11-2-dummy-coding.mdx src/content/lessons/11-3-pairwise-comparisons.mdx
git commit -m "feat: Module 11, categorical predictors"
```

---

### Task M12: Interactions and factorial designs

**Files:**
- Create: `src/content/lessons/12-1-what-an-interaction-is.mdx`, `src/content/lessons/12-2-factorial-and-type-iii.mdx`, `src/content/lessons/12-3-interaction-plots.mdx`
- Modify: `src/content/manifest.ts` (`PLANNED_MODULES`), `src/content/exercises/module-12.ts`, `src/content/exercises/index.test.ts`
- Test: `src/content/content.test.ts`, `src/content/exercises/index.test.ts`, `src/content/exercises/validate.itest.ts`

**Interfaces:**
- Consumes: `ExerciseDef`; `data/workplace.csv`; `car`, declared by lesson `12-2` and installed on demand (content-platform P1). If task M11's step 8 note has not been applied, extend `validate.itest.ts`'s `beforeAll` to install `car` before running this module's fixtures.
- Produces: `module12: ExerciseDef[]` with ids `m12-1-a`, `m12-2-a`, `m12-2-b`, `m12-3-a`; three lesson files; `module-12` live in `MODULES`.

The outcome for the whole module is the **change** in engagement, `engagement_t2 - engagement_t1`, because that is where the workplace study's designed interaction lives: training adds about 1.4 points, mentoring about 0.7, and having both adds a further 2.3 on top (content-platform P2's documented effects). The main effects are deliberately unimpressive on their own, so a student who reports them without the interaction gets a real answer that is really misleading — which is the lesson.

**The `contr.sum` rule is the load-bearing detail of this module.** `car::Anova(model, type = "III")` under R's default treatment contrasts does not test the main effects that anyone means by "main effect": it tests each factor at the other factor's reference level. The correct call passes `contrasts = list(training = contr.sum, mentoring = contr.sum)` to `lm()`. Lesson `12-2` says this explicitly, shows both tables side by side, and exercise `m12-2-b` has the uncorrected fit as a negative fixture. Note also what does **not** change: the type III test of the *interaction* is identical under either coding, so only a main-effect row can serve as the fixture.

- [x] **Step 1: Add the Module 12 entry to `PLANNED_MODULES`**

```ts
  {
    id: 'module-12',
    number: 12,
    title: 'Interactions and factorial designs',
    lessons: [
      {
        id: '12-1',
        title: 'What an interaction is',
        file: '12-1-what-an-interaction-is',
        exercises: ['m12-1-a'],
        packages: ['broom', 'dplyr'],
      },
      {
        id: '12-2',
        title: 'Factorial designs',
        file: '12-2-factorial-and-type-iii',
        exercises: ['m12-2-a', 'm12-2-b'],
        packages: ['broom', 'car'],
      },
      {
        id: '12-3',
        title: 'Plotting and reporting it',
        file: '12-3-interaction-plots',
        exercises: ['m12-3-a'],
        packages: ['dplyr', 'ggplot2'],
      },
    ],
  },
```

- [x] **Step 2: Write `src/content/exercises/module-12.ts`**

```ts
import type { ExerciseDef } from '../../r/checker';

export const module12: ExerciseDef[] = [
  {
    id: 'm12-1-a',
    prompt:
      'Build the change score - engagement at time 2 minus time 1 - as a new column called change, then fit the model in which training and mentoring interact. Store the fitted model in model_int and the interaction coefficient in b_int.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nd2 <- d %>% mutate(change = )\n\n# A star fits both main effects AND their interaction.\nmodel_int <- \nb_int <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\nmodel_int <- lm(change ~ training * mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes:mentoringYes") %>% pull(estimate)',
    wrongAnswers: [
      // A plus sign: no interaction term at all, so nothing to read.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\nmodel_int <- lm(change ~ training + mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes:mentoringYes") %>% pull(estimate)',
      // A colon without the main effects: the interaction term is there but means
      // something different, because the main effects are not partialled out.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\nmodel_int <- lm(change ~ training:mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes:mentoringYes") %>% pull(estimate)',
      // The change score computed backwards.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t1 - engagement_t2)\nmodel_int <- lm(change ~ training * mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes:mentoringYes") %>% pull(estimate)',
      // Time 2 modelled directly: not a change score, and a different answer.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2)\nmodel_int <- lm(change ~ training * mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes:mentoringYes") %>% pull(estimate)',
      // A main effect read as the interaction.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\nmodel_int <- lm(change ~ training * mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes") %>% pull(estimate)',
    ],
    alternateSolutions: [
      // The star written out in full: identical model.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\nmodel_int <- lm(change ~ training + mentoring + training:mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes:mentoringYes") %>% pull(estimate)',
      // Base R throughout, and the column added with $.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d\nd2$change <- d2$engagement_t2 - d2$engagement_t1\nmodel_int <- lm(change ~ training * mentoring, data = d2)\nb_int <- coef(model_int)["trainingYes:mentoringYes"]',
      // The change computed inside the formula with I().
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\nmodel_int <- lm(I(engagement_t2 - engagement_t1) ~ training * mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% slice(4) %>% pull(estimate)',
    ],
    check: `
      if (!has_answer("model_int") || !has_answer("b_int")) {
        list(pass = FALSE, message = "I need both model_int and b_int.")
      } else {
        model_int <- answer("model_int")
        b <- as.vector(answer("b_int"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        d$change <- d$engagement_t2 - d$engagement_t1
        reference <- lm(change ~ training * mentoring, data = d)
        exp_b <- as.vector(coef(reference)["trainingYes:mentoringYes"])
        exp_training <- as.vector(coef(reference)["trainingYes"])
        exp_mentoring <- as.vector(coef(reference)["mentoringYes"])
        flipped <- as.vector(coef(lm(I(-change) ~ training * mentoring, data = d))["trainingYes:mentoringYes"])
        if (!inherits(model_int, "lm")) {
          list(pass = FALSE, message = "model_int is not a fitted linear model.")
        } else if (!("trainingYes:mentoringYes" %in% names(coef(model_int)))) {
          list(pass = FALSE, message = paste0("model_int has no interaction term. Its coefficients are: ", paste(names(coef(model_int)), collapse = ", "), ". A plus sign fits the two effects side by side and forces them to be the same whatever the other factor is doing; a star adds the term that lets them differ."))
        } else if (length(coef(model_int)) != 4L) {
          list(pass = FALSE, message = paste0("A 2 x 2 design needs four coefficients: an intercept, two main effects and one interaction. Yours has ", length(coef(model_int)), ". A colon on its own gives the interaction without the main effects, which makes every coefficient mean something else."))
        } else if (!is.numeric(b) || length(b) != 1L) {
          list(pass = FALSE, message = "b_int should be a single number: the estimate on the trainingYes:mentoringYes row.")
        } else if (isTRUE(all.equal(b, exp_training, tolerance = 1e-6, check.attributes = FALSE)) || isTRUE(all.equal(b, exp_mentoring, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is a main effect, not the interaction. In tidy() the interaction is the row whose term contains a colon: trainingYes:mentoringYes, which is ", round(exp_b, 2), "."))
        } else if (isTRUE(all.equal(b, flipped, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Your change score runs the wrong way: you computed time 1 minus time 2, so every effect has the wrong sign. Change is the later measurement minus the earlier one.")
        } else if (!isTRUE(all.equal(b, exp_b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("b_int is ", round(b, 4), " but the interaction coefficient is ", round(exp_b, 4), ". Check that change is engagement_t2 - engagement_t1 and that the model uses a star."))
        } else {
          list(pass = TRUE, message = paste0("The interaction is ", round(exp_b, 2), ". Training alone adds ", round(exp_training, 2), " and mentoring alone ", round(exp_mentoring, 2), ", but employees who got both gained a further ", round(exp_b, 2), " on top of the two. That extra is what the interaction term is."))
        }
      }
    `,
    hints: [
      'mutate(change = engagement_t2 - engagement_t1) adds the change column - later minus earlier.',
      'training * mentoring fits both main effects and the interaction in one go.',
      'tidy() names the interaction row trainingYes:mentoringYes, with a colon.',
    ],
  },
  {
    id: 'm12-2-a',
    prompt:
      'Before any test, the four cell means. Build cell_means with one row for each combination of training and mentoring, holding the mean change, its SD and the cell n. Then compute boost: how much more the both-interventions group gained than you would predict by adding the two separate gains to the neither group.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\n\ncell_means <- \n\n# boost = (both - neither) - (training only - neither) - (mentoring only - neither)\nboost <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncell_means <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), .groups = "drop")\nm <- function(t, mt) cell_means$mean_change[cell_means$training == t & cell_means$mentoring == mt]\nboost <- (m("Yes", "Yes") - m("No", "No")) - (m("Yes", "No") - m("No", "No")) - (m("No", "Yes") - m("No", "No"))',
    wrongAnswers: [
      // The raw gap between the corners, which is the whole combined gain and
      // not the extra over and above the two separate ones.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncell_means <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), .groups = "drop")\nm <- function(t, mt) cell_means$mean_change[cell_means$training == t & cell_means$mentoring == mt]\nboost <- m("Yes", "Yes") - m("No", "No")',
      // The two separate gains added together: the additive prediction, not the excess.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncell_means <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), .groups = "drop")\nm <- function(t, mt) cell_means$mean_change[cell_means$training == t & cell_means$mentoring == mt]\nboost <- (m("Yes", "No") - m("No", "No")) + (m("No", "Yes") - m("No", "No"))',
      // Only two cells, because only one factor was grouped on.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncell_means <- d2 %>%\n  group_by(training) %>%\n  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), .groups = "drop")\nboost <- cell_means$mean_change[cell_means$training == "Yes"] - cell_means$mean_change[cell_means$training == "No"]',
      // Time 2 means rather than change means.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2)\ncell_means <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), .groups = "drop")\nm <- function(t, mt) cell_means$mean_change[cell_means$training == t & cell_means$mentoring == mt]\nboost <- (m("Yes", "Yes") - m("No", "No")) - (m("Yes", "No") - m("No", "No")) - (m("No", "Yes") - m("No", "No"))',
    ],
    alternateSolutions: [
      // Base R: the 2 x 2 table of means, and the same contrast written directly.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\ncells <- tapply(d$change, list(d$training, d$mentoring), mean)\ncell_means <- as.data.frame(as.table(cells))\nnames(cell_means) <- c("training", "mentoring", "mean_change")\nboost <- cells["Yes", "Yes"] - cells["Yes", "No"] - cells["No", "Yes"] + cells["No", "No"]',
      // The algebraically identical short form, and a summarise() with extra columns.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncell_means <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), se = sd(change) / sqrt(n()), .groups = "drop")\nm <- function(t, mt) cell_means$mean_change[cell_means$training == t & cell_means$mentoring == mt]\nboost <- m("Yes", "Yes") - m("Yes", "No") - m("No", "Yes") + m("No", "No")',
    ],
    check: `
      if (!has_answer("cell_means") || !has_answer("boost")) {
        list(pass = FALSE, message = "I need both cell_means and boost.")
      } else {
        tbl <- answer("cell_means")
        boost <- as.vector(answer("boost"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        d$change <- d$engagement_t2 - d$engagement_t1
        cells <- tapply(d$change, list(d$training, d$mentoring), mean)
        exp_boost <- as.vector(cells["Yes", "Yes"] - cells["Yes", "No"] - cells["No", "Yes"] + cells["No", "No"])
        corner <- as.vector(cells["Yes", "Yes"] - cells["No", "No"])
        additive <- as.vector((cells["Yes", "No"] - cells["No", "No"]) + (cells["No", "Yes"] - cells["No", "No"]))
        if (!is.data.frame(tbl) || nrow(tbl) != 4L) {
          list(pass = FALSE, message = paste0("cell_means should have four rows - one per combination of two yes/no factors. Yours has ", if (is.data.frame(tbl)) nrow(tbl) else 0, ". group_by() takes both factors: group_by(training, mentoring)."))
        } else {
          found <- FALSE
          for (nm in names(tbl)) {
            value <- tbl[[nm]]
            if (is.numeric(value) && length(value) == 4L &&
                isTRUE(all.equal(sort(as.vector(value)), sort(as.vector(cells)), tolerance = 1e-6, check.attributes = FALSE))) found <- TRUE
          }
          if (!found) {
            list(pass = FALSE, message = paste0("No column of cell_means holds the four mean change scores, which are ", paste(round(sort(as.vector(cells)), 2), collapse = ", "), ". Check that you summarised change (engagement_t2 minus engagement_t1) rather than engagement itself."))
          } else if (!is.numeric(boost) || length(boost) != 1L) {
            list(pass = FALSE, message = "boost should be a single number.")
          } else if (isTRUE(all.equal(boost, corner, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("That is the whole gap between the both-interventions cell and the neither cell (", round(corner, 2), "). Most of that gap is the two interventions doing their separate jobs. Subtract both separate gains to get what is left over."))
          } else if (isTRUE(all.equal(boost, additive, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("That is the additive prediction (", round(additive, 2), "): what the both cell would gain if the two interventions simply stacked. The boost is how far the real both cell beats that prediction."))
          } else if (!isTRUE(all.equal(boost, exp_boost, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("boost is ", round(boost, 4), " but should be ", round(exp_boost, 4), ". The short form is mean(Yes,Yes) - mean(Yes,No) - mean(No,Yes) + mean(No,No)."))
          } else {
            list(pass = TRUE, message = paste0("boost = ", round(exp_boost, 2), ". The both cell gained ", round(corner, 2), " over the neither cell, but adding the two separate gains only predicts ", round(additive, 2), " - the rest is the two working together. Fit the model with a star and you will find this same number sitting on the interaction row."))
          }
        }
      }
    `,
    hints: [
      'group_by(training, mentoring) groups on both factors at once and gives four rows.',
      'Add .groups = "drop" to summarise() to leave the result ungrouped.',
      'Written out fully, boost is mean(Yes,Yes) - mean(Yes,No) - mean(No,Yes) + mean(No,No).',
    ],
  },
  {
    id: 'm12-2-b',
    prompt:
      'Produce the factorial ANOVA table for the change score with type III sums of squares, correctly. Fit the model with sum-to-zero contrasts for both factors, store it in model_sum, store the car::Anova table as a data frame in aov_tbl, and store the F value for the training main effect in f_training.',
    starterCode:
      'library(broom)\nlibrary(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\n\n# Type III main-effect tests are only meaningful with sum-to-zero contrasts.\nmodel_sum <- \naov_tbl <- \nf_training <- ',
    solution:
      'library(broom)\nlibrary(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\nmodel_sum <- lm(change ~ training * mentoring, data = d,\n                contrasts = list(training = contr.sum, mentoring = contr.sum))\naov_tbl <- as.data.frame(Anova(model_sum, type = "III"))\nf_training <- aov_tbl["training", "F value"]',
    wrongAnswers: [
      // The contrasts argument left off: R uses treatment contrasts, and the
      // type III main-effect tests then answer a different question.
      'library(broom)\nlibrary(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\nmodel_sum <- lm(change ~ training * mentoring, data = d)\naov_tbl <- as.data.frame(Anova(model_sum, type = "III"))\nf_training <- aov_tbl["training", "F value"]',
      // Type II, which ignores the interaction when testing the main effects.
      'library(broom)\nlibrary(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\nmodel_sum <- lm(change ~ training * mentoring, data = d,\n                contrasts = list(training = contr.sum, mentoring = contr.sum))\naov_tbl <- as.data.frame(Anova(model_sum, type = "II"))\nf_training <- aov_tbl["training", "F value"]',
      // The interaction row read as the training main effect.
      'library(broom)\nlibrary(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\nmodel_sum <- lm(change ~ training * mentoring, data = d,\n                contrasts = list(training = contr.sum, mentoring = contr.sum))\naov_tbl <- as.data.frame(Anova(model_sum, type = "III"))\nf_training <- aov_tbl["training:mentoring", "F value"]',
      // Sum-to-zero contrasts applied to only one of the two factors.
      'library(broom)\nlibrary(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\nmodel_sum <- lm(change ~ training * mentoring, data = d,\n                contrasts = list(training = contr.sum))\naov_tbl <- as.data.frame(Anova(model_sum, type = "III"))\nf_training <- aov_tbl["training", "F value"]',
    ],
    alternateSolutions: [
      // The contrasts set on the data instead of in the call: the same model.
      'library(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\ncontrasts(d$training) <- contr.sum\ncontrasts(d$mentoring) <- contr.sum\nmodel_sum <- lm(change ~ training * mentoring, data = d)\naov_tbl <- as.data.frame(Anova(model_sum, type = "III"))\nf_training <- aov_tbl$"F value"[rownames(aov_tbl) == "training"]',
      // The type given as the number 3, which car accepts, and the table indexed by number.
      'library(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\nmodel_sum <- lm(change ~ training * mentoring, data = d,\n                contrasts = list(training = contr.sum, mentoring = contr.sum))\naov_tbl <- as.data.frame(Anova(model_sum, type = 3))\nf_training <- aov_tbl[["F value"]][which(rownames(aov_tbl) == "training")]',
    ],
    check: `
      if (!has_answer("model_sum") || !has_answer("aov_tbl") || !has_answer("f_training")) {
        list(pass = FALSE, message = "I need all three: model_sum, aov_tbl and f_training.")
      } else {
        model_sum <- answer("model_sum")
        tbl <- answer("aov_tbl")
        f_training <- as.vector(answer("f_training"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        d$change <- d$engagement_t2 - d$engagement_t1
        correct_fit <- lm(change ~ training * mentoring, data = d,
                          contrasts = list(training = contr.sum, mentoring = contr.sum))
        default_fit <- lm(change ~ training * mentoring, data = d)
        correct3 <- as.data.frame(car::Anova(correct_fit, type = "III"))
        default3 <- as.data.frame(car::Anova(default_fit, type = "III"))
        type2 <- as.data.frame(car::Anova(correct_fit, type = "II"))
        exp_f <- as.vector(correct3["training", "F value"])
        exp_int <- as.vector(correct3["training:mentoring", "F value"])
        if (!inherits(model_sum, "lm")) {
          list(pass = FALSE, message = "model_sum is not a fitted linear model.")
        } else if (!("trainingYes:mentoringYes" %in% names(coef(model_sum))) && !any(grepl(":", names(coef(model_sum))))) {
          list(pass = FALSE, message = "model_sum has no interaction term. Use change ~ training * mentoring.")
        } else if (!is.data.frame(tbl) || !("F value" %in% names(tbl))) {
          list(pass = FALSE, message = "aov_tbl should be the car::Anova table turned into a data frame with as.data.frame(); it has columns Sum Sq, Df, F value and Pr(>F).")
        } else if (!is.numeric(f_training) || length(f_training) != 1L) {
          list(pass = FALSE, message = "f_training should be a single number: the F value on the training row.")
        } else if (isTRUE(all.equal(f_training, exp_int, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the interaction's F (", round(exp_int, 2), "), on the training:mentoring row. The training main effect is on the row called training."))
        } else if (isTRUE(all.equal(f_training, as.vector(default3["training", "F value"]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("You fitted without sum-to-zero contrasts, so that F (", round(as.vector(default3["training", "F value"]), 2), ") is not the main effect of training. Under R's default treatment contrasts a type III main-effect test asks about training among employees with NO mentoring only - a simple effect wearing a main effect's name. With contrasts = list(training = contr.sum, mentoring = contr.sum) the same row becomes ", round(exp_f, 2), "."))
        } else if (isTRUE(all.equal(f_training, as.vector(type2["training", "F value"]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the type II F (", round(as.vector(type2["training", "F value"]), 2), "). Type II tests each main effect while ignoring the interaction, which is only defensible when the interaction is negligible. This exercise asks for type III."))
        } else if (!isTRUE(all.equal(f_training, exp_f, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("f_training is ", round(f_training, 4), " but the type III F for training with sum-to-zero contrasts is ", round(exp_f, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("F for training = ", round(exp_f, 2), " and for the interaction = ", round(exp_int, 2), ". Worth knowing: the interaction's type III F is the same under either contrast coding - it is only the main-effect rows that change, which is exactly why the contrasts argument is not optional."))
        }
      }
    `,
    hints: [
      'Pass contrasts = list(training = contr.sum, mentoring = contr.sum) inside the lm() call, alongside data = d.',
      'Anova() with a capital A comes from car; anova() with a lower-case a is a different function that gives sequential (type I) sums of squares.',
      'as.data.frame() on the result lets you index it by row name: aov_tbl["training", "F value"].',
    ],
  },
  {
    id: 'm12-3-a',
    prompt:
      'An interaction means the effect of one factor depends on the other, so report each effect where it actually applies. From the cell means, store the effect of training among employees with no mentoring in effect_no_mentoring, and among employees who also got mentoring in effect_yes_mentoring. Each is the Yes-minus-No difference in mean change within that half of the data.',
    starterCode:
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\n\ncells <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), .groups = "drop")\ncells\n\neffect_no_mentoring <- \neffect_yes_mentoring <- ',
    solution:
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncells <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), .groups = "drop")\ncell <- function(t, mt) cells$mean_change[cells$training == t & cells$mentoring == mt]\neffect_no_mentoring <- cell("Yes", "No") - cell("No", "No")\neffect_yes_mentoring <- cell("Yes", "Yes") - cell("No", "Yes")',
    wrongAnswers: [
      // The overall training effect used for both: the interaction erased.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\noverall <- mean(d2$change[d2$training == "Yes"]) - mean(d2$change[d2$training == "No"])\neffect_no_mentoring <- overall\neffect_yes_mentoring <- overall',
      // Split by training instead of by mentoring: the other pair of simple effects.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncells <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), .groups = "drop")\ncell <- function(t, mt) cells$mean_change[cells$training == t & cells$mentoring == mt]\neffect_no_mentoring <- cell("No", "Yes") - cell("No", "No")\neffect_yes_mentoring <- cell("Yes", "Yes") - cell("Yes", "No")',
      // Both differences taken the wrong way round.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncells <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), .groups = "drop")\ncell <- function(t, mt) cells$mean_change[cells$training == t & cells$mentoring == mt]\neffect_no_mentoring <- cell("No", "No") - cell("Yes", "No")\neffect_yes_mentoring <- cell("No", "Yes") - cell("Yes", "Yes")',
      // Cell means of engagement at time 2 rather than of the change.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2)\ncells <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), .groups = "drop")\ncell <- function(t, mt) cells$mean_change[cells$training == t & cells$mentoring == mt]\neffect_no_mentoring <- cell("Yes", "No") - cell("No", "No")\neffect_yes_mentoring <- cell("Yes", "Yes") - cell("No", "Yes")',
    ],
    alternateSolutions: [
      // Base R via a 2 x 2 table of means.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\ncells <- tapply(d$change, list(d$training, d$mentoring), mean)\neffect_no_mentoring <- cells["Yes", "No"] - cells["No", "No"]\neffect_yes_mentoring <- cells["Yes", "Yes"] - cells["No", "Yes"]',
      // Two separate models, each fitted within one half of the data. The slope
      // of training in each is that half\'s simple effect.
      'library(dplyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\neffect_no_mentoring <- coef(lm(change ~ training, data = filter(d2, mentoring == "No")))[["trainingYes"]]\neffect_yes_mentoring <- coef(lm(change ~ training, data = filter(d2, mentoring == "Yes")))[["trainingYes"]]',
    ],
    check: `
      if (!has_answer("effect_no_mentoring") || !has_answer("effect_yes_mentoring")) {
        list(pass = FALSE, message = "I need both effect_no_mentoring and effect_yes_mentoring.")
      } else {
        no_m <- as.vector(answer("effect_no_mentoring"))
        yes_m <- as.vector(answer("effect_yes_mentoring"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        d$change <- d$engagement_t2 - d$engagement_t1
        cells <- tapply(d$change, list(d$training, d$mentoring), mean)
        exp_no <- as.vector(cells["Yes", "No"] - cells["No", "No"])
        exp_yes <- as.vector(cells["Yes", "Yes"] - cells["No", "Yes"])
        overall <- mean(d$change[d$training == "Yes"]) - mean(d$change[d$training == "No"])
        if (!is.numeric(no_m) || length(no_m) != 1L || !is.numeric(yes_m) || length(yes_m) != 1L) {
          list(pass = FALSE, message = "Both should be single numbers.")
        } else if (isTRUE(all.equal(no_m, yes_m, tolerance = 1e-12, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("Your two simple effects are identical, so you have reported the overall training effect (", round(overall, 2), ") twice. The whole point of a simple effect is that it differs between the levels of the other factor - here they are ", round(exp_no, 2), " and ", round(exp_yes, 2), "."))
        } else if (isTRUE(all.equal(no_m, -exp_no, tolerance = 1e-6, check.attributes = FALSE)) && isTRUE(all.equal(yes_m, -exp_yes, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Both of your differences run backwards. Each simple effect is the training-Yes cell minus the training-No cell within that level of mentoring.")
        } else if (!isTRUE(all.equal(no_m, exp_no, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("effect_no_mentoring is ", round(no_m, 4), " but the training effect among employees without mentoring is ", round(exp_no, 4), ". Hold mentoring at No and take the difference across training."))
        } else if (!isTRUE(all.equal(yes_m, exp_yes, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("effect_yes_mentoring is ", round(yes_m, 4), " but the training effect among mentored employees is ", round(exp_yes, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("Training is worth ", round(exp_no, 2), " points without mentoring and ", round(exp_yes, 2), " points with it - a difference of ", round(exp_yes - exp_no, 2), ", which is the interaction coefficient again. The overall training effect, ", round(overall, 2), ", is an average of these two and describes neither group. When an interaction is present, report the simple effects."))
        }
      }
    `,
    hints: [
      'A simple effect is a difference computed inside one level of the other factor.',
      'cells$mean_change[cells$training == "Yes" & cells$mentoring == "No"] picks out one cell mean.',
      'Both effects are Yes minus No on training; only the level of mentoring you hold fixed changes.',
    ],
  },
];
```

> **Why no `emmeans` in Module 12.** The P3 package table gives `12-2` `broom` and `car`, and `12-3` `dplyr` and `ggplot2`. Simple effects are therefore computed from the cell means rather than with `emmeans(model, pairwise ~ training | mentoring)`, which would be the natural call and is what the chooser's factorial leaf shows. Lesson `12-3` names `emmeans` in prose and points at Module 11 for it; adding it to the package list is a change to the content-platform plan's frozen table, not something this task may do on its own.

- [x] **Step 3: Write `src/content/lessons/12-1-what-an-interaction-is.mdx`**

````mdx
Every model so far has assumed that an effect is an effect: workload costs the
same number of wellbeing points whoever you are, training helps everyone equally.
That assumption is often wrong, and this module is about what to do when it is.

The workplace study ran two interventions. Half the employees got a training
programme; independently, half got a mentor. The outcome is the **change** in
engagement between the two measurements.

<CodeBlock id="c-load" code={`library(dplyr)
library(broom)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

d2 <- d %>% mutate(change = engagement_t2 - engagement_t1)

d2 %>%
  group_by(training, mentoring) %>%
  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), .groups = "drop")`} />

Four cells, four means. Read them before you read anything else, because
everything in this module is those four numbers in different arrangements.

<Predict
  id="p-additive"
  question="Suppose training on its own adds about 1.4 points of engagement and mentoring on its own about 0.7. If the two effects simply stacked, what would employees with both gain relative to those with neither?"
  choices={[
    { text: 'About 2.1 points - the two added together', correct: true, response: 'That is the additive prediction. Compare it with the both-interventions cell above: the real gain is larger, and the excess is the interaction.' },
    { text: 'About 1.4 points - whichever is bigger wins', response: 'Effects do not compete for the outcome. Under a plus-sign model they add.' },
    { text: 'About 0.98 points - they multiply', response: 'Effects on a raw score add. Multiplication comes in for odds ratios in Module 14.' },
    { text: 'Nothing predictable', response: 'An additive model makes a perfectly definite prediction, which is what makes it testable.' },
  ]}
/>

## Additive, and not

Fit the additive model first, the one with a plus sign. It is forced to say that
the training effect is the same whether or not you were mentored.

<CodeBlock id="c-additive" code={`model_add <- lm(change ~ training + mentoring, data = d2)

model_add %>% tidy()`} />

Now free it. A `*` fits both main effects **and** the term that lets them differ.

<CodeBlock id="c-interaction" code={`model_int <- lm(change ~ training * mentoring, data = d2)

model_int %>% tidy()`} />

Four coefficients now, and in this coding each one has a precise meaning:

- **`(Intercept)`** — mean change with neither intervention.
- **`trainingYes`** — the training effect **among employees with no mentoring**.
- **`mentoringYes`** — the mentoring effect **among employees with no training**.
- **`trainingYes:mentoringYes`** — how much more training is worth when mentoring
  is also present. Equivalently, how much more mentoring is worth with training.

That third bullet is the one that catches people. With an interaction in the
model and treatment coding, `trainingYes` is **not** the overall training effect.
It is a simple effect at one level of the other factor.

## `*` and `:`

<CodeBlock id="c-star-colon" code={`names(coef(lm(change ~ training + mentoring, data = d2)))
names(coef(lm(change ~ training : mentoring, data = d2)))
names(coef(lm(change ~ training * mentoring, data = d2)))`} />

`a * b` expands to `a + b + a:b`. A colon on its own gives the interaction term
with no main effects, which produces a model whose coefficients almost nobody can
interpret. Use the star.

<Exercise id="m12-1-a" />

## Is the interaction worth keeping?

The two models are nested — the additive one is the interaction one with that
term set to zero — so Module 10's comparison applies.

<CodeBlock id="c-anova" code={`anova(model_add, model_int) %>% tidy()

bind_rows(
  model_add %>% glance() %>% mutate(model = "additive"),
  model_int %>% glance() %>% mutate(model = "with interaction")
) %>% select(model, r.squared, adj.r.squared, sigma)`} />

<Quiz
  id="q-star"
  question="What is the difference between change ~ training + mentoring and change ~ training * mentoring?"
  choices={[
    { text: 'The star multiplies the two variables together into a single predictor', response: 'It adds a product term to a model that still contains both main effects. It does not replace them.' },
    { text: 'The star adds a term allowing the effect of each factor to differ across the levels of the other; the plus forces them to be the same', correct: true, response: 'Correct - and that is why an additive model can fit badly even when both main effects are real.' },
    { text: 'They fit the same model, written differently', response: 'The additive model has three coefficients, the interaction model four. Compare names(coef(...)) for each.' },
    { text: 'The star is only valid for two-level factors', response: 'It works for factors of any size and for continuous predictors too, though the coefficient count grows quickly.' },
  ]}
/>

<Interpret
  id="i-12-1"
  question="Your interaction model gives trainingYes b = 1.38, SE = 0.41, t(476) = 3.37, p < .001 and trainingYes:mentoringYes b = 2.27, SE = 0.58, t(476) = 3.91, p < .001. Which reading is right?"
  choices={[
    { text: 'Training raised engagement by 1.38 points overall, and mentoring added 2.27 on top.', response: 'Neither half is right. 1.38 applies only to unmentored employees, and 2.27 is not the mentoring effect - it is the extra value of training when mentoring is present.' },
    { text: 'Among employees without mentoring, training was associated with a 1.38-point larger gain in engagement, b = 1.38, SE = 0.41, t(476) = 3.37, p < .001; the benefit of training was a further 2.27 points larger among mentored employees, b = 2.27, SE = 0.58, t(476) = 3.91, p < .001.', correct: true, response: 'Correct. Each coefficient is reported at the level of the other factor where it actually applies.' },
    { text: 'Training and mentoring both had significant main effects.', response: 'With treatment coding and an interaction in the model, neither of those coefficients is a main effect. They are simple effects at the reference level of the other factor.' },
    { text: 'The interaction was significant, so the main effects cannot be interpreted at all.', response: 'Too strong. They can be interpreted - as simple effects at one level of the other factor, which is exactly what they are.' },
  ]}
/>
````

- [x] **Step 4: Write `src/content/lessons/12-2-factorial-and-type-iii.mdx`**

````mdx
A supervisor who asks for "a two-way ANOVA" is asking for an *F* test of each
factor and of the interaction. You already have the model; what is missing is the
table — and one argument without which the table is quietly wrong.

> **This lesson installs `car`.** The status pill shows the download; it is
> cached afterwards.

<CodeBlock id="c-load" code={`library(broom)
library(car)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
d$change <- d$engagement_t2 - d$engagement_t1

model <- lm(change ~ training * mentoring, data = d)
model %>% tidy()`} />

## Sums of squares have types

In a perfectly balanced design with no missing data, every way of carving up the
variance agrees. Real designs are rarely perfectly balanced, and then the order
in which you credit the terms matters.

- **Type I** (`anova()`) is sequential: each term gets the variance left after the
  ones written before it. Reorder the formula and the answer changes.
- **Type II** tests each main effect ignoring the interaction. Defensible when
  the interaction is negligible, awkward when it is not.
- **Type III** tests each term with every other term, interaction included,
  already in the model. This is what psychology journals mean by a factorial
  ANOVA table, and it is what `car::Anova(model, type = "III")` gives.

## The argument you must not forget

Type III main-effect tests depend on how the factors are coded. R's default is
**treatment** coding, where each factor is measured from its own first level —
and under that coding the type III row labelled `training` tests training **at
the reference level of mentoring**, not on average. It is a simple effect wearing
a main effect's name.

Sum-to-zero coding centres each factor on the average of its levels, and only
then does the row mean what its label says.

<CodeBlock id="c-wrong-right" code={`wrong <- lm(change ~ training * mentoring, data = d)

right <- lm(change ~ training * mentoring, data = d,
            contrasts = list(training = contr.sum, mentoring = contr.sum))

Anova(wrong, type = "III")
Anova(right, type = "III")`} />

Compare the two tables row by row. The `training` and `mentoring` rows differ.
The `training:mentoring` row is identical — the interaction's type III test does
not depend on the coding, which is precisely why forgetting the contrasts is so
easy to miss: the term you were most interested in looks fine.

<Predict
  id="p-contrasts"
  question="Which rows of a type III table change when you switch from treatment to sum-to-zero contrasts?"
  choices={[
    { text: 'All of them, including the interaction', response: 'The interaction row is invariant. Run the two tables above and compare.' },
    { text: 'The main-effect rows, but not the interaction', correct: true, response: 'Right, and that is the trap: the row you care about most looks the same either way, so nothing signals the mistake.' },
    { text: 'None: contrasts only rename coefficients', response: 'They rename coefficients in a model with no interaction. With an interaction present they change what a type III main-effect test is asking.' },
    { text: 'Only the intercept', response: 'The intercept does change, but so do both main-effect rows.' },
  ]}
/>

Note also that the model's fit is untouched: the fitted values, residuals, *R*²
and the interaction coefficient are identical under both codings. Contrasts
change the questions, not the fit.

<CodeBlock id="c-same-fit" code={`c(
  r2_wrong = summary(wrong)$r.squared,
  r2_right = summary(right)$r.squared,
  max_difference_in_fitted = max(abs(fitted(wrong) - fitted(right)))
)`} />

## Cell means first

<Exercise id="m12-2-a" />

## The table

<Exercise id="m12-2-b" />

An APA factorial ANOVA reports each effect as *F*(df_effect, df_error) with its
*p*, alongside the cell means and SDs, and then interprets the interaction
first — because when the interaction is real, the main effects are averages over
conditions that behave differently.

<Quiz
  id="q-type3"
  question="Your colleague runs Anova(model, type = 'III') on a model fitted with R's default contrasts and reports the main effect of training. What have they reported?"
  choices={[
    { text: 'The main effect of training, correctly', response: 'Only if the interaction were absent from the model. With it present and treatment coding in force, that row is something else.' },
    { text: 'The effect of training among employees at the reference level of mentoring - a simple effect, not an average', correct: true, response: 'Correct, and the fix is one argument: contrasts = list(training = contr.sum, mentoring = contr.sum).' },
    { text: 'A type I sum of squares', response: 'Type I is what anova() with a lower-case a produces. This is genuinely type III - of a quantity nobody wanted.' },
    { text: 'Nothing at all: the function would have errored', response: 'It runs perfectly happily and prints a plausible table. That is the problem.' },
  ]}
/>

<Interpret
  id="i-12-2"
  question="Your type III table with sum-to-zero contrasts gives training F(1, 476) = 26.14, p < .001; mentoring F(1, 476) = 9.02, p = .003; training x mentoring F(1, 476) = 15.28, p < .001. Which write-up is correct?"
  choices={[
    { text: 'A 2 x 2 factorial analysis of the change in engagement found a significant interaction between training and mentoring, F(1, 476) = 15.28, p < .001, qualifying significant main effects of training, F(1, 476) = 26.14, p < .001, and mentoring, F(1, 476) = 9.02, p = .003. Simple effects are reported below.', correct: true, response: 'Correct: the interaction leads, the main effects are explicitly described as qualified by it, and the reader is told where to find the simple effects.' },
    { text: 'There were significant main effects of training, F(1, 476) = 26.14, p < .001, and mentoring, F(1, 476) = 9.02, p = .003. The interaction was also significant.', response: 'Reporting main effects first and the interaction as an afterthought invites exactly the reading the interaction rules out - and it gives no statistics for the interaction.' },
    { text: 'Training improved engagement more than mentoring did, F(1, 476) = 26.14, p < .001.', response: 'Two F values cannot be compared to rank effects, and with an interaction present neither main effect describes any actual group.' },
    { text: 'The interaction was significant, F(1, 476) = 15.28, p < .001, so the main effects are meaningless and are not reported.', response: 'They are qualified, not meaningless, and a factorial table reports every row. Suppressing them makes the analysis unreproducible.' },
  ]}
/>
````

- [x] **Step 5: Write `src/content/lessons/12-3-interaction-plots.mdx`**

````mdx
Nobody reads a factorial table and sees the pattern. They see it in a plot with
two lines, and whether those lines are parallel is the whole question.

<CodeBlock id="c-load" code={`library(dplyr)
library(ggplot2)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
d2 <- d %>% mutate(change = engagement_t2 - engagement_t1)

cells <- d2 %>%
  group_by(training, mentoring) %>%
  summarise(
    mean_change = mean(change),
    sd_change = sd(change),
    n = n(),
    se = sd(change) / sqrt(n()),
    .groups = "drop"
  )

cells`} />

## The interaction plot

One factor on the x axis, the other as the colour of the lines, the cell means as
the points.

<CodeBlock id="c-plot" code={`cells %>%
  ggplot(aes(x = training, y = mean_change, colour = mentoring, group = mentoring)) +
  geom_point(size = 3) +
  geom_line() +
  labs(
    x = "Training programme",
    y = "Mean change in engagement",
    colour = "Mentoring",
    title = "Training and mentoring together"
  ) +
  theme_classic()`} />

**Parallel lines mean no interaction.** The gap between the two lines is the
effect of mentoring; if that gap is the same at both ends, mentoring is worth the
same whether or not you were trained, and an additive model would do. Lines that
converge, diverge or cross say the opposite.

<Predict
  id="p-lines"
  question="In the plot above, the line for mentored employees rises more steeply from No training to Yes training than the line for unmentored employees. What does that say?"
  choices={[
    { text: 'Mentoring works better than training', response: 'The plot compares slopes, not the overall size of two effects. Steeper means the two combine, not that one beats the other.' },
    { text: 'Training is worth more to employees who also have a mentor', correct: true, response: 'Exactly what a non-parallel pair of lines means, and exactly what the interaction coefficient measured.' },
    { text: 'The two interventions cancel each other out', response: 'Cancelling would show as lines crossing, with the gap reversing sign from one end to the other.' },
    { text: 'There is no interaction, because both lines go up', response: 'Both going up is consistent with an interaction. It is whether they go up in parallel that matters.' },
  ]}
/>

## Error bars, so the plot is honest

A plot of four means with no indication of precision invites the reader to see
patterns in noise.

<CodeBlock id="c-errorbars" code={`cells %>%
  ggplot(aes(x = training, y = mean_change, colour = mentoring, group = mentoring)) +
  geom_errorbar(aes(ymin = mean_change - se, ymax = mean_change + se), width = 0.08) +
  geom_point(size = 3) +
  geom_line() +
  labs(
    x = "Training programme",
    y = "Mean change in engagement (+/- 1 SE)",
    colour = "Mentoring",
    title = "Training and mentoring together"
  ) +
  theme_classic()`} />

> **Swap the axes.** Edit the block to put `mentoring` on the x axis and use
> `training` for the colour. The same four means, the same interaction, a
> different story to the eye. Which arrangement to publish is a question about
> your research question, not about the statistics.

## Reporting simple effects

When the interaction is real, the honest report is one effect per level of the
other factor.

<Exercise id="m12-3-a" />

For the significance tests of those simple effects, `emmeans` — which you met in
Module 11 — takes a vertical bar:
`emmeans(model, pairwise ~ training | mentoring, adjust = "tukey")` gives the
training comparison within each level of mentoring, with the adjustment applied.
That call needs the `emmeans` package attached, which this lesson deliberately
does not do; go back to lesson 11-3 to run it there.

## An APA-ready figure

<CodeBlock id="c-apa" code={`cells %>%
  ggplot(aes(x = training, y = mean_change, shape = mentoring, group = mentoring)) +
  geom_errorbar(aes(ymin = mean_change - se, ymax = mean_change + se), width = 0.08) +
  geom_point(size = 3) +
  geom_line() +
  scale_y_continuous(limits = c(0, NA)) +
  labs(x = "Training programme", y = "Mean change in engagement", shape = "Mentoring") +
  theme_classic()`} />

Shape rather than colour, because journals print in greyscale and readers with
colour-vision deficiencies exist. A caption states what the error bars are; this
one would say "Error bars show +/- 1 standard error of the mean."

<Quiz
  id="q-parallel"
  question="An interaction plot shows two exactly parallel lines. What follows?"
  choices={[
    { text: 'Neither factor has an effect', response: 'Both lines can be steep and both can sit far apart. Parallel says nothing about the size of either effect.' },
    { text: 'No interaction in this sample: the effect of each factor looks the same at both levels of the other', correct: true, response: 'Correct, and the sample caveat matters - parallel-looking lines are still estimates with error bars.' },
    { text: 'The interaction is significant', response: 'The opposite. A significant interaction is what makes the lines depart from parallel.' },
    { text: 'The design is unbalanced', response: 'Balance is about cell sizes and is invisible in a plot of means.' },
  ]}
/>

<Interpret
  id="i-12-3"
  question="Your cell means for change in engagement are: neither 0.21 (SD = 3.15), training only 1.59 (SD = 3.08), mentoring only 0.93 (SD = 3.22), both 4.47 (SD = 3.11), with the interaction F(1, 476) = 15.28, p < .001. Which write-up is correct?"
  choices={[
    { text: 'Training increased engagement by 1.38 points and mentoring by 0.72 points, and both together by 4.26 points.', response: 'The three numbers are right and the framing hides the finding: the combined gain is far more than the two separate gains added together, which is the whole result.' },
    { text: 'The effect of training on engagement change depended on mentoring, F(1, 476) = 15.28, p < .001. Training was associated with a gain of 1.38 points among employees without a mentor (M = 1.59, SD = 3.08, versus M = 0.21, SD = 3.15) and 3.54 points among mentored employees (M = 4.47, SD = 3.11, versus M = 0.93, SD = 3.22).', correct: true, response: 'Correct: the interaction is stated first, then one simple effect per level of mentoring, each with the cell means and SDs behind it.' },
    { text: 'Employees who received both interventions had the highest engagement change (M = 4.47, SD = 3.11), so the combination is recommended.', response: 'A recommendation from one cell mean, with no test and no comparison. The interaction is what licenses the claim, and it is missing.' },
    { text: 'There was a significant interaction, F(1, 476) = 15.28, p < .001, meaning training only works with mentoring.', response: 'Training is associated with a 1.38-point gain without mentoring too. The interaction says the benefit is larger with mentoring, not that it vanishes without it.' },
  ]}
/>
````

- [x] **Step 6: Add Module 12 assertions to `src/content/exercises/index.test.ts`**

```ts
describe('Module 12', () => {
  const module12 = ALL_EXERCISES.filter((exercise) => exercise.id.startsWith('m12-'));

  test('defines all four exercises', () => {
    expect(module12.map((exercise) => exercise.id)).toEqual([
      'm12-1-a', 'm12-2-a', 'm12-2-b', 'm12-3-a',
    ]);
  });

  test('the type III exercise sets sum-to-zero contrasts and rejects the fit without them', () => {
    // Without contr.sum the type III main-effect rows test simple effects. The
    // interaction row is unchanged either way, which is why the negative fixture
    // has to target a main effect.
    const typeThree = module12.find((exercise) => exercise.id === 'm12-2-b')!;
    expect(typeThree.solution).toContain('contrasts = list(training = contr.sum, mentoring = contr.sum)');
    expect(typeThree.wrongAnswers.some((code) => !code.includes('contr.sum'))).toBe(true);
    expect(typeThree.wrongAnswers.some((code) => code.includes('type = "II"'))).toBe(true);
  });

  test('the interaction exercise rejects a model fitted with a plus sign', () => {
    const interaction = module12.find((exercise) => exercise.id === 'm12-1-a')!;
    expect(interaction.solution).toMatch(/training \* mentoring/);
    expect(interaction.wrongAnswers.some((code) => /change ~ training \+ mentoring/.test(code))).toBe(true);
  });

  test('every solution builds the change score the same way', () => {
    // engagement_t1 - engagement_t2 flips every sign in the module.
    for (const exercise of module12) {
      expect(exercise.solution, `${exercise.id}`).toContain('engagement_t2 - engagement_t1');
    }
  });
});
```

- [x] **Step 7: Run the static content tests**

Run: `npx vitest run src/content/content.test.ts src/content/exercises/index.test.ts`
Expected: PASS. `12-2` is the only Module 12 lesson permitted `library(car)`; `12-3` declares `dplyr` and `ggplot2` only and must not attach `emmeans`, which it names in prose but never calls.

- [x] **Step 8: Run the R validator over Module 12**

Run: `npx vitest run src/content/exercises/validate.itest.ts -t "m12-"`
Expected: four solutions pass, seventeen wrong answers all `fail`, nine alternate solutions pass. `m12-2-b`'s check fits three models and builds three `car::Anova` tables, so it is the slowest check in the course so far — expect several seconds per fixture.

Then: `npx vitest run src/content/exercises/validate.itest.ts -t "12-"`. Expected: no R error. In `12-2` the two `Anova()` calls must both print; if `car` is missing the validator reports `could not find function "Anova"`, which means the `beforeAll` install from M11 step 8 was not applied.

- [ ] **Step 9: Verify Module 12 in the browser**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/12-2`.
Expected: the two `Anova()` tables print one after the other, their `training` and `mentoring` rows differ and their `training:mentoring` rows agree to every printed digit — this is the comparison the lesson is built on, so read it rather than assuming it. `max_difference_in_fitted` prints a number at machine-precision scale. On `12-3` both interaction plots draw, the error bars render, and the shape-coded figure is legible in greyscale.

- [x] **Step 10: Commit**

```bash
git add src/content/manifest.ts src/content/exercises/module-12.ts src/content/exercises/index.test.ts src/content/lessons/12-1-what-an-interaction-is.mdx src/content/lessons/12-2-factorial-and-type-iii.mdx src/content/lessons/12-3-interaction-plots.mdx
git commit -m "feat: Module 12, interactions and factorial designs"
```

---

### Task M13: Repeated measures and nested data

**Files:**
- Create: `src/content/lessons/13-1-why-independence-breaks.mdx`, `src/content/lessons/13-2-random-intercepts.mdx`, `src/content/lessons/13-3-nesting-and-paired-t.mdx`
- Modify: `src/content/manifest.ts` (`PLANNED_MODULES`), `src/content/exercises/module-13.ts`, `src/content/exercises/index.test.ts`
- Test: `src/content/content.test.ts`, `src/content/exercises/index.test.ts`, `src/content/exercises/validate.itest.ts`

**Interfaces:**
- Consumes: `ExerciseDef`; `data/workplace.csv`; `tidyr::pivot_longer` (core); **`lmerTest`, and through it `lme4`, whose availability from the webR binary repository at v0.6.0 is verified by content-platform task P1 step 8.** Do not start this task until that step has run and passed. If `lme4`/`lmerTest` do not install, Module 13 becomes the long-format reshape plus the paired *t*-test only: lessons `13-2` and `13-3` drop their `lmer` blocks, exercises `m13-2-a`, `m13-2-b` and `m13-3-a` are rewritten against `t.test(..., paired = TRUE)` and the within-employee correlation, the manifest entries lose their `lmerTest` package, and task M15 makes the chooser's two mixed-model leaves reference material with no `lessonId` (overview open question 3).
- Produces: `module13: ExerciseDef[]` with ids `m13-1-a`, `m13-2-a`, `m13-2-b`, `m13-3-a`; three lesson files; `module-13` live in `MODULES`.

The two engagement columns are the only repeated measure in the dataset, and `site` is the only nesting. Both are used: `(1 | employee_id)` for the two time points, `(1 | site)` for employees grouped in offices, and `(1 | site/employee_id)` where both apply at once.

**A naming decision that everything downstream depends on:** `pivot_longer` puts the original column names into the new `time` column, so its levels would be `engagement_t1` and `engagement_t2` and the fixed effect would be called `timeengagement_t2`. Every lesson and every exercise here relabels them to `t1` and `t2` in the same `mutate`, so the coefficient is `timet2`. Checks still locate the fixed effect by position and by a `time` prefix rather than by that exact string, so a student who keeps the long names still passes.

- [x] **Step 1: Add the Module 13 entry to `PLANNED_MODULES`**

```ts
  {
    id: 'module-13',
    number: 13,
    title: 'Repeated measures and nested data',
    lessons: [
      {
        id: '13-1',
        title: 'When independence breaks',
        file: '13-1-why-independence-breaks',
        exercises: ['m13-1-a'],
        packages: ['dplyr', 'tidyr'],
      },
      {
        id: '13-2',
        title: 'Random intercepts',
        file: '13-2-random-intercepts',
        exercises: ['m13-2-a', 'm13-2-b'],
        packages: ['lmerTest', 'broom'],
      },
      {
        id: '13-3',
        title: 'Nesting, and the paired t-test',
        file: '13-3-nesting-and-paired-t',
        exercises: ['m13-3-a'],
        packages: ['lmerTest', 'tidyr'],
      },
    ],
  },
```

- [x] **Step 2: Write `src/content/exercises/module-13.ts`**

```ts
import type { ExerciseDef } from '../../r/checker';

export const module13: ExerciseDef[] = [
  {
    id: 'm13-1-a',
    prompt:
      'Reshape the two engagement columns into long format. Store the result in long_d, with one row per employee per measurement, a factor column time whose levels are t1 then t2, and a numeric column engagement. Then build time_means: the mean, SD and n of engagement at each time point. The means are what tell you which way engagement moved.',
    starterCode:
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nlong_d <- d %>%\n  pivot_longer(\n    cols = ,\n    names_to = ,\n    values_to = \n  )\n\ntime_means <- ',
    solution:
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(\n    cols = c(engagement_t1, engagement_t2),\n    names_to = "time",\n    values_to = "engagement"\n  ) %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\ntime_means <- long_d %>%\n  group_by(time) %>%\n  summarise(mean_engagement = mean(engagement), sd_engagement = sd(engagement), n = n())',
    wrongAnswers: [
      // names_to and values_to the wrong way round: the columns swap roles.
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(\n    cols = c(engagement_t1, engagement_t2),\n    names_to = "engagement",\n    values_to = "time"\n  )\ntime_means <- long_d %>%\n  group_by(engagement) %>%\n  summarise(mean_engagement = mean(time), sd_engagement = sd(time), n = n())',
      // The wrong pair of columns reshaped.
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(\n    cols = c(wellbeing, performance),\n    names_to = "time",\n    values_to = "engagement"\n  ) %>%\n  mutate(time = factor(time))\ntime_means <- long_d %>%\n  group_by(time) %>%\n  summarise(mean_engagement = mean(engagement), sd_engagement = sd(engagement), n = n())',
      // Only one time point kept: 480 rows, and no comparison possible.
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  select(employee_id, site, engagement = engagement_t1) %>%\n  mutate(time = factor("t1"))\ntime_means <- long_d %>%\n  group_by(time) %>%\n  summarise(mean_engagement = mean(engagement), sd_engagement = sd(engagement), n = n())',
      // Grouped by department rather than by time.
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(\n    cols = c(engagement_t1, engagement_t2),\n    names_to = "time",\n    values_to = "engagement"\n  ) %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\ntime_means <- long_d %>%\n  group_by(department) %>%\n  summarise(mean_engagement = mean(engagement), sd_engagement = sd(engagement), n = n())',
    ],
    alternateSolutions: [
      // names_prefix strips the shared start, so the levels are already t1 and t2.
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(\n    cols = starts_with("engagement_"),\n    names_to = "time",\n    names_prefix = "engagement_",\n    values_to = "engagement"\n  ) %>%\n  mutate(time = factor(time))\ntime_means <- long_d %>%\n  group_by(time) %>%\n  summarise(mean_engagement = mean(engagement), sd_engagement = sd(engagement), n = n())',
      // Base R: two stacked frames, and aggregate() for the summary.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- rbind(\n  data.frame(employee_id = d$employee_id, site = d$site, time = "t1", engagement = d$engagement_t1),\n  data.frame(employee_id = d$employee_id, site = d$site, time = "t2", engagement = d$engagement_t2)\n)\nlong_d$time <- factor(long_d$time, levels = c("t1", "t2"))\ntime_means <- aggregate(engagement ~ time, data = long_d,\n  FUN = function(x) c(mean = mean(x), sd = sd(x), n = length(x)))',
    ],
    check: `
      if (!has_answer("long_d") || !has_answer("time_means")) {
        list(pass = FALSE, message = "I need both long_d and time_means.")
      } else {
        long_d <- answer("long_d")
        tbl <- answer("time_means")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        expected_values <- sort(c(d$engagement_t1, d$engagement_t2))
        exp_m1 <- mean(d$engagement_t1)
        exp_m2 <- mean(d$engagement_t2)
        if (!is.data.frame(long_d)) {
          list(pass = FALSE, message = "long_d should be a data frame.")
        } else if (nrow(long_d) != 2L * nrow(d)) {
          list(pass = FALSE, message = paste0("long_d has ", nrow(long_d), " rows. Two measurements for each of ", nrow(d), " employees is ", 2L * nrow(d), " rows - one row per employee per time point."))
        } else if (!("engagement" %in% names(long_d)) || !is.numeric(long_d$engagement)) {
          list(pass = FALSE, message = paste0("long_d needs a numeric column called engagement holding the scores. Its columns are: ", paste(names(long_d), collapse = ", "), ". names_to gets the name of the column the value came FROM; values_to gets the values themselves - it is easy to write them the wrong way round."))
        } else if (!("time" %in% names(long_d))) {
          list(pass = FALSE, message = paste0("long_d needs a column called time saying which measurement each row is. Its columns are: ", paste(names(long_d), collapse = ", "), "."))
        } else if (!isTRUE(all.equal(sort(as.vector(long_d$engagement)), as.vector(expected_values), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "The values in long_d$engagement are not the two engagement columns. Reshape engagement_t1 and engagement_t2, not another pair.")
        } else if (length(unique(as.character(long_d$time))) != 2L) {
          list(pass = FALSE, message = "time should take exactly two values, one per measurement.")
        } else {
          labels <- sort(unique(as.character(long_d$time)))
          first_label <- labels[1]
          means_by_time <- tapply(long_d$engagement, as.character(long_d$time), mean)
          if (!isTRUE(all.equal(as.vector(means_by_time[[labels[1]]]), exp_m1, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "The first level of time does not hold the time 1 scores. Set the levels explicitly so that the earlier measurement comes first - otherwise the model in the next lesson reports the change backwards.")
          } else if (!is.data.frame(tbl) || nrow(tbl) != 2L) {
            list(pass = FALSE, message = paste0("time_means should have two rows, one per time point. Yours has ", if (is.data.frame(tbl)) nrow(tbl) else 0, ". Group by time."))
          } else {
            found <- FALSE
            for (nm in names(tbl)) {
              value <- tbl[[nm]]
              if (is.numeric(value) && length(value) == 2L &&
                  isTRUE(all.equal(sort(as.vector(value)), sort(c(exp_m1, exp_m2)), tolerance = 1e-6, check.attributes = FALSE))) found <- TRUE
            }
            if (!found) {
              list(pass = FALSE, message = paste0("No column of time_means holds the two mean engagement scores, which are ", round(exp_m1, 2), " and ", round(exp_m2, 2), ". Check that you grouped by time."))
            } else {
              list(pass = TRUE, message = paste0("960 rows, two per employee. Engagement went from ", round(exp_m1, 2), " at time 1 to ", round(exp_m2, 2), " at time 2, a rise of ", round(exp_m2 - exp_m1, 2), " points. Keep that direction in mind: the model in the next lesson should report the same sign, and if it does not, the level order of time is the first thing to check."))
            }
          }
        }
      }
    `,
    hints: [
      'pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement").',
      'names_to names the new column that holds the OLD column names; values_to names the column that holds the numbers.',
      'factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")) fixes both the order and the labels.',
    ],
  },
  {
    id: 'm13-2-a',
    prompt:
      'Fit the mixed-effects model for the two measurements: engagement predicted by time, with a random intercept for each employee. Store the model in m_time and the fixed effect of time in b_time.',
    starterCode:
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\n\n# (1 | employee_id) gives every employee their own starting level.\nm_time <- \nb_time <- ',
    solution:
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nb_time <- fixef(m_time)[["timet2"]]',
    wrongAnswers: [
      // An ordinary lm: it ignores that each employee appears twice.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lm(engagement ~ time, data = long_d)\nb_time <- coef(m_time)[["timet2"]]',
      // The wrong grouping factor: site does not identify the repeated measure.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | site), data = long_d)\nb_time <- fixef(m_time)[["timet2"]]',
      // The intercept read as the effect of time.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nb_time <- fixef(m_time)[[1]]',
      // The level order reversed, so the fixed effect reports the fall from t2 to t1.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t2", "engagement_t1"), labels = c("t2", "t1")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nb_time <- fixef(m_time)[[2]]',
    ],
    alternateSolutions: [
      // The fixed effect read off the summary table instead of with fixef().
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nb_time <- summary(m_time)$coefficients["timet2", "Estimate"]',
      // names_prefix leaves the levels as t1 and t2 without a second mutate,
      // and the effect is taken by position.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = starts_with("engagement_"), names_to = "time", names_prefix = "engagement_", values_to = "engagement")\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nb_time <- fixef(m_time)[[2]]',
    ],
    check: `
      if (!has_answer("m_time") || !has_answer("b_time")) {
        list(pass = FALSE, message = "I need both m_time and b_time.")
      } else {
        m_time <- answer("m_time")
        b <- as.vector(answer("b_time"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        long <- data.frame(
          employee_id = rep(d$employee_id, 2),
          site = rep(d$site, 2),
          time = factor(rep(c("t1", "t2"), each = nrow(d)), levels = c("t1", "t2")),
          engagement = c(d$engagement_t1, d$engagement_t2)
        )
        reference <- lmerTest::lmer(engagement ~ time + (1 | employee_id), data = long)
        exp_b <- as.vector(lme4::fixef(reference)[[2]])
        exp_intercept <- as.vector(lme4::fixef(reference)[[1]])
        if (!inherits(m_time, "merMod")) {
          list(pass = FALSE, message = "m_time is not a mixed-effects model. An lm() on the long data treats each employee's two rows as two unrelated people, which throws away the pairing and gets the standard error wrong. Use lmer(engagement ~ time + (1 | employee_id), data = long_d).")
        } else if (!("employee_id" %in% names(m_time@flist))) {
          list(pass = FALSE, message = paste0("The random intercept is grouped by ", paste(names(m_time@flist), collapse = ", "), ". The repeated measurement is within employees, so the grouping factor has to be employee_id: the model needs to know which two rows belong to the same person."))
        } else if (!is.numeric(b) || length(b) != 1L) {
          list(pass = FALSE, message = "b_time should be a single number.")
        } else if (isTRUE(all.equal(b, exp_intercept, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the intercept (", round(exp_intercept, 2), "), the predicted engagement at time 1. The effect of time is the second fixed effect, ", round(exp_b, 2), "."))
        } else if (isTRUE(all.equal(b, -exp_b, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("Right size, wrong sign: your time factor has t2 as its first level, so the coefficient reports the fall from time 2 back to time 1. Set levels = c(\\"engagement_t1\\", \\"engagement_t2\\") so the earlier measurement is the reference and the coefficient is the rise, ", round(exp_b, 2), "."))
        } else if (!isTRUE(all.equal(b, exp_b, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("b_time is ", round(b, 4), " but the fixed effect of time is ", round(exp_b, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("Engagement rose by ", round(exp_b, 2), " points from time 1 to time 2. Because each employee has their own intercept, that estimate is built from within-employee changes rather than from the difference between two piles of scores - which is why it is the right model for data where the same people were measured twice."))
        }
      }
    `,
    hints: [
      'lmer(engagement ~ time + (1 | employee_id), data = long_d) - the fixed part before the plus, the random part in brackets.',
      'The vertical bar reads "grouped by": (1 | employee_id) is an intercept for each employee.',
      'fixef(m_time) returns the fixed effects; the one you want is the second, named after the second level of time.',
    ],
  },
  {
    id: 'm13-2-b',
    prompt:
      'Split the leftover variation in two. From the same model, store the standard deviation of the employee random intercepts in sd_employee, the residual standard deviation in sd_residual, and the intraclass correlation - the share of the variance that is between employees - in icc.',
    starterCode:
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\n\nvc <- as.data.frame(VarCorr(m_time))\nvc\n\nsd_employee <- \nsd_residual <- \n# The ICC compares VARIANCES, not standard deviations.\nicc <- ',
    solution:
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nvc <- as.data.frame(VarCorr(m_time))\nsd_employee <- vc$sdcor[vc$grp == "employee_id"]\nsd_residual <- vc$sdcor[vc$grp == "Residual"]\nicc <- sd_employee^2 / (sd_employee^2 + sd_residual^2)',
    wrongAnswers: [
      // Variances handed in where SDs were asked for.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nvc <- as.data.frame(VarCorr(m_time))\nsd_employee <- vc$vcov[vc$grp == "employee_id"]\nsd_residual <- vc$vcov[vc$grp == "Residual"]\nicc <- sd_employee / (sd_employee + sd_residual)',
      // The ICC computed from standard deviations rather than variances.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nvc <- as.data.frame(VarCorr(m_time))\nsd_employee <- vc$sdcor[vc$grp == "employee_id"]\nsd_residual <- vc$sdcor[vc$grp == "Residual"]\nicc <- sd_employee / (sd_employee + sd_residual)',
      // The two components swapped.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nvc <- as.data.frame(VarCorr(m_time))\nsd_employee <- vc$sdcor[vc$grp == "Residual"]\nsd_residual <- vc$sdcor[vc$grp == "employee_id"]\nicc <- sd_employee^2 / (sd_employee^2 + sd_residual^2)',
      // The ICC as the share of variance that is WITHIN employees.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nvc <- as.data.frame(VarCorr(m_time))\nsd_employee <- vc$sdcor[vc$grp == "employee_id"]\nsd_residual <- vc$sdcor[vc$grp == "Residual"]\nicc <- sd_residual^2 / (sd_employee^2 + sd_residual^2)',
    ],
    alternateSolutions: [
      // sigma() for the residual SD, and the variance components pulled by position.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nsd_employee <- attr(VarCorr(m_time)$employee_id, "stddev")[["(Intercept)"]]\nsd_residual <- sigma(m_time)\nicc <- sd_employee^2 / (sd_employee^2 + sd_residual^2)',
      // The variances taken first, then square-rooted.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nvc <- as.data.frame(VarCorr(m_time))\nvar_employee <- vc$vcov[vc$grp == "employee_id"]\nvar_residual <- vc$vcov[vc$grp == "Residual"]\nsd_employee <- sqrt(var_employee)\nsd_residual <- sqrt(var_residual)\nicc <- var_employee / (var_employee + var_residual)',
    ],
    check: `
      if (!has_answer("sd_employee") || !has_answer("sd_residual") || !has_answer("icc")) {
        list(pass = FALSE, message = "I need all three: sd_employee, sd_residual and icc.")
      } else {
        sd_e <- as.vector(answer("sd_employee"))
        sd_r <- as.vector(answer("sd_residual"))
        icc <- as.vector(answer("icc"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        long <- data.frame(
          employee_id = rep(d$employee_id, 2),
          time = factor(rep(c("t1", "t2"), each = nrow(d)), levels = c("t1", "t2")),
          engagement = c(d$engagement_t1, d$engagement_t2)
        )
        reference <- lmerTest::lmer(engagement ~ time + (1 | employee_id), data = long)
        vc <- as.data.frame(lme4::VarCorr(reference))
        exp_sd_e <- as.vector(vc$sdcor[vc$grp == "employee_id"])
        exp_sd_r <- as.vector(vc$sdcor[vc$grp == "Residual"])
        exp_icc <- exp_sd_e^2 / (exp_sd_e^2 + exp_sd_r^2)
        sd_icc <- exp_sd_e / (exp_sd_e + exp_sd_r)
        if (!is.numeric(sd_e) || length(sd_e) != 1L || !is.numeric(sd_r) || length(sd_r) != 1L || !is.numeric(icc) || length(icc) != 1L) {
          list(pass = FALSE, message = "All three should be single numbers.")
        } else if (isTRUE(all.equal(sd_e, exp_sd_e^2, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the variance (", round(exp_sd_e^2, 2), "), not the standard deviation. In as.data.frame(VarCorr(m)) the vcov column holds variances and the sdcor column holds their square roots; report SDs, which are in the units of engagement."))
        } else if (isTRUE(all.equal(sd_e, exp_sd_r, tolerance = 1e-4, check.attributes = FALSE)) && isTRUE(all.equal(sd_r, exp_sd_e, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You have the two components the wrong way round. The employee_id row is the between-employee SD; the Residual row is what is left within an employee across the two measurements.")
        } else if (!isTRUE(all.equal(sd_e, exp_sd_e, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("sd_employee is ", round(sd_e, 4), " but the employee_id standard deviation is ", round(exp_sd_e, 4), "."))
        } else if (!isTRUE(all.equal(sd_r, exp_sd_r, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("sd_residual is ", round(sd_r, 4), " but the residual standard deviation is ", round(exp_sd_r, 4), "."))
        } else if (isTRUE(all.equal(icc, sd_icc, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("You divided standard deviations. The ICC is a share of VARIANCE, so square both first: ", round(exp_sd_e, 2), " squared over ", round(exp_sd_e, 2), " squared plus ", round(exp_sd_r, 2), " squared, which is ", round(exp_icc, 3), "."))
        } else if (isTRUE(all.equal(icc, 1 - exp_icc, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the share of variance WITHIN employees (", round(1 - exp_icc, 3), "). The ICC is the between-employee share, ", round(exp_icc, 3), " - the proportion of the total that the random intercepts account for."))
        } else if (!isTRUE(all.equal(icc, exp_icc, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("icc is ", round(icc, 4), " but should be ", round(exp_icc, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("Between employees SD = ", round(exp_sd_e, 2), ", within-employee residual SD = ", round(exp_sd_r, 2), ", ICC = ", round(exp_icc, 3), ". So about ", round(100 * exp_icc), " % of the variation in engagement is stable differences between people. That is exactly the dependence an ordinary lm would have ignored, and the reason its standard error for time would be wrong."))
        }
      }
    `,
    hints: [
      'as.data.frame(VarCorr(m_time)) gives one row per variance component, with grp, vcov and sdcor columns.',
      'vc$sdcor[vc$grp == "employee_id"] picks the between-employee SD; the residual row is labelled "Residual".',
      'The ICC is between-variance over total variance, so square the SDs before dividing.',
    ],
  },
  {
    id: 'm13-3-a',
    prompt:
      'Show that with two time points the mixed model reproduces the paired-samples t-test. Fit the model and store it in m_time, store its t statistic for time in t_lmer, and store the t from the paired t-test in t_paired. They should agree.',
    starterCode:
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\n\nm_time <- \nt_lmer <- \n# t.test needs paired = TRUE, or it forgets who is who.\nt_paired <- ',
    solution:
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nt_lmer <- summary(m_time)$coefficients["timet2", "t value"]\nt_paired <- t.test(d$engagement_t2, d$engagement_t1, paired = TRUE)$statistic',
    wrongAnswers: [
      // paired left out: the pairing is discarded and the t is much smaller.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nt_lmer <- summary(m_time)$coefficients["timet2", "t value"]\nt_paired <- t.test(d$engagement_t2, d$engagement_t1)$statistic',
      // An lm on the long data instead of a mixed model.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lm(engagement ~ time, data = long_d)\nt_lmer <- summary(m_time)$coefficients["timet2", "t value"]\nt_paired <- t.test(d$engagement_t2, d$engagement_t1, paired = TRUE)$statistic',
      // The intercept row read as the time effect.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nt_lmer <- summary(m_time)$coefficients["(Intercept)", "t value"]\nt_paired <- t.test(d$engagement_t2, d$engagement_t1, paired = TRUE)$statistic',
      // A one-sample test on the time 2 scores, which runs and answers nothing.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nt_lmer <- summary(m_time)$coefficients["timet2", "t value"]\nt_paired <- t.test(d$engagement_t2)$statistic',
    ],
    alternateSolutions: [
      // The paired test written the other way round: the t flips sign, and the
      // check compares sizes, which is what the equivalence is about.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nt_lmer <- summary(m_time)$coefficients["timet2", "t value"]\nt_paired <- t.test(d$engagement_t1, d$engagement_t2, paired = TRUE)$statistic',
      // The paired test as a one-sample test on the differences - the same test.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nt_lmer <- coef(summary(m_time))[2, "t value"]\nt_paired <- t.test(d$engagement_t2 - d$engagement_t1)$statistic',
    ],
    check: `
      if (!has_answer("m_time") || !has_answer("t_lmer") || !has_answer("t_paired")) {
        list(pass = FALSE, message = "I need all three: m_time, t_lmer and t_paired.")
      } else {
        m_time <- answer("m_time")
        t_lmer <- as.vector(answer("t_lmer"))
        t_paired <- as.vector(answer("t_paired"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        long <- data.frame(
          employee_id = rep(d$employee_id, 2),
          time = factor(rep(c("t1", "t2"), each = nrow(d)), levels = c("t1", "t2")),
          engagement = c(d$engagement_t1, d$engagement_t2)
        )
        reference <- lmerTest::lmer(engagement ~ time + (1 | employee_id), data = long)
        exp_t <- as.vector(coef(summary(reference))[2, "t value"])
        exp_intercept_t <- as.vector(coef(summary(reference))[1, "t value"])
        exp_paired <- as.vector(t.test(d$engagement_t2, d$engagement_t1, paired = TRUE)$statistic)
        unpaired <- as.vector(t.test(d$engagement_t2, d$engagement_t1)$statistic)
        if (!inherits(m_time, "merMod")) {
          list(pass = FALSE, message = "m_time is not a mixed-effects model. An lm() on the long data pretends the 960 rows come from 960 different people, which inflates the residual variance and shrinks the t. Use lmer with (1 | employee_id).")
        } else if (!is.numeric(t_lmer) || length(t_lmer) != 1L || !is.numeric(t_paired) || length(t_paired) != 1L) {
          list(pass = FALSE, message = "Both t statistics should be single numbers.")
        } else if (isTRUE(all.equal(t_lmer, exp_intercept_t, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = "t_lmer is the intercept's t, which tests whether engagement at time 1 differs from zero. The row you want is the one named after the second level of time.")
        } else if (!isTRUE(all.equal(abs(t_lmer), abs(exp_t), tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("t_lmer is ", round(t_lmer, 4), " but the fixed effect of time has t = ", round(exp_t, 4), "."))
        } else if (isTRUE(all.equal(abs(t_paired), abs(unpaired), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the independent-samples t (", round(unpaired, 3), "), which treats the two measurements as two unrelated groups and throws away the fact that they come from the same 480 people. With paired = TRUE it becomes ", round(exp_paired, 3), " - far larger, because each employee acts as their own control."))
        # Tolerance 1e-3, not 1e-6: REML fits the variance components by
        # optimisation, so the equivalence with the paired t is exact in
        # algebra and agrees only to several decimals in floating point.
        } else if (!isTRUE(all.equal(abs(t_paired), abs(exp_t), tolerance = 1e-3, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("t_paired is ", round(t_paired, 4), ", which does not match the model's ", round(exp_t, 4), ". Check that you compared engagement_t2 with engagement_t1 and passed paired = TRUE."))
        } else {
          list(pass = TRUE, message = paste0("Both are about ", round(abs(exp_t), 3), " in size. With exactly two time points and nobody missing, lmer(engagement ~ time + (1 | employee_id)) and t.test(paired = TRUE) are the same test - the random intercept is doing precisely what taking a difference score does. The model keeps working when there are three time points, or when someone missed one; the paired t-test does not."))
        }
      }
    `,
    hints: [
      'summary(m_time)$coefficients is a matrix with a "t value" column; take the timet2 row.',
      't.test(d$engagement_t2, d$engagement_t1, paired = TRUE) compares each employee with themselves.',
      'Without paired = TRUE you get the independent-samples test, which is a different and much less powerful comparison.',
    ],
  },
];
```

> **Why the looser tolerances in this module.** `m13-2-b` compares variance components and `m13-3-a` compares a mixed-model *t* with a paired *t* at `tolerance = 1e-4` and `1e-3` respectively, not `1e-6`. `lmer` estimates its variance components by numerical optimisation under REML, so two fits of the same model agree to many decimals rather than to machine precision, and the algebraic equivalence with the paired *t*-test survives only to about the same depth. Both comparisons carry that reason as a comment at the call, per spec §5.2.

- [x] **Step 3: Write `src/content/lessons/13-1-why-independence-breaks.mdx`**

````mdx
Every model in Modules 9 to 12 assumed that the rows of your data are independent
— that knowing one employee's score tells you nothing about the next. Two very
common designs break that assumption, and both are in this dataset.

1. **The same people, measured more than once.** Engagement was recorded at two
   time points. An employee who was engaged in March is likely to be engaged in
   September; those two rows are not two independent observations.
2. **People grouped inside something.** The 480 employees work at six sites.
   People at the same site share a manager, a building and a canteen, so their
   scores are more alike than scores from different sites.

<CodeBlock id="c-load" code={`library(dplyr)
library(tidyr)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

d %>% select(employee_id, site, engagement_t1, engagement_t2) %>% head(6)

d %>% summarise(r_within_employee = cor(engagement_t1, engagement_t2))`} />

That correlation is the dependence, measured. An employee's two scores are
strongly related, which means the second measurement carries much less new
information than a second employee would.

<Predict
  id="p-ignore"
  question="Suppose you stacked the two measurements into 960 rows and ran an ordinary lm(engagement ~ time). What goes wrong?"
  choices={[
    { text: 'Nothing - 960 rows is more data, so the estimate improves', response: 'The estimate of the change is fine. It is the uncertainty around it that the model gets wrong.' },
    { text: 'The model treats 480 people as 960, so the differences between people land in the residual and the standard error for time is wrong', correct: true, response: 'Exactly. Stable between-person differences swamp the within-person change, and the test loses most of its power.' },
    { text: 'R will refuse to run it', response: 'It runs perfectly happily and prints a plausible table. Nothing in the output says the rows are not independent.' },
    { text: 'The change score comes out with the wrong sign', response: 'The estimate is unbiased. Only its standard error, and therefore its t and p, are wrong.' },
  ]}
/>

## Wide and long

The file stores the two measurements side by side, one row per employee. That is
**wide** format. A model needs one row per observation — one row per employee per
measurement — which is **long** format.

<CodeBlock id="c-pivot" code={`long_d <- d %>%
  pivot_longer(
    cols = c(engagement_t1, engagement_t2),
    names_to = "time",
    values_to = "engagement"
  ) %>%
  mutate(time = factor(time,
                       levels = c("engagement_t1", "engagement_t2"),
                       labels = c("t1", "t2")))

long_d %>% select(employee_id, site, time, engagement) %>% head(6)
nrow(long_d)`} />

Three things that trip people up:

- **`names_to` takes the old column names**, `values_to` takes the numbers. Write
  them the wrong way round and you get a data frame that looks fine and holds
  text where the scores should be.
- **`employee_id` is carried along**, appearing twice. That repeated id is what
  the model in the next lesson uses to know which rows belong together, so it
  must survive the reshape.
- **Set the level order deliberately.** With the default alphabetical order t1
  comes first here, which is what you want — but on a dataset with levels called
  `post` and `pre` alphabetical order would silently reverse your effect.

<CodeBlock id="c-time-means" code={`long_d %>%
  group_by(time) %>%
  summarise(mean_engagement = mean(engagement), sd_engagement = sd(engagement), n = n())`} />

Two means, and the direction of the change. Whatever the model says next has to
agree with this table.

<Exercise id="m13-1-a" />

## Seeing the dependence

<CodeBlock id="c-spaghetti" code={`library(ggplot2)

long_d %>%
  filter(employee_id <= 30) %>%
  ggplot(aes(x = time, y = engagement, group = employee_id)) +
  geom_line(alpha = 0.5) +
  geom_point(alpha = 0.6) +
  labs(x = "Measurement", y = "Engagement", title = "Thirty employees, twice each") +
  theme_classic()`} />

Notice what dominates the picture: the lines sit at very different heights, and
most of them tilt gently upward. The height differences are between-employee
variation — nothing to do with the intervention. The tilts are the effect. A
model that cannot tell those apart is looking for a small tilt through a thick
cloud of heights, which is exactly what the next lesson fixes.

<Quiz
  id="q-long"
  question="Why must the data be in long format before fitting a repeated-measures model?"
  choices={[
    { text: 'Because long data frames are smaller', response: 'They have more rows, not fewer. Format is about structure, not size.' },
    { text: 'Because the model needs one row per observation, with a column saying which measurement it is and a column saying whose it is', correct: true, response: 'Correct. Wide format hides the measurement occasion in the column name, where a formula cannot reach it.' },
    { text: 'Because pivot_longer removes the dependence between measurements', response: 'It changes the shape, not the data. The dependence is still there - the model is what accounts for it.' },
    { text: 'Because lm() cannot handle two columns', response: 'lm() handles many columns. The issue is that engagement_t1 and engagement_t2 are one variable measured twice, not two variables.' },
  ]}
/>

<Interpret
  id="i-13-1"
  question="A colleague stacked the two measurements into 960 rows, ran lm(engagement ~ time), and reports b = 1.31, SE = 0.42, t(958) = 3.12, p = .002. What should you tell them?"
  choices={[
    { text: 'The analysis is fine; 960 observations is a good sample.', response: 'There are 480 independent units, not 960. Counting each person twice overstates the information available.' },
    { text: 'The estimate of the change is unbiased, but the model treats each employee as two unrelated people, so the standard error and the degrees of freedom are wrong. A mixed model with a random intercept per employee, or a paired t-test, is the correct analysis.', correct: true, response: 'Correct on both counts: the point estimate survives, the inference does not.' },
    { text: 'They should report it as t(479) instead, since there are 480 employees.', response: 'Changing the degrees of freedom by hand does not fix the standard error, which was computed from the wrong residual variance.' },
    { text: 'The p value is too small and should be doubled to be safe.', response: 'Inference is not repaired by inventing a correction. Fit the model that matches the design.' },
  ]}
/>
````

- [x] **Step 4: Write `src/content/lessons/13-2-random-intercepts.mdx`**

````mdx
The spaghetti plot showed two kinds of variation at once: employees sitting at
different heights, and each employee moving a little between measurements. A
mixed-effects model estimates both, and keeps them apart.

> **This lesson installs `lmerTest` and `lme4`.** They are the largest download
> in the course; the status pill shows the progress and the browser caches them.

<CodeBlock id="c-load" code={`library(dplyr)
library(tidyr)
library(lmerTest)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

long_d <- d %>%
  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%
  mutate(time = factor(time,
                       levels = c("engagement_t1", "engagement_t2"),
                       labels = c("t1", "t2")))

long_d %>%
  group_by(time) %>%
  summarise(mean_engagement = mean(engagement), sd_engagement = sd(engagement), n = n())`} />

## Fixed and random

- A **fixed effect** is something you want an estimate of, with the same meaning
  for everyone: the effect of time here. It gets a coefficient, an SE, a *t* and
  a *p*.
- A **random effect** is a set of deviations you assume are drawn from a
  distribution: each employee's own starting level. You do not estimate 480
  separate parameters and report them; you estimate the standard deviation of
  that distribution.

The question "is this factor fixed or random?" is really "do I want to compare
these particular levels, or account for the fact that levels exist?"

<CodeBlock id="c-fit" code={`m_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)

summary(m_time)`} />

Read the formula as two halves. `engagement ~ time` is the fixed part, exactly the
`lm` from Module 11. `(1 | employee_id)` is the random part: a `1` means an
intercept, and the vertical bar reads "grouped by". Every employee gets their own
starting height; the model estimates how spread out those heights are.

<Exercise id="m13-2-a" />

## Two sources of variation

<CodeBlock id="c-varcorr" code={`vc <- as.data.frame(VarCorr(m_time))
vc

c(
  icc = vc$sdcor[vc$grp == "employee_id"]^2 /
        (vc$sdcor[vc$grp == "employee_id"]^2 + vc$sdcor[vc$grp == "Residual"]^2)
)`} />

The `employee_id` row is how much employees differ from each other; the
`Residual` row is what is left within an employee once their own level and the
time effect are accounted for. Their ratio is the **intraclass correlation**: the
share of the total variance that is stable differences between people.

A high ICC is the whole justification for the model. It says most of the raw
variation has nothing to do with your research question, and that an ordinary
`lm` would have been trying to find a small effect inside it.

<Predict
  id="p-icc"
  question="The ICC comes out around .65. What does that imply for an ordinary lm on the same 960 rows?"
  choices={[
    { text: 'The lm would have given the same answer', response: 'The same estimate of the change, yes. Not the same standard error, and so not the same t or p.' },
    { text: 'The lm would put that 65 % into its residual variance, inflating the standard error of time and losing most of the power', correct: true, response: 'Exactly. The mixed model removes that variance from the comparison, which is why its t is so much larger.' },
    { text: 'The ICC has no bearing on the lm', response: 'It is the exact quantity the lm cannot see and the mixed model removes.' },
    { text: 'The lm would have been anti-conservative, giving too small a p value', response: 'For a within-person effect it goes the other way: the naive lm is too conservative. Ignoring clustering is anti-conservative for a BETWEEN-cluster predictor, and that difference is worth knowing.' },
  ]}
/>

<Exercise id="m13-2-b" />

## Where the p values come from

`lme4` deliberately reports no *p* values for fixed effects, because the
denominator degrees of freedom for a mixed model are not a settled question.
`lmerTest` — which is what `library(lmerTest)` loads on top of it — adds them
using Satterthwaite's approximation, which is why the `summary()` above has a
`Pr(>|t|)` column and why this course attaches `lmerTest` rather than `lme4`.

<CodeBlock id="c-coefs" code={`coef(summary(m_time))`} />

Degrees of freedom that are not whole numbers are normal here, and are reported
as such: *t*(478.0) or *t*(942.7), rounded to one decimal.

<Quiz
  id="q-random"
  question="What does (1 | employee_id) add to the model?"
  choices={[
    { text: 'A separate coefficient for every employee, reported in the output', response: 'The deviations are estimated but not reported as fixed coefficients. What is reported is their standard deviation.' },
    { text: 'One extra parameter: the standard deviation of employees\' own starting levels, which lets the model know which rows belong to the same person', correct: true, response: 'Correct - one parameter for 480 employees, which is what makes the approach practical.' },
    { text: 'An interaction between employee and time', response: 'That would be a random slope, written (1 + time | employee_id). This is an intercept only.' },
    { text: 'A correction applied to the p value after fitting', response: 'Nothing is corrected afterwards. The dependence is part of the model from the start.' },
  ]}
/>

<Interpret
  id="i-13-2"
  question="Your model gives a fixed effect of time b = 1.31, SE = 0.15, t(479.0) = 8.73, p < .001, with employee SD = 5.84 and residual SD = 3.21. Which write-up is correct?"
  choices={[
    { text: 'A linear mixed-effects model with a random intercept for each employee showed that engagement increased from time 1 to time 2, b = 1.31, SE = 0.15, t(479.0) = 8.73, p < .001. Employees differed substantially in their overall level of engagement (SD = 5.84) relative to the within-employee residual variation (SD = 3.21).', correct: true, response: 'Correct: the random structure is described, the fixed effect is reported in full, and both variance components are given.' },
    { text: 'Engagement increased significantly over time, p < .001, in a mixed model.', response: 'No estimate, no SE, no degrees of freedom, and nothing about the random structure - a reader could not reproduce or evaluate this.' },
    { text: 'The intervention raised engagement by 1.31 points, t(479.0) = 8.73, p < .001.', response: 'The model has no intervention in it. The fixed effect is a change over time, which in a study with no control group cannot be attributed to any particular cause.' },
    { text: 'A mixed model showed engagement increased, b = 1.31, SE = 0.15, t(479.0) = 8.73, p < .001; the random effect was not significant, so it could be dropped.', response: 'The random intercept is a feature of the design, not a hypothesis. It stays whether or not some test of it reaches .05.' },
  ]}
/>
````

- [x] **Step 5: Write `src/content/lessons/13-3-nesting-and-paired-t.mdx`**

````mdx
Two loose ends. First, the traditional name for what you fitted in the last
lesson. Second, the other way dependence enters a dataset: people grouped inside
places.

<CodeBlock id="c-load" code={`library(dplyr)
library(tidyr)
library(lmerTest)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

long_d <- d %>%
  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%
  mutate(time = factor(time,
                       levels = c("engagement_t1", "engagement_t2"),
                       labels = c("t1", "t2")))

m_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)`} />

## The paired t-test, which you have already run

<CodeBlock id="c-paired" code={`coef(summary(m_time))

t.test(d$engagement_t2, d$engagement_t1, paired = TRUE)`} />

Same *t*, same degrees of freedom, same *p*. With exactly two time points and
nobody missing a measurement, the random intercept does precisely what a paired
*t*-test does: it removes each employee's own level before looking at the change.

<CodeBlock id="c-differences" code={`differences <- d$engagement_t2 - d$engagement_t1

c(
  mean_difference = mean(differences),
  fixed_effect = as.vector(fixef(m_time)[2])
)

t.test(differences)$statistic`} />

Three routes, one number. A one-sample *t*-test on the differences, a paired
*t*-test on the two columns, and the fixed effect of time in the mixed model are
the same analysis wearing three names.

<Predict
  id="p-why-lmer"
  question="If the paired t-test gives the same answer, why learn the mixed model at all?"
  choices={[
    { text: 'It does not; the t-test is simpler and should be preferred', response: 'It is simpler, and it stops working the moment the design grows past two measurements.' },
    { text: 'Because it keeps working with three or more measurements, with missing data, and with other predictors in the model', correct: true, response: 'Exactly. The paired t-test is one special case; the model is the general tool.' },
    { text: 'Because it gives smaller p values', response: 'It gives the same p value in this special case, which is the whole point of the comparison above.' },
    { text: 'Because the paired t-test requires normally distributed data and the model does not', response: 'They make the same distributional assumptions - they are the same model.' },
  ]}
/>

And the practical consequence, which matters in real thesis data:

<CodeBlock id="c-missing" code={`set.seed(4)
with_gaps <- long_d %>% slice_sample(prop = 0.9)

nrow(with_gaps)
length(unique(with_gaps$employee_id))

coef(summary(lmer(engagement ~ time + (1 | employee_id), data = with_gaps)))`} />

Ninety per cent of the rows, and many employees now contributing only one
measurement. A paired *t*-test would drop every one of those employees entirely.
The mixed model uses what each person has.

<Exercise id="m13-3-a" />

## Nesting: people inside places

The second kind of dependence has nothing to do with time. The 480 employees work
at six sites, and site is a grouping in exactly the same sense.

<CodeBlock id="c-site-means" code={`d %>%
  group_by(site) %>%
  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())`} />

<CodeBlock id="c-site-model" code={`m_site <- lmer(wellbeing ~ autonomy + workload + (1 | site), data = d)

summary(m_site)

as.data.frame(VarCorr(m_site))`} />

`(1 | site)` gives each site its own baseline wellbeing, so the autonomy and
workload coefficients are estimated from comparisons **within** sites rather than
being partly driven by differences between them. The site SD in the `VarCorr`
table is how much the six baselines differ.

<CodeBlock id="c-ranef" code={`ranef(m_site)$site`} />

Those six numbers are the estimated site deviations. They are shrunk towards zero
— a site with few employees is pulled harder towards the average than a large one,
because the model trusts a small sample less. That shrinkage is a feature, and it
is one of the things a set of six fixed dummy coefficients would not give you.

## Both at once

When employees are measured repeatedly **and** grouped in sites, the groupings
nest: a measurement is inside an employee, an employee is inside a site.

<CodeBlock id="c-nested" code={`m_nested <- lmer(engagement ~ time + (1 | site/employee_id), data = long_d)

as.data.frame(VarCorr(m_nested))
coef(summary(m_nested))`} />

`(1 | site/employee_id)` is shorthand for `(1 | site) + (1 | site:employee_id)`:
a random intercept for each site, and another for each employee within a site.
Three variance components now — site, employee, and residual — and the fixed
effect of time is barely changed, because the time comparison lives inside
employees and sites cannot affect it.

A rule of thumb worth carrying into your own work: you need a reasonable number
of groups to estimate how groups vary. Six sites is on the thin side, and the
site variance will be estimated imprecisely; with two or three groups, make them
fixed effects instead.

<Quiz
  id="q-nesting"
  question="What does (1 | site/employee_id) fit that (1 | employee_id) alone does not?"
  choices={[
    { text: 'A separate slope for each site', response: 'That would be a random slope, (1 + time | site). Both of these are intercept-only.' },
    { text: 'An intercept for each site as well as for each employee, so shared site-level variation is separated from individual differences', correct: true, response: 'Correct, and the output shows it as a third variance component.' },
    { text: 'An interaction between site and time', response: 'No interaction is fitted. Nesting is about which observations share a level, not about effects differing across levels.' },
    { text: 'Nothing: employee_id is already unique, so site adds no information', response: 'Employees are unique, but employees at the same site share a baseline. That shared part is what the site intercept captures.' },
  ]}
/>

<Interpret
  id="i-13-3"
  question="Your nested model gives a fixed effect of time b = 1.31, SE = 0.15, t(479.0) = 8.73, p < .001, with variance components SD_site = 2.41, SD_employee = 5.32, SD_residual = 3.21, and the paired t-test on the same data gives t(479) = 8.73, p < .001. Which write-up is correct?"
  choices={[
    { text: 'Engagement increased over time, t(479) = 8.73, p < .001. A mixed model gave the same result, so the nesting can be ignored.', response: 'It gave the same result for this particular effect because the comparison is within employees. That is a finding about this design, not a licence to ignore nesting in general.' },
    { text: 'A linear mixed-effects model with random intercepts for site and for employee within site showed that engagement increased from time 1 to time 2, b = 1.31, SE = 0.15, t(479.0) = 8.73, p < .001 (SD_site = 2.41, SD_employee = 5.32, SD_residual = 3.21). With two time points and complete data this estimate matches a paired-samples t-test, t(479) = 8.73, p < .001.', correct: true, response: 'Correct: the random structure is described, the fixed effect and all three variance components are reported, and the equivalence is stated as the special case it is.' },
    { text: 'The training programme increased engagement by 1.31 points, b = 1.31, SE = 0.15, t(479.0) = 8.73, p < .001.', response: 'This model contains no intervention. Every employee was measured twice; a rise over time with no control group cannot be attributed to a programme.' },
    { text: 'Engagement increased by 1.31 points, and since SD_site was smallest, site had no effect on engagement.', response: 'A variance component is not a test, and "smallest of three" does not mean zero. Sites do differ; they differ less than individuals do.' },
  ]}
/>
````

- [x] **Step 6: Add Module 13 assertions to `src/content/exercises/index.test.ts`**

```ts
describe('Module 13', () => {
  const module13 = ALL_EXERCISES.filter((exercise) => exercise.id.startsWith('m13-'));

  test('defines all four exercises', () => {
    expect(module13.map((exercise) => exercise.id)).toEqual([
      'm13-1-a', 'm13-2-a', 'm13-2-b', 'm13-3-a',
    ]);
  });

  test('every mixed-model check guards on merMod before reading the fit', () => {
    // An lm() on the long data is the headline wrong answer of this module, and
    // it has the same coefficient. Only the class tells them apart.
    for (const exercise of module13) {
      if (!/lmer\(/.test(exercise.solution)) continue;
      expect(exercise.check, `${exercise.id}`).toContain('inherits(m_time, "merMod")');
    }
  });

  test('the mixed-model exercises rehearse an lm as a wrong answer', () => {
    const fit = module13.find((exercise) => exercise.id === 'm13-2-a')!;
    expect(fit.wrongAnswers.some((code) => /m_time <- lm\(/.test(code))).toBe(true);
  });

  test('the paired equivalence exercise rejects the unpaired test', () => {
    const paired = module13.find((exercise) => exercise.id === 'm13-3-a')!;
    expect(paired.solution).toContain('paired = TRUE');
    expect(paired.wrongAnswers.some((code) => /t\.test\(d\$engagement_t2, d\$engagement_t1\)\$statistic/.test(code))).toBe(true);
  });

  test('the loosened tolerances carry their reason', () => {
    // Spec 5.2 allows a looser tolerance where a legitimate route differs
    // slightly, provided the check says why.
    const paired = module13.find((exercise) => exercise.id === 'm13-3-a')!;
    expect(paired.check).toMatch(/#[^\n]*REML/);
  });
});
```

- [x] **Step 7: Run the static content tests**

Run: `npx vitest run src/content/content.test.ts src/content/exercises/index.test.ts`
Expected: PASS. `13-1` declares `dplyr` and `tidyr` and must not attach `lmerTest`; `13-2` and `13-3` are the only lessons in the course that may.

> `13-1`'s spaghetti plot calls `library(ggplot2)`, which the lesson does not declare. `ggplot2` is in `CORE_PACKAGES`, so the validator's `declared` set already contains it and the test passes — this is the same allowance every lesson in this plan relies on for `dplyr`.

- [x] **Step 8: Run the R validator over Module 13**

Run: `npx vitest run src/content/exercises/validate.itest.ts -t "m13-"`
Expected: four solutions pass, seventeen wrong answers all `fail`, eight alternate solutions pass. This is by far the slowest module: every check refits an `lmer`, each fixture fits at least one more, and the validator's `beforeAll` has to install `lme4` and `lmerTest` first. Budget several minutes and raise the per-test timeout in `validate.itest.ts` if `m13-2-b` or `m13-3-a` times out at 120 s.

Then: `npx vitest run src/content/exercises/validate.itest.ts -t "13-"`. Expected: no R error. `lmer` may emit a message about the REML criterion or, on the nested model, a boundary warning; a *message* or a *warning* is captured and displayed but is not an error, and does not fail the run. An actual `isSingular` error would — if `(1 | site/employee_id)` fails to converge on the committed dataset, say so in the lesson prose and keep the block, because a convergence message is itself worth teaching.

- [ ] **Step 9: Verify Module 13 in the browser**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/13-2`.
Expected: the status pill reads "Installing lmerTest" for noticeably longer than `emmeans` did, then clears; `summary(m_time)` prints a `Pr(>|t|)` column — if it does not, `lme4` was attached instead of `lmerTest` and the *p* values are missing. On `13-3`, the `coef(summary(m_time))` and `t.test(..., paired = TRUE)` blocks print the same *t* to at least three decimals, `ranef(m_site)$site` prints six numbers, and the nested model prints three variance components.

- [x] **Step 10: Commit**

```bash
git add src/content/manifest.ts src/content/exercises/module-13.ts src/content/exercises/index.test.ts src/content/lessons/13-1-why-independence-breaks.mdx src/content/lessons/13-2-random-intercepts.mdx src/content/lessons/13-3-nesting-and-paired-t.mdx
git commit -m "feat: Module 13, repeated measures and nested data"
```

---

### Task M14: Binary outcomes

**Files:**
- Create: `src/content/lessons/14-1-why-not-a-linear-model.mdx`, `src/content/lessons/14-2-glm-and-log-odds.mdx`, `src/content/lessons/14-3-odds-ratios-and-reporting.mdx`
- Modify: `src/content/manifest.ts` (`PLANNED_MODULES`), `src/content/exercises/module-14.ts`, `src/content/exercises/index.test.ts`
- Test: `src/content/content.test.ts`, `src/content/exercises/index.test.ts`, `src/content/exercises/validate.itest.ts`

**Interfaces:**
- Consumes: `ExerciseDef`; `data/workplace.csv`, whose `left_company` column is the course's only binary outcome (content-platform P2: `logit(p) = 1.9 - 0.06 x wellbeing - 0.11 x tenure_years`, giving roughly 20 % leavers); `broom`, in the core set. No on-demand package: Module 14 is base `glm` plus `broom`.
- Produces: `module14: ExerciseDef[]` with ids `m14-1-a`, `m14-2-a`, `m14-2-b`, `m14-3-a`; three lesson files; `module-14` live in `MODULES`.

**One dependency worth checking before writing a line of `14-3`.** `confint()` on a `glm` computes profile-likelihood intervals. That method lived in `MASS` for twenty years and moved into `stats` in R 4.4.0; webR 0.6.0 runs R 4.6.0, so it is present without `MASS`. Verify it in the playground first (step 0 below) — if it is missing, the whole module falls back to `confint.default()` Wald intervals, which is a one-word change in three places and a sentence of prose, not a redesign.

- [x] **Step 0: Confirm `confint()` works on a glm without MASS**

In the playground, or in the validator's R session:

```r
d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
m <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)
"MASS" %in% loadedNamespaces()
confint(m)
```

Expected: `FALSE`, then a 3 x 2 matrix of profile-likelihood bounds, possibly preceded by a `Waiting for profiling to be done...` message (a message, not an error). If `confint(m)` errors, use `confint.default(m)` throughout this module and say in `14-3` that the intervals are Wald intervals.

- [x] **Step 1: Add the Module 14 entry to `PLANNED_MODULES`**

```ts
  {
    id: 'module-14',
    number: 14,
    title: 'Binary outcomes',
    lessons: [
      {
        id: '14-1',
        title: 'Why not a linear model',
        file: '14-1-why-not-a-linear-model',
        exercises: ['m14-1-a'],
        packages: ['ggplot2'],
      },
      {
        id: '14-2',
        title: 'glm and log odds',
        file: '14-2-glm-and-log-odds',
        exercises: ['m14-2-a', 'm14-2-b'],
        packages: ['broom'],
      },
      {
        id: '14-3',
        title: 'Odds ratios, and reporting',
        file: '14-3-odds-ratios-and-reporting',
        exercises: ['m14-3-a'],
        packages: ['broom'],
      },
    ],
  },
```

- [x] **Step 2: Write `src/content/exercises/module-14.ts`**

```ts
import type { ExerciseDef } from '../../r/checker';

export const module14: ExerciseDef[] = [
  {
    id: 'm14-1-a',
    prompt:
      'See for yourself why a straight line is the wrong shape for a yes/no outcome. Fit lm(left_company ~ wellbeing) and store it in lpm, count how many of its fitted values fall outside the range 0 to 1 and store that count in n_impossible, and build rate_by_third: the proportion who left in each third of wellbeing, lowest third first.',
    starterCode:
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\n# left_company is 0 or 1, so its mean is the proportion who left.\nd %>% summarise(n = n(), leavers = sum(left_company), rate = mean(left_company))\n\nlpm <- \nn_impossible <- \nrate_by_third <- ',
    solution:
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlpm <- lm(left_company ~ wellbeing, data = d)\nn_impossible <- sum(fitted(lpm) < 0 | fitted(lpm) > 1)\nrate_by_third <- d %>%\n  mutate(third = ntile(wellbeing, 3)) %>%\n  group_by(third) %>%\n  summarise(rate = mean(left_company), n = n())',
    wrongAnswers: [
      // Counting against the wrong range: a probability lives in 0 to 1.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlpm <- lm(left_company ~ wellbeing, data = d)\nn_impossible <- sum(fitted(lpm) < 0 | fitted(lpm) > 100)\nrate_by_third <- d %>%\n  mutate(third = ntile(wellbeing, 3)) %>%\n  group_by(third) %>%\n  summarise(rate = mean(left_company), n = n())',
      // Counting the leavers instead of the impossible predictions.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlpm <- lm(left_company ~ wellbeing, data = d)\nn_impossible <- sum(d$left_company == 1)\nrate_by_third <- d %>%\n  mutate(third = ntile(wellbeing, 3)) %>%\n  group_by(third) %>%\n  summarise(rate = mean(left_company), n = n())',
      // The thirds taken on the outcome, which makes the rates trivially 0 and 1.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlpm <- lm(left_company ~ wellbeing, data = d)\nn_impossible <- sum(fitted(lpm) < 0 | fitted(lpm) > 1)\nrate_by_third <- d %>%\n  mutate(third = ntile(left_company, 3)) %>%\n  group_by(third) %>%\n  summarise(rate = mean(left_company), n = n())',
      // The wrong predictor, so the fitted values are someone else\'s.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlpm <- lm(left_company ~ tenure_years, data = d)\nn_impossible <- sum(fitted(lpm) < 0 | fitted(lpm) > 1)\nrate_by_third <- d %>%\n  mutate(third = ntile(wellbeing, 3)) %>%\n  group_by(third) %>%\n  summarise(rate = mean(left_company), n = n())',
    ],
    alternateSolutions: [
      // Base R: predict() instead of fitted(), and table thirds with cut().
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlpm <- lm(left_company ~ wellbeing, data = d)\np <- predict(lpm)\nn_impossible <- length(which(p < 0 | p > 1))\nbreaks <- quantile(d$wellbeing, probs = c(0, 1/3, 2/3, 1))\nd$third <- cut(d$wellbeing, breaks = breaks, include.lowest = TRUE, labels = FALSE)\nrate_by_third <- aggregate(left_company ~ third, data = d, FUN = mean)',
      // The count written as a sum over a single logical vector.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlpm <- lm(left_company ~ wellbeing, data = d)\nn_impossible <- sum(!dplyr::between(fitted(lpm), 0, 1))\nrate_by_third <- d %>%\n  mutate(third = ntile(wellbeing, 3)) %>%\n  group_by(third) %>%\n  summarise(rate = mean(left_company), n = n(), leavers = sum(left_company))',
    ],
    check: `
      if (!has_answer("lpm") || !has_answer("n_impossible") || !has_answer("rate_by_third")) {
        list(pass = FALSE, message = "I need all three: lpm, n_impossible and rate_by_third.")
      } else {
        lpm <- answer("lpm")
        n_imp <- as.vector(answer("n_impossible"))
        tbl <- answer("rate_by_third")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- lm(left_company ~ wellbeing, data = d)
        p <- fitted(reference)
        exp_n <- sum(p < 0 | p > 1)
        breaks <- quantile(d$wellbeing, probs = c(0, 1/3, 2/3, 1))
        third <- cut(d$wellbeing, breaks = breaks, include.lowest = TRUE, labels = FALSE)
        exp_rates <- as.vector(tapply(d$left_company, third, mean))
        if (!inherits(lpm, "lm")) {
          list(pass = FALSE, message = "lpm should be an ordinary linear model - this exercise is about what goes wrong when you fit one to a 0/1 outcome.")
        } else if (!("wellbeing" %in% names(coef(lpm)))) {
          list(pass = FALSE, message = paste0("lpm has no wellbeing coefficient; its predictors are ", paste(setdiff(names(coef(lpm)), "(Intercept)"), collapse = ", "), "."))
        } else if (!is.numeric(n_imp) || length(n_imp) != 1L) {
          list(pass = FALSE, message = "n_impossible should be a single number.")
        } else if (isTRUE(all.equal(as.numeric(n_imp), as.numeric(sum(d$left_company)), tolerance = 1e-9, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the number of employees who left (", sum(d$left_company), "). The question is how many PREDICTIONS the line makes that no probability could take - count the fitted values below 0 or above 1."))
        } else if (isTRUE(all.equal(as.numeric(n_imp), 0, tolerance = 1e-9)) && exp_n > 0) {
          list(pass = FALSE, message = paste0("You found none, but there are ", exp_n, ". Check the range you tested against: a predicted probability has to lie between 0 and 1, not between 0 and 100."))
        } else if (!isTRUE(all.equal(as.numeric(n_imp), as.numeric(exp_n), tolerance = 1e-9, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_impossible is ", n_imp, " but ", exp_n, " fitted values from lm(left_company ~ wellbeing) fall outside 0 to 1."))
        } else if (!is.data.frame(tbl) || nrow(tbl) != 3L) {
          list(pass = FALSE, message = "rate_by_third should have three rows, one per third of wellbeing.")
        } else {
          found <- FALSE
          for (nm in names(tbl)) {
            value <- tbl[[nm]]
            if (is.numeric(value) && length(value) == 3L &&
                isTRUE(all.equal(as.vector(value), exp_rates, tolerance = 1e-6, check.attributes = FALSE))) found <- TRUE
          }
          if (!found) {
            list(pass = FALSE, message = paste0("No column of rate_by_third holds the three leaving rates, which are ", paste(round(exp_rates, 3), collapse = ", "), " from the lowest third of wellbeing to the highest. Split on wellbeing, not on left_company."))
          } else {
            list(pass = TRUE, message = paste0(exp_n, " of the ", nrow(d), " fitted values are impossible probabilities. And the descriptives say the effect is real: ", round(100 * exp_rates[1], 1), " % of the least happy third left, against ", round(100 * exp_rates[3], 1), " % of the happiest. A model that predicts a negative probability for the very employees it should be most confident about is the wrong shape, not the wrong data."))
          }
        }
      }
    `,
    hints: [
      'fitted(lpm) gives the predicted value for every employee.',
      'sum() over a logical vector counts the TRUEs: sum(fitted(lpm) < 0 | fitted(lpm) > 1).',
      'mean() of a 0/1 column is the proportion of 1s, so summarise(rate = mean(left_company)) is the leaving rate.',
    ],
  },
  {
    id: 'm14-2-a',
    prompt:
      'Fit the logistic regression of leaving on wellbeing and tenure. Store the fitted model in m_left and the wellbeing coefficient - on the log-odds scale, exactly as the model reports it - in b_wellbeing.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\n# Without family = binomial, glm() fits an ordinary linear model and says nothing.\nm_left <- \nb_wellbeing <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nb_wellbeing <- m_left %>% tidy() %>% filter(term == "wellbeing") %>% pull(estimate)',
    wrongAnswers: [
      // family left off: a gaussian glm, which runs and is not logistic regression.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d)\nb_wellbeing <- m_left %>% tidy() %>% filter(term == "wellbeing") %>% pull(estimate)',
      // lm instead of glm: the same mistake with a different spelling.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- lm(left_company ~ wellbeing + tenure_years, data = d)\nb_wellbeing <- m_left %>% tidy() %>% filter(term == "wellbeing") %>% pull(estimate)',
      // The coefficient exponentiated when the log odds were asked for.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nb_wellbeing <- exp(coef(m_left)[["wellbeing"]])',
      // The tenure coefficient read as wellbeing\'s.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nb_wellbeing <- m_left %>% tidy() %>% filter(term == "tenure_years") %>% pull(estimate)',
      // The intercept read as the wellbeing effect.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nb_wellbeing <- m_left %>% tidy() %>% slice(1) %>% pull(estimate)',
    ],
    alternateSolutions: [
      // family written as the function call, which is the canonical form.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial(link = "logit"))\nb_wellbeing <- coef(m_left)["wellbeing"]',
      // The predictors in the other order, and the coefficient by name.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ tenure_years + wellbeing, data = d, family = "binomial")\nb_wellbeing <- summary(m_left)$coefficients["wellbeing", "Estimate"]',
    ],
    check: `
      if (!has_answer("m_left") || !has_answer("b_wellbeing")) {
        list(pass = FALSE, message = "I need both m_left and b_wellbeing.")
      } else {
        m_left <- answer("m_left")
        b <- as.vector(answer("b_wellbeing"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)
        exp_b <- as.vector(coef(reference)["wellbeing"])
        exp_tenure <- as.vector(coef(reference)["tenure_years"])
        exp_intercept <- as.vector(coef(reference)["(Intercept)"])
        if (!inherits(m_left, "glm")) {
          list(pass = FALSE, message = "m_left is not a glm. lm() fits a straight line to the 0/1 outcome, which is the model lesson 14-1 showed predicting impossible probabilities. Use glm().")
        } else if (!identical(family(m_left)$family, "binomial")) {
          list(pass = FALSE, message = paste0("m_left is a glm, but its family is \\"", family(m_left)$family, "\\", not binomial. Without family = binomial, glm() fits an ordinary linear model - it runs, it prints a coefficient table, and it is not logistic regression. The family is what puts the outcome on the log-odds scale."))
        } else if (!("wellbeing" %in% names(coef(m_left)))) {
          list(pass = FALSE, message = paste0("m_left has no wellbeing coefficient; its predictors are ", paste(setdiff(names(coef(m_left)), "(Intercept)"), collapse = ", "), "."))
        } else if (!is.numeric(b) || length(b) != 1L) {
          list(pass = FALSE, message = "b_wellbeing should be a single number.")
        } else if (isTRUE(all.equal(b, exp(exp_b), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("You exponentiated. exp(b) = ", round(exp(exp_b), 4), " is the odds ratio, which lesson 14-3 is about. The coefficient itself, on the log-odds scale, is ", round(exp_b, 4), " - and the sign is readable there in a way it is not after exponentiating, because below zero means less likely while below one means the same thing."))
        } else if (isTRUE(all.equal(b, exp_tenure, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the tenure coefficient (", round(exp_tenure, 4), "). Filter tidy() to the wellbeing row."))
        } else if (isTRUE(all.equal(b, exp_intercept, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the intercept (", round(exp_intercept, 4), "): the log odds of leaving for an employee with wellbeing 0 and no tenure at all, which describes nobody."))
        } else if (!isTRUE(all.equal(b, exp_b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("b_wellbeing is ", round(b, 4), " but the wellbeing coefficient is ", round(exp_b, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("b = ", round(exp_b, 4), " log odds per point of wellbeing. Negative, so higher wellbeing goes with a lower chance of leaving - which is the direction the leaving rates by third showed in the last lesson. Log odds are not readable as they stand; exp() fixes that in lesson 14-3."))
        }
      }
    `,
    hints: [
      'glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial) - the family argument is what makes it logistic.',
      'tidy() works on a glm exactly as it does on an lm, and the estimate column is on the log-odds scale.',
      'Do not exponentiate yet. This exercise asks for the coefficient as the model reports it.',
    ],
  },
  {
    id: 'm14-2-b',
    prompt:
      'Turn both slopes into odds ratios. Store exp() of the wellbeing coefficient in or_wellbeing and exp() of the tenure coefficient in or_tenure. One of them should come out below 1 and one above; make sure you can say which and why.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\n\nm_left %>% tidy()\n\nor_wellbeing <- \nor_tenure <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nor_wellbeing <- exp(coef(m_left)[["wellbeing"]])\nor_tenure <- exp(coef(m_left)[["tenure_years"]])',
    wrongAnswers: [
      // Not exponentiated at all: log odds labelled as odds ratios.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nor_wellbeing <- coef(m_left)[["wellbeing"]]\nor_tenure <- coef(m_left)[["tenure_years"]]',
      // The standard errors exponentiated instead of the estimates.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nor_wellbeing <- exp(summary(m_left)$coefficients["wellbeing", "Std. Error"])\nor_tenure <- exp(summary(m_left)$coefficients["tenure_years", "Std. Error"])',
      // The reciprocal taken "to make it bigger than 1".
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nor_wellbeing <- 1 / exp(coef(m_left)[["wellbeing"]])\nor_tenure <- exp(coef(m_left)[["tenure_years"]])',
      // Exponentiated coefficients from a model with no binomial family.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d)\nor_wellbeing <- exp(coef(m_left)[["wellbeing"]])\nor_tenure <- exp(coef(m_left)[["tenure_years"]])',
    ],
    alternateSolutions: [
      // broom does the exponentiating.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nors <- m_left %>% tidy(exponentiate = TRUE)\nor_wellbeing <- ors$estimate[ors$term == "wellbeing"]\nor_tenure <- ors$estimate[ors$term == "tenure_years"]',
      // The whole coefficient vector exponentiated at once, then indexed.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nall_ors <- exp(coef(m_left))\nor_wellbeing <- all_ors["wellbeing"]\nor_tenure <- all_ors["tenure_years"]',
    ],
    check: `
      if (!has_answer("or_wellbeing") || !has_answer("or_tenure")) {
        list(pass = FALSE, message = "I need both or_wellbeing and or_tenure.")
      } else {
        or_w <- as.vector(answer("or_wellbeing"))
        or_t <- as.vector(answer("or_tenure"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)
        b_w <- as.vector(coef(reference)["wellbeing"])
        b_t <- as.vector(coef(reference)["tenure_years"])
        exp_w <- exp(b_w)
        exp_t <- exp(b_t)
        gaussian_fit <- glm(left_company ~ wellbeing + tenure_years, data = d)
        if (!is.numeric(or_w) || length(or_w) != 1L || !is.numeric(or_t) || length(or_t) != 1L) {
          list(pass = FALSE, message = "Both should be single numbers.")
        } else if (isTRUE(all.equal(or_w, b_w, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("Those are still log odds. An odds ratio is exp() of the coefficient: exp(", round(b_w, 3), ") = ", round(exp_w, 3), ". You can spot the mistake without any arithmetic - an odds ratio is never negative, and a log odds usually is."))
        } else if (isTRUE(all.equal(or_w, exp(as.vector(summary(reference)$coefficients["wellbeing", "Std. Error"])), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You exponentiated the standard error rather than the estimate. Exponentiate the estimate column; the SE stays on the log-odds scale, which is where the confidence interval is built before being exponentiated with it.")
        } else if (isTRUE(all.equal(or_w, 1 / exp_w, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("You inverted it. 1/OR flips the direction of the comparison, so ", round(1 / exp_w, 3), " would be the odds ratio for a one-point DECREASE in wellbeing. Report exp(b) = ", round(exp_w, 3), " and say in words that higher wellbeing lowers the odds."))
        } else if (isTRUE(all.equal(or_w, exp(as.vector(coef(gaussian_fit)["wellbeing"])), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Those come from a glm fitted without family = binomial, so they are exp() of a linear-model slope - a number with no interpretation at all. Refit with family = binomial.")
        } else if (!isTRUE(all.equal(or_w, exp_w, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("or_wellbeing is ", round(or_w, 4), " but exp() of the wellbeing coefficient is ", round(exp_w, 4), "."))
        } else if (!isTRUE(all.equal(or_t, exp_t, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("or_tenure is ", round(or_t, 4), " but exp() of the tenure coefficient is ", round(exp_t, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("OR = ", round(exp_w, 3), " per point of wellbeing and ", round(exp_t, 3), " per year of tenure. An odds ratio multiplies rather than adds: below 1 means the odds of leaving shrink with each extra point, above 1 means they grow. Both are ratios of ODDS, not of risks, and the two are only close when the outcome is rare."))
        }
      }
    `,
    hints: [
      'exp() undoes the log in log odds: exp(coef(m_left)[["wellbeing"]]).',
      'Use the double bracket, or unname(), so you get a plain number rather than a named one.',
      'An odds ratio is always positive. If yours is negative, you have not exponentiated.',
    ],
  },
  {
    id: 'm14-3-a',
    prompt:
      'Build the table that goes in the results section: odds ratios with their 95 % confidence intervals, for every term in the model including the intercept. Store it in or_table, with the odds ratio in a column called OR and the interval bounds beside it.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\n\n# Build the interval on the log-odds scale first, then exponentiate the whole thing.\nor_table <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nor_table <- exp(cbind(OR = coef(m_left), confint(m_left)))',
    wrongAnswers: [
      // Never exponentiated: log odds in a table labelled OR.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nor_table <- cbind(OR = coef(m_left), confint(m_left))',
      // Only the interval: no estimate to report alongside it.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nor_table <- exp(confint(m_left))',
      // The whole summary matrix exponentiated, so the SE, z and p are mangled too.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nor_table <- exp(summary(m_left)$coefficients)',
      // Built from a model with no binomial family.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d)\nor_table <- exp(cbind(OR = coef(m_left), confint(m_left)))',
    ],
    alternateSolutions: [
      // broom builds the same table as a data frame, with Wald intervals.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nor_table <- m_left %>%\n  tidy(exponentiate = TRUE, conf.int = TRUE) %>%\n  select(term, OR = estimate, conf.low, conf.high)',
      // Wald intervals built by hand from the estimate and its SE.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)\nest <- coef(m_left)\nse <- summary(m_left)$coefficients[, "Std. Error"]\nor_table <- exp(cbind(OR = est, lower = est - 1.96 * se, upper = est + 1.96 * se))',
    ],
    check: `
      if (!has_answer("or_table")) {
        list(pass = FALSE, message = "I could not find an object called or_table.")
      } else {
        tbl <- answer("or_table")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)
        b <- coef(reference)
        exp_or <- as.vector(exp(b))
        profile <- suppressMessages(confint(reference))
        se <- summary(reference)$coefficients[, "Std. Error"]
        wald <- cbind(b - 1.96 * se, b + 1.96 * se)
        gaussian_fit <- glm(left_company ~ wellbeing + tenure_years, data = d)
        numeric_cols <- list()
        if (is.matrix(tbl) || is.data.frame(tbl)) {
          for (nm in colnames(tbl)) {
            column <- if (is.data.frame(tbl)) tbl[[nm]] else tbl[, nm]
            if (is.numeric(column)) numeric_cols[[nm]] <- as.vector(column)
          }
        }
        matches <- function(target, tol) {
          for (column in numeric_cols) {
            if (length(column) == length(target) &&
                isTRUE(all.equal(column, as.vector(target), tolerance = tol, check.attributes = FALSE))) return(TRUE)
          }
          FALSE
        }
        if (!is.matrix(tbl) && !is.data.frame(tbl)) {
          list(pass = FALSE, message = "or_table should be a table - a matrix from cbind() or a data frame - with one row per term.")
        } else if (nrow(tbl) != length(b)) {
          list(pass = FALSE, message = paste0("or_table has ", nrow(tbl), " rows but the model has ", length(b), " terms (the intercept included). exp(confint(m)) on its own gives the interval with no estimate column; cbind the odds ratios on first."))
        } else if (length(numeric_cols) < 3L) {
          list(pass = FALSE, message = paste0("or_table needs at least three numeric columns: the odds ratio and the two interval bounds. Yours has ", length(numeric_cols), "."))
        } else if (matches(as.vector(b), 1e-6)) {
          list(pass = FALSE, message = paste0("One of your columns holds the raw coefficients, so the table was never exponentiated. exp() the whole cbind() at once - the interval has to be built on the log-odds scale and exponentiated with the estimate, not the other way round. The wellbeing OR should be ", round(exp(b[["wellbeing"]]), 3), ", not ", round(b[["wellbeing"]], 3), "."))
        } else if (matches(as.vector(exp(coef(gaussian_fit))), 1e-6)) {
          list(pass = FALSE, message = "Those odds ratios come from a glm fitted without family = binomial. Refit with family = binomial before exponentiating anything.")
        } else if (!matches(exp_or, 1e-6)) {
          list(pass = FALSE, message = paste0("No column of or_table holds the odds ratios, which are ", paste(round(exp_or, 3), collapse = ", "), " for the intercept, wellbeing and tenure."))
        # Tolerance 1e-4, not 1e-6: confint() on a glm finds the profile-likelihood
        # bounds by iterative root-finding, so two runs agree to several decimals
        # rather than to machine precision. Wald bounds are accepted as well.
        } else if (!matches(as.vector(exp(profile[, 1])), 1e-4) && !matches(as.vector(exp(wald[, 1])), 1e-4)) {
          list(pass = FALSE, message = "No column of or_table holds the lower bounds of the 95 % intervals. confint(m) gives profile-likelihood bounds on the log-odds scale; exponentiate them together with the estimates.")
        } else if (!matches(as.vector(exp(profile[, 2])), 1e-4) && !matches(as.vector(exp(wald[, 2])), 1e-4)) {
          list(pass = FALSE, message = "No column of or_table holds the upper bounds of the 95 % intervals.")
        } else {
          kind <- if (matches(as.vector(exp(profile[, 1])), 1e-4)) "profile-likelihood" else "Wald"
          list(pass = TRUE, message = paste0("Your intervals are ", kind, " bounds, which is fine - say which kind you used. Wellbeing: OR = ", round(exp(b[["wellbeing"]]), 3), ", 95 % CI [", round(exp(profile[["wellbeing", 1]]), 3), ", ", round(exp(profile[["wellbeing", 2]]), 3), "]. The test of no effect is whether that interval contains 1, not 0 - exponentiating moved the null value with everything else."))
        }
      }
    `,
    hints: [
      'cbind(OR = coef(m_left), confint(m_left)) builds the three columns on the log-odds scale.',
      'Wrap the whole cbind() in exp() so the estimate and both bounds are transformed together.',
      'confint() on a glm prints "Waiting for profiling to be done..." - that is a message, not an error.',
    ],
  },
];
```

> **Why `m14-3-a`'s check searches the columns rather than indexing them.** `exp(cbind(OR = coef(m), confint(m)))` gives a matrix whose second and third columns are named `2.5 %` and `97.5 %`; `tidy(exponentiate = TRUE, conf.int = TRUE)` gives a data frame with `conf.low` and `conf.high` and a `term` column of text. Both are correct answers to the prompt, and a check that indexed by name or position would reject one of them. It also accepts Wald bounds alongside profile bounds, and the passing message names which kind the student produced — because "which interval did you report" is a real question in a results section.

- [x] **Step 3: Write `src/content/lessons/14-1-why-not-a-linear-model.mdx`**

````mdx
Five modules of linear models, and one kind of outcome they cannot handle. Did
the employee leave, yes or no? Did the patient recover? Did the student pass?
The outcome is not a quantity; it is one of two things.

<CodeBlock id="c-load" code={`library(dplyr)
library(ggplot2)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

d %>% summarise(n = n(), leavers = sum(left_company), rate = mean(left_company))`} />

`left_company` is stored as 0 and 1, so its mean is the proportion who left. That
small trick — the mean of a 0/1 column is a proportion — is worth remembering,
because it is how every descriptive in this module is computed.

<CodeBlock id="c-rates" code={`d %>%
  mutate(third = ntile(wellbeing, 3)) %>%
  group_by(third) %>%
  summarise(rate = mean(left_company), n = n())`} />

Read the direction before fitting anything: the leaving rate falls as wellbeing
rises. Whatever the model says next has to agree with these three numbers.

<Predict
  id="p-lm"
  question="What happens if you fit lm(left_company ~ wellbeing) - a straight line through zeros and ones?"
  choices={[
    { text: 'R refuses, because the outcome is not continuous', response: 'R runs it without complaint. The output looks like any other regression table.' },
    { text: 'It runs, and the fitted values are predicted probabilities that can fall below 0 or above 1', correct: true, response: 'Exactly - and the next block counts how many of them do.' },
    { text: 'It runs and gives the same answer as logistic regression', response: 'The two agree on the direction and disagree about almost everything else, most visibly at the extremes.' },
    { text: 'All the fitted values come out as 0 or 1', response: 'A straight line takes every value in between. That is the problem.' },
  ]}
/>

## What goes wrong

<CodeBlock id="c-lpm" code={`lpm <- lm(left_company ~ wellbeing, data = d)

fitted_values <- fitted(lpm)

c(
  smallest = min(fitted_values),
  largest = max(fitted_values),
  impossible = sum(fitted_values < 0 | fitted_values > 1)
)`} />

<CodeBlock id="c-lpm-plot" code={`d %>%
  ggplot(aes(x = wellbeing, y = left_company)) +
  geom_point(alpha = 0.15) +
  geom_smooth(method = lm, se = FALSE) +
  geom_hline(yintercept = c(0, 1), linetype = "dashed") +
  labs(x = "Wellbeing", y = "Left the company (0/1)", title = "A straight line through a yes/no outcome") +
  theme_classic()`} />

The line leaves the strip between the dashed lines. Every prediction outside it
is a probability that cannot exist, and it happens exactly where the data are
most informative — at the two extremes of wellbeing.

There is a second problem, less visible and just as fatal. A linear model assumes
the residuals have the same spread everywhere. With a 0/1 outcome the residual
can only take two values at any given prediction, and their spread depends
entirely on the predicted probability: near .5 there is a lot of room to be
wrong, near 0 or 1 there is almost none. The standard errors are wrong before you
start.

<Exercise id="m14-1-a" />

## The shape we want

A model for a probability should produce a curve that approaches 0 and 1 without
ever reaching them, and that is steepest in the middle where the outcome is
genuinely uncertain. That curve is the **logistic** function, and the next lesson
fits it.

<CodeBlock id="c-curve" code={`d %>%
  ggplot(aes(x = wellbeing, y = left_company)) +
  geom_point(alpha = 0.15) +
  geom_smooth(method = "glm", method.args = list(family = binomial), se = FALSE) +
  geom_hline(yintercept = c(0, 1), linetype = "dashed") +
  labs(x = "Wellbeing", y = "Left the company (0/1)", title = "A logistic curve through the same data") +
  theme_classic()`} />

> **Put both on one plot.** Add a second `geom_smooth(method = lm, se = FALSE,
> linetype = "dashed")` layer to the block above and run it again. The two agree
> across the middle and part company at the ends, which is the whole story of this
> lesson in one figure.

<Quiz
  id="q-lpm"
  question="Which is the strongest reason not to fit a linear model to a 0/1 outcome?"
  choices={[
    { text: 'The coefficients are hard to interpret', response: 'They are unusually easy to interpret - a change in probability per unit. That is not the problem.' },
    { text: 'It can predict probabilities below 0 or above 1, and its residual spread necessarily changes with the prediction, so the standard errors are wrong', correct: true, response: 'Correct on both counts, and the second reason is the one people forget.' },
    { text: 'R cannot fit it', response: 'R fits it happily. Nothing in the output warns you.' },
    { text: 'The outcome is a factor', response: 'Here it is stored as 0/1 numbers. Even so, the model is the wrong shape.' },
  ]}
/>

<Interpret
  id="i-14-1"
  question="A colleague fits lm(left_company ~ wellbeing) and reports b = -0.011, SE = 0.002, t(478) = -5.42, p < .001, concluding that each extra point of wellbeing reduces the probability of leaving by 1.1 percentage points. What should you say?"
  choices={[
    { text: 'The conclusion is fine; a linear probability model is a standard approach.', response: 'It is used in some fields, but not without the caveats - and none of them appears here.' },
    { text: 'The direction is right and the model is the wrong shape: it predicts probabilities outside 0 to 1 at the extremes of wellbeing, and its standard errors assume a constant residual spread that a 0/1 outcome cannot have. Refit with glm(..., family = binomial).', correct: true, response: 'Correct: the finding survives, the model and its inference do not.' },
    { text: 'The effect is too small to be worth reporting.', response: 'Just over a percentage point per point of wellbeing, across a scale tens of points wide, is a substantial effect. Size is not the issue.' },
    { text: 'They should report the odds ratio instead, exp(-0.011) = 0.989.', response: 'Exponentiating a linear-model slope produces a number with no interpretation. The odds ratio has to come from a logistic model.' },
  ]}
/>
````

- [x] **Step 4: Write `src/content/lessons/14-2-glm-and-log-odds.mdx`**

````mdx
`glm` stands for generalised linear model, and the generalisation is one idea: put
the linear part on a scale where a straight line makes sense, then transform back.

<CodeBlock id="c-load" code={`library(dplyr)
library(broom)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

d %>%
  group_by(left_company) %>%
  summarise(n = n(), mean_wellbeing = mean(wellbeing), mean_tenure = mean(tenure_years))`} />

Descriptives for a binary outcome mean comparing the two groups on the
predictors. Leavers should have lower wellbeing and shorter tenure than stayers;
if the model later says otherwise, one of the two is wrong.

## Probability, odds, log odds

Three ways of saying the same thing, each fixing a problem with the last.

- A **probability** *p* runs from 0 to 1. A straight line will not stay inside it.
- The **odds** are *p* / (1 − *p*): how many times more likely the event is than
  its absence. They run from 0 to infinity — better at the top, still floored at
  zero.
- The **log odds**, log(*p* / (1 − *p*)), run from minus infinity to plus
  infinity. A straight line can live there safely.

<CodeBlock id="c-scales" code={`probabilities <- c(0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99)

data.frame(
  probability = probabilities,
  odds = probabilities / (1 - probabilities),
  log_odds = log(probabilities / (1 - probabilities))
)`} />

Look at the symmetry in the last column: *p* = .25 and *p* = .75 give log odds of
equal size and opposite sign, and *p* = .5 gives exactly 0. Zero log odds means
even chances, which is why zero is the null value on this scale.

<Predict
  id="p-logodds"
  question="A model gives a log-odds coefficient of -0.06 for wellbeing. What does the minus sign mean?"
  choices={[
    { text: 'Wellbeing is negatively skewed', response: 'The coefficient says nothing about the distribution of the predictor.' },
    { text: 'Higher wellbeing goes with lower odds of leaving', correct: true, response: 'Right. On the log-odds scale, negative means downward, exactly as a negative slope does in a linear model.' },
    { text: 'The probability of leaving is negative', response: 'Probabilities cannot be negative. The log odds can, and that is the point of the scale.' },
    { text: 'The model failed to converge', response: 'A negative coefficient is perfectly ordinary. Convergence failures announce themselves as warnings.' },
  ]}
/>

## Fitting it

<CodeBlock id="c-fit" code={`m_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)

m_left %>% tidy()`} />

The formula is the same as always. `family = binomial` is the whole difference,
and leaving it out is the single most common mistake in this module: `glm()`
without a family fits an ordinary linear model, prints a perfectly plausible
table, and answers a different question.

<CodeBlock id="c-no-family" code={`no_family <- glm(left_company ~ wellbeing + tenure_years, data = d)

family(no_family)$family
family(m_left)$family

c(with_binomial = coef(m_left)[["wellbeing"]], without = coef(no_family)[["wellbeing"]])`} />

Two coefficients, two scales, no warning. Check `family()` when a logistic
coefficient looks suspiciously small.

<Exercise id="m14-2-a" />

## Reading the table

`tidy()` on a `glm` gives the same four columns as on an `lm`, with two changes
of name and meaning:

- **`estimate`** is the change in **log odds** per unit of the predictor.
- **`statistic`** is a *z* value, not a *t* — the sampling distribution here is
  normal rather than *t*, so there are no residual degrees of freedom to report.

<CodeBlock id="c-glance" code={`m_left %>% glance()`} />

There is no *R*². `glance()` gives the null and residual deviance and the AIC
instead. Deviance is the logistic analogue of a residual sum of squares: lower is
better, and the drop from null to residual is what the model bought.

<CodeBlock id="c-lrtest" code={`anova(m_left, test = "LRT") %>% tidy()`} />

That likelihood-ratio test is the closest thing to the model *F* of Module 10: it
asks whether the predictors together explain more than chance.

<Exercise id="m14-2-b" />

<Quiz
  id="q-family"
  question="What does family = binomial actually change?"
  choices={[
    { text: 'It tells R the predictors are categorical', response: 'The family describes the outcome, not the predictors. Predictors can be anything.' },
    { text: 'It says the outcome is a yes/no event and models its log odds as a linear function of the predictors', correct: true, response: 'Correct: a distribution for the outcome and a link function for the scale, which is what "generalised" means.' },
    { text: 'It makes the p values more conservative', response: 'It changes the model entirely, not the strictness of a test.' },
    { text: 'It standardises the coefficients', response: 'Nothing is standardised. The coefficients are in log odds per original unit of each predictor.' },
  ]}
/>

<Interpret
  id="i-14-2"
  question="Your model gives, for wellbeing, b = -0.062, SE = 0.013, z = -4.77, p < .001, and for tenure b = -0.108, SE = 0.031, z = -3.48, p < .001. Which reading is correct?"
  choices={[
    { text: 'Each additional point of wellbeing reduces the probability of leaving by 0.062.', response: 'The coefficient is in log odds, not in probability. How much the probability moves depends on where on the curve you start.' },
    { text: 'Holding tenure constant, each additional point of wellbeing was associated with a decrease of 0.062 in the log odds of leaving, b = -0.062, SE = 0.013, z = -4.77, p < .001.', correct: true, response: 'Correct: the scale is named, the adjustment is named, and the statistics are reported in full.' },
    { text: 'Wellbeing and tenure both had large effects, since both p values are below .001.', response: 'p measures surprise under the null, not size. With 480 employees a modest effect reaches p < .001 easily.' },
    { text: 'Employees with higher wellbeing are 6.2 % less likely to leave.', response: 'That converts a log odds into a percentage as though they were the same scale. Exponentiate first, and even then an odds ratio is not a percentage change in risk.' },
  ]}
/>
````

- [x] **Step 5: Write `src/content/lessons/14-3-odds-ratios-and-reporting.mdx`**

````mdx
Log odds are the right scale for fitting and the wrong scale for writing. Nobody
has an intuition for −0.062 log odds. Exponentiate, and you get a number people
can argue about.

<CodeBlock id="c-load" code={`library(dplyr)
library(broom)

d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

d %>%
  group_by(left_company) %>%
  summarise(n = n(), mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing))

m_left <- glm(left_company ~ wellbeing + tenure_years, data = d, family = binomial)
m_left %>% tidy()`} />

## The odds ratio

<CodeBlock id="c-or" code={`exp(coef(m_left))`} />

An odds ratio **multiplies**. An OR of 0.94 for wellbeing means that each extra
point of wellbeing multiplies the odds of leaving by 0.94 — a 6 % reduction in
the odds, applied again for every further point. Ten points multiply the odds by
0.94 to the power of ten.

The null value is **1**, not 0. Exponentiating moved it along with everything
else, which is why a confidence interval for an odds ratio is read against 1.

<CodeBlock id="c-table" code={`or_table <- exp(cbind(OR = coef(m_left), confint(m_left)))

round(or_table, 3)`} />

`confint()` builds the interval on the log-odds scale and `exp()` transforms the
whole thing, estimate and bounds together. Doing it the other way round — an
interval around the exponentiated estimate — gives a symmetric interval on a
scale where the quantity is not symmetric, and it is wrong.

The message `Waiting for profiling to be done...` is R computing
profile-likelihood bounds rather than the quicker Wald approximation. It is a
message, not a warning, and the intervals are the better ones.

<Predict
  id="p-or"
  question="The odds ratio for tenure is 0.90, with a 95 % interval from 0.85 to 0.95. Is the effect of tenure significant at the .05 level?"
  choices={[
    { text: 'Yes, because the interval does not contain 1', correct: true, response: 'Right. On the odds-ratio scale, 1 means no effect - the value 0 has been transformed away.' },
    { text: 'No, because the interval contains values below 1', response: 'Every value in the interval is below 1, which is what a protective effect looks like.' },
    { text: 'Yes, because the interval does not contain 0', response: 'True but irrelevant: an odds ratio can never be 0, so that test would call everything significant.' },
    { text: 'Impossible to tell without the p value', response: 'A 95 % interval and a test at .05 carry the same information. The interval also tells you the plausible sizes.' },
  ]}
/>

<Exercise id="m14-3-a" />

## Odds ratios are not risk ratios

This is the misreading that reaches print most often. An odds ratio of 2 does
**not** mean the event is twice as likely.

<CodeBlock id="c-or-vs-rr" code={`p1 <- 0.10
p2 <- 0.20

c(
  risk_ratio = p2 / p1,
  odds_ratio = (p2 / (1 - p2)) / (p1 / (1 - p1))
)

q1 <- 0.40
q2 <- 0.60

c(
  risk_ratio = q2 / q1,
  odds_ratio = (q2 / (1 - q2)) / (q1 / (1 - q1))
)`} />

When the outcome is rare the two are close. When it is common they diverge
sharply, and the odds ratio always looks like the bigger effect. Say "the odds of
leaving", not "the chance of leaving", and the sentence stays true.

## Back to probabilities

For readers who want a probability, give them one at a stated value of the
predictors.

<CodeBlock id="c-predict" code={`profiles <- data.frame(
  wellbeing = c(50, 60, 70),
  tenure_years = rep(mean(d$tenure_years), 3)
)

profiles %>%
  mutate(predicted_probability = predict(m_left, newdata = profiles, type = "response"))`} />

`type = "response"` returns probabilities; without it you get log odds. Notice
that the three gaps are not equal even though the wellbeing values are evenly
spaced — the curve is steepest in the middle, so the same change in the predictor
buys a different change in probability depending on where you start. That is
exactly the non-linearity the model was chosen for, and the reason a single
"effect on the probability" does not exist.

## Reporting it

> A logistic regression predicting whether an employee left the company from
> wellbeing and tenure was a significant improvement on the null model,
> χ²(2) = 38.11, *p* < .001. Lower wellbeing was associated with higher odds of
> leaving, *OR* = 0.94, 95 % CI [0.92, 0.97], *z* = −4.77, *p* < .001, as was
> shorter tenure, *OR* = 0.90, 95 % CI [0.85, 0.95], *z* = −3.48, *p* < .001.

<CodeBlock id="c-lrt" code={`anova(m_left, test = "LRT") %>% tidy()

m_left %>% glance() %>% select(null.deviance, df.null, deviance, df.residual, AIC)`} />

What that report contains, and why each part is there: the model test against the
null, so the reader knows the predictors do something; the odds ratio, so they
know the direction and size; the confidence interval, so they know the precision;
*z* and *p*, because a journal will ask. Report *OR* and its interval together —
an odds ratio with no interval is an estimate with no error bar.

<Quiz
  id="q-or-rr"
  question="A study of a common outcome (about 40 % of people) reports OR = 2.0. A newspaper writes 'twice as likely'. What is wrong?"
  choices={[
    { text: 'Nothing; an odds ratio of 2 means twice as likely', response: 'That is true only when the outcome is rare. At 40 % the two diverge substantially.' },
    { text: 'An odds ratio compares odds, not probabilities. At a 40 % baseline an OR of 2.0 corresponds to a probability rising to about 57 %, a risk ratio near 1.4', correct: true, response: 'Correct, and that gap between 2.0 and 1.4 is the whole reason the distinction matters.' },
    { text: 'The odds ratio should have been reported as a percentage', response: 'An OR is a ratio and is reported as one. The problem is the translation, not the format.' },
    { text: 'Odds ratios cannot exceed 1', response: 'They run from 0 to infinity. Above 1 means the event becomes more likely.' },
  ]}
/>

<Interpret
  id="i-14-3"
  question="Your final model gives, for wellbeing, OR = 0.94, 95 % CI [0.92, 0.97], z = -4.77, p < .001, with a likelihood-ratio test of the model against the null of chi-square(2) = 38.11, p < .001, on 480 employees of whom 97 left. Which write-up is correct APA 7?"
  choices={[
    { text: 'A logistic regression predicting whether an employee left the company (97 of 480) from wellbeing and tenure improved significantly on the null model, chi-square(2) = 38.11, p < .001. Each additional point of wellbeing was associated with lower odds of leaving, OR = 0.94, 95 % CI [0.92, 0.97], z = -4.77, p < .001.', correct: true, response: 'Correct: the base rate, the model test, the odds ratio with its interval, and "odds" rather than "chance".' },
    { text: 'Employees with higher wellbeing were 6 % less likely to leave, OR = 0.94, 95 % CI [0.92, 0.97], p < .001.', response: 'It reads the odds ratio as a risk ratio. With 20 % leaving, a 6 % reduction in the odds is not a 6 % reduction in the probability.' },
    { text: 'Wellbeing protected employees from leaving, OR = 0.94, p < .001.', response: 'Two problems: "protected" is causal in an observational study, and the confidence interval is missing.' },
    { text: 'Wellbeing significantly predicted leaving, OR = 0.94, 95 % CI [0.92, 0.97], z = -4.77, p < .001; since the interval excludes 0, the effect is reliable.', response: 'Everything is right except the last clause. An odds ratio is tested against 1, and an interval excluding 0 would be true of every odds ratio ever computed.' },
  ]}
/>
````

- [x] **Step 6: Add Module 14 assertions to `src/content/exercises/index.test.ts`**

```ts
describe('Module 14', () => {
  const module14 = ALL_EXERCISES.filter((exercise) => exercise.id.startsWith('m14-'));

  test('defines all four exercises', () => {
    expect(module14.map((exercise) => exercise.id)).toEqual([
      'm14-1-a', 'm14-2-a', 'm14-2-b', 'm14-3-a',
    ]);
  });

  test('every check that reads a glm verifies the binomial family', () => {
    // glm() without family = binomial runs, prints a plausible table, and is an
    // ordinary linear model. Only family() can tell.
    for (const exercise of module14) {
      if (!/family = binomial/.test(exercise.solution)) continue;
      expect(exercise.check, `${exercise.id}`).toMatch(/family\(/);
    }
  });

  test('the logistic exercises rehearse a missing family as a wrong answer', () => {
    const fit = module14.find((exercise) => exercise.id === 'm14-2-a')!;
    expect(fit.wrongAnswers.some((code) => /glm\([^)]*data = d\)/.test(code))).toBe(true);
  });

  test('the odds-ratio exercises rehearse exponentiating the wrong thing', () => {
    const ors = module14.find((exercise) => exercise.id === 'm14-2-b')!;
    const table = module14.find((exercise) => exercise.id === 'm14-3-a')!;
    expect(ors.wrongAnswers.some((code) => code.includes('Std. Error'))).toBe(true);
    expect(table.wrongAnswers.some((code) => /^(?!.*exp\().*cbind\(OR/s.test(code))).toBe(true);
  });

  test('the profile-interval tolerance carries its reason', () => {
    const table = module14.find((exercise) => exercise.id === 'm14-3-a')!;
    expect(table.check).toMatch(/#[^\n]*profile-likelihood/);
  });
});
```

- [x] **Step 7: Run the static content tests**

Run: `npx vitest run src/content/content.test.ts src/content/exercises/index.test.ts`
Expected: PASS, and `MODULES` now contains Modules 6 and 9 through 14. This is the run that first exercises `every planned exercise id is unique across the course` against all twenty-six ids in this plan.

- [x] **Step 8: Run the R validator over Module 14**

Run: `npx vitest run src/content/exercises/validate.itest.ts -t "m14-"`
Expected: four solutions pass, seventeen wrong answers all `fail`, eight alternate solutions pass. `m14-3-a`'s check calls `confint()` twice, each of which profiles the likelihood, so allow it time.

Then: `npx vitest run src/content/exercises/validate.itest.ts -t "14-"`. Expected: no R error. `confint()` emits `Waiting for profiling to be done...` as a **message**; the evaluation wrapper captures messages separately from errors and the lesson run stays green. If it comes back as an error, step 0's fallback applies.

- [ ] **Step 9: Verify Module 14 in the browser**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/14-1`.
Expected: the linear-probability plot draws with the fitted line crossing both dashed limits, and `impossible` prints a non-zero count. On `14-2`, `family(no_family)$family` prints `gaussian` beside `binomial` — that contrast is the lesson's point and must actually render. On `14-3`, `confint()` shows its profiling message in the output pane styled as a message rather than an error, `round(or_table, 3)` prints a 3 x 3 table, and `predict(..., type = "response")` returns three probabilities that are unevenly spaced.

- [x] **Step 10: Commit**

```bash
git add src/content/manifest.ts src/content/exercises/module-14.ts src/content/exercises/index.test.ts src/content/lessons/14-1-why-not-a-linear-model.mdx src/content/lessons/14-2-glm-and-log-odds.mdx src/content/lessons/14-3-odds-ratios-and-reporting.mdx
git commit -m "feat: Module 14, binary outcomes and logistic regression"
```

---

### Task M15: Wire the chooser to the lessons

**Files:**
- Modify: `src/pages/TestChooser.tsx`, `src/pages/TestChooser.test.tsx`
- Test: `src/pages/TestChooser.test.tsx`

**Interfaces:**
- Consumes: `findLesson` (`src/content/manifest.ts`), which resolves against `MODULES` — the **derived** list, containing only modules whose lesson files all exist (content-platform P3 step 3).
- Produces: a `lessonId` on all eight answer leaves of `TREE`, and a link that names the lesson it goes to.

> **This task runs last.** `findLesson` reads `MODULES`, and a module is in `MODULES` only when every one of its lesson files is on disk. A `lessonId` added before its module's task has completed resolves to `undefined`, the link renders without a title, and the test that every `lessonId` resolves fails. Do M9 through M14 first, then this.

> **The file may be called something else by then.** The reconciled spec's §4.2 settles the chooser's three names on *model*: §12 requires `TestChooser.tsx` renamed to `ModelChooser.tsx`, the route moved from `/which-test` to `/which-model`, and a redirect left behind, touching `App.tsx`, `Sidebar.tsx`, the component and its test. That rename is not this task's work and this task does not wait on it — the leaves and their `lessonId` property are the same either way. If the rename has already landed, read every `TestChooser` below as `ModelChooser`; if it has not, do the rename here as step 0 rather than leaving the repository with three names for one page.

Spec §4.2 requires the chooser to "link each leaf to the lesson that teaches it". Eight leaves, eight links. The rule for choosing which lesson, applied mechanically so a reviewer can check it: **the leaf links to the lesson in which the distinguishing call of its `rCode` is first fitted.** Where the module then continues (reading the output, the pairwise step), the lesson's own next-lesson control carries the student on, so no leaf needs two links.

| Leaf (`model`) | `lessonId` | Why that lesson |
|---|---|---|
| Simple linear regression | `09-2` | Where `lm(y ~ x)` is first fitted; `09-3` follows for `tidy()` and `glance()` |
| Multiple linear regression | `10-1` | Where the second predictor enters the formula |
| Linear model with a two-group predictor | `11-1` | The two-group lesson, and where the `t.test(var.equal = TRUE)` equivalence is demonstrated |
| Linear model with a categorical predictor | `11-2` | Dummy coding, the reference level and the overall *F*; `11-3` follows for `emmeans` |
| Linear model with an interaction (factorial design) | `12-2` | The only lesson that fits `Anova(type = "III")` with `contr.sum`, which is this leaf's snippet |
| Linear mixed-effects model | `13-2` | Where `lmer(... + (1 \| id))` is fitted |
| Linear mixed-effects model with a grouping factor | `13-3` | Where `(1 \| site)` and nesting are taught |
| Logistic regression | `14-2` | Where `glm(..., family = binomial)` is fitted; `14-3` follows for the odds-ratio table |

- [x] **Step 1: Add `lessonId` to all eight leaves**

In `src/pages/TestChooser.tsx`, add one property to each answer node. Nothing else in `TREE` changes — the `rCode`, `check`, `traditional` and `note` strings were written against this curriculum and are already correct.

```ts
// Simple linear regression
                    note: 'The slope b is the change in the outcome for each one-unit increase in the predictor.',
                    lessonId: '09-2',

// Multiple linear regression
                    note: 'Each b is the change in the outcome for a one-unit increase in that predictor, holding the other predictors constant. Report R², F and each b with its SE, t and p.',
                    lessonId: '10-1',

// Two-group predictor
                    note: 'The slope is the difference between the two group means. Always look at the means: the sign of b depends on which group R took as the reference.',
                    lessonId: '11-1',

// Categorical predictor, three or more groups
                    note: 'Each b compares one group with the reference group. glance() gives the overall F; emmeans gives every pairwise comparison, corrected for multiple testing.',
                    lessonId: '11-2',

// Interaction / factorial
                    note: 'The contrasts = list(...) line matters: type III tests of the main effects are only correct with sum-to-zero contrasts, and R does not use those by default. An interaction means the effect of one factor depends on the level of the other: in an interaction plot, the lines are not parallel.',
                    lessonId: '12-2',

// Mixed-effects model, repeated measures
              note: '(1 | id) gives every person their own starting level, so the model knows which scores belong together. Setting the factor levels makes "before" the reference, so the time coefficient is the change from before to after. Unlike repeated-measures ANOVA, it keeps people who missed a measurement.',
              lessonId: '13-2',

// Mixed-effects model with a grouping factor
              note: 'People in the same site are more alike than people in different sites; (1 | site) accounts for that. If people are also measured repeatedly, nest them: (1 | site/id).',
              lessonId: '13-3',

// Logistic regression
        note: 'The coefficients are in log odds. exp() turns them into odds ratios: above 1, the outcome becomes more likely; below 1, less likely.',
        lessonId: '14-2',
```

> **If content-platform P1 step 8 found `lme4`/`lmerTest` unavailable**, leave `lessonId` off the two mixed-effects leaves — they stay as reference material with no link, exactly as overview open question 3 says — and drop those two rows from the test table in step 3.

- [x] **Step 2: Make the link name its lesson**

A link reading "Go to the lesson" tells the student nothing about where they are about to land. Pull the title out of the manifest. In `src/pages/TestChooser.tsx`:

```tsx
import { findLesson } from '../content/manifest';

/**
 * The link to the lesson a leaf teaches. findLesson reads MODULES, which holds
 * only modules whose lesson files all exist, so a lessonId added before its
 * module is written resolves to undefined. The link still works in that case —
 * the route renders its own not-found state — but it loses its title, which is
 * what the test in TestChooser.test.tsx watches for.
 */
function LessonLink({ lessonId }: { lessonId: string }) {
  const lesson = findLesson(lessonId);
  return (
    <p className="test-chooser-lesson">
      <Link to={`/lesson/${lessonId}`}>
        {lesson ? `Go to the lesson: ${lesson.title}` : 'Go to the lesson'}
      </Link>
    </p>
  );
}
```

and replace the bare link in the answer branch:

```tsx
          <p>{node.note}</p>
          {node.lessonId && <LessonLink lessonId={node.lessonId} />}
```

- [x] **Step 3: Extend the chooser tests**

In `src/pages/TestChooser.test.tsx`, add `lessonId` to each entry of the existing hand-written `PATHS` table — it is deliberately not derived from `TREE`, so a leaf that silently loses its link fails here:

```ts
const PATHS: { clicks: RegExp[]; model: string; code: string; lessonId: string }[] = [
  { clicks: [/^a number/i, /different people/i, /one continuous predictor/i],
    model: 'Simple linear regression', code: 'lm(outcome ~ predictor, data = d)', lessonId: '09-2' },
  { clicks: [/^a number/i, /different people/i, /several predictors/i],
    model: 'Multiple linear regression', code: 'outcome ~ predictor1 + predictor2', lessonId: '10-1' },
  { clicks: [/^a number/i, /different people/i, /with two groups/i],
    model: 'Linear model with a two-group predictor', code: 'group_by(group) %>% summarise(', lessonId: '11-1' },
  { clicks: [/^a number/i, /different people/i, /three or more groups/i],
    model: 'Linear model with a categorical predictor', code: 'emmeans(model, pairwise ~ group, adjust = "tukey")', lessonId: '11-2' },
  { clicks: [/^a number/i, /different people/i, /two grouping variables/i],
    model: 'Linear model with an interaction (factorial design)', code: 'contrasts = list(factor1 = contr.sum, factor2 = contr.sum)', lessonId: '12-2' },
  { clicks: [/^a number/i, /measured more than once/i],
    model: 'Linear mixed-effects model', code: 'pivot_longer', lessonId: '13-2' },
  { clicks: [/^a number/i, /teams, classes or sites/i],
    model: 'Linear mixed-effects model with a grouping factor', code: '(1 | site)', lessonId: '13-3' },
  { clicks: [/^yes or no/i],
    model: 'Logistic regression', code: 'family = binomial', lessonId: '14-2' },
];
```

Then add four tests:

```ts
test.each(PATHS)('$model links to lesson $lessonId', async ({ clicks, lessonId }) => {
  renderChooser();
  for (const name of clicks) {
    await userEvent.click(screen.getByRole('button', { name }));
  }
  const link = screen.getByRole('link', { name: /go to the lesson/i });
  expect(link.getAttribute('href')).toBe(`/lesson/${lessonId}`);
});

test('every leaf of the tree links to a lesson', () => {
  // Spec 4.2: the chooser "links each leaf to the lesson that teaches it". A leaf
  // with no lessonId is a dead end for the student who navigated to it.
  const answers: Extract<Node, { kind: 'answer' }>[] = [];
  (function walk(node: Node) {
    if (node.kind === 'answer') answers.push(node);
    else node.options.forEach((option) => walk(option.next));
  })(TREE);

  for (const answer of answers) {
    expect(answer.lessonId, `${answer.model} has no lessonId`).toBeDefined();
  }
});

test('every lessonId resolves to a lesson a student can open', () => {
  // findLesson reads MODULES, which contains a module only once all its lesson
  // files exist. This test therefore also proves Modules 9-14 are complete.
  (function walk(node: Node) {
    if (node.kind === 'answer') {
      if (node.lessonId) expect(findLesson(node.lessonId), `${node.model} -> ${node.lessonId}`).toBeDefined();
      return;
    }
    node.options.forEach((option) => walk(option.next));
  })(TREE);
});

test('the link names the lesson it goes to', async () => {
  renderChooser();
  await userEvent.click(screen.getByRole('button', { name: /^yes or no/i }));
  expect(screen.getByRole('link', { name: /go to the lesson: glm and log odds/i })).toBeTruthy();
});
```

The existing `every node in the tree is well formed` test already asserts that a
defined `lessonId` resolves; it now has eight of them to check rather than none,
and it stays as the guard against a typo in an id.

- [x] **Step 4: Run the chooser tests**

Run: `npx vitest run src/pages/TestChooser.test.tsx`
Expected: PASS, including the eight new per-path link assertions. A failure of `every lessonId resolves to a lesson a student can open` means one of Modules 9–14 is not yet live in `MODULES` — find the module whose lesson files are missing rather than deleting the `lessonId`.

- [x] **Step 5: Run the whole suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS. Then `npm run validate`, which now runs the static content tests and the full R suite over twenty-six exercises and eighteen lessons on top of everything the other module plans added. Record the wall time; if it has pushed the total past the twenty minutes content-platform task P4 step 5 set as the threshold, split `validate:static` from `validate:r` there rather than trimming fixtures here.

- [ ] **Step 6: Verify the chooser in the browser**

Run: `npm run dev`, then open `http://localhost:5173/statlab/which-test`.
Expected: walk all eight paths. Each answer shows its model, its R snippet, "Check first:", its note, and a link naming a real lesson; clicking the link lands on that lesson and the sidebar highlights it. Use "Start over" between paths and confirm focus moves to the heading each time. Check one leaf's promise against its lesson — the two-group leaf says the *t*-test matches with the sign reversed, and lesson `11-1` is where a student can run that and see it.

- [x] **Step 7: Commit**

```bash
git add src/pages/TestChooser.tsx src/pages/TestChooser.test.tsx
git commit -m "feat: link every chooser leaf to the lesson that teaches it"
```

---

## Self-Review

Run this after all seven tasks are complete, against spec §4.2, §7 and §7.1.

**Spec coverage**

| Spec section | Covered by |
|---|---|
| §4.1 `<Interpret>` closes every inferential lesson | All eighteen lessons; enforced by content-platform P4 step 2 |
| §4.2 The six-step chain named explicitly | `09-3` states it; every later lesson follows it |
| §4.2 Chooser links each leaf to the lesson that teaches it | M15 |
| §5.1 `ExerciseDef` contract, every field filled | M9–M14, step 2 of each |
| §5.2 Value-based checks, tolerance, `has_answer`/`answer` | Global Constraints; every check in this plan |
| §6 `correlation` and `leastsquares` embedded | M9 (`09-1`, `09-2`) |
| §7 Module 9, correlation and simple regression | M9 |
| §7 Module 10, multiple regression | M10 |
| §7 Module 11, categorical predictors | M11 |
| §7 Module 12, interactions and factorial designs | M12 |
| §7 Module 13, repeated measures and nested data | M13 |
| §7 Module 14, binary outcomes | M14 |
| §7.1 Tidyverse style, `tidy`/`glance`, base R only where there is no equivalent | Every lesson; `t.test`, `exp`, `confint`, `contr.sum`, `car::Anova` are the only base-R intrusions |
| §7.1 One model, many names — the *t*-test | `11-1`, exercise `m11-1-b` |
| §7.1 One model, many names — one-way ANOVA | `11-2` (`aov` beside `glance`) |
| §7.1 One model, many names — factorial ANOVA | `12-2` (`car::Anova(type = "III")`) |
| §7.1 One model, many names — the paired *t*-test | `13-3`, exercise `m13-3-a` |
| §7.1 One model, many names — chi-square | Not a lesson, by the spec's own rule; it stays a one-line mention on the chooser's logistic leaf |
| §7.1 Always look at the descriptives | Every model lesson; exercises `m9-3-b`, `m10-2-b`, `m11-2-b`, `m12-2-a`, `m13-1-a`, `m14-1-a` |
| §7.1 APA 7 reporting | The eighteen `<Interpret>` blocks; `10-3` teaches the conventions directly |
| §7.2 Workplace dataset, its documented effects | Consumed by all six modules; `wellbeing`, the `training` × `mentoring` interaction, the site intercepts and `left_company` each carry one |
| §8.1 Solutions pass, wrong answers fail via `pass = FALSE`, alternates pass | Step 8 of each module task |
| §8.2 Static content checks | Step 7 of each module task |

**Counts, so a reviewer can check the plan against itself**

| | M9 | M10 | M11 | M12 | M13 | M14 | Total |
|---|---|---|---|---|---|---|---|
| Lessons | 3 | 3 | 3 | 3 | 3 | 3 | 18 |
| Exercises | 5 | 4 | 5 | 4 | 4 | 4 | 26 |
| `<Interpret>` blocks | 3 | 3 | 3 | 3 | 3 | 3 | 18 |
| On-demand packages | — | — | `emmeans` | `car` | `lmerTest` | — | 3 of 4 |

**Deliberate deviations**

1. **Module 12's outcome is a change score**, `engagement_t2 - engagement_t1`, rather than `engagement_t2` itself. The spec names no variable; content-platform P2 put the designed `training` × `mentoring` interaction into the change, so a model of `engagement_t2` would find a much weaker effect diluted by between-employee differences in starting engagement. The change score is also the quantity Module 13 then re-analyses properly with a random intercept, which makes the two modules talk to each other.
2. **Module 12 computes simple effects from cell means rather than with `emmeans`.** The natural call is `emmeans(model, pairwise ~ training | mentoring)`, and it is what the chooser's factorial leaf shows, but the P3 package table gives lesson `12-3` only `dplyr` and `ggplot2`. Changing that table is a change to the content-platform plan, not something a module task may do; `12-3` therefore names `emmeans` in prose and points back to `11-3`. If the tables are ever revisited, adding `emmeans` to `12-3` is the first change to make.
3. **Two checks use a looser tolerance than 1e-6.** `m13-3-a` compares a mixed-model *t* with a paired *t* at 1e-3, and `m14-3-a` compares profile-likelihood bounds at 1e-4. Both are algebraic identities that survive only to several decimals once REML optimisation and profile root-finding are involved, and spec §5.2 permits a looser tolerance where a legitimate route differs slightly provided the check says why. Both carry that reason as an R comment at the comparison, and `index.test.ts` asserts the comment is there.
4. **`<Interpret>` questions state the statistics inline rather than quoting a printed output block.** `ChoiceBlock` renders `question` inside a single `<p>`, so a pasted table collapses into one unreadable line. Every question therefore carries its numbers in prose ("b = 2.24, SE = 0.20, t(478) = 11.24, p < .001"), and the correct option reports exactly those, which keeps the block self-contained and independent of the generated CSV's exact values.
5. **No check contains a numeric literal from `workplace.csv`.** Every check reads the CSV and refits the reference model. This costs a model fit per submission — noticeable in Module 13, where it is an `lmer` — and buys a course whose grading survives the dataset being regenerated. One fixture is still dataset-dependent and is flagged where it appears: `m11-2-b`'s "sorted by the mean" wrong answer relies on the mean and the median naming different departments, which content-platform P2 step 4 verifies before committing the file.
6. **The chooser mapping puts the factorial leaf on `12-2`, not `12-1`.** The rule is "the lesson in which the distinguishing call of the leaf's `rCode` is first fitted", and that leaf's snippet is `Anova(model, type = "III")` with `contr.sum`, which only `12-2` fits. Every other leaf lands on the first lesson of its module under the same rule.
7. **Module 9 depends on the simulations plan.** The overview says module tasks are independent of each other once the platform is in place; that is true of M10–M14 but not of M9, which embeds `correlation` and `leastsquares` and whose `content.test.ts` run fails until both are in the registry. It is recorded here rather than silently discovered.
8. **Module 13 is conditional on a verification outside this plan.** Everything in M13 assumes content-platform P1 step 8 confirmed that `lme4` and `lmerTest` install under webR 0.6.0. The fallback — the reshape plus the paired *t*-test, and two chooser leaves demoted to reference material — is stated in M13's Interfaces and in M15 step 1 rather than left to whoever hits the failure.
9. **`library(dplyr)` and `library(ggplot2)` appear in lessons that do not declare them.** Both are in `CORE_PACKAGES`, installed at boot, and the validator's `declared` set is a lesson's `packages` plus the core set — so this is allowed rather than tolerated. It is called out because the P3 table lists `dplyr` for some lessons and not others, which reads as an inconsistency until you know that field means "beyond the core".
