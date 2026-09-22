# StatLab — Modules 1–4 (Foundations) Implementation Plan

**Goal:** Write Part 1 of the curriculum — Modules 1 to 4 — as twelve lesson files, nineteen checked exercises with negative and alternate fixtures, and four manifest entries, so that a student who has never opened R can reach Module 5 able to load the workplace data, wrangle it with dplyr, describe it, and draw a figure that would survive a supervisor.

**Overview:** `docs/plans/2026-09-22-statlab-remaining-work-overview.md`

**Spec:** `docs/specs/2026-09-14-statlab-r-statistics-webapp-design.md` §7 (Modules 1–4), §7.1, §7.2, §4.1, §5

**Depends on:** the shell plan, merged to `main` as PR #1 on 2026-09-22; `content-platform` tasks P1 (per-lesson packages), P2 (`public/data/workplace.csv` generated, committed and in `DATASET_FILES`), P3 (`PLANNED_MODULES`, the stub exercise files, `ALL_EXERCISES`) and P4 (the validator rules). Nothing here depends on the simulations plan: Modules 1–4 embed no `<Simulation>`.

## Global Constraints

The shell plan's Global Constraints and the overview's content constraints apply in full. These are additional, and specific to Part 1.

- **Module 1 uses no dataset.** It teaches objects, vectors, functions, help and packages. Everything it computes on is typed into the lesson — inline vectors, and one six-row `data.frame` built by hand in Module 1 lesson 3. `read.csv` does not appear anywhere in Module 1; Module 2 lesson 1 is where a student first meets a file. Task M1 step 6 enforces this.
- **Modules 2–4 read only `public/data/workplace.csv`**, always as `read.csv("data/workplace.csv", stringsAsFactors = TRUE)`, and only the columns in the P2 codebook: `employee_id`, `department`, `site`, `remote`, `tenure_years`, `workload`, `autonomy`, `training`, `mentoring`, `wellbeing`, `engagement_t1`, `engagement_t2`, `performance`, `left_company`. A column that is not in that list does not exist, and inventing one produces a lesson whose code blocks fail the validator.
- **A lesson attaches only the packages its P3 row lists.** Lesson `02-1` lists none, so it is written in base R and contains no `library()` call at all — deliberately, because factors have to be understood before the pipe hides them. Lessons `04-1` and `04-3` list `ggplot2` only, so they contain no `%>%`: ggplot2 does not export the pipe, and a lesson that used it would break for the student who opens it first.
- **No check hard-codes a number or a level name read off the generated CSV.** Every check that needs a value from the data reads `data/workplace.csv` itself and recomputes it. `workplace.csv` is seeded, but P2 step 4 explicitly allows changing the seed if a designed effect fails to land, and a check with `62.4` or `"Engineering"` baked into it would then mark correct answers wrong. Task M3 step 6 enforces this for the module where the temptation is greatest.
- **ggplot2 checks inspect the plot object, never the rendered image and never the source text.** `ggplot2::layer_data(p, i)` returns the data frame a layer actually draws, which is the value-based evidence §5.2 asks for: it catches the wrong column, the wrong geom, a missing facet and a curved fit, and it passes every route that produces the same picture. `p$layers`, `p$labels` and `p$theme` carry the rest. Graphics capture stays off in Node, so no check may depend on an image being produced.
- **No exercise in Modules 1–4 involves randomness**, so none needs `setupCode` for a seed. `setupCode` appears exactly once, in `m1-3-a`, to put a small data frame in the attempt environment.
- **No `<Simulation>` in Modules 1–4.** Spec §7's table assigns none to them, and the registry would fail the content test for a name it does not hold.
- **Modules 1–4 are not inferential**, so P4's "every inferential lesson closes with an `<Interpret>`" rule does not reach them (`INFERENTIAL` is `/^(0[578]|1[0-4]|09)-/`). Two lessons carry one anyway — `03-3` and `04-3` — because both end in a claim that has to be written down in words, which is exactly what `<Interpret>` is for. See the Self-Review.
- **MDX hygiene.** Write `<-`, `%>%` and any `{` inside backticks or inside an attribute string, never bare in prose. R code inside `code={`…`}` contains no backtick and no `${`. Block ids are unique within a lesson file, counting `<Exercise id>` — `content.test.ts` reads every `id=` in the file.

## File Structure

```
src/content/
  manifest.ts                      + PLANNED_MODULES entries for modules 1-4
  content.test.ts                  + four module-specific assertions
  exercises/
    module-01.ts                   m1-1-a, m1-1-b, m1-2-a, m1-2-b, m1-3-a
    module-02.ts                   m2-1-a, m2-1-b, m2-2-a, m2-2-b, m2-3-a
    module-03.ts                   m3-1-a, m3-1-b, m3-2-a, m3-2-b, m3-3-a
    module-04.ts                   m4-1-a, m4-2-a, m4-2-b, m4-3-a
  lessons/
    01-1-objects-and-scripts.mdx
    01-2-functions-and-help.mdx
    01-3-packages-and-libraries.mdx
    02-1-reading-data.mdx
    02-2-pipe-and-verbs.mdx
    02-3-wide-and-long.mdx
    03-1-summaries.mdx
    03-2-group-by.mdx
    03-3-mean-vs-median.mdx
    04-1-ggplot-layers.mdx
    04-2-boxplots-and-facets.mdx
    04-3-scatter-and-apa.mdx
```

---

### Task M1: Module 1 — First steps in R

**Files:**
- Create: `src/content/lessons/01-1-objects-and-scripts.mdx`, `src/content/lessons/01-2-functions-and-help.mdx`, `src/content/lessons/01-3-packages-and-libraries.mdx`
- Modify: `src/content/exercises/module-01.ts`, `src/content/manifest.ts`, `src/content/content.test.ts`
- Test: `npx vitest run src/content/content.test.ts`, `npm run validate`

**Interfaces:**
- Consumes: `ExerciseDef` (`src/r/checker.ts`), `has_answer`/`answer`, `LessonMeta.packages` (P1), `PLANNED_MODULES` (P3), the MDX components `CodeBlock`, `Predict`, `Exercise`, `Quiz`
- Produces: `module01: ExerciseDef[]` with ids `m1-1-a`, `m1-1-b`, `m1-2-a`, `m1-2-b`, `m1-3-a`; three lesson files; the `module-01` entry in `PLANNED_MODULES`, which `MODULES` picks up once all three files exist

- [ ] **Step 1: Add the module to `PLANNED_MODULES`**

In `src/content/manifest.ts`, as the first element of `PLANNED_MODULES`:

```ts
  {
    id: 'module-01',
    number: 1,
    title: 'First steps in R',
    lessons: [
      {
        id: '01-1',
        title: 'Objects and scripts',
        file: '01-1-objects-and-scripts',
        exercises: ['m1-1-a', 'm1-1-b'],
      },
      {
        id: '01-2',
        title: 'Functions and getting help',
        file: '01-2-functions-and-help',
        exercises: ['m1-2-a', 'm1-2-b'],
      },
      {
        id: '01-3',
        title: 'Packages and library()',
        file: '01-3-packages-and-libraries',
        exercises: ['m1-3-a'],
        packages: ['dplyr'],
      },
    ],
  },
```

`dplyr` is in `CORE_PACKAGES`, so declaring it on `01-3` costs no extra download; it is declared because the overview requires every lesson that attaches a package to name it, and because the validator's "attaches no package it did not declare" rule reads that field.

- [ ] **Step 2: Write `src/content/exercises/module-01.ts`**

```ts
import type { ExerciseDef } from '../../r/checker';

export const module01: ExerciseDef[] = [
  {
    id: 'm1-1-a',
    prompt:
      'A tutor recorded five marks: 68, 74, 59, 81 and 77. Store them in a vector called marks, and store their mean in mark_mean.',
    starterCode:
      '# Put the five marks in one vector, then take their mean.\nmarks <- \nmark_mean <- ',
    solution: 'marks <- c(68, 74, 59, 81, 77)\nmark_mean <- mean(marks)',
    wrongAnswers: [
      // One mark dropped while typing: four values, and a mean of the four.
      'marks <- c(68, 74, 59, 81)\nmark_mean <- mean(marks)',
      // The middle value instead of the average.
      'marks <- c(68, 74, 59, 81, 77)\nmark_mean <- median(marks)',
      // Divided by the wrong n, counted by hand.
      'marks <- c(68, 74, 59, 81, 77)\nmark_mean <- sum(marks) / 4',
    ],
    alternateSolutions: [
      // The mean written out. Correct, and worth accepting: it is how the mean is defined.
      'marks <- c(68, 74, 59, 81, 77)\nmark_mean <- sum(marks) / length(marks)',
      // Growing the vector in two steps, which is what a student who types slowly does.
      'marks <- c(68, 74)\nmarks <- c(marks, 59, 81, 77)\nmark_mean <- mean(marks)',
    ],
    check: `
      if (!has_answer("marks") || !has_answer("mark_mean")) {
        list(pass = FALSE, message = "I need both marks (the five numbers) and mark_mean (their mean).")
      } else {
        marks <- answer("marks")
        mark_mean <- answer("mark_mean")
        expected <- c(68, 74, 59, 81, 77)
        if (!is.numeric(marks)) {
          list(pass = FALSE, message = "marks is not numeric. Quotation marks turn a number into text: write c(68, 74, 59, 81, 77), not c(\\"68\\", \\"74\\", ...).")
        } else if (length(marks) != 5L) {
          list(pass = FALSE, message = paste0("marks holds ", length(marks), " values, but the tutor recorded five. Check for a missing or repeated number."))
        } else if (!isTRUE(all.equal(sort(as.vector(marks)), sort(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "marks holds five numbers, but not the five marks in the prompt: 68, 74, 59, 81, 77.")
        } else if (!is.numeric(mark_mean) || length(as.vector(mark_mean)) != 1L) {
          list(pass = FALSE, message = "mark_mean should be a single number - the mean of all five marks.")
        } else if (isTRUE(all.equal(as.vector(mark_mean), median(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "That is the median: the middle mark once they are sorted. The mean adds them up and divides by how many there are.")
        } else if (isTRUE(all.equal(as.vector(mark_mean), sum(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "That is the total of the five marks. Divide it by 5 - or let mean() do both steps.")
        } else if (!isTRUE(all.equal(as.vector(mark_mean), mean(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("mark_mean is ", round(as.vector(mark_mean), 3), ", but the mean of those five marks is ", round(mean(expected), 2), ". Check what you divided by."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", round(mean(expected), 2), ". Notice that mean(marks) needed the vector, not the five numbers again - that is what storing them bought you."))
        }
      }
    `,
    hints: [
      'c() combines values into one vector: c(68, 74, 59, 81, 77).',
      'The arrow stores a result under a name: marks <- c(...).',
      'mean() takes the whole vector at once: mark_mean <- mean(marks).',
    ],
  },
  {
    id: 'm1-1-b',
    prompt:
      'Those five marks were out of 90. Store them as percentages in percent, in one line and without a loop, and store how many of them are above 85 percent in n_high.',
    starterCode:
      'marks <- c(68, 74, 59, 81, 77)\n\n# Turn the marks into percentages of 90, then count the ones above 85.\npercent <- \nn_high <- ',
    solution:
      'marks <- c(68, 74, 59, 81, 77)\npercent <- marks / 90 * 100\nn_high <- sum(percent > 85)',
    wrongAnswers: [
      // Divided, but never scaled to 100: every "percentage" is under 1.
      'marks <- c(68, 74, 59, 81, 77)\npercent <- marks / 90\nn_high <- sum(percent > 85)',
      // length() counts the comparisons, not the TRUEs.
      'marks <- c(68, 74, 59, 81, 77)\npercent <- marks / 90 * 100\nn_high <- length(percent > 85)',
      // Compared on the raw scale instead of the percentage scale.
      'marks <- c(68, 74, 59, 81, 77)\npercent <- marks / 90 * 100\nn_high <- sum(marks > 85)',
    ],
    alternateSolutions: [
      // which() then length(): the route a student who thinks in positions takes.
      'marks <- c(68, 74, 59, 81, 77)\npercent <- 100 * marks / 90\nn_high <- length(which(percent > 85))',
      // Scaling by a single factor, and counting with ifelse().
      'marks <- c(68, 74, 59, 81, 77)\npercent <- marks * (100 / 90)\nn_high <- sum(ifelse(percent > 85, 1, 0))',
    ],
    check: `
      if (!has_answer("percent") || !has_answer("n_high")) {
        list(pass = FALSE, message = "I need both percent (the five percentages) and n_high (how many are above 85).")
      } else {
        percent <- as.vector(answer("percent"))
        n_high <- as.vector(answer("n_high"))
        marks <- c(68, 74, 59, 81, 77)
        expected_percent <- marks / 90 * 100
        expected_n <- sum(expected_percent > 85)
        if (!is.numeric(percent) || length(percent) != 5L) {
          list(pass = FALSE, message = "percent should hold five numbers, one per mark. Dividing a vector divides every element at once, so no loop is needed.")
        } else if (isTRUE(all.equal(percent, marks / 90, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You divided by 90 but stopped there, so percent holds proportions under 1. Multiply by 100 to get percentages.")
        } else if (!isTRUE(all.equal(percent, expected_percent, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "percent is not marks / 90 * 100. Each mark is out of 90, so divide by 90 and scale to 100.")
        } else if (!is.numeric(n_high) || length(n_high) != 1L) {
          list(pass = FALSE, message = "n_high should be a single number: a count.")
        } else if (isTRUE(all.equal(n_high, 5, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You counted the comparisons, not the TRUEs. percent > 85 has five elements whatever the answer is; length() reports five. sum() adds the TRUEs, because R counts TRUE as 1.")
        } else if (isTRUE(all.equal(n_high, sum(marks > 85), tolerance = 1e-6, check.attributes = FALSE)) && expected_n != sum(marks > 85)) {
          list(pass = FALSE, message = "You compared the raw marks with 85, not the percentages. 85 percent of 90 is 76.5, so the two comparisons give different answers.")
        } else if (!isTRUE(all.equal(n_high, expected_n, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_high is ", n_high, ", but ", expected_n, " of the five percentages are above 85."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", expected_n, " of the five are above 85 percent. You did it without writing a single loop - compare, then sum."))
        }
      }
    `,
    hints: [
      'An operation on a vector happens to every element: marks / 90 gives five results.',
      'percent > 85 gives five TRUE or FALSE values, one per student.',
      'sum() of TRUE and FALSE counts the TRUEs, because R treats TRUE as 1.',
    ],
  },
  {
    id: 'm1-2-a',
    prompt:
      'Eight employees were asked for a wellbeing score, but one skipped the question: scores <- c(62, 58, NA, 71, 66, 60, 64, 57). Store the mean of the scores that were given in mean_score, and that mean rounded to one decimal place in mean_rounded.',
    starterCode:
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\n\n# mean() has an argument for missing values. Find it, then round to one decimal.\nmean_score <- \nmean_rounded <- ',
    solution:
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\nmean_score <- mean(scores, na.rm = TRUE)\nmean_rounded <- round(mean_score, 1)',
    wrongAnswers: [
      // The default: one NA makes the whole mean NA.
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\nmean_score <- mean(scores)\nmean_rounded <- round(mean_score, 1)',
      // round()'s second argument left out, so it rounds to whole numbers.
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\nmean_score <- mean(scores, na.rm = TRUE)\nmean_rounded <- round(mean_score)',
      // Dropped the NA from the total but not from the denominator.
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\nmean_score <- sum(scores, na.rm = TRUE) / length(scores)\nmean_rounded <- round(mean_score, 1)',
    ],
    alternateSolutions: [
      // Removing the missing value first, then using the default mean().
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\nmean_score <- mean(scores[!is.na(scores)])\nmean_rounded <- round(mean_score, digits = 1)',
      // The arithmetic written out, with the right denominator.
      'scores <- c(62, 58, NA, 71, 66, 60, 64, 57)\nmean_score <- sum(scores, na.rm = TRUE) / sum(!is.na(scores))\nmean_rounded <- round(mean_score, 1)',
    ],
    check: `
      if (!has_answer("mean_score") || !has_answer("mean_rounded")) {
        list(pass = FALSE, message = "I need both mean_score and mean_rounded.")
      } else {
        mean_score <- as.vector(answer("mean_score"))
        mean_rounded <- as.vector(answer("mean_rounded"))
        scores <- c(62, 58, NA, 71, 66, 60, 64, 57)
        expected <- mean(scores, na.rm = TRUE)
        if (length(mean_score) != 1L || length(mean_rounded) != 1L) {
          list(pass = FALSE, message = "Both answers should be single numbers.")
        } else if (is.na(mean_score)) {
          list(pass = FALSE, message = "mean_score is NA. That is R being careful: with one value missing, it cannot know the true mean, so it refuses to guess. Tell it to drop the missing value with na.rm = TRUE.")
        } else if (isTRUE(all.equal(mean_score, sum(scores, na.rm = TRUE) / length(scores), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You added the seven scores that exist but divided by eight. Seven people answered, so the denominator is seven.")
        } else if (!isTRUE(all.equal(mean_score, expected, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("mean_score is ", round(mean_score, 4), ", but the mean of the seven scores given is ", round(expected, 4), "."))
        } else if (isTRUE(all.equal(mean_rounded, round(expected, 0), tolerance = 1e-6, check.attributes = FALSE)) &&
                   !isTRUE(all.equal(round(expected, 0), round(expected, 1), tolerance = 1e-6))) {
          list(pass = FALSE, message = paste0("mean_rounded is ", round(expected, 0), ", which is rounded to a whole number. round() has a second argument, digits, and its default is 0: round(mean_score, 1)."))
        } else if (!isTRUE(all.equal(mean_rounded, round(expected, 1), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("mean_rounded should be ", round(expected, 1), "."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", round(expected, 4), ", reported as ", round(expected, 1), ". na.rm = TRUE is an argument you will type for the rest of your life - real data always has holes in it."))
        }
      }
    `,
    hints: [
      'args(mean) shows the arguments mean() accepts. One of them is about missing values.',
      'mean(scores, na.rm = TRUE) drops the NA and averages what is left.',
      'round() takes a second argument: round(mean_score, 1) keeps one decimal.',
    ],
  },
  {
    id: 'm1-2-b',
    prompt:
      'A questionnaire is scored from 0 to 100 in steps of 10. Use seq() to build that vector of scale points in scale_points, and store how many points it has in n_points.',
    starterCode:
      '# seq() builds a regular sequence. Check its arguments with args(seq).\nscale_points <- \nn_points <- ',
    solution:
      'scale_points <- seq(from = 0, to = 100, by = 10)\nn_points <- length(scale_points)',
    wrongAnswers: [
      // by and length.out confused: ten evenly spaced points, not steps of ten.
      'scale_points <- seq(from = 0, to = 100, length.out = 10)\nn_points <- length(scale_points)',
      // The colon operator always steps by one.
      'scale_points <- 0:100\nn_points <- length(scale_points)',
      // The classic fencepost: counted the steps, not the points.
      'scale_points <- seq(from = 0, to = 100, by = 10)\nn_points <- 10',
    ],
    alternateSolutions: [
      // Positional arguments, in seq()'s documented order.
      'scale_points <- seq(0, 100, 10)\nn_points <- length(scale_points)',
      // No seq() at all: eleven integers, scaled.
      'scale_points <- (0:10) * 10\nn_points <- length(scale_points)',
    ],
    check: `
      if (!has_answer("scale_points") || !has_answer("n_points")) {
        list(pass = FALSE, message = "I need both scale_points and n_points.")
      } else {
        scale_points <- as.vector(answer("scale_points"))
        n_points <- as.vector(answer("n_points"))
        expected <- seq(from = 0, to = 100, by = 10)
        if (!is.numeric(scale_points)) {
          list(pass = FALSE, message = "scale_points should be numbers.")
        } else if (length(scale_points) == 101L) {
          list(pass = FALSE, message = "0:100 steps by one, so you built 101 points. seq() lets you choose the step: by = 10.")
        } else if (length(scale_points) == 10L) {
          list(pass = FALSE, message = "length.out = 10 asks for ten evenly spaced points, which lands on 0, 11.1, 22.2 and so on. You want a step of ten: by = 10.")
        } else if (!isTRUE(all.equal(scale_points, expected, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "scale_points should be 0, 10, 20, ... , 100.")
        } else if (!is.numeric(n_points) || length(n_points) != 1L) {
          list(pass = FALSE, message = "n_points should be a single number.")
        } else if (isTRUE(all.equal(n_points, 10, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "There are ten steps of ten, but eleven points, because 0 is one of them. Do not count by hand - length(scale_points) always tells the truth.")
        } else if (!isTRUE(all.equal(n_points, length(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_points is ", n_points, ", but scale_points has ", length(expected), " values."))
        } else {
          list(pass = TRUE, message = "Correct: eleven points, 0 to 100 in tens. Naming arguments (from, to, by) makes a call like this readable a month later.")
        }
      }
    `,
    hints: [
      'args(seq) lists the arguments: from, to, by and length.out among them.',
      'by = 10 sets the step size; length.out sets how many values you get. You want the step.',
      'length() counts the values in a vector, so you never have to count them yourself.',
    ],
  },
  {
    id: 'm1-3-a',
    prompt:
      'The data frame team is already in your environment, with a name column and an hours column. Attach dplyr and use filter() to keep only the people who worked more than 35 hours. Store the result in busy and its number of rows in n_busy.',
    starterCode:
      'library(dplyr)\n\n# team is already here. Keep the rows where hours is above 35.\nbusy <- \nn_busy <- ',
    setupCode:
      'team <- data.frame(\n  name = c("Ada", "Bram", "Chen", "Dana", "Eva", "Finn"),\n  hours = c(32, 41, 38, 29, 35, 44),\n  stringsAsFactors = TRUE\n)',
    solution:
      'library(dplyr)\nbusy <- team %>% filter(hours > 35)\nn_busy <- nrow(busy)',
    wrongAnswers: [
      // The boundary: Eva worked exactly 35 hours, which is not more than 35.
      'library(dplyr)\nbusy <- team %>% filter(hours >= 35)\nn_busy <- nrow(busy)',
      // select() chooses columns, not rows: all six people survive.
      'library(dplyr)\nbusy <- team %>% select(hours)\nn_busy <- nrow(busy)',
      // length() of a data frame counts its columns.
      'library(dplyr)\nbusy <- team %>% filter(hours > 35)\nn_busy <- length(busy)',
    ],
    alternateSolutions: [
      // Base R subsetting: the route Module 1 says dplyr is an alternative to.
      'busy <- team[team$hours > 35, ]\nn_busy <- nrow(busy)',
      // Same rows, different order. The people are what matters, not their order.
      'library(dplyr)\nbusy <- team %>% filter(hours > 35) %>% arrange(name)\nn_busy <- nrow(busy)',
    ],
    check: `
      if (!has_answer("busy") || !has_answer("n_busy")) {
        list(pass = FALSE, message = "I need both busy (the filtered data frame) and n_busy (how many rows it has).")
      } else {
        busy <- answer("busy")
        n_busy <- as.vector(answer("n_busy"))
        expected_hours <- sort(c(41, 38, 44))
        if (!is.data.frame(busy)) {
          list(pass = FALSE, message = "busy should be a data frame - the rows of team that survived the filter.")
        } else if (!("hours" %in% names(busy))) {
          list(pass = FALSE, message = "busy has no hours column. filter() keeps every column and drops rows; it is select() that drops columns.")
        } else if (nrow(busy) == 6L) {
          list(pass = FALSE, message = "busy still has all six people. filter() chooses rows and select() chooses columns - only one of them can answer this question.")
        } else if (nrow(busy) == 4L) {
          list(pass = FALSE, message = "You kept four people, which means Eva is in there on exactly 35 hours. More than 35 is hours > 35, not hours >= 35.")
        } else if (!isTRUE(all.equal(sort(as.vector(busy$hours)), expected_hours, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("busy holds ", nrow(busy), " row(s), but the people above 35 hours are the ones on 38, 41 and 44."))
        } else if (!is.numeric(n_busy) || length(n_busy) != 1L) {
          list(pass = FALSE, message = "n_busy should be a single number.")
        } else if (isTRUE(all.equal(n_busy, ncol(busy), tolerance = 1e-6, check.attributes = FALSE)) && ncol(busy) != nrow(busy)) {
          list(pass = FALSE, message = paste0("n_busy is ", n_busy, ", which is how many columns busy has. A data frame is a list of columns, so length() counts columns; nrow() counts rows."))
        } else if (!isTRUE(all.equal(n_busy, 3, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_busy is ", n_busy, ", but busy has ", nrow(busy), " rows."))
        } else {
          list(pass = TRUE, message = "Correct: Bram, Chen and Finn. filter() takes a condition about a row and keeps the rows where it is TRUE - and it knew what hours meant without you writing team$hours.")
        }
      }
    `,
    hints: [
      'library(dplyr) attaches the package; the verbs only exist afterwards.',
      'filter() keeps rows: team %>% filter(hours > 35). Note that "more than 35" excludes 35 itself.',
      'nrow() counts the rows of a data frame; length() would count its columns.',
    ],
  },
];
```

Every wrong answer here is a mistake a first-week student actually makes — a dropped value, the median for the mean, `NA` from a missing score, `length()` where `sum()` was meant, `length()` where `nrow()` was meant, the fencepost, `>=` for `>`, `select()` for `filter()` — and every one fails through `pass = FALSE` rather than by erroring, which is what §8.1 requires of a negative fixture. Every alternate is a route the lesson has not taught but a student may know: the mean written out, `which()`, `ifelse()`, base subsetting, a re-ordered result.

- [ ] **Step 3: Write `src/content/lessons/01-1-objects-and-scripts.mdx`**

````mdx
R is a calculator that remembers things. Everything in this course — every
figure, every model — is built out of the two ideas in this lesson: you compute
something, and you give the result a name.

Start with the calculator half. Press **Run**.

<CodeBlock id="calculator" code={`3 + 4
12 / 5
sqrt(81)`} />

Each line was evaluated and its answer printed. Nothing was kept. Ask R for
`3 + 4` again and it will do the arithmetic again, from scratch.

## Giving a result a name

The arrow `<-` stores a result under a name. What you have stored is called an
**object**, and R keeps it for the rest of your session.

<CodeBlock id="assign" code={`hours <- 38
rate <- 24.5

hours * rate`} />

Two things are worth noticing. The first two lines printed nothing — storing a
value is a quiet act. And the third line used both objects by name, without
repeating either number.

> **Try it.** Change `hours` to 40 and run the block again. Nothing else in the
> block mentions 38, so the whole calculation follows on its own. That is the
> entire reason to name things.

Names are case sensitive: `hours` and `Hours` are two different objects, and
asking for one when you stored the other is the first error almost everyone
meets. A name may not start with a number and may not contain a space, which is
why R code is full of `mean_score` and `engagement_t1`.

## Comments

Everything after a `#` on a line is ignored by R. It is written for the human
reading the script — most often you, three weeks later, wondering what you were
doing.

<CodeBlock id="comment" code={`# Weekly pay, before tax.
weekly_pay <- hours * rate
weekly_pay`} />

<Predict
  id="p-vector"
  question="You have five exam marks to store. How many objects do you need?"
  choices={[
    { text: 'Five, one per mark', response: 'You could, and then every calculation would have to name all five by hand. R has something much better.' },
    { text: 'One, holding all five marks', correct: true, response: 'Yes. A vector is a single object holding many values of the same kind, and it is the workhorse of the language.' },
    { text: 'None, because R stores only one number at a time', response: 'The opposite is true. In R even a single number is really a vector that happens to have one element.' },
  ]}
/>

## Vectors

`c()` combines values into a **vector** — c for combine.

<CodeBlock id="vector" code={`marks <- c(68, 74, 59, 81, 77)

marks
length(marks)`} />

Functions that summarise take the whole vector at once. You never ask for the
values one at a time.

<CodeBlock id="summaries" code={`mean(marks)
min(marks)
max(marks)
sum(marks)`} />

## Arithmetic happens to every element

Here is the part that surprises people who have written other languages. An
operation on a vector is applied to every value in it, with no loop anywhere.

<CodeBlock id="vectorised" code={`marks + 2

marks / 90 * 100`} />

The first line gave all five students two marks of grace. The second turned
marks out of 90 into percentages. Comparisons behave the same way, except that
they produce TRUE and FALSE instead of numbers.

<CodeBlock id="logical" code={`marks > 70

sum(marks > 70)`} />

`sum()` of TRUE and FALSE counts the TRUEs, because R stores TRUE as 1 and FALSE
as 0. Compare, then sum: that idiom is how you count anything in R, and you will
use it in every module from here to the end of the course.

<Exercise id="m1-1-a" />

<Exercise id="m1-1-b" />

<Quiz
  id="q-1-1"
  question="You run scores <- c(4, 8, 15) and then scores * 2. What does scores contain afterwards?"
  choices={[
    { text: 'c(8, 16, 30)', response: 'Only if you had stored the result. scores * 2 computed a new vector, printed it, and let it go.' },
    { text: 'c(4, 8, 15)', correct: true, response: 'Right. An object changes only when you assign to it. Printing a calculation does not change its inputs.' },
    { text: 'An error, because a vector cannot be multiplied', response: 'Multiplying a vector by a number is exactly what R is built for: it multiplies every element.' },
    { text: 'c(4, 8, 15, 8, 16, 30)', response: 'R never appends a result to the object it came from. The original is untouched.' },
  ]}
/>
````

- [ ] **Step 4: Write `src/content/lessons/01-2-functions-and-help.mdx`**

````mdx
You have already used half a dozen functions: `c()`, `mean()`, `sqrt()`,
`length()`, `sum()`. A function takes inputs, does something with them, and
returns a result. The inputs are called **arguments**, and they go inside the
brackets.

Almost every difficulty a beginner has with R is really a difficulty with
arguments: which ones exist, what order they come in, and what happens to the
ones you leave out.

<CodeBlock id="basics" code={`round(3.14159, 2)

rep("Sales", 3)

seq(from = 1, to = 9, by = 2)`} />

## Arguments have names, and most have defaults

`args()` shows a function's arguments and the values it uses when you do not
supply them.

<CodeBlock id="args" code={`args(round)
args(seq)
args(mean)`} />

`round(x, digits = 0)` tells you two things at once: the second argument is
called `digits`, and if you leave it out R rounds to a whole number. So these
three calls are the same, and the third is the one to write in a script you will
re-read:

<CodeBlock id="named" code={`round(3.14159)
round(3.14159, 2)
round(3.14159, digits = 2)`} />

Naming an argument also frees you from its position. `seq(to = 9, from = 1, by = 2)`
works, and `seq(9, 1, 2)` does something quite different — it counts downwards
and fails, because R matched 9 to `from`.

> **In RStudio,** `?round` opens the full help page: every argument, the value
> returned, and worked examples at the bottom. Here, `args()` gives you the
> argument list, which is what you need nine times out of ten.

## Missing values

Real data has holes in it. Someone skipped a question; a sensor failed. R writes
a hole as `NA`, and it is deliberately infectious.

<CodeBlock id="na" code={`scores <- c(62, 58, NA, 71, 66)

scores
mean(scores)`} />

<Predict
  id="p-na"
  question="mean(scores) returned NA. Why would R refuse to average the four numbers it does have?"
  choices={[
    { text: 'Because NA counts as zero and drags the mean down', response: 'NA is not zero. Zero is a score someone gave; NA is a score nobody gave, and R keeps the difference.' },
    { text: 'Because the true mean depends on the missing value, and R will not guess it', correct: true, response: 'Exactly. The honest answer to "what is the average of these five" is "unknown", and R says so rather than quietly averaging four.' },
    { text: 'Because there is a typo in the vector', response: 'There is no typo. NA is a legitimate value meaning "not available".' },
  ]}
/>

Once you have decided that averaging the people who answered is what you want,
you say so:

<CodeBlock id="narm" code={`mean(scores, na.rm = TRUE)

sum(is.na(scores))`} />

`na.rm = TRUE` is an argument you will type for the rest of your working life.
`is.na()` tells you where the holes are, and `sum(is.na(x))` counts them — the
compare-then-sum idiom again.

<Exercise id="m1-2-a" />

## Functions inside functions

The result of one function can be the argument of the next. R works from the
inside out.

<CodeBlock id="nested" code={`round(mean(scores, na.rm = TRUE), 1)

length(seq(from = 0, to = 100, by = 10))`} />

Read the first line inside out: average the scores, ignoring the missing one,
then round to one decimal. It is compact, and once there are four or five
functions stacked up it becomes unreadable. Module 2 introduces the pipe, which
is R's answer to exactly that problem.

<Exercise id="m1-2-b" />

<Quiz
  id="q-1-2"
  question="args(round) reports round(x, digits = 0). What does that tell you about round(2.567)?"
  choices={[
    { text: 'It will fail, because digits is missing', response: 'An argument with a default is optional. Only x has no default, so only x is required.' },
    { text: 'It will round to a whole number, giving 3', correct: true, response: 'Right. digits = 0 in the argument list is the value R uses when you do not supply one.' },
    { text: 'It will keep all the decimals, giving 2.567', response: 'The default is 0 digits, not "leave it alone". Rounding to zero digits gives 3.' },
    { text: 'It will round to two digits, because there are two decimals in the input', response: 'R does not inspect the input to decide. It uses the default written in the argument list.' },
  ]}
/>
````

- [ ] **Step 5: Write `src/content/lessons/01-3-packages-and-libraries.mdx`**

````mdx
Everything you have used so far is **base R** — the functions that come with the
language. Almost everything else you will use in this course comes from a
**package**: a bundle of functions, documentation and sometimes data that
somebody else wrote and published.

There are two separate steps, and confusing them is the single most common
first-week frustration.

- `install.packages("dplyr")` downloads the package onto the machine. Once.
- `library(dplyr)` attaches it to the current session, so its functions become
  available by name. Every session.

Installing is like buying a book; attaching is like taking it off the shelf and
opening it. StatLab has already installed the packages this course uses, so you
will only ever type the second line.

<CodeBlock id="attach" code={`library(dplyr)`} />

That message about objects being masked is not an error. It is R telling you
that `dplyr::filter` has taken the name `filter` from a base R function of the
same name. From now on, `filter()` means dplyr's version — which is the one you
want.

## Something to use it on

Let us make a small data frame by hand. A **data frame** is a table: columns of
equal length, each with a name, each holding one kind of thing.

<CodeBlock id="team" code={`team <- data.frame(
  name = c("Ada", "Bram", "Chen", "Dana", "Eva", "Finn"),
  hours = c(32, 41, 38, 29, 35, 44),
  stringsAsFactors = TRUE
)

team`} />

<Predict
  id="p-library"
  question="You close R, reopen it tomorrow, and type team %>% filter(hours > 35). What happens?"
  choices={[
    { text: 'It works, because dplyr was installed yesterday', response: 'Installing is permanent, but attaching is not. A new session starts with base R only.' },
    { text: 'R cannot find filter or the pipe, until you attach dplyr again', correct: true, response: 'Right. library(dplyr) belongs at the top of every script, which is why every script you will ever read starts with a block of library() calls.' },
    { text: 'You have to install dplyr again first', response: 'The package is still on the machine. It simply is not attached to this session yet.' },
  ]}
/>

## The pipe

dplyr brings a piece of punctuation with it: `%>%`, the **pipe**. It takes what
is on its left and hands it to the function on its right as the first argument.

<CodeBlock id="pipe" code={`team %>% filter(hours > 35)

# The same thing, written inside out:
filter(team, hours > 35)`} />

Both give the same table. The pipe version reads left to right, in the order the
work happens — take the team, then keep the busy people — and that advantage
grows with every extra step. Module 2 is built on it.

Notice what `filter()` did **not** need: you wrote `hours`, not `team$hours`. A
dplyr verb already knows which table it is working inside.

<Exercise id="m1-3-a" />

## A note on the tidyverse

`dplyr` belongs to a family of packages that share a design: `ggplot2` for
figures, `tidyr` for reshaping, `broom` for reading model output. Together they
are called the **tidyverse**, and there is a meta-package that attaches the
whole family in one line:

    library(tidyverse)

You will see that line in almost every tutorial and in most R scripts written in
the last ten years, and in RStudio it is what you should write. StatLab does not
use it, for one practical reason: the meta-package pulls in about 34 MB of
packages this course never touches, and everything here downloads into your
browser. So each lesson attaches exactly what it needs, by name. The functions
are identical either way.

<Quiz
  id="q-1-3"
  question="A classmate sends you a script that starts with library(ggplot2) and it fails on their machine with 'there is no package called ggplot2'. What do they need to do?"
  choices={[
    { text: 'Run library(ggplot2) twice', response: 'Attaching a package that is not installed fails however many times you try it.' },
    { text: 'Install the package once with install.packages("ggplot2"), then attach it', correct: true, response: 'Right. The error is about the package not being on the machine; library() can only attach what is already there.' },
    { text: 'Remove the library() line, because the functions are built into R', response: 'ggplot2 is not part of base R. Without attaching it, ggplot() does not exist.' },
    { text: 'Put install.packages("ggplot2") at the top of the script instead', response: 'That works once, then re-downloads the package every time the script runs. Install in the console, attach in the script.' },
  ]}
/>
````

- [ ] **Step 6: Add the Module 1 assertions**

Append to `src/content/content.test.ts`, importing `PLANNED_MODULES` from `./manifest` and `module01` from `./exercises/module-01`:

```ts
test('Module 1 defines exactly its five exercises, in order', () => {
  expect(module01.map((exercise) => exercise.id)).toEqual([
    'm1-1-a', 'm1-1-b', 'm1-2-a', 'm1-2-b', 'm1-3-a',
  ]);
});

test('Module 1 teaches without a dataset', () => {
  // Module 1 is about objects, functions and packages. A student meets read.csv
  // for the first time in lesson 02-1, where factors are explained alongside it;
  // showing a file here would teach the incantation without the idea.
  const module = PLANNED_MODULES.find((m) => m.id === 'module-01')!;
  for (const lesson of module.lessons) {
    const source = sources[`./lessons/${lesson.file}.mdx`] ?? '';
    expect(source, `${lesson.id} reads a dataset`).not.toMatch(/read\.csv/);
  }
  for (const exercise of module01) {
    const code = [exercise.starterCode, exercise.solution, exercise.check].join('\n');
    expect(code, `${exercise.id} reads a dataset`).not.toMatch(/read\.csv/);
  }
});
```

Lesson `01-3` is the first lesson to name `library(tidyverse)` in prose — the
line students meet in every other tutorial, and the one thing this course never
runs — and its quiz quotes `library(ggplot2)` in a choice. Content-platform task
P3 step 4 already accounts for this: its "a live lesson attaches no package it
did not declare" rule scans `lessonCode(source)`, the contents of the
`<CodeBlock>` code literals, rather than the whole file. Confirm that helper is
present before running the suite; if the rule still scans the whole source,
`01-3` will fail it, and the fix is P3's, not a weakening here. The
forbidden-function rule still scans everything.

- [ ] **Step 7: Run the content tests and the validator**

Run: `npx vitest run src/content/content.test.ts`
Expected: PASS. `MODULES` now contains `module-01` and `module-06`, because all three Module 1 lesson files exist.

Run: `npm run validate`
Expected: PASS. For each of the five exercises the real R suite reports the solution passing, all three wrong answers failing with `pass = FALSE` (never "the student's code threw"), and both alternate solutions passing; every lesson's code blocks run in order in one fresh lesson environment without an error; and the exercises pass again in the environment the lesson leaves behind, where neither an empty submission nor the untouched starter code passes.

If a wrong answer is reported as erroring rather than failing, fix the fixture, not the check: an erroring wrong answer proves nothing about whether the check can tell right from wrong.

- [ ] **Step 8: Verify the lessons render**

Run: `npm run dev`, then open in turn:

- `http://localhost:5173/statlab/lesson/01-1`
- `http://localhost:5173/statlab/lesson/01-2`
- `http://localhost:5173/statlab/lesson/01-3`

Expected: **First steps in R** appears in the sidebar above **Sampling**, with its three lessons. Prose renders with no stray brackets. Every code block runs and prints. `01-3`'s first block prints dplyr's masking message rather than an error. Each `<Predict>` refuses to reveal its answer before a choice is made. Each exercise accepts its solution, rejects a wrong answer with the teaching message rather than a bare "incorrect", and reveals hints one at a time.

- [ ] **Step 9: Commit**

```bash
git add src/content/manifest.ts src/content/content.test.ts src/content/exercises/module-01.ts src/content/lessons/01-1-objects-and-scripts.mdx src/content/lessons/01-2-functions-and-help.mdx src/content/lessons/01-3-packages-and-libraries.mdx
git commit -m "feat: Module 1, first steps in R"
```

---

### Task M2: Module 2 — Working with data

**Files:**
- Create: `src/content/lessons/02-1-reading-data.mdx`, `src/content/lessons/02-2-pipe-and-verbs.mdx`, `src/content/lessons/02-3-wide-and-long.mdx`
- Modify: `src/content/exercises/module-02.ts`, `src/content/manifest.ts`, `src/content/content.test.ts`
- Test: `npx vitest run src/content/content.test.ts`, `npm run validate`

**Interfaces:**
- Consumes: `ExerciseDef`, `has_answer`/`answer`, `data/workplace.csv` (P2, mounted through `DATASET_FILES`), `LessonMeta.packages` (P1), `PLANNED_MODULES` (P3)
- Produces: `module02: ExerciseDef[]` with ids `m2-1-a`, `m2-1-b`, `m2-2-a`, `m2-2-b`, `m2-3-a`; three lesson files; the `module-02` entry in `PLANNED_MODULES`

- [ ] **Step 1: Add the module to `PLANNED_MODULES`**

```ts
  {
    id: 'module-02',
    number: 2,
    title: 'Working with data',
    lessons: [
      {
        id: '02-1',
        title: 'Reading data, and what a factor is',
        file: '02-1-reading-data',
        exercises: ['m2-1-a', 'm2-1-b'],
      },
      {
        id: '02-2',
        title: 'The pipe, and four verbs',
        file: '02-2-pipe-and-verbs',
        exercises: ['m2-2-a', 'm2-2-b'],
        packages: ['dplyr'],
      },
      {
        id: '02-3',
        title: 'Wide and long',
        file: '02-3-wide-and-long',
        exercises: ['m2-3-a'],
        packages: ['dplyr', 'tidyr'],
      },
    ],
  },
```

`02-1` declares no packages on purpose. It is the lesson where a student learns what a factor is, and base R's `str()`, `levels()` and `table()` show that more plainly than any dplyr verb would.

- [ ] **Step 2: Write `src/content/exercises/module-02.ts`**

```ts
import type { ExerciseDef } from '../../r/checker';

export const module02: ExerciseDef[] = [
  {
    id: 'm2-1-a',
    prompt:
      'Read data/workplace.csv into employees, with the text columns as factors. Store the number of employees in n_employees and the number of departments in n_departments.',
    starterCode:
      '# Read the file, then count the rows and the departments.\nemployees <- \nn_employees <- \nn_departments <- ',
    solution:
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nn_employees <- nrow(employees)\nn_departments <- nlevels(employees$department)',
    wrongAnswers: [
      // Without stringsAsFactors the text columns stay character, so they have no levels.
      'employees <- read.csv("data/workplace.csv")\nn_employees <- nrow(employees)\nn_departments <- nlevels(employees$department)',
      // ncol() counts the columns of the codebook, not the people.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nn_employees <- ncol(employees)\nn_departments <- nlevels(employees$department)',
      // length() of a column gives one entry per employee, not the number of distinct departments.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nn_employees <- nrow(employees)\nn_departments <- length(employees$department)',
    ],
    alternateSolutions: [
      // levels() then length(): what nlevels() is short for.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nn_employees <- nrow(employees)\nn_departments <- length(levels(employees$department))',
      // unique() works whether the column is a factor or not.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nn_employees <- length(employees$employee_id)\nn_departments <- length(unique(employees$department))',
    ],
    check: `
      if (!has_answer("employees") || !has_answer("n_employees") || !has_answer("n_departments")) {
        list(pass = FALSE, message = "I need employees (the data frame), n_employees and n_departments.")
      } else {
        employees <- answer("employees")
        n_employees <- as.vector(answer("n_employees"))
        n_departments <- as.vector(answer("n_departments"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        if (!is.data.frame(employees)) {
          list(pass = FALSE, message = "employees should be the data frame that read.csv() returns.")
        } else if (!("department" %in% names(employees))) {
          list(pass = FALSE, message = "employees has no department column. Read the whole file - the columns are the codebook.")
        } else if (nrow(employees) != nrow(d)) {
          list(pass = FALSE, message = paste0("employees has ", nrow(employees), " rows, but data/workplace.csv has ", nrow(d), "."))
        } else if (!is.factor(employees$department)) {
          list(pass = FALSE, message = "department arrived as plain text, so it has no levels for nlevels() to count. Add stringsAsFactors = TRUE to your read.csv() call and it becomes a factor.")
        } else if (isTRUE(all.equal(n_employees, ncol(d), tolerance = 1e-6, check.attributes = FALSE)) && ncol(d) != nrow(d)) {
          list(pass = FALSE, message = paste0("n_employees is ", n_employees, ", which is the number of columns. Each row is one employee, so you want nrow()."))
        } else if (!isTRUE(all.equal(n_employees, nrow(d), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_employees is ", n_employees, ", but the file holds ", nrow(d), " employees."))
        } else if (isTRUE(all.equal(n_departments, nrow(d), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "length(employees$department) gives one entry per employee - the whole column. The number of departments is the number of distinct values it can take: nlevels().")
        } else if (!isTRUE(all.equal(n_departments, nlevels(d$department), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_departments is ", n_departments, ", but there are ", nlevels(d$department), " departments."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", nrow(d), " employees in ", nlevels(d$department), " departments (", paste(levels(d$department), collapse = ", "), "). Those four names are the levels of the factor, and R will keep them in that order everywhere - in tables, in plots, and in every model you fit from Module 9 on."))
        }
      }
    `,
    hints: [
      'read.csv("data/workplace.csv", stringsAsFactors = TRUE) reads the file and turns the text columns into factors.',
      'Each row is one employee, so nrow() counts employees.',
      'A factor stores its possible values as levels; nlevels() counts them.',
    ],
  },
  {
    id: 'm2-1-b',
    prompt:
      'How many people work remotely? Store the counts of the remote column in remote_counts, and the number of remote employees alone in n_remote.',
    starterCode:
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\n# Count the two kinds of employee, then pull out the remote one.\nremote_counts <- \nn_remote <- ',
    solution:
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nremote_counts <- table(employees$remote)\nn_remote <- remote_counts[["Yes"]]',
    wrongAnswers: [
      // The first level is No, not Yes: factor levels are alphabetical.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nremote_counts <- table(employees$remote)\nn_remote <- remote_counts[[1]]',
      // length() of a comparison counts the employees, not the TRUEs.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nremote_counts <- table(employees$remote)\nn_remote <- length(employees$remote == "Yes")',
      // Proportions where counts were asked for.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nremote_counts <- table(employees$remote) / nrow(employees)\nn_remote <- remote_counts[["Yes"]]',
    ],
    alternateSolutions: [
      // Single brackets keep the name; the value is the same.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nremote_counts <- table(employees$remote)\nn_remote <- remote_counts["Yes"]',
      // Compare then sum, without touching the table at all.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nremote_counts <- table(employees$remote)\nn_remote <- sum(employees$remote == "Yes")',
    ],
    check: `
      if (!has_answer("remote_counts") || !has_answer("n_remote")) {
        list(pass = FALSE, message = "I need remote_counts (the two counts) and n_remote (how many work remotely).")
      } else {
        remote_counts <- answer("remote_counts")
        n_remote <- as.vector(answer("n_remote"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        expected <- table(d$remote)
        if (length(remote_counts) != 2L) {
          list(pass = FALSE, message = paste0("remote_counts has ", length(remote_counts), " entries. remote has two levels, No and Yes, so counting it gives two numbers."))
        } else if (!setequal(names(remote_counts), names(expected))) {
          list(pass = FALSE, message = "remote_counts should be labelled No and Yes. Count the remote column, not another one.")
        } else if (isTRUE(all.equal(sum(as.vector(remote_counts)), 1, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Your two numbers add up to 1, so they are proportions. The question asks for counts - how many people, not what share of them.")
        } else if (!isTRUE(all.equal(as.vector(remote_counts[names(expected)]), as.vector(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("The counts do not match the file, which has ", expected[["No"]], " office-based and ", expected[["Yes"]], " remote employees."))
        } else if (!is.numeric(n_remote) || length(n_remote) != 1L) {
          list(pass = FALSE, message = "n_remote should be a single number.")
        } else if (isTRUE(all.equal(n_remote, as.vector(expected[["No"]]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "That is the office-based count. Factor levels are alphabetical, so No comes first and position 1 is not the one you want. Ask for it by name instead: remote_counts[[\\"Yes\\"]].")
        } else if (isTRUE(all.equal(n_remote, nrow(d), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "That is everybody. employees$remote == \\"Yes\\" gives one TRUE or FALSE per person, so length() reports all of them; sum() counts the TRUEs.")
        } else if (!isTRUE(all.equal(n_remote, as.vector(expected[["Yes"]]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_remote is ", n_remote, ", but ", expected[["Yes"]], " employees work remotely."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", expected[["Yes"]], " of ", nrow(d), " work remotely. Indexing a table by name rather than by position is a habit worth forming - the order of the levels is not something you chose."))
        }
      }
    `,
    hints: [
      'table() counts how often each level of a factor appears: table(employees$remote).',
      'A table can be indexed by the name of a level, with double square brackets.',
      'Levels are alphabetical, so No is first and Yes is second. Ask for the name, not the position.',
    ],
  },
  {
    id: 'm2-2-a',
    prompt:
      'Build sales_remote: the employees in Sales who work remotely, keeping only the columns employee_id, tenure_years and wellbeing. Store its number of rows in n_sales_remote.',
    starterCode:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\n# Two conditions, then three columns.\nsales_remote <- employees %>%\n  \nn_sales_remote <- ',
    solution:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsales_remote <- employees %>%\n  filter(department == "Sales", remote == "Yes") %>%\n  select(employee_id, tenure_years, wellbeing)\nn_sales_remote <- nrow(sales_remote)',
    wrongAnswers: [
      // A vertical bar is OR: everyone in Sales plus everyone remote.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsales_remote <- employees %>%\n  filter(department == "Sales" | remote == "Yes") %>%\n  select(employee_id, tenure_years, wellbeing)\nn_sales_remote <- nrow(sales_remote)',
      // The filtering columns kept as well, which was not asked for.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsales_remote <- employees %>%\n  filter(department == "Sales", remote == "Yes") %>%\n  select(employee_id, department, remote, tenure_years, wellbeing)\nn_sales_remote <- nrow(sales_remote)',
      // The count taken from the table that was never filtered.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsales_remote <- employees %>%\n  filter(department == "Sales", remote == "Yes") %>%\n  select(employee_id, tenure_years, wellbeing)\nn_sales_remote <- nrow(employees)',
    ],
    alternateSolutions: [
      // Two filters in a row mean the same as one filter with two conditions.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsales_remote <- employees %>%\n  filter(department == "Sales") %>%\n  filter(remote == "Yes") %>%\n  select(employee_id, tenure_years, wellbeing)\nn_sales_remote <- nrow(sales_remote)',
      // Base R subsetting: rows before the comma, columns after it.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nsales_remote <- employees[employees$department == "Sales" & employees$remote == "Yes", c("employee_id", "tenure_years", "wellbeing")]\nn_sales_remote <- nrow(sales_remote)',
    ],
    check: `
      if (!has_answer("sales_remote") || !has_answer("n_sales_remote")) {
        list(pass = FALSE, message = "I need sales_remote (the filtered table) and n_sales_remote (its row count).")
      } else {
        sales_remote <- answer("sales_remote")
        n_sales_remote <- as.vector(answer("n_sales_remote"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        keep <- d$department == "Sales" & d$remote == "Yes"
        expected_ids <- sort(as.vector(d$employee_id[keep]))
        either <- sum(d$department == "Sales" | d$remote == "Yes")
        wanted <- c("employee_id", "tenure_years", "wellbeing")
        if (!is.data.frame(sales_remote)) {
          list(pass = FALSE, message = "sales_remote should be a data frame.")
        } else if (!all(wanted %in% names(sales_remote))) {
          list(pass = FALSE, message = "sales_remote should keep employee_id, tenure_years and wellbeing. At least one of them is missing.")
        } else if (nrow(sales_remote) == either) {
          list(pass = FALSE, message = paste0("You have ", either, " rows, which is everyone who is in Sales OR works remotely. A comma between two conditions in filter() means AND; a vertical bar means OR."))
        } else if (nrow(sales_remote) == nrow(d)) {
          list(pass = FALSE, message = "sales_remote still holds every employee. filter() returns a new table - make sure you assigned its result.")
        } else if (!isTRUE(all.equal(sort(as.vector(sales_remote$employee_id)), expected_ids, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("sales_remote holds ", nrow(sales_remote), " employees, but ", length(expected_ids), " people are in Sales and remote. Check both conditions."))
        } else if (ncol(sales_remote) != 3L) {
          list(pass = FALSE, message = paste0("The right people, but ", ncol(sales_remote), " columns instead of three. select() lists what you keep; the columns you filtered on do not have to be among them, because filtering already happened."))
        } else if (!is.numeric(n_sales_remote) || length(n_sales_remote) != 1L) {
          list(pass = FALSE, message = "n_sales_remote should be a single number.")
        } else if (isTRUE(all.equal(n_sales_remote, nrow(d), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You counted the rows of employees, not of sales_remote. Count the table you built.")
        } else if (!isTRUE(all.equal(n_sales_remote, length(expected_ids), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_sales_remote is ", n_sales_remote, ", but sales_remote has ", nrow(sales_remote), " rows."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", length(expected_ids), " remote employees in Sales. Note how the pipe reads in the order the work happens - take the employees, then keep some rows, then keep some columns."))
        }
      }
    `,
    hints: [
      'filter() chooses rows. Two conditions separated by a comma both have to hold.',
      'select() chooses columns, and you name them without quotes: select(employee_id, tenure_years, wellbeing).',
      'Chain them with the pipe, then count with nrow(sales_remote).',
    ],
  },
  {
    id: 'm2-2-b',
    prompt:
      'Every employee was measured twice. Add a column engagement_change holding engagement_t2 minus engagement_t1, store the whole table in with_change, and store the mean change in mean_change.',
    starterCode:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\n# Add a column, keep every row, then average the new column.\nwith_change <- \nmean_change <- ',
    solution:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwith_change <- employees %>%\n  mutate(engagement_change = engagement_t2 - engagement_t1)\nmean_change <- mean(with_change$engagement_change)',
    wrongAnswers: [
      // The result of mutate() never assigned: with_change is the untouched table.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nemployees %>% mutate(engagement_change = engagement_t2 - engagement_t1)\nwith_change <- employees\nmean_change <- mean(employees$engagement_t2 - employees$engagement_t1)',
      // Subtracted the other way round: the change comes out negative.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwith_change <- employees %>%\n  mutate(engagement_change = engagement_t1 - engagement_t2)\nmean_change <- mean(with_change$engagement_change)',
      // summarise() where mutate() was meant: 480 rows collapse to one.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwith_change <- employees %>%\n  summarise(engagement_change = mean(engagement_t2 - engagement_t1))\nmean_change <- with_change$engagement_change',
    ],
    alternateSolutions: [
      // Base R: assign into a new column by name.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwith_change <- employees\nwith_change$engagement_change <- with_change$engagement_t2 - with_change$engagement_t1\nmean_change <- mean(with_change$engagement_change)',
      // The mean taken with a dplyr summary rather than mean() on the column.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwith_change <- employees %>%\n  mutate(engagement_change = engagement_t2 - engagement_t1)\nmean_change <- with_change %>% summarise(m = mean(engagement_change)) %>% pull(m)',
    ],
    check: `
      if (!has_answer("with_change") || !has_answer("mean_change")) {
        list(pass = FALSE, message = "I need with_change (the table with the new column) and mean_change (the average change).")
      } else {
        with_change <- answer("with_change")
        mean_change <- as.vector(answer("mean_change"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        expected <- d$engagement_t2 - d$engagement_t1
        if (!is.data.frame(with_change)) {
          list(pass = FALSE, message = "with_change should be a data frame: the employees, with one extra column.")
        } else if (nrow(with_change) == 1L) {
          list(pass = FALSE, message = "with_change has a single row. summarise() collapses a table to one row per group; mutate() adds a column and keeps every row. You want mutate().")
        } else if (nrow(with_change) != nrow(d)) {
          list(pass = FALSE, message = paste0("with_change has ", nrow(with_change), " rows, but nobody was supposed to be dropped: the file has ", nrow(d), "."))
        } else if (!("engagement_change" %in% names(with_change))) {
          list(pass = FALSE, message = "There is no engagement_change column. mutate() does not modify a table in place - it returns a new one, and you have to store it with the arrow.")
        } else if (isTRUE(all.equal(as.vector(with_change$engagement_change), -expected, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You subtracted the other way round: that is time 1 minus time 2. Change means where they ended up minus where they started, engagement_t2 - engagement_t1.")
        } else if (!isTRUE(all.equal(as.vector(with_change$engagement_change), expected, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "engagement_change should be each employee's engagement_t2 minus their own engagement_t1, row by row.")
        } else if (!is.numeric(mean_change) || length(mean_change) != 1L) {
          list(pass = FALSE, message = "mean_change should be a single number.")
        } else if (!isTRUE(all.equal(mean_change, mean(expected), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("mean_change is ", round(mean_change, 3), ", but the mean of engagement_change is ", round(mean(expected), 3), "."))
        } else {
          list(pass = TRUE, message = paste0("Correct: engagement rose by ", round(mean(expected), 2), " points on average. Hold on to that number - Module 12 asks which of the two interventions earned it, and the answer is not what the two main effects suggest."))
        }
      }
    `,
    hints: [
      'mutate() adds or changes a column and returns the whole table: employees %>% mutate(new = a - b).',
      'The result has to be assigned, or it is printed and thrown away.',
      'Change is where they ended up minus where they started, so engagement_t2 comes first.',
    ],
  },
  {
    id: 'm2-3-a',
    prompt:
      'Reshape the two engagement columns into long form. Keep employee_id and department, put the column names into a column called time and the scores into one called engagement, store the result in long, and store its number of rows in n_long.',
    starterCode:
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nlong <- employees %>%\n  select(employee_id, department, engagement_t1, engagement_t2) %>%\n  \nn_long <- ',
    solution:
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong <- employees %>%\n  select(employee_id, department, engagement_t1, engagement_t2) %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement")\nn_long <- nrow(long)',
    wrongAnswers: [
      // Only one of the two measurements moved, so nothing was really stacked.
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong <- employees %>%\n  select(employee_id, department, engagement_t1, engagement_t2) %>%\n  pivot_longer(cols = engagement_t1, names_to = "time", values_to = "engagement")\nn_long <- nrow(long)',
      // names_to and values_to swapped: the scores land in time and the labels in engagement.
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong <- employees %>%\n  select(employee_id, department, engagement_t1, engagement_t2) %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "engagement", values_to = "time")\nn_long <- nrow(long)',
      // The row count taken from the wide table.
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong <- employees %>%\n  select(employee_id, department, engagement_t1, engagement_t2) %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement")\nn_long <- nrow(employees)',
    ],
    alternateSolutions: [
      // A selection helper instead of naming both columns.
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong <- employees %>%\n  select(employee_id, department, engagement_t1, engagement_t2) %>%\n  pivot_longer(cols = starts_with("engagement"), names_to = "time", values_to = "engagement")\nn_long <- nrow(long)',
      // A range of adjacent columns, and no select() step at all.
      'library(dplyr)\nlibrary(tidyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong <- employees %>%\n  pivot_longer(cols = engagement_t1:engagement_t2, names_to = "time", values_to = "engagement") %>%\n  select(employee_id, department, time, engagement)\nn_long <- nrow(long)',
    ],
    check: `
      if (!has_answer("long") || !has_answer("n_long")) {
        list(pass = FALSE, message = "I need long (the reshaped table) and n_long (its row count).")
      } else {
        long <- answer("long")
        n_long <- as.vector(answer("n_long"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        expected_rows <- 2L * nrow(d)
        if (!is.data.frame(long)) {
          list(pass = FALSE, message = "long should be a data frame.")
        } else if (!all(c("time", "engagement") %in% names(long))) {
          list(pass = FALSE, message = "long needs a column called time and one called engagement. Those names come from names_to and values_to.")
        } else if (!is.numeric(long$engagement)) {
          list(pass = FALSE, message = "engagement holds text rather than numbers, which means the old column names ended up there. names_to names the column that receives the old NAMES; values_to names the column that receives the VALUES.")
        } else if (nrow(long) == nrow(d)) {
          list(pass = FALSE, message = paste0("long has ", nrow(d), " rows, the same as the wide table, so only one measurement moved. Both engagement columns have to go into cols."))
        } else if (nrow(long) != expected_rows) {
          list(pass = FALSE, message = paste0("long has ", nrow(long), " rows. Each of the ", nrow(d), " employees contributes two rows, one per time point, so there should be ", expected_rows, "."))
        } else if (length(unique(as.character(long$time))) != 2L) {
          list(pass = FALSE, message = paste0("time takes ", length(unique(as.character(long$time))), " distinct values, but there are two time points."))
        } else if (!isTRUE(all.equal(sum(long$engagement), sum(d$engagement_t1) + sum(d$engagement_t2), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "The numbers in engagement are not the two engagement columns stacked on top of one another.")
        } else if (!isTRUE(all.equal(n_long, expected_rows, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_long is ", n_long, ", but long has ", nrow(long), " rows. Count the long table, not the wide one."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", nrow(d), " employees times 2 time points is ", expected_rows, " rows. Every observation now has its own row, which is the shape ggplot2 wants in Module 4 and lmer() wants in Module 13."))
        }
      }
    `,
    hints: [
      'pivot_longer() takes cols (which columns to stack), names_to and values_to.',
      'Both engagement columns move: cols = c(engagement_t1, engagement_t2).',
      'names_to is the column that will hold engagement_t1 and engagement_t2 as labels; values_to holds the scores.',
    ],
  },
];
```

- [ ] **Step 3: Write `src/content/lessons/02-1-reading-data.mdx`**

````mdx
From here to the end of the course you will work with one dataset: a fictional
workplace study of 480 employees at a company with six sites. It was designed so
that every question this course teaches you to ask has an honest answer in it.

Here is the codebook. Come back to it whenever a column name means nothing to
you.

| Column | What it holds |
|---|---|
| `employee_id` | a number identifying the employee |
| `department` | Sales, Engineering, Support or Marketing |
| `site` | one of six office locations |
| `remote` | No or Yes |
| `tenure_years` | years at the company |
| `workload` | self-reported workload, 1 to 10 |
| `autonomy` | self-reported autonomy, 1 to 10 |
| `training` | took the training programme: No or Yes |
| `mentoring` | had a mentor: No or Yes |
| `wellbeing` | wellbeing score, 0 to 100 |
| `engagement_t1` | engagement at the start of the year |
| `engagement_t2` | engagement at the end of the year |
| `performance` | manager rating, 0 to 100 |
| `left_company` | 0 if still employed, 1 if left |

## Reading the file

`read.csv()` reads a comma-separated file into a **data frame** — R's word for a
table with named columns.

<CodeBlock id="read" code={`employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

nrow(employees)
ncol(employees)
names(employees)`} />

`nrow()` counts employees, because each row is one employee. `ncol()` counts
columns, which is a fact about the codebook and not about the company.

<CodeBlock id="head" code={`head(employees)`} />

## What str() tells you that head() does not

<CodeBlock id="structure" code={`str(employees)`} />

Read the type at the start of each line. `num` is a number. `int` is a whole
number. `Factor w/ 4 levels` is something new, and it is there because of the
`stringsAsFactors = TRUE` you typed.

<Predict
  id="p-factor"
  question="The department column holds words. Why would R want to store it as a factor rather than as text?"
  choices={[
    { text: 'Because factors take less memory', response: 'They historically did, but that is not the reason the course cares. Think about what R needs to know to fit a model or draw four boxes.' },
    { text: 'Because a factor records the full set of possible values, in a fixed order', correct: true, response: 'Exactly. The four department names are the levels. R keeps them even for a subset that contains none of a given department, and every table, plot and model uses that same order.' },
    { text: 'Because text cannot be stored in a data frame', response: 'It can. Without stringsAsFactors = TRUE these columns would be plain character, and everything would still read.' },
  ]}
/>

## Levels

<CodeBlock id="levels" code={`levels(employees$department)
nlevels(employees$department)

levels(employees$remote)`} />

The `$` picks one column out of a data frame, and what comes back is a plain
vector of the kind you met in Module 1.

Notice the order of the levels of `remote`: **No** then **Yes**. Levels are
alphabetical unless you say otherwise, and they are not in the order the column
happens to appear in the file. That alphabetical order will matter again in
Module 11, where the first level becomes the group every other group is compared
against.

## Counting and summarising

<CodeBlock id="table" code={`table(employees$department)

table(employees$department, employees$remote)`} />

`table()` counts each level; given two factors it counts every combination. And
`summary()` adapts to what it is given — counts for a factor, five numbers for a
numeric column.

<CodeBlock id="summary" code={`summary(employees$department)

summary(employees$wellbeing)`} />

<Exercise id="m2-1-a" />

<Exercise id="m2-1-b" />

<Quiz
  id="q-2-1"
  question="You read the file without stringsAsFactors = TRUE and then run nlevels(employees$department). What comes back?"
  choices={[
    { text: '4, because there are four departments in the column', response: 'R does not look at the values. Without the factor conversion the column is plain text, and text has no levels.' },
    { text: '0, because a character column has no levels', correct: true, response: 'Right, and it is a quiet failure: no error, just a zero, which is why the argument is worth typing every time.' },
    { text: 'An error, because nlevels() needs a factor', response: 'nlevels() accepts anything and returns 0 for a non-factor. Nothing warns you.' },
    { text: '480, one level per employee', response: 'That would be length(), which counts the entries in the column rather than the values it can take.' },
  ]}
/>
````

- [ ] **Step 4: Write `src/content/lessons/02-2-pipe-and-verbs.mdx`**

````mdx
Data analysis is a sequence of small changes to a table: keep these rows, drop
those columns, add this variable, sort by that one. dplyr gives each of those a
verb, and the pipe strings the verbs together in the order you would say them
out loud.

<CodeBlock id="setup" code={`library(dplyr)

employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
dim(employees)`} />

## The pipe

`%>%` takes the thing on its left and passes it to the function on its right as
the first argument. These two lines do the same work:

<CodeBlock id="pipe" code={`head(employees, 3)

employees %>% head(3)`} />

With one function the second form looks like showing off. With four it is the
difference between code you can read and code you cannot.

<Predict
  id="p-pipe"
  question="Why is the pipe worth learning, given that both forms above do the same thing?"
  choices={[
    { text: 'It runs faster', response: 'It does not. The pipe is about the person reading the code, not the machine running it.' },
    { text: 'It keeps steps in the order they happen, instead of nesting them inside out', correct: true, response: 'Yes. arrange(select(filter(d, ...), ...), ...) has to be read from the middle outwards; the piped version reads top to bottom, like a recipe.' },
    { text: 'It avoids having to attach dplyr', response: 'The opposite: the pipe comes from the tidyverse packages, so dplyr has to be attached before you can use it.' },
  ]}
/>

## filter() keeps rows

<CodeBlock id="filter" code={`employees %>% filter(department == "Engineering") %>% nrow()

employees %>% filter(remote == "Yes", tenure_years > 10) %>% nrow()`} />

Two things to notice. Inside a verb you write `department`, not
`employees$department` — the verb already knows which table it is in. And `==`
means "is equal to", where `=` would mean "set this argument".

A comma between conditions means **and**. For **or**, use `|`:

<CodeBlock id="or" code={`employees %>% filter(department == "Sales" | department == "Marketing") %>% nrow()

employees %>% filter(department %in% c("Sales", "Marketing")) %>% nrow()`} />

## select() keeps columns

<CodeBlock id="select" code={`employees %>%
  select(employee_id, department, wellbeing) %>%
  head(4)`} />

A minus sign drops instead of keeps: `select(-site)` returns everything except
`site`.

## mutate() adds a column

<CodeBlock id="mutate" code={`employees %>%
  mutate(engagement_change = engagement_t2 - engagement_t1) %>%
  select(employee_id, engagement_t1, engagement_t2, engagement_change) %>%
  head(4)`} />

`mutate()` does the arithmetic row by row, and the new column is as long as the
table. Nothing has been saved yet: every block on this page has printed a new
table and thrown it away. Storing it takes the arrow.

<Exercise id="m2-2-a" />

## arrange() sorts

<CodeBlock id="arrange" code={`employees %>%
  arrange(desc(wellbeing)) %>%
  select(employee_id, department, workload, autonomy, wellbeing) %>%
  head(5)`} />

Look at the five happiest employees. Autonomy is high and workload is not, in
most of them. That is a hypothesis, not a finding — five rows out of 480 chosen
for being extreme will always look convincing. Module 9 tests it properly.

<Exercise id="m2-2-b" />

<Quiz
  id="q-2-2"
  question="A classmate writes employees %>% mutate(load_ratio = workload / autonomy) and is surprised that employees still has 14 columns. Why?"
  choices={[
    { text: 'mutate() only works on numeric columns', response: 'Both columns are numeric, and the calculation ran. The question is where its result went.' },
    { text: 'The pipeline returned a new table, which was printed and discarded', correct: true, response: 'Right. dplyr verbs never modify their input. To keep the result, assign it: employees <- employees %>% mutate(...).' },
    { text: 'load_ratio is not a real column name', response: 'You may name a new column whatever you like, as long as it is a legal R name.' },
    { text: 'mutate() needs an assignment inside the brackets, with the arrow', response: 'Inside mutate() the new column is created with =, not with the arrow. The assignment that is missing is the one around the whole pipeline.' },
  ]}
/>
````

- [ ] **Step 5: Write `src/content/lessons/02-3-wide-and-long.mdx`**

````mdx
Engagement was measured twice, and the file stores the two measurements as two
columns: `engagement_t1` and `engagement_t2`. That is **wide** format — one row
per employee, one column per measurement.

<CodeBlock id="wide" code={`library(dplyr)
library(tidyr)

employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)

wide <- employees %>%
  select(employee_id, department, engagement_t1, engagement_t2)

head(wide, 4)`} />

Wide is how data arrives from a questionnaire tool, and it is comfortable to
read. It is also the wrong shape for most of what you are about to do, because
the thing you want to treat as a variable — *when* the measurement was taken —
is not a variable at all. It is hidden in two column names.

<Predict
  id="p-rows"
  question="The wide table has 480 rows. If you stack the two engagement columns into one, how many rows will the result have?"
  choices={[
    { text: '480, because there are still 480 employees', response: 'There are still 480 employees, but each of them now contributes two rows - one per measurement.' },
    { text: '960, because each employee contributes one row per time point', correct: true, response: 'Yes. In long format a row is one observation, not one person, and each person was observed twice.' },
    { text: '240, because two columns become one', response: 'Reshaping never throws observations away. Every number in the two columns has to land somewhere.' },
  ]}
/>

## pivot_longer()

<CodeBlock id="longer" code={`long <- wide %>%
  pivot_longer(
    cols = c(engagement_t1, engagement_t2),
    names_to = "time",
    values_to = "engagement"
  )

head(long, 6)
nrow(long)`} />

Three arguments, and each answers a question:

- `cols` — which columns hold values that belong in one column.
- `names_to` — the name of the new column that receives the old column *names*.
- `values_to` — the name of the new column that receives the old *values*.

Swapping the last two is the mistake everybody makes once. The symptom is a
column of numbers called `time` and a column of text called `engagement`.

<CodeBlock id="count" code={`long %>% count(time)

long %>% count(employee_id) %>% head(3)`} />

Each time point has 480 rows, and each employee has 2. The identifier columns —
`employee_id`, `department` — were simply repeated for each of an employee's
rows, which is exactly what tells a model in Module 13 that those two rows
belong to the same person.

## Tidy data

The long table is **tidy**: each variable is a column, each observation is a
row. Three parts of this course insist on it.

1. ggplot2 maps columns to axes and colours. To put time on the x axis, time has
   to be a column.
2. `group_by(time)` in Module 3 needs a column to group by.
3. `lmer(engagement ~ time + (1 | employee_id))` in Module 13 needs one row per
   observation, with the person identified.

The reverse operation exists, and is useful when a reader wants a table rather
than a model:

<CodeBlock id="wider" code={`long %>%
  pivot_wider(names_from = time, values_from = engagement) %>%
  head(4)`} />

<Exercise id="m2-3-a" />

<Quiz
  id="q-2-3"
  question="After pivot_longer(), the time column holds the values engagement_t1 and engagement_t2. Where did those come from?"
  choices={[
    { text: 'They are the names of the columns that were stacked', correct: true, response: 'Right. names_to creates a column and fills it with the old column names, one label per row, which is how the information in those names becomes data you can use.' },
    { text: 'pivot_longer() numbers the rows in each group', response: 'It does not invent labels. Every value in the new name column is the name of a column that existed before.' },
    { text: 'They are read from the employee_id column', response: 'employee_id says who; the new column says when, and it comes from the names of the stacked columns.' },
    { text: 'They were already a column in the file', response: 'They were not - that is the whole point. The file stores when as two column names, and pivot_longer() turns that into a column.' },
  ]}
/>
````

- [ ] **Step 6: Add the Module 2 assertions**

Append to `src/content/content.test.ts`, importing `module02`:

```ts
test('Module 2 defines exactly its five exercises, in order', () => {
  expect(module02.map((exercise) => exercise.id)).toEqual([
    'm2-1-a', 'm2-1-b', 'm2-2-a', 'm2-2-b', 'm2-3-a',
  ]);
});

test('Module 2 reads only the workplace dataset', () => {
  // Part 1 and Part 3 share one codebook (overview, decision 2). A second CSV
  // here would mean a student learning two of them before Module 3.
  const module = PLANNED_MODULES.find((m) => m.id === 'module-02')!;
  for (const lesson of module.lessons) {
    const source = sources[`./lessons/${lesson.file}.mdx`] ?? '';
    for (const match of source.matchAll(/data\/([\w-]+\.csv)/g)) {
      expect(match[1], `${lesson.id} reads ${match[1]}`).toBe('workplace.csv');
    }
  }
});

test('lesson 02-1 is written in base R', () => {
  // Its manifest entry declares no packages, so a library() call here would work
  // only for a student who had already opened a lesson that installed it.
  const source = sources['./lessons/02-1-reading-data.mdx'] ?? '';
  expect(source, '02-1 attaches a package it did not declare').not.toMatch(/library\(/);
  expect(source, '02-1 uses the pipe before it has been taught').not.toMatch(/%>%/);
});
```

- [ ] **Step 7: Run the content tests and the validator**

Run: `npx vitest run src/content/content.test.ts`
Expected: PASS, with `module-02` now live in `MODULES`.

Run: `npm run validate`
Expected: PASS. Each of the five exercises has its solution and both alternates pass, and all three wrong answers fail with `pass = FALSE`. Watch two fixtures in particular, because both are designed to fail through the check rather than by erroring: `m2-1-a`'s missing `stringsAsFactors` (which yields `nlevels() == 0`, not an error) and `m2-3-a`'s swapped `names_to`/`values_to` (which yields a character `engagement` column, not an error).

- [ ] **Step 8: Verify the lessons render**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/02-1`, `/02-2` and `/02-3`.

Expected: the codebook table in `02-1` renders as a table. `str(employees)` prints the factor lines. `02-2`'s pipelines print tables rather than errors, and `02-3`'s status pill shows `tidyr` installing the first time that lesson opens (P1's on-demand path), then the blocks run.

- [ ] **Step 9: Commit**

```bash
git add src/content/manifest.ts src/content/content.test.ts src/content/exercises/module-02.ts src/content/lessons/02-1-reading-data.mdx src/content/lessons/02-2-pipe-and-verbs.mdx src/content/lessons/02-3-wide-and-long.mdx
git commit -m "feat: Module 2, working with data"
```

---

### Task M3: Module 3 — Describing data

**Files:**
- Create: `src/content/lessons/03-1-summaries.mdx`, `src/content/lessons/03-2-group-by.mdx`, `src/content/lessons/03-3-mean-vs-median.mdx`
- Modify: `src/content/exercises/module-03.ts`, `src/content/manifest.ts`, `src/content/content.test.ts`
- Test: `npx vitest run src/content/content.test.ts`, `npm run validate`

**Interfaces:**
- Consumes: `ExerciseDef`, `has_answer`/`answer`, `data/workplace.csv` (P2), `PLANNED_MODULES` (P3)
- Produces: `module03: ExerciseDef[]` with ids `m3-1-a`, `m3-1-b`, `m3-2-a`, `m3-2-b`, `m3-3-a`; three lesson files; the `module-03` entry in `PLANNED_MODULES`

> **The Module 3 surprise is a property of the generator, not of the seed.** P2's
> `DEPARTMENT_PROFILE` gives Engineering both the highest `workload` and the
> highest `autonomy`, which is what puts its mean wellbeing mid-table while its
> median is the highest of the four. P2 step 4 refuses to commit a dataset where
> that is not true. Lesson `03-3` may therefore name Engineering in its prose and
> in its choices — but no *check* may, because a re-seeded dataset can move the
> other three departments around. Step 6 enforces the distinction.

- [ ] **Step 1: Add the module to `PLANNED_MODULES`**

```ts
  {
    id: 'module-03',
    number: 3,
    title: 'Describing data',
    lessons: [
      {
        id: '03-1',
        title: 'Summarising a column',
        file: '03-1-summaries',
        exercises: ['m3-1-a', 'm3-1-b'],
        packages: ['dplyr'],
      },
      {
        id: '03-2',
        title: 'Summaries by group',
        file: '03-2-group-by',
        exercises: ['m3-2-a', 'm3-2-b'],
        packages: ['dplyr'],
      },
      {
        id: '03-3',
        title: 'When the mean misleads',
        file: '03-3-mean-vs-median',
        exercises: ['m3-3-a'],
        packages: ['dplyr'],
      },
    ],
  },
```

- [ ] **Step 2: Write `src/content/exercises/module-03.ts`**

```ts
import type { ExerciseDef } from '../../r/checker';

export const module03: ExerciseDef[] = [
  {
    id: 'm3-1-a',
    prompt:
      'Summarise the wellbeing column. Store a one-row data frame in wellbeing_summary with the columns mean_wellbeing, sd_wellbeing and n.',
    starterCode:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nwellbeing_summary <- employees %>%\n  ',
    solution:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_summary <- employees %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
    wrongAnswers: [
      // The variance, which is the SD squared and is not what anyone reports.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_summary <- employees %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = var(wellbeing), n = n())',
      // n() forgotten, so the summary never says how many people it describes.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_summary <- employees %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing))',
      // mutate() repeats the summary on all 480 rows instead of collapsing them.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_summary <- employees %>%\n  mutate(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
    ],
    alternateSolutions: [
      // The SD written as the square root of the variance.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_summary <- employees %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sqrt(var(wellbeing)), n = length(wellbeing))',
      // Base R: a one-row data frame built by hand.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_summary <- data.frame(\n  mean_wellbeing = mean(employees$wellbeing),\n  sd_wellbeing = sd(employees$wellbeing),\n  n = nrow(employees)\n)',
    ],
    check: `
      if (!has_answer("wellbeing_summary")) {
        list(pass = FALSE, message = "I could not find an object called wellbeing_summary.")
      } else {
        got <- answer("wellbeing_summary")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        needed <- c("mean_wellbeing", "sd_wellbeing", "n")
        if (!is.data.frame(got)) {
          list(pass = FALSE, message = "wellbeing_summary should be a data frame - the one-row table summarise() returns.")
        } else if (nrow(got) == nrow(d)) {
          list(pass = FALSE, message = paste0("wellbeing_summary has ", nrow(d), " rows: the same summary repeated once per employee. mutate() adds a column to every row; summarise() collapses the table to one row."))
        } else if (nrow(got) != 1L) {
          list(pass = FALSE, message = paste0("wellbeing_summary has ", nrow(got), " rows, but a summary of one column is a single row."))
        } else if (!all(needed %in% names(got))) {
          list(pass = FALSE, message = paste0("wellbeing_summary is missing the column(s): ", paste(setdiff(needed, names(got)), collapse = ", "), ". A summary without n does not say how many people it describes, which is why every APA table has one."))
        } else if (!isTRUE(all.equal(as.vector(got$mean_wellbeing), mean(d$wellbeing), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("mean_wellbeing is ", round(as.vector(got$mean_wellbeing), 3), ", but the mean of the wellbeing column is ", round(mean(d$wellbeing), 3), "."))
        } else if (isTRUE(all.equal(as.vector(got$sd_wellbeing), var(d$wellbeing), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the variance, ", round(var(d$wellbeing), 2), ". The standard deviation is its square root, ", round(sd(d$wellbeing), 2), ", and it is the one you report because it is in the same units as the scores."))
        } else if (!isTRUE(all.equal(as.vector(got$sd_wellbeing), sd(d$wellbeing), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("sd_wellbeing is ", round(as.vector(got$sd_wellbeing), 3), ", but the standard deviation of wellbeing is ", round(sd(d$wellbeing), 3), "."))
        } else if (!isTRUE(all.equal(as.vector(got$n), nrow(d), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n is ", as.vector(got$n), ", but the summary describes ", nrow(d), " employees."))
        } else {
          list(pass = TRUE, message = paste0("Correct: M = ", round(mean(d$wellbeing), 2), ", SD = ", round(sd(d$wellbeing), 2), ", n = ", nrow(d), ". Those three numbers together are what a results section reports - a mean with no SD and no n cannot be judged."))
        }
      }
    `,
    hints: [
      'summarise() turns a whole table into one row: employees %>% summarise(...).',
      'Inside summarise() you name each new column: mean_wellbeing = mean(wellbeing).',
      'n() counts the rows that went into the summary, and takes no arguments.',
    ],
  },
  {
    id: 'm3-1-b',
    prompt:
      'How spread out is wellbeing? Store a one-row data frame in spread with sd_wellbeing (the standard deviation), iqr_wellbeing (the interquartile range) and range_wellbeing (the largest score minus the smallest).',
    starterCode:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nspread <- employees %>%\n  ',
    solution:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nspread <- employees %>%\n  summarise(\n    sd_wellbeing = sd(wellbeing),\n    iqr_wellbeing = IQR(wellbeing),\n    range_wellbeing = max(wellbeing) - min(wellbeing)\n  )',
    wrongAnswers: [
      // The standard error of the mean, not the spread of the scores.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nspread <- employees %>%\n  summarise(\n    sd_wellbeing = sd(wellbeing) / sqrt(n()),\n    iqr_wellbeing = IQR(wellbeing),\n    range_wellbeing = max(wellbeing) - min(wellbeing)\n  )',
      // The upper quartile instead of the distance between the quartiles.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nspread <- employees %>%\n  summarise(\n    sd_wellbeing = sd(wellbeing),\n    iqr_wellbeing = quantile(wellbeing, 0.75),\n    range_wellbeing = max(wellbeing) - min(wellbeing)\n  )',
      // The largest score, with the subtraction forgotten.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nspread <- employees %>%\n  summarise(\n    sd_wellbeing = sd(wellbeing),\n    iqr_wellbeing = IQR(wellbeing),\n    range_wellbeing = max(wellbeing)\n  )',
    ],
    alternateSolutions: [
      // The IQR written out as the gap between the quartiles, and diff(range()).
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nspread <- employees %>%\n  summarise(\n    sd_wellbeing = sd(wellbeing),\n    iqr_wellbeing = quantile(wellbeing, 0.75) - quantile(wellbeing, 0.25),\n    range_wellbeing = diff(range(wellbeing))\n  )',
      // Base R, same three numbers.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nspread <- data.frame(\n  sd_wellbeing = sd(employees$wellbeing),\n  iqr_wellbeing = IQR(employees$wellbeing),\n  range_wellbeing = max(employees$wellbeing) - min(employees$wellbeing)\n)',
    ],
    check: `
      if (!has_answer("spread")) {
        list(pass = FALSE, message = "I could not find an object called spread.")
      } else {
        got <- answer("spread")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        needed <- c("sd_wellbeing", "iqr_wellbeing", "range_wellbeing")
        if (!is.data.frame(got) || nrow(got) != 1L) {
          list(pass = FALSE, message = "spread should be a one-row data frame with three columns.")
        } else if (!all(needed %in% names(got))) {
          list(pass = FALSE, message = paste0("spread is missing the column(s): ", paste(setdiff(needed, names(got)), collapse = ", "), "."))
        } else if (isTRUE(all.equal(as.vector(got$sd_wellbeing), sd(d$wellbeing) / sqrt(nrow(d)), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("You divided by the square root of n, which gives the standard error of the mean (", round(sd(d$wellbeing) / sqrt(nrow(d)), 3), "). That says how precisely you know the average; the standard deviation (", round(sd(d$wellbeing), 2), ") says how much employees differ from each other. Module 7 is about the difference."))
        } else if (!isTRUE(all.equal(as.vector(got$sd_wellbeing), sd(d$wellbeing), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("sd_wellbeing should be ", round(sd(d$wellbeing), 3), "."))
        } else if (isTRUE(all.equal(as.vector(got$iqr_wellbeing), as.vector(quantile(d$wellbeing, 0.75)), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the upper quartile: the score three quarters of the way up. The interquartile range is the distance between the quartiles, ", round(IQR(d$wellbeing), 2), " - the width of the middle half of the company."))
        } else if (!isTRUE(all.equal(as.vector(got$iqr_wellbeing), IQR(d$wellbeing), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("iqr_wellbeing should be ", round(IQR(d$wellbeing), 3), "."))
        } else if (isTRUE(all.equal(as.vector(got$range_wellbeing), max(d$wellbeing), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the highest score on its own. The range is a distance: the highest minus the lowest, ", round(max(d$wellbeing) - min(d$wellbeing), 2), "."))
        } else if (!isTRUE(all.equal(as.vector(got$range_wellbeing), max(d$wellbeing) - min(d$wellbeing), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("range_wellbeing should be ", round(max(d$wellbeing) - min(d$wellbeing), 3), "."))
        } else {
          list(pass = TRUE, message = paste0("Correct: SD ", round(sd(d$wellbeing), 2), ", IQR ", round(IQR(d$wellbeing), 2), ", range ", round(max(d$wellbeing) - min(d$wellbeing), 2), ". The range is built from the two most extreme people in the company, so it moves whenever either of them does; the IQR ignores them both."))
        }
      }
    `,
    hints: [
      'sd() gives the standard deviation, IQR() the interquartile range.',
      'R has a function called range(), but it returns two numbers - the smallest and the largest. Here you want the distance between them.',
      'max(wellbeing) - min(wellbeing) is that distance in one expression.',
    ],
  },
  {
    id: 'm3-2-a',
    prompt:
      'Describe wellbeing department by department. Store a data frame in by_department with one row per department and the columns mean_wellbeing, sd_wellbeing and n.',
    starterCode:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nby_department <- employees %>%\n  ',
    solution:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nby_department <- employees %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
    wrongAnswers: [
      // No grouping: one row describing the whole company.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nby_department <- employees %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
      // Grouped, but with mutate(), so the summary is pasted onto all 480 rows.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nby_department <- employees %>%\n  group_by(department) %>%\n  mutate(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
      // Grouped by one variable too many: a row per department and site.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nby_department <- employees %>%\n  group_by(department, site) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
    ],
    alternateSolutions: [
      // length() instead of n(): the same count, written differently.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nby_department <- employees %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = length(wellbeing))',
      // Base R with tapply(), which is what group_by() replaced.
      'employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nby_department <- data.frame(\n  department = levels(employees$department),\n  mean_wellbeing = as.vector(tapply(employees$wellbeing, employees$department, mean)),\n  sd_wellbeing = as.vector(tapply(employees$wellbeing, employees$department, sd)),\n  n = as.vector(table(employees$department))\n)',
    ],
    check: `
      if (!has_answer("by_department")) {
        list(pass = FALSE, message = "I could not find an object called by_department.")
      } else {
        got <- answer("by_department")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        needed <- c("mean_wellbeing", "sd_wellbeing", "n")
        n_groups <- nlevels(d$department)
        if (!is.data.frame(got)) {
          list(pass = FALSE, message = "by_department should be a data frame.")
        } else if (nrow(got) == 1L) {
          list(pass = FALSE, message = "by_department has a single row, which describes the whole company. group_by(department) before summarise() gives one row per department.")
        } else if (nrow(got) == nrow(d)) {
          list(pass = FALSE, message = paste0("by_department has ", nrow(d), " rows: each employee, with their department's mean written beside them. That is what mutate() does. summarise() collapses each group to one row."))
        } else if (!("department" %in% names(got))) {
          list(pass = FALSE, message = "by_department has no department column, so there is no way to tell which row is which. group_by() keeps the grouping column in the result.")
        } else if (nrow(got) != n_groups) {
          list(pass = FALSE, message = paste0("by_department has ", nrow(got), " rows, but there are ", n_groups, " departments. Check how many variables you grouped by - each extra one multiplies the rows."))
        } else if (!all(needed %in% names(got))) {
          list(pass = FALSE, message = paste0("by_department is missing the column(s): ", paste(setdiff(needed, names(got)), collapse = ", "), "."))
        } else {
          key <- as.character(got$department)
          means <- tapply(d$wellbeing, d$department, mean)
          sds <- tapply(d$wellbeing, d$department, sd)
          counts <- table(d$department)
          if (!all(key %in% names(means))) {
            list(pass = FALSE, message = "The department column does not hold the four department names.")
          } else if (!isTRUE(all.equal(as.vector(got$mean_wellbeing), as.vector(means[key]), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "mean_wellbeing does not match the mean wellbeing of each department. Check that you are averaging wellbeing, and that the grouping happened before the summary.")
          } else if (!isTRUE(all.equal(as.vector(got$sd_wellbeing), as.vector(sds[key]), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "sd_wellbeing does not match the standard deviation within each department.")
          } else if (!isTRUE(all.equal(as.vector(got$n), as.vector(counts[key]), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("n should be the size of each department (", paste(as.vector(counts), collapse = ", "), "), not the size of the company. n() counts the rows in the group it is called on."))
          } else {
            list(pass = TRUE, message = paste0("Correct - four departments, ", paste(as.vector(counts), collapse = ", "), " employees. The departments differ by ", round(max(as.vector(means)) - min(as.vector(means)), 1), " points at the extremes, and the SDs tell you how much of that could be individual variation. Lesson 3 asks whether the means are telling the truth."))
          }
        }
      }
    `,
    hints: [
      'group_by(department) tells the next verb to work inside each department separately.',
      'summarise() then returns one row per group, with the grouping column kept.',
      'n() counts the rows of the group it is called in, so it gives a department size here.',
    ],
  },
  {
    id: 'm3-2-b',
    prompt:
      'Do remote employees report higher wellbeing? Store by_remote (one row per level of remote, with mean_wellbeing and n), and store the difference remote minus office in remote_gap.',
    starterCode:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nby_remote <- employees %>%\n  \nremote_gap <- ',
    solution:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nby_remote <- employees %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), n = n())\nremote_gap <- with(by_remote, mean_wellbeing[remote == "Yes"] - mean_wellbeing[remote == "No"])',
    wrongAnswers: [
      // Office minus remote: the right size, the wrong sign, the opposite conclusion.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nby_remote <- employees %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), n = n())\nremote_gap <- with(by_remote, mean_wellbeing[remote == "No"] - mean_wellbeing[remote == "Yes"])',
      // Medians in a column called mean_wellbeing.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nby_remote <- employees %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = median(wellbeing), n = n())\nremote_gap <- with(by_remote, mean_wellbeing[remote == "Yes"] - mean_wellbeing[remote == "No"])',
      // nrow(employees) inside summarise ignores the grouping entirely.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nby_remote <- employees %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), n = nrow(employees))\nremote_gap <- with(by_remote, mean_wellbeing[remote == "Yes"] - mean_wellbeing[remote == "No"])',
    ],
    alternateSolutions: [
      // tapply() for the gap, dplyr for the table.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nby_remote <- employees %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), n = n())\nmeans <- tapply(employees$wellbeing, employees$remote, mean)\nremote_gap <- as.vector(means[["Yes"]] - means[["No"]])',
      // Two filtered means, subtracted.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nby_remote <- employees %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), n = n())\nremote_gap <- mean(filter(employees, remote == "Yes")$wellbeing) - mean(filter(employees, remote == "No")$wellbeing)',
    ],
    check: `
      if (!has_answer("by_remote") || !has_answer("remote_gap")) {
        list(pass = FALSE, message = "I need by_remote (the two-row summary) and remote_gap (the difference between the two means).")
      } else {
        got <- answer("by_remote")
        gap <- as.vector(answer("remote_gap"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        means <- tapply(d$wellbeing, d$remote, mean)
        medians <- tapply(d$wellbeing, d$remote, median)
        counts <- table(d$remote)
        expected_gap <- as.vector(means[["Yes"]] - means[["No"]])
        if (!is.data.frame(got)) {
          list(pass = FALSE, message = "by_remote should be a data frame.")
        } else if (!all(c("remote", "mean_wellbeing", "n") %in% names(got))) {
          list(pass = FALSE, message = "by_remote needs the columns remote, mean_wellbeing and n.")
        } else if (nrow(got) != 2L) {
          list(pass = FALSE, message = paste0("by_remote has ", nrow(got), " rows. remote has two levels, so grouping by it gives two rows."))
        } else {
          key <- as.character(got$remote)
          if (!setequal(key, names(means))) {
            list(pass = FALSE, message = "The remote column should hold No and Yes.")
          } else if (isTRUE(all.equal(as.vector(got$mean_wellbeing), as.vector(medians[key]), tolerance = 1e-6, check.attributes = FALSE)) &&
                     !isTRUE(all.equal(as.vector(medians[key]), as.vector(means[key]), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "Those are the medians. The column is called mean_wellbeing, and lesson 3 is about how much the choice between them can change a story - so it is worth being exact about which one you computed.")
          } else if (!isTRUE(all.equal(as.vector(got$mean_wellbeing), as.vector(means[key]), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "mean_wellbeing does not match the mean wellbeing of the two groups.")
          } else if (!isTRUE(all.equal(as.vector(got$n), as.vector(counts[key]), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("n should be the size of each group (", paste(as.vector(counts), collapse = " and "), "). nrow(employees) ignores the grouping and reports the whole company in both rows; n() respects it."))
          } else if (!is.numeric(gap) || length(gap) != 1L) {
            list(pass = FALSE, message = "remote_gap should be a single number.")
          } else if (isTRUE(all.equal(gap, -expected_gap, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("Right size, wrong sign: you computed office minus remote. The question asks for remote minus office, which is ", round(expected_gap, 2), ". A sign is a conclusion, so this is worth being careful about."))
          } else if (!isTRUE(all.equal(gap, expected_gap, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("remote_gap is ", round(gap, 3), ", but the two means differ by ", round(expected_gap, 3), "."))
          } else {
            list(pass = TRUE, message = paste0("Correct: remote employees average ", round(expected_gap, 2), " points more wellbeing. That is a description of these 480 people, not yet a claim about anyone else - Module 8 is where you learn what would justify the stronger sentence."))
          }
        }
      }
    `,
    hints: [
      'group_by(remote) then summarise() gives one row per level of remote.',
      'n() inside summarise counts the rows of the current group; nrow(employees) would ignore the grouping.',
      'To pick one row of the result, index by the level name: mean_wellbeing[remote == "Yes"].',
    ],
  },
  {
    id: 'm3-3-a',
    prompt:
      'Compare the two summaries side by side. Store department_shape with one row per department and the columns mean_wellbeing, median_wellbeing and n, then store the name of the department with the highest median wellbeing in highest_median.',
    starterCode:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\ndepartment_shape <- employees %>%\n  \nhighest_median <- ',
    solution:
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_shape <- employees %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), n = n())\nhighest_median <- department_shape %>%\n  slice_max(median_wellbeing, n = 1) %>%\n  pull(department) %>%\n  as.character()',
    wrongAnswers: [
      // The department with the highest MEAN, which is the whole point of the lesson.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_shape <- employees %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), n = n())\nhighest_median <- department_shape %>%\n  slice_max(mean_wellbeing, n = 1) %>%\n  pull(department) %>%\n  as.character()',
      // slice_min: the lowest median rather than the highest.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_shape <- employees %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), n = n())\nhighest_median <- department_shape %>%\n  slice_min(median_wellbeing, n = 1) %>%\n  pull(department) %>%\n  as.character()',
      // The median column filled with means, so the two columns say the same thing.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_shape <- employees %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = mean(wellbeing), n = n())\nhighest_median <- department_shape %>%\n  slice_max(median_wellbeing, n = 1) %>%\n  pull(department) %>%\n  as.character()',
    ],
    alternateSolutions: [
      // which.max() on the column, which is what slice_max() does underneath.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_shape <- employees %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), n = n())\nhighest_median <- as.character(department_shape$department[which.max(department_shape$median_wellbeing)])',
      // Sort, then take the top row.
      'library(dplyr)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_shape <- employees %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), n = n()) %>%\n  arrange(desc(median_wellbeing))\nhighest_median <- as.character(department_shape$department[1])',
    ],
    check: `
      if (!has_answer("department_shape") || !has_answer("highest_median")) {
        list(pass = FALSE, message = "I need department_shape (the table) and highest_median (one department name).")
      } else {
        got <- answer("department_shape")
        top <- as.character(as.vector(answer("highest_median")))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        means <- tapply(d$wellbeing, d$department, mean)
        medians <- tapply(d$wellbeing, d$department, median)
        counts <- table(d$department)
        top_median <- names(medians)[which.max(medians)]
        top_mean <- names(means)[which.max(means)]
        needed <- c("department", "mean_wellbeing", "median_wellbeing", "n")
        if (!is.data.frame(got)) {
          list(pass = FALSE, message = "department_shape should be a data frame.")
        } else if (!all(needed %in% names(got))) {
          list(pass = FALSE, message = paste0("department_shape is missing the column(s): ", paste(setdiff(needed, names(got)), collapse = ", "), "."))
        } else if (nrow(got) != nlevels(d$department)) {
          list(pass = FALSE, message = paste0("department_shape has ", nrow(got), " rows, but there are ", nlevels(d$department), " departments."))
        } else if (!all(as.character(got$department) %in% names(means))) {
          list(pass = FALSE, message = "The department column does not hold the department names.")
        } else if (!isTRUE(all.equal(as.vector(got$mean_wellbeing), as.vector(means[as.character(got$department)]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "mean_wellbeing does not match the mean wellbeing of each department.")
        } else if (isTRUE(all.equal(as.vector(got$median_wellbeing), as.vector(means[as.character(got$department)]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "median_wellbeing holds the means again, so the two columns cannot disagree - and the disagreement is exactly what this lesson is about. Use median() for the second column.")
        } else if (!isTRUE(all.equal(as.vector(got$median_wellbeing), as.vector(medians[as.character(got$department)]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "median_wellbeing does not match the median wellbeing of each department.")
        } else if (!isTRUE(all.equal(as.vector(got$n), as.vector(counts[as.character(got$department)]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "n should be the number of employees in each department.")
        } else if (length(top) != 1L || is.na(top)) {
          list(pass = FALSE, message = "highest_median should be a single department name.")
        } else if (identical(top, top_mean) && !identical(top_mean, top_median)) {
          list(pass = FALSE, message = paste0("You found the department with the highest MEAN. The question asks for the highest median, and in this company they are not the same department - which is the entire point of the lesson. Sort by median_wellbeing instead."))
        } else if (identical(top, names(medians)[which.min(medians)]) && !identical(top, top_median)) {
          list(pass = FALSE, message = "That is the lowest median, not the highest. slice_max() takes the top; slice_min() takes the bottom.")
        } else if (!identical(top, top_median)) {
          list(pass = FALSE, message = paste0("highest_median is ", top, ", but the highest median wellbeing belongs to a different department."))
        } else {
          list(pass = TRUE, message = paste0(top_median, " has the highest median wellbeing (", round(max(medians), 1), "), while the highest mean belongs to ", top_mean, " (", round(max(means), 1), "). Two honest summaries of the same column, two different answers to \\"which department is doing best\\" - which is why you report both, or show the distribution."))
        }
      }
    `,
    hints: [
      'Add median_wellbeing = median(wellbeing) beside the mean in the same summarise() call.',
      'slice_max(median_wellbeing, n = 1) keeps the row with the largest median.',
      'pull(department) turns that one-cell column into a value; as.character() drops the factor labelling.',
    ],
  },
];
```

- [ ] **Step 3: Write `src/content/lessons/03-1-summaries.mdx`**

````mdx
A dataset of 480 employees and 14 columns holds more numbers than anyone can
read. Describing it means replacing all of them with a handful that carry the
same message — and then being honest about what got lost.

<CodeBlock id="setup" code={`library(dplyr)

employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)`} />

## summarise()

`summarise()` collapses a whole table into one row. You name each number you
want and say how to compute it.

<CodeBlock id="first" code={`employees %>%
  summarise(mean_wellbeing = mean(wellbeing))`} />

Several at once, which is how you would actually use it:

<CodeBlock id="several" code={`employees %>%
  summarise(
    mean_wellbeing = mean(wellbeing),
    sd_wellbeing = sd(wellbeing),
    n = n()
  )`} />

`n()` counts the rows that went into the summary. It takes no arguments, because
it already knows which rows it is being asked about.

A mean with no SD and no n is not a result. The SD says how much employees
differ from one another; the n says how much of the company you are describing.
Every APA table you write from Module 9 onwards has all three.

<Predict
  id="p-summarise"
  question="employees has 480 rows. How many rows will employees %>% mutate(mean_wellbeing = mean(wellbeing)) have?"
  choices={[
    { text: '1, because there is one mean', response: 'That is what summarise() would give you. mutate() does something different.' },
    { text: '480, each with the same company-wide mean beside it', correct: true, response: 'Yes. mutate() adds a column and keeps every row, so the single mean is repeated 480 times. That is useful when you want to compare each person with the average - and wrong when you wanted a summary table.' },
    { text: '480, each holding the mean of that one employee alone', response: 'One employee has one wellbeing score, so a mean of that person alone would just be the score itself. mean(wellbeing) is computed over all the rows in scope.' },
  ]}
/>

<CodeBlock id="mutate-vs" code={`employees %>%
  mutate(mean_wellbeing = mean(wellbeing)) %>%
  select(employee_id, wellbeing, mean_wellbeing) %>%
  head(4)`} />

**summarise collapses, mutate keeps.** Choosing the wrong one is the most common
dplyr mistake there is, and it never produces an error — only a table of the
wrong shape.

<Exercise id="m3-1-a" />

## Describing spread

The mean says where the middle is. Three different numbers say how wide the
distribution is, and they disagree on purpose.

<CodeBlock id="spread" code={`employees %>%
  summarise(
    sd_wellbeing = sd(wellbeing),
    iqr_wellbeing = IQR(wellbeing),
    smallest = min(wellbeing),
    largest = max(wellbeing)
  )`} />

- The **standard deviation** is roughly the average distance from the mean. It
  uses every score, so a single extreme person moves it.
- The **interquartile range** is the width of the middle half of the company: the
  distance from the 25th to the 75th percentile. It ignores the tails entirely.
- The **range** — largest minus smallest — is built from exactly two people, so
  it is the least stable number in statistics and the easiest to quote.

Watch out for R's `range()`: it returns the two endpoints, not the distance
between them.

<CodeBlock id="range-trap" code={`range(employees$wellbeing)

max(employees$wellbeing) - min(employees$wellbeing)`} />

<Exercise id="m3-1-b" />

<Quiz
  id="q-3-1"
  question="One employee's wellbeing score is corrected from 71 to 17. Which summary of the 480 scores changes least?"
  choices={[
    { text: 'The mean', response: 'The mean uses every score, so it moves - only a little with 480 people, but it moves.' },
    { text: 'The standard deviation', response: 'The SD is built from distances to the mean, and a score 54 points lower than before adds a large one.' },
    { text: 'The interquartile range', correct: true, response: 'Right. The IQR depends only on the two quartiles. Moving one score from one tail to the other leaves the middle half almost exactly where it was.' },
    { text: 'The range', response: 'The range is the most sensitive of all: if 17 is now the lowest score in the company, the range changes by the full amount.' },
  ]}
/>
````

- [ ] **Step 4: Write `src/content/lessons/03-2-group-by.mdx`**

````mdx
A single mean for 480 employees answers almost no question anyone asks. The
questions people actually ask are comparisons: do remote employees report higher
wellbeing than office-based ones, and is Engineering really worse off than
Sales?

Each of those is the same summary, computed once per group.

<CodeBlock id="setup" code={`library(dplyr)

employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)`} />

## group_by() then summarise()

`group_by()` changes nothing by itself. It attaches a note to the table saying
"from here on, work inside each department separately", and the next verb obeys
it.

<CodeBlock id="group" code={`employees %>%
  group_by(department) %>%
  summarise(mean_wellbeing = mean(wellbeing))`} />

Four rows instead of one, and the grouping column came along so you can tell
which is which.

<Predict
  id="p-groups"
  question="You group by site instead, and the company has six sites. How many rows does summarise() return?"
  choices={[
    { text: '480, one per employee', response: 'That is what the grouped table still holds internally, but summarise() collapses each group to a single row.' },
    { text: '6, one per site', correct: true, response: 'Yes. One row per group, always - which means the number of rows tells you how many groups you asked for.' },
    { text: '1, because summarise() always returns one row', response: 'Ungrouped it does. Grouped, it returns one row per group, and that is the whole trick.' },
  ]}
/>

## A summary worth reading

Add the SD and the group size, then sort.

<CodeBlock id="full" code={`employees %>%
  group_by(department) %>%
  summarise(
    mean_wellbeing = mean(wellbeing),
    sd_wellbeing = sd(wellbeing),
    n = n()
  ) %>%
  arrange(desc(mean_wellbeing))`} />

Read the SD column beside the means. The departments differ by a few points on
average, and individuals within each department differ by far more than that.
Keeping both numbers in view is what stops a small difference between groups
from sounding like a big one.

## n() knows about the grouping; nrow() does not

<CodeBlock id="n-trap" code={`employees %>%
  group_by(department) %>%
  summarise(with_n = n(), with_nrow = nrow(employees))`} />

`n()` counts the rows of the group it is called in. `nrow(employees)` reaches
outside and counts the whole company, four times. Nothing errors; the column is
simply wrong, and a reader who trusts it concludes that every department has 480
people.

<Exercise id="m3-2-a" />

## Two groups

The same machinery answers a two-group question, and the difference between the
two means is the quantity every test in Part 2 is really about.

<CodeBlock id="remote" code={`employees %>%
  group_by(remote) %>%
  summarise(
    mean_wellbeing = mean(wellbeing),
    sd_wellbeing = sd(wellbeing),
    n = n()
  )`} />

Before you read anything into the gap: it is a description of these 480 people.
Whether it says anything about employees in general is a different question, and
Modules 7 and 8 exist to answer it. Module 11 fits exactly this comparison as a
model and gets the same two means back.

<Exercise id="m3-2-b" />

<Quiz
  id="q-3-2"
  question="A pipeline reads group_by(department, remote) %>% summarise(m = mean(wellbeing)). How many rows come back, with four departments and two levels of remote?"
  choices={[
    { text: '4, because department is the first grouping variable', response: 'Every grouping variable counts. The second one splits each department in two.' },
    { text: '6, four departments plus two remote levels', response: 'Groups multiply rather than add: each department is split by remote, not listed beside it.' },
    { text: '8, one per combination that occurs in the data', correct: true, response: 'Right - four departments times two levels. A combination that no employee has would simply be absent, so you always check the row count against what you expected.' },
    { text: '480, because two grouping variables cancel out', response: 'Grouping never returns the original rows. summarise() always collapses each group to one row.' },
  ]}
/>
````

- [ ] **Step 5: Write `src/content/lessons/03-3-mean-vs-median.mdx`**

````mdx
You now have everything you need to produce a summary table. This lesson is
about the moment where the table is right and the conclusion drawn from it is
wrong.

<CodeBlock id="setup" code={`library(dplyr)

employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)`} />

## A table of means

<CodeBlock id="means" code={`employees %>%
  group_by(department) %>%
  summarise(mean_wellbeing = mean(wellbeing), n = n()) %>%
  arrange(desc(mean_wellbeing))`} />

<Predict
  id="p-engineering"
  question="Engineering sits in the middle of that table. Which of these would you be willing to write in a report on the strength of it?"
  choices={[
    { text: 'Engineering employees have middling wellbeing compared with other departments', response: 'It is the natural reading, and it is the one this lesson is about to undermine. A mean is a single summary of a whole distribution.' },
    { text: 'Nothing yet - a mean can sit mid-table for more than one reason', correct: true, response: 'Right. A middling mean can come from a middling department, or from a department where most people are doing well and a minority are doing very badly. Those call for completely different responses.' },
    { text: 'Engineering is the healthiest department, because engineers have the most autonomy', response: 'That reasoning skips the data entirely. Whatever autonomy does, the table in front of you does not say this.' },
  ]}
/>

## Add the median

The **median** is the score in the middle when everyone is lined up: half the
department is above it, half below. Unlike the mean, it does not care how far
away the extremes are.

<CodeBlock id="both" code={`employees %>%
  group_by(department) %>%
  summarise(
    mean_wellbeing = mean(wellbeing),
    median_wellbeing = median(wellbeing),
    n = n()
  ) %>%
  arrange(desc(median_wellbeing))`} />

Engineering has the **highest median wellbeing of the four departments**, and a
mean that sits in the middle of the table. Both numbers are correct. They
describe the same 128 people. They support opposite headlines.

## Why the two disagree

A mean sits below a median when a long tail pulls it down. So look at what the
department is made of:

<CodeBlock id="why" code={`employees %>%
  group_by(department) %>%
  summarise(
    mean_workload = mean(workload),
    mean_autonomy = mean(autonomy),
    q10 = quantile(wellbeing, 0.10),
    q90 = quantile(wellbeing, 0.90)
  )`} />

Engineering has the highest workload **and** the highest autonomy in the
company. Autonomy lifts wellbeing and workload pushes it down, so the department
contains both the best-off people in the company and a heavy tail of people who
are not coping. The typical engineer is doing well — that is the median. The
average engineer is dragged down by the tail — that is the mean.

<CodeBlock id="tail" code={`cutoff <- quantile(employees$wellbeing, 0.10)

employees %>%
  group_by(department) %>%
  summarise(in_bottom_tenth = sum(wellbeing < cutoff), n = n())`} />

Count how many of each department fall in the worst-off tenth of the company.
A department can hold more than its share of them and still have the highest
typical score.

<Exercise id="m3-3-a" />

## What to do about it

Three rules, and you will use all of them for the rest of the course.

1. **Report both** when they disagree, and say which one your conclusion rests
   on.
2. **Look at the distribution**, not only at summaries of it. Module 4 draws
   this department in one boxplot, and the shape is obvious in a second.
3. **Say what the summary is of.** "Typical" and "average" are different claims
   about different people.

<Interpret
  id="i-3-3"
  question="You have to write one sentence about Engineering for a management report. Which is defensible on the summaries you have computed?"
  choices={[
    { text: 'Engineering has average wellbeing and needs no attention.', response: 'It rests on the mean alone and then adds a recommendation the data does not support. The tail is precisely the group that needs attention.' },
    { text: 'Engineering has the highest median wellbeing of the four departments, but also a longer lower tail: its mean is pulled below Marketing by a minority of employees reporting very low scores.', correct: true, response: 'Correct. It names both summaries, says which people cause the gap between them, and makes a claim that someone could check against the data.' },
    { text: 'Engineering has the highest wellbeing in the company.', response: 'True of the median and false of the mean, and the sentence does not say which it means. A reader will assume the average.' },
    { text: 'The Engineering data are unreliable, because the mean and the median disagree.', response: 'The disagreement is information about the shape of the distribution, not evidence of bad data. Skewed distributions are normal and honest.' },
  ]}
/>

<Quiz
  id="q-3-3"
  question="For which of these would the mean and the median of a column be closest to each other?"
  choices={[
    { text: 'Tenure in years, where most employees are new and a few have been there 30 years', response: 'That is a long right tail, which pulls the mean above the median. It is exactly the shape tenure_years has in this dataset.' },
    { text: 'A wellbeing score with a roughly symmetric distribution and no extreme values', correct: true, response: 'Right. When the distribution is symmetric the two summaries land in almost the same place, and it does not much matter which you report.' },
    { text: 'Annual salaries in a company with three very highly paid directors', response: 'Three extreme values move the mean and leave the median alone - the textbook example of why median income is reported rather than mean income.' },
    { text: 'Any column with at least 400 values', response: 'Sample size does not make a distribution symmetric. A skewed column stays skewed however many rows you add.' },
  ]}
/>
````

- [ ] **Step 6: Add the Module 3 assertions**

Append to `src/content/content.test.ts`, importing `module03`:

```ts
test('Module 3 defines exactly its five exercises, in order', () => {
  expect(module03.map((exercise) => exercise.id)).toEqual([
    'm3-1-a', 'm3-1-b', 'm3-2-a', 'm3-2-b', 'm3-3-a',
  ]);
});

test('Module 3 checks recompute from the dataset instead of naming a department', () => {
  // P2 step 4 allows re-seeding workplace.csv if a designed effect fails to land.
  // The Engineering surprise survives that, because it comes from the department
  // profiles rather than the seed - but which department has the highest mean can
  // move. A check that spelled a department name would then fail a correct answer.
  for (const exercise of module03) {
    expect(exercise.check, `${exercise.id} names a department`).not.toMatch(
      /\b(Sales|Engineering|Support|Marketing)\b/,
    );
    expect(exercise.check, `${exercise.id} never reads the dataset`).toMatch(
      /read\.csv\("data\/workplace\.csv"/,
    );
  }
});
```

- [ ] **Step 7: Run the content tests and the validator**

Run: `npx vitest run src/content/content.test.ts`
Expected: PASS, with `module-03` live in `MODULES`.

Run: `npm run validate`
Expected: PASS. The fixture to watch is `m3-3-a`'s first wrong answer — the student who sorts by the mean. It fails only because the highest mean and the highest median belong to different departments, which is the property P2 step 4 verified. If it passes instead, the committed dataset does not have the Module 3 surprise in it: stop, re-run P2 step 4, and fix the dataset rather than the exercise.

- [ ] **Step 8: Verify the lessons render**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/03-1`, `/03-2` and `/03-3`.

Expected: every summary block prints a tibble. In `03-2`, the `n-trap` block prints a `with_nrow` column of four identical numbers, which is the point. In `03-3`, the medians table puts Engineering at the top and the means table does not, and the `<Interpret>` block reveals its explanations only after a choice is made.

- [ ] **Step 9: Commit**

```bash
git add src/content/manifest.ts src/content/content.test.ts src/content/exercises/module-03.ts src/content/lessons/03-1-summaries.mdx src/content/lessons/03-2-group-by.mdx src/content/lessons/03-3-mean-vs-median.mdx
git commit -m "feat: Module 3, describing data"
```

---

### Task M4: Module 4 — Visualising data

**Files:**
- Create: `src/content/lessons/04-1-ggplot-layers.mdx`, `src/content/lessons/04-2-boxplots-and-facets.mdx`, `src/content/lessons/04-3-scatter-and-apa.mdx`
- Modify: `src/content/exercises/module-04.ts`, `src/content/manifest.ts`, `src/content/content.test.ts`
- Test: `npx vitest run src/content/content.test.ts`, `npm run validate`

**Interfaces:**
- Consumes: `ExerciseDef`, `has_answer`/`answer`, `data/workplace.csv` (P2), `PLANNED_MODULES` (P3), `ggplot2::layer_data`
- Produces: `module04: ExerciseDef[]` with ids `m4-1-a`, `m4-2-a`, `m4-2-b`, `m4-3-a`; three lesson files; the `module-04` entry in `PLANNED_MODULES`

> **How a plot is checked.** A check never looks at an image — graphics capture
> is off under Node (shell plan Global Constraints), and an image could not be
> compared anyway. `ggplot2::layer_data(p, i)` returns the data frame layer `i`
> actually draws: bin counts for a histogram, `middle` and the hinges for a
> boxplot, `x`/`y` for points, the fitted grid for a smooth, and a `PANEL` column
> when the plot is facetted. Comparing that against the CSV is a value-based
> check in exactly the sense §5.2 means, and it accepts any route to the same
> picture — mapping in `ggplot()` or in the layer, a formula or `vars()` in
> `facet_wrap()`, `lm` as a symbol or as a string.

- [ ] **Step 1: Add the module to `PLANNED_MODULES`**

```ts
  {
    id: 'module-04',
    number: 4,
    title: 'Visualising data',
    lessons: [
      {
        id: '04-1',
        title: 'ggplot2 as layers',
        file: '04-1-ggplot-layers',
        exercises: ['m4-1-a'],
        packages: ['ggplot2'],
      },
      {
        id: '04-2',
        title: 'Comparing groups',
        file: '04-2-boxplots-and-facets',
        exercises: ['m4-2-a', 'm4-2-b'],
        packages: ['dplyr', 'ggplot2'],
      },
      {
        id: '04-3',
        title: 'An APA-ready figure',
        file: '04-3-scatter-and-apa',
        exercises: ['m4-3-a'],
        packages: ['ggplot2'],
      },
    ],
  },
```

`04-1` and `04-3` declare `ggplot2` only, so neither lesson may use `%>%`: the pipe comes from the tidyverse packages that re-export it, and ggplot2 is not one of them. Both lessons are written with `ggplot(employees, ...)` directly, which is how ggplot2 code is normally written anyway.

- [ ] **Step 2: Write `src/content/exercises/module-04.ts`**

```ts
import type { ExerciseDef } from '../../r/checker';

export const module04: ExerciseDef[] = [
  {
    id: 'm4-1-a',
    prompt:
      'Draw the distribution of wellbeing: a histogram with 20 bins, stored in wellbeing_plot.',
    starterCode:
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nwellbeing_plot <- ggplot(employees, aes(x = wellbeing)) +\n  ',
    solution:
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(employees, aes(x = wellbeing)) +\n  geom_histogram(bins = 20)',
    wrongAnswers: [
      // The setup with no layer: axes, no bars.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(employees, aes(x = wellbeing))',
      // The wrong column binned.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(employees, aes(x = workload)) +\n  geom_histogram(bins = 20)',
      // A density curve, which is a different picture of the same column.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(employees, aes(x = wellbeing)) +\n  geom_density()',
      // The default 30 bins, with the argument forgotten.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(employees, aes(x = wellbeing)) +\n  geom_histogram()',
    ],
    alternateSolutions: [
      // The mapping declared in the layer rather than in ggplot().
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(employees) +\n  geom_histogram(aes(x = wellbeing), bins = 20)',
      // Positional arguments throughout.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nwellbeing_plot <- ggplot(data = employees, mapping = aes(wellbeing)) +\n  geom_histogram(bins = 20)',
    ],
    check: `
      if (!has_answer("wellbeing_plot")) {
        list(pass = FALSE, message = "I could not find an object called wellbeing_plot.")
      } else {
        p <- answer("wellbeing_plot")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        if (!inherits(p, "ggplot")) {
          list(pass = FALSE, message = "wellbeing_plot should be the plot object itself - what ggplot() plus a layer returns.")
        } else if (length(p$layers) == 0L) {
          list(pass = FALSE, message = "Your plot has no layers, so it draws an empty panel with axes and nothing in them. ggplot() sets up the data and the mapping; a geom_ layer is what puts ink on the page.")
        } else if (!inherits(p$layers[[1]]$stat, "StatBin")) {
          list(pass = FALSE, message = "The first layer is not a histogram. geom_histogram() cuts the values into bins and draws a bar per bin; geom_density() smooths them into a curve instead, which is a different picture with different choices behind it.")
        } else {
          ld <- ggplot2::layer_data(p, 1)
          if ("flipped_aes" %in% names(ld) && isTRUE(ld$flipped_aes[1])) {
            list(pass = FALSE, message = "Your histogram is drawn sideways, which happens when the variable is mapped to y. A histogram puts the variable on x; the counts it computes go on y.")
          } else if (nrow(ld) != 20L) {
            list(pass = FALSE, message = paste0("Your histogram has ", nrow(ld), " bins rather than 20. geom_histogram() defaults to 30, so the number has to be asked for: geom_histogram(bins = 20)."))
          } else if (!isTRUE(all.equal(sum(ld$count), nrow(d), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("The bars account for ", sum(ld$count), " observations, but the file holds ", nrow(d), " employees."))
          } else {
            centre <- sum(ld$count * ld$x) / sum(ld$count)
            binw <- ld$xmax[1] - ld$xmin[1]
            candidates <- c("tenure_years", "workload", "autonomy", "wellbeing", "engagement_t1", "engagement_t2", "performance")
            gaps <- sapply(candidates, function(nm) abs(centre - mean(d[[nm]])))
            if (abs(centre - mean(d$wellbeing)) > binw) {
              list(pass = FALSE, message = paste0("The values you binned average about ", round(centre, 1), ", which is not wellbeing - it looks like ", names(which.min(gaps)), ". Check the variable inside aes()."))
            } else {
              list(pass = TRUE, message = paste0("Correct: 20 bins holding all ", nrow(d), " employees. Now change bins to 5, run it, and change it to 80. The data never moves; the shape you would describe in a report does. That is why the number of bins is a decision and not a default."))
            }
          }
        }
      }
    `,
    hints: [
      'ggplot(employees, aes(x = wellbeing)) sets up the data and says which column goes on x.',
      'A layer is added with a plus sign on the end of the line: + geom_histogram().',
      'geom_histogram() takes bins as an argument: geom_histogram(bins = 20).',
    ],
  },
  {
    id: 'm4-2-a',
    prompt:
      'Compare the four departments: a boxplot of wellbeing by department, stored in department_plot.',
    starterCode:
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\ndepartment_plot <- ggplot(employees, aes(x = department, y = wellbeing)) +\n  ',
    solution:
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_plot <- ggplot(employees, aes(x = department, y = wellbeing)) +\n  geom_boxplot()',
    wrongAnswers: [
      // The two axes the other way round: one box per wellbeing value is not the plot.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_plot <- ggplot(employees, aes(x = wellbeing, y = department)) +\n  geom_boxplot()',
      // Bars of summed wellbeing, which is a number with no meaning.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_plot <- ggplot(employees, aes(x = department, y = wellbeing)) +\n  geom_col()',
      // The wrong grouping variable.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_plot <- ggplot(employees, aes(x = site, y = wellbeing)) +\n  geom_boxplot()',
    ],
    alternateSolutions: [
      // Positional aes, which is how most published code writes it.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_plot <- ggplot(employees, aes(department, wellbeing)) +\n  geom_boxplot()',
      // Piped into ggplot(), with the mapping on the layer.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndepartment_plot <- employees %>%\n  ggplot() +\n  geom_boxplot(aes(x = department, y = wellbeing))',
    ],
    check: `
      if (!has_answer("department_plot")) {
        list(pass = FALSE, message = "I could not find an object called department_plot.")
      } else {
        p <- answer("department_plot")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        if (!inherits(p, "ggplot")) {
          list(pass = FALSE, message = "department_plot should be the plot object itself.")
        } else if (length(p$layers) == 0L) {
          list(pass = FALSE, message = "Your plot has no layers. Add + geom_boxplot().")
        } else if (!inherits(p$layers[[1]]$stat, "StatBoxplot")) {
          list(pass = FALSE, message = "The layer is not a boxplot. geom_col() draws a bar whose height is the total of the column, which for wellbeing scores is a number nobody wants; geom_boxplot() summarises each group by its quartiles.")
        } else {
          ld <- ggplot2::layer_data(p, 1)
          medians <- sort(as.vector(tapply(d$wellbeing, d$department, median)))
          if (!("middle" %in% names(ld))) {
            list(pass = FALSE, message = "Your boxes are drawn horizontally, which means wellbeing ended up on x. Put the grouping variable on x and the numbers on y.")
          } else if (nrow(ld) != nlevels(d$department)) {
            list(pass = FALSE, message = paste0("Your plot draws ", nrow(ld), " boxes, but there are ", nlevels(d$department), " departments. Check which variable is on x."))
          } else if (!isTRUE(all.equal(sort(as.vector(ld$middle)), medians, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "The lines inside the boxes are not the departments' median wellbeing. Check that wellbeing is the variable on y and department the one on x.")
          } else {
            list(pass = TRUE, message = paste0("Correct. The line in each box is the median you computed in Module 3, the box is the middle half of the department, and the dots beyond the whiskers are the tail you had to infer from numbers last module. The department with the highest line is not the one with the highest mean - here it is visible in one glance."))
          }
        }
      }
    `,
    hints: [
      'A boxplot needs a grouping variable and a number: aes(x = department, y = wellbeing).',
      'The layer is geom_boxplot(), with no arguments needed.',
      'If the boxes come out horizontal, the two variables are the wrong way round.',
    ],
  },
  {
    id: 'm4-2-b',
    prompt:
      'Compare performance in Sales and Engineering only, one panel each: filter to those two departments, then draw a histogram of performance with 15 bins and facet_wrap() by department. Store it in facet_plot.',
    starterCode:
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\ntwo_departments <- employees %>%\n  \nfacet_plot <- ',
    solution:
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ntwo_departments <- employees %>%\n  filter(department %in% c("Sales", "Engineering"))\nfacet_plot <- ggplot(two_departments, aes(x = performance)) +\n  geom_histogram(bins = 15) +\n  facet_wrap(~ department)',
    wrongAnswers: [
      // No filter: all four departments get a panel.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ntwo_departments <- employees\nfacet_plot <- ggplot(two_departments, aes(x = performance)) +\n  geom_histogram(bins = 15) +\n  facet_wrap(~ department)',
      // Colour instead of panels: everything overlaps in one picture.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ntwo_departments <- employees %>%\n  filter(department %in% c("Sales", "Engineering"))\nfacet_plot <- ggplot(two_departments, aes(x = performance, fill = department)) +\n  geom_histogram(bins = 15)',
      // Two panels, but not the two departments that were asked for.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ntwo_departments <- employees %>%\n  filter(department %in% c("Sales", "Support"))\nfacet_plot <- ggplot(two_departments, aes(x = performance)) +\n  geom_histogram(bins = 15) +\n  facet_wrap(~ department)',
    ],
    alternateSolutions: [
      // vars() instead of a formula.
      'library(dplyr)\nlibrary(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ntwo_departments <- employees %>%\n  filter(department == "Sales" | department == "Engineering")\nfacet_plot <- ggplot(two_departments, aes(x = performance)) +\n  geom_histogram(bins = 15) +\n  facet_wrap(vars(department))',
      // Base subsetting, and the mapping declared on the layer.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ntwo_departments <- employees[employees$department %in% c("Sales", "Engineering"), ]\nfacet_plot <- ggplot(two_departments) +\n  geom_histogram(aes(x = performance), bins = 15) +\n  facet_wrap(~ department)',
    ],
    check: `
      if (!has_answer("facet_plot")) {
        list(pass = FALSE, message = "I could not find an object called facet_plot.")
      } else {
        p <- answer("facet_plot")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        wanted <- c("Sales", "Engineering")
        expected_counts <- sort(as.vector(table(d$department)[wanted]))
        if (!inherits(p, "ggplot")) {
          list(pass = FALSE, message = "facet_plot should be the plot object itself.")
        } else if (length(p$layers) == 0L) {
          list(pass = FALSE, message = "Your plot has no layers. Add + geom_histogram(bins = 15).")
        } else if (!inherits(p$layers[[1]]$stat, "StatBin")) {
          list(pass = FALSE, message = "The first layer is not a histogram.")
        } else {
          ld <- ggplot2::layer_data(p, 1)
          panels <- droplevels(factor(ld$PANEL))
          per_panel <- sort(as.vector(tapply(ld$count, panels, sum)))
          if (nlevels(panels) == 1L) {
            list(pass = FALSE, message = "Everything is in one panel. Mapping department to fill or colour puts both departments in the same picture, where the bars sit on top of each other; facet_wrap(~ department) gives each department a panel of its own with the same axes.")
          } else if (nlevels(panels) != 2L) {
            list(pass = FALSE, message = paste0("Your plot has ", nlevels(panels), " panels. Only Sales and Engineering were asked for, so filter() before plotting - facet_wrap() draws a panel for every value it is given."))
          } else if (!isTRUE(all.equal(per_panel, expected_counts, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("Two panels, but they hold ", paste(per_panel, collapse = " and "), " employees rather than ", paste(expected_counts, collapse = " and "), ". Check which two departments you kept."))
          } else if (nrow(ld) != 30L) {
            list(pass = FALSE, message = paste0("Each panel should have 15 bins, so the layer should have 30 rows in total; it has ", nrow(ld), ". Set bins = 15 inside geom_histogram()."))
          } else {
            centre <- sum(ld$count * ld$x) / sum(ld$count)
            kept <- d[d$department %in% wanted, ]
            binw <- ld$xmax[1] - ld$xmin[1]
            if (abs(centre - mean(kept$performance)) > binw) {
              list(pass = FALSE, message = paste0("The binned values average about ", round(centre, 1), ", but performance in those two departments averages ", round(mean(kept$performance), 1), ". Check the variable inside aes()."))
            } else {
              list(pass = TRUE, message = "Correct. Both panels share an x axis and a y axis, which is what makes them comparable - two histograms drawn separately, each with its own scale, would not be.")
            }
          }
        }
      }
    `,
    hints: [
      'filter(department %in% c("Sales", "Engineering")) keeps two departments in one condition.',
      'facet_wrap(~ department) gives every remaining department its own panel.',
      'The panels only exist for values still in the data, so filter first and facet afterwards.',
    ],
  },
  {
    id: 'm4-3-a',
    prompt:
      'Build one figure you could paste into a report: wellbeing against autonomy as points, with a straight-line fit from geom_smooth(method = lm), axis labels written for a reader, and theme_classic(). Store it in apa_plot.',
    starterCode:
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  ',
    solution:
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_point(alpha = 0.5) +\n  geom_smooth(method = lm) +\n  labs(\n    x = "Autonomy (self-reported, 1 to 10)",\n    y = "Wellbeing (0 to 100)"\n  ) +\n  theme_classic()',
    wrongAnswers: [
      // No labs(): the axes still carry the raw column names.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_point(alpha = 0.5) +\n  geom_smooth(method = lm) +\n  theme_classic()',
      // geom_smooth() with no method: a loess curve, not a linear fit.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_point(alpha = 0.5) +\n  geom_smooth() +\n  labs(x = "Autonomy (self-reported, 1 to 10)", y = "Wellbeing (0 to 100)") +\n  theme_classic()',
      // The default grey theme left in place.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_point(alpha = 0.5) +\n  geom_smooth(method = lm) +\n  labs(x = "Autonomy (self-reported, 1 to 10)", y = "Wellbeing (0 to 100)")',
      // geom_line() joins the points instead of fitting anything.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_point(alpha = 0.5) +\n  geom_line() +\n  labs(x = "Autonomy (self-reported, 1 to 10)", y = "Wellbeing (0 to 100)") +\n  theme_classic()',
    ],
    alternateSolutions: [
      // method as a string, the band switched off, and the layers in the other order.
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_smooth(method = "lm", se = FALSE) +\n  geom_point() +\n  labs(x = "Autonomy (1 to 10)", y = "Wellbeing (0 to 100)") +\n  theme_classic()',
      // xlab() and ylab() instead of labs().
      'library(ggplot2)\nemployees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\napa_plot <- ggplot(employees, aes(x = autonomy, y = wellbeing)) +\n  geom_point() +\n  geom_smooth(method = lm) +\n  xlab("Autonomy rating") +\n  ylab("Wellbeing score") +\n  theme_classic()',
    ],
    check: `
      if (!has_answer("apa_plot")) {
        list(pass = FALSE, message = "I could not find an object called apa_plot.")
      } else {
        p <- answer("apa_plot")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        if (!inherits(p, "ggplot")) {
          list(pass = FALSE, message = "apa_plot should be the plot object itself.")
        } else if (length(p$layers) == 0L) {
          list(pass = FALSE, message = "Your plot has no layers.")
        } else {
          point_i <- which(vapply(p$layers, function(l) inherits(l$geom, "GeomPoint"), logical(1)))
          smooth_i <- which(vapply(p$layers, function(l) inherits(l$stat, "StatSmooth"), logical(1)))
          if (length(point_i) == 0L) {
            list(pass = FALSE, message = "There is no layer of points. geom_point() draws one point per employee, and a scatterplot without the points is a line with nothing to explain it.")
          } else {
            pd <- ggplot2::layer_data(p, point_i[1])
            if (nrow(pd) != nrow(d)) {
              list(pass = FALSE, message = paste0("The point layer draws ", nrow(pd), " points, but there are ", nrow(d), " employees."))
            } else if (!isTRUE(all.equal(sort(as.vector(pd$x)), sort(d$autonomy), tolerance = 1e-6, check.attributes = FALSE))) {
              list(pass = FALSE, message = "The variable on x is not autonomy.")
            } else if (!isTRUE(all.equal(sort(as.vector(pd$y)), sort(d$wellbeing), tolerance = 1e-6, check.attributes = FALSE))) {
              list(pass = FALSE, message = "The variable on y is not wellbeing. The outcome - the thing you think is being affected - goes on y.")
            } else if (length(smooth_i) == 0L) {
              list(pass = FALSE, message = "There is no fitted line. geom_line() joins the points in the order they appear, which for 480 unordered employees is a scribble; geom_smooth() fits a model and draws that.")
            } else {
              sd_layer <- ggplot2::layer_data(p, smooth_i[1])
              steps <- diff(as.vector(sd_layer$y))
              spread <- max(1, diff(range(as.vector(sd_layer$y))))
              straight <- length(steps) > 2L && max(abs(diff(steps))) <= 1e-6 * spread
              labels <- p$labels
              if (is.null(labels$x) || is.null(labels$y)) labels <- ggplot2::ggplot_build(p)$plot$labels
              if (!straight) {
                list(pass = FALSE, message = "The fitted line bends, so it is not a linear fit. Left to itself geom_smooth() fits a loess curve, which is useful for looking but is not a model you can report a slope from. Ask for the linear model: geom_smooth(method = lm).")
              } else if (is.null(labels$x) || is.null(labels$y) ||
                         identical(labels$x, "autonomy") || identical(labels$y, "wellbeing")) {
                list(pass = FALSE, message = "The axes are still labelled with the column names. A figure has to be readable on its own, by someone who has never seen your data frame: labs(x = \\"Autonomy (1 to 10)\\", y = \\"Wellbeing (0 to 100)\\").")
              } else if (!inherits(p$theme$panel.grid, "element_blank")) {
                list(pass = FALSE, message = "The grey panel and its grid lines are still there. APA figures are drawn on white, with axis lines and no grid: add + theme_classic().")
              } else {
                list(pass = TRUE, message = "That figure could go in a report as it stands: the points show every employee, the line shows the model, the axes say what they mean, and nothing is drawn that carries no information. Module 9 fits exactly this line with lm() and tells you whether its slope is worth believing.")
              }
            }
          }
        }
      }
    `,
    hints: [
      'Two layers: geom_point() for the employees and geom_smooth(method = lm) for the line.',
      'labs(x = "...", y = "...") replaces the column names with something a reader understands.',
      'theme_classic() removes the grey panel and the grid, leaving the two axis lines.',
    ],
  },
];
```

- [ ] **Step 3: Write `src/content/lessons/04-1-ggplot-layers.mdx`**

````mdx
Module 3 described the wellbeing column with four numbers. This module draws it,
and you will see things in the picture that no summary reported.

ggplot2 builds a figure out of three parts, and every plot in this course is
some combination of them:

1. the **data** — one data frame;
2. the **mapping** — which column goes on which part of the picture, written
   inside `aes()`;
3. one or more **layers** — what is actually drawn, written as `geom_` something.

<CodeBlock id="setup" code={`library(ggplot2)

employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)`} />

## Data and mapping alone draw nothing

<CodeBlock id="empty" code={`ggplot(employees, aes(x = wellbeing))`} />

Axes, a range, a grey panel — and no data. That is correct behaviour, not a
bug. You have said what to draw with; you have not said what to draw.

<Predict
  id="p-layer"
  question="What has to be added to put something in that panel?"
  choices={[
    { text: 'The data, which has not been supplied yet', response: 'The data was the first argument to ggplot(), and it is what gave the x axis its range.' },
    { text: 'A geom layer, added with a plus sign', correct: true, response: 'Yes. ggplot() prepares the canvas; a geom_ layer draws on it. One plot can carry several layers, drawn in the order you add them.' },
    { text: 'A call to plot() or print()', response: 'A ggplot object prints itself. What is missing is a layer, not a print.' },
  ]}
/>

## Adding a layer

<CodeBlock id="histogram" code={`ggplot(employees, aes(x = wellbeing)) +
  geom_histogram(bins = 20)`} />

A **histogram** cuts the range into bins and counts how many employees fall in
each. Notice what ggplot2 did without being asked: it computed the counts, and
put them on the y axis. You mapped one column; the second axis came from the
geom.

## Bins are a decision

<CodeBlock id="bins" code={`ggplot(employees, aes(x = wellbeing)) +
  geom_histogram(bins = 5)`} />

> **Try it.** Change `bins = 5` to `bins = 80` and run it again. Then try 20.
> The data is identical in all three. With five bins the distribution looks
> smooth and symmetric; with eighty it looks ragged and full of structure that
> is really just noise.

There is no correct number of bins, which is precisely why you should look at
more than one before describing a shape in words.

## A different view of the same column

<CodeBlock id="density" code={`ggplot(employees, aes(x = wellbeing)) +
  geom_density()`} />

A **density** curve smooths the histogram. It is easier to read and it hides how
many observations there are, so it is a poor choice when n is small — and it
makes exactly the same kind of arbitrary choice as the number of bins, only
where you cannot see it.

<Exercise id="m4-1-a" />

<Quiz
  id="q-4-1"
  question="A figure is built with ggplot(employees, aes(x = tenure_years)) + geom_histogram(bins = 30). What is on the y axis?"
  choices={[
    { text: 'tenure_years, the same as x', response: 'Nothing was mapped to y at all. y comes from the layer.' },
    { text: 'The number of employees in each bin, computed by the histogram', correct: true, response: 'Right. Some geoms compute a variable of their own - a histogram computes counts - and that is what fills the axis you never mapped.' },
    { text: 'Nothing, because only x was mapped', response: 'The axis exists and is labelled count. geom_histogram() supplied it.' },
    { text: 'wellbeing, because it is the outcome of the study', response: 'ggplot2 draws only what it is told to draw. A column that is not in the mapping is not in the figure.' },
  ]}
/>
````

- [ ] **Step 4: Write `src/content/lessons/04-2-boxplots-and-facets.mdx`**

````mdx
Module 3 ended with a puzzle: Engineering has the highest median wellbeing and a
middling mean, and the numbers alone made that hard to picture. One figure
settles it.

<CodeBlock id="setup" code={`library(dplyr)
library(ggplot2)

employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)`} />

## The boxplot

Map the grouping variable to x and the number to y.

<CodeBlock id="box" code={`ggplot(employees, aes(x = department, y = wellbeing)) +
  geom_boxplot()`} />

Each box is one department, and it is built from the summaries you already
computed:

- the thick line is the **median**;
- the box spans the **quartiles** — the middle half of the department, so its
  height is the IQR;
- the whiskers reach out to the furthest observation within 1.5 IQRs of the box;
- anything beyond that is drawn as a point, and is worth looking at rather than
  deleting.

Look at Engineering. Its median line is the highest of the four, its box is
tall, and it has a run of low points below the whisker. That single picture is
the whole of lesson 3-3, and it took one line of code.

<Predict
  id="p-box"
  question="Two departments have boxes at the same height, but one box is twice as tall as the other. What does that mean?"
  choices={[
    { text: 'The taller box has more employees in it', response: 'Box height says nothing about group size - a boxplot of five people and one of five hundred look the same. That is its main weakness.' },
    { text: 'The taller box has more variable wellbeing: its middle half is spread over twice the range', correct: true, response: 'Right. The height of the box is the interquartile range, so it is about spread, not about numbers of people.' },
    { text: 'The taller box has more outliers', response: 'Outliers are the points drawn beyond the whiskers, and they do not change the height of the box itself.' },
  ]}
/>

A boxplot hides the group sizes, so report them alongside it:

<CodeBlock id="counts" code={`employees %>%
  group_by(department) %>%
  summarise(median_wellbeing = median(wellbeing), n = n())`} />

<Exercise id="m4-2-a" />

## Facets: the same plot, once per group

A boxplot compresses each group into five numbers. Sometimes you want the whole
distribution for each group, and `facet_wrap()` gives you one panel per level of
a variable, with the axes shared so the panels can be compared.

<CodeBlock id="facets" code={`ggplot(employees, aes(x = wellbeing)) +
  geom_histogram(bins = 20) +
  facet_wrap(~ department)`} />

The tilde is read as "by": one panel **by** department. The alternative —
mapping department to `fill` and drawing one histogram — puts four overlapping
distributions in one panel, and is much harder to read.

<CodeBlock id="fill" code={`ggplot(employees, aes(x = wellbeing, fill = department)) +
  geom_histogram(bins = 20)`} />

## Filtering before plotting

Facets are drawn for the values that are present in the data, so restricting the
figure is a dplyr job, not a ggplot2 one.

<CodeBlock id="filter-plot" code={`employees %>%
  filter(remote == "Yes") %>%
  ggplot(aes(x = department, y = wellbeing)) +
  geom_boxplot()`} />

Note the punctuation change halfway through: the pipe carries the data into
`ggplot()`, and from there layers are added with `+`. Mixing them up is the most
common ggplot2 error message there is.

<Exercise id="m4-2-b" />

<Quiz
  id="q-4-2"
  question="A figure facets by site, and one of the six sites is missing from it entirely. What is the most likely reason?"
  choices={[
    { text: 'facet_wrap() shows at most five panels', response: 'It has no such limit; it wraps as many panels as there are values.' },
    { text: 'No rows with that site survived the filtering that came before the plot', correct: true, response: 'Right. Facets are drawn from the data the plot receives, so a value filtered away has no panel. Check the row counts before blaming the figure.' },
    { text: 'That site has too few employees to plot', response: 'Even one employee would get a panel with one bar in it.' },
    { text: 'site is a factor, and factors cannot be facetted', response: 'A factor is exactly what facet_wrap() wants. Its levels become the panels.' },
  ]}
/>
````

- [ ] **Step 5: Write `src/content/lessons/04-3-scatter-and-apa.mdx`**

````mdx
So far every figure has described one column, or one column within groups. The
last one puts two numbers together, which is the shape of every question in Part
3 of this course: does wellbeing go with autonomy, and by how much?

<CodeBlock id="setup" code={`library(ggplot2)

employees <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)`} />

## The scatterplot

Two numeric columns, one on each axis, one point per employee.

<CodeBlock id="scatter" code={`ggplot(employees, aes(x = autonomy, y = wellbeing)) +
  geom_point()`} />

Which variable goes where is a claim, not a convention: the thing you think is
being affected — the **outcome** — goes on y, and the thing you think is doing
the affecting goes on x. Module 9 writes the same claim as
`lm(wellbeing ~ autonomy)`, in the same order.

With 480 points, many land on top of each other. Making them partly transparent
shows where the crowd is.

<CodeBlock id="alpha" code={`ggplot(employees, aes(x = autonomy, y = wellbeing)) +
  geom_point(alpha = 0.4)`} />

`alpha` is set to a fixed value here, outside `aes()`. Inside `aes()` it would
mean "vary the transparency according to a column", which is not what you want.
That distinction — constants outside `aes()`, mappings inside — catches everyone
once.

<Predict
  id="p-smooth"
  question="You add geom_smooth() with no arguments to this plot. What line do you get?"
  choices={[
    { text: 'A straight line, the regression line', response: 'That is what most people expect and it is not the default. geom_smooth() chooses a method based on the sample size.' },
    { text: 'A curve that follows the local trend, with a shaded band around it', correct: true, response: 'Yes: with fewer than a thousand rows it fits a loess curve. It is excellent for looking at a relationship and useless for reporting one, because it has no slope to quote.' },
    { text: 'Nothing, because the method argument is required', response: 'It runs happily, tells you in a message which formula it used, and draws a curve.' },
  ]}
/>

<CodeBlock id="loess" code={`ggplot(employees, aes(x = autonomy, y = wellbeing)) +
  geom_point(alpha = 0.4) +
  geom_smooth()`} />

## Ask for the model you mean

<CodeBlock id="lm" code={`ggplot(employees, aes(x = autonomy, y = wellbeing)) +
  geom_point(alpha = 0.4) +
  geom_smooth(method = lm)`} />

That straight line is the fitted linear model — the same line `lm()` produces in
Module 9, drawn before you have learned to fit it. The grey band is a confidence
interval for the line, which Module 7 explains.

## Making it APA-ready

The figure is now correct and still unpublishable. Two changes fix that.

<CodeBlock id="apa" code={`ggplot(employees, aes(x = autonomy, y = wellbeing)) +
  geom_point(alpha = 0.4) +
  geom_smooth(method = lm) +
  labs(
    x = "Autonomy (self-reported, 1 to 10)",
    y = "Wellbeing (0 to 100)"
  ) +
  theme_classic()`} />

- `labs()` replaces the column names. A reader has never seen your data frame,
  and `autonomy` does not tell them the scale or what was asked.
- `theme_classic()` removes the grey panel and the grid lines, leaving two axis
  lines on white. APA figures carry no decoration that does not carry
  information.

Two more rules that live outside the code. The caption goes below the figure and
says what it shows, not what you concluded from it. And nothing that matters may
depend on colour alone, because the journal may print in greyscale and some of
your readers cannot distinguish red from green.

<Exercise id="m4-3-a" />

<Interpret
  id="i-4-3"
  question="Which caption belongs under the figure you just built?"
  choices={[
    { text: 'Figure 1. Autonomy causes higher wellbeing among employees.', response: 'The figure shows an association in observational data. Nothing here rules out the possibility that content employees report more autonomy, or that a third variable drives both.' },
    { text: 'Figure 1. Wellbeing as a function of self-reported autonomy in 480 employees, with a fitted linear regression line and 95% confidence band.', correct: true, response: 'Correct. It says what is plotted, for how many people, and what the line is - everything a reader needs to interpret the figure without the surrounding text.' },
    { text: 'Figure 1. Scatterplot.', response: 'True and useless. A caption has to work when the figure is read on its own, which is how figures are usually read.' },
    { text: 'Figure 1. The relationship between autonomy and wellbeing was significant.', response: 'A caption describes the figure; significance belongs in the text, and nothing in this figure reports a test.' },
  ]}
/>

<Quiz
  id="q-4-3"
  question="In geom_point(alpha = 0.4), why is alpha outside the aes() brackets?"
  choices={[
    { text: 'Because alpha is not a real aesthetic', response: 'It is a genuine aesthetic - you could map a column to it. The question is whether you want to.' },
    { text: 'Because it is a fixed setting for every point, not a mapping from a column', correct: true, response: 'Right. Inside aes() a value means "take this from the data"; outside it means "use this constant". aes(alpha = 0.4) would invent a column containing 0.4 and add a legend for it.' },
    { text: 'Because aes() accepts only x and y', response: 'aes() accepts colour, fill, shape, size, alpha and more - as mappings from columns.' },
    { text: 'Because transparency is set by the theme', response: 'Themes control the non-data parts of the figure: panels, grids, fonts. The ink that represents data is set by the layer.' },
  ]}
/>
````

- [ ] **Step 6: Add the Module 4 assertions**

Append to `src/content/content.test.ts`, importing `module04`:

```ts
test('Module 4 defines exactly its four exercises, in order', () => {
  expect(module04.map((exercise) => exercise.id)).toEqual([
    'm4-1-a', 'm4-2-a', 'm4-2-b', 'm4-3-a',
  ]);
});

test('Module 4 checks inspect the plot object rather than an image', () => {
  // Graphics capture is off under Node, so a check that tried to render would
  // report every answer as a broken exercise.
  for (const exercise of module04) {
    expect(exercise.check, `${exercise.id} does not inspect the plot`).toMatch(
      /ggplot2::layer_data|\$layers/,
    );
    expect(exercise.check, `${exercise.id} tries to render`).not.toMatch(/ggsave|png\(|print\(/);
  }
});

test('the APA figure exercise asks for all three of labels, a linear fit and theme_classic', () => {
  const apa = module04.find((exercise) => exercise.id === 'm4-3-a')!;
  expect(apa.solution).toMatch(/labs\(/);
  expect(apa.solution).toMatch(/geom_smooth\(method = lm\)/);
  expect(apa.solution).toMatch(/theme_classic\(\)/);
  // Each of the three has its own negative fixture, so a check that silently
  // stopped testing one of them would be caught by the R validator.
  expect(apa.wrongAnswers.length).toBeGreaterThanOrEqual(3);
});

test('lessons 04-1 and 04-3 avoid the pipe, which ggplot2 does not export', () => {
  for (const file of ['04-1-ggplot-layers', '04-3-scatter-and-apa']) {
    const source = sources[`./lessons/${file}.mdx`] ?? '';
    expect(source, `${file} uses %>% without attaching dplyr`).not.toMatch(/%>%/);
  }
});
```

- [ ] **Step 7: Run the content tests and the validator**

Run: `npx vitest run src/content/content.test.ts`
Expected: PASS, with all four Part 1 modules live in `MODULES`.

Run: `npm run validate`
Expected: PASS. The plot exercises are the slowest in Part 1, because each fixture builds a ggplot; budget a few minutes. Two failure modes are worth recognising rather than patching around:

- A wrong answer reported as an R error usually means the plot failed to *build* (`layer_data` forces the build). Replace the fixture with one that produces a wrong picture rather than no picture.
- `m4-3-a`'s "no method" fixture depends on `geom_smooth()` choosing loess. It does so below 1000 rows, and `workplace.csv` has 480, so no `mgcv` install is involved. If the dataset ever grows past 1000 rows the default becomes a GAM, and this fixture needs revisiting.

- [ ] **Step 8: Verify the lessons render**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/04-1`, `/04-2` and `/04-3`.

Expected: every code block draws a plot in the output pane — this is the first module that depends on the canvas path end to end. In `04-1` the `empty` block draws axes and no bars. In `04-2` the boxplot shows Engineering with the highest median line and a tail of low points below its whisker. In `04-3` the `loess` block prints ggplot2's "using formula" message and draws a curve, and the `apa` block draws the same data on a white panel with a straight line. Check the last one at a narrow browser width too, since the output pane sizes the graphics device.

- [ ] **Step 9: Commit**

```bash
git add src/content/manifest.ts src/content/content.test.ts src/content/exercises/module-04.ts src/content/lessons/04-1-ggplot-layers.mdx src/content/lessons/04-2-boxplots-and-facets.mdx src/content/lessons/04-3-scatter-and-apa.mdx
git commit -m "feat: Module 4, visualising data"
```

---

## Self-Review

Run this after M1–M4 are implemented, against spec §7 and §7.1.

| Spec section | Covered by |
|---|---|
| §7 Module 1 — scripts and comments, objects, functions, help, packages and `library()` | M1: `01-1` (objects, vectors, comments, vectorised arithmetic), `01-2` (arguments, defaults, `args()`, `NA`/`na.rm`, nested calls), `01-3` (install vs attach, masking, the pipe, the tidyverse meta-package in prose) |
| §7 Module 2 — `read.csv(..., stringsAsFactors = TRUE)`, factors, `%>%`, `select`/`filter`/`mutate`, wide vs long with `pivot_longer` | M2: `02-1` (read, codebook, `str`, levels, `table`), `02-2` (pipe, `filter`, `select`, `mutate`, `arrange`), `02-3` (`pivot_longer`, tidy data, `pivot_wider`) |
| §7 Module 3 — `group_by` + `summarise` (mean, SD, n), mean vs median, spotting surprises in summaries | M3: `03-1` (`summarise`, `n()`, SD/IQR/range), `03-2` (`group_by`, the `nrow()` trap, two groups), `03-3` (the Engineering mean-vs-median surprise, and what to report) |
| §7 Module 4 — ggplot2 as layers: histogram, density, boxplot, scatter with `geom_smooth(method = lm)`, `facet_wrap`, `labs` and `theme_classic` for an APA-ready figure | M4: `04-1` (grammar, histogram, bins, density), `04-2` (boxplot, `facet_wrap`, filter-then-plot), `04-3` (scatter, `geom_smooth(method = lm)`, `labs`, `theme_classic`) |
| §7.1 Tidyverse style throughout | Every lesson from `02-2` on uses `%>%`, dplyr verbs and ggplot2 layers. Base R appears only where the tidyverse has no equivalent or where the point is comparison: `02-1` (factors), `read.csv`, `table`, `tapply` in alternate solutions |
| §7.1 Never `library(tidyverse)` | `01-3` explains the meta-package in prose, in an indented block that is not a runnable `<CodeBlock>`; every other lesson attaches packages by name, and each name appears in that lesson's manifest `packages` field |
| §7.1 Original material | All prose, examples, choices and fixtures written for StatLab against the P2 codebook |
| §4.1 `<Predict>` before the result it answers | One per lesson, twelve in total, each placed before the block that settles it |
| §4.1 `<Quiz>` closes every lesson | Twelve, one per lesson |
| §5.1 Exercise contract | Nineteen `ExerciseDef`s, every field filled; `setupCode` used once (`m1-3-a`) |
| §5.2 Value-based checks, tolerance, teaching messages | Every check compares values via `isTRUE(all.equal(..., tolerance = 1e-6, check.attributes = FALSE))` on `as.vector()`-ed values, reads student objects only through `has_answer`/`answer`, and names the specific mistake rather than saying "incorrect" |
| §8.1 Negative and alternate fixtures | Three or four `wrongAnswers` and two `alternateSolutions` per exercise; every wrong answer fails through `pass = FALSE` |
| §8.2 Static content checks | Each task's step 6 adds module-specific assertions; the existing suite covers unknown components, unresolved exercise ids, duplicate block ids, forbidden functions and unmounted datasets |

**Deliberate deviations**

1. **Two `<Interpret>` blocks in non-inferential modules** (`03-3` and `04-3`). Spec §4.1 introduces `<Interpret>` as the closer for inferential lessons, and P4's validator rule scopes it to Modules 5 and 7–14. Both of these lessons nonetheless end in a claim that has to survive being written down — which department is doing best, and what a figure may be captioned — and those are the two places in Part 1 where a student who understood the code can still write something indefensible. The component is used as designed: one correct option, distractors drawn from the mistakes people actually make.
2. **`01-3` shows `library(tidyverse)` as indented text rather than as a `<CodeBlock>`.** The overview forbids running it; students will nonetheless meet it in every tutorial they read, so the lesson names it, explains what it does, and says why StatLab attaches packages individually. Indented text is not a runnable block, so the validator's code-block suite never executes it.
3. **Module 1 exercises build their data inline instead of reading a file.** Spec §7 gives Module 1 no dataset, and the workplace codebook is introduced in `02-1` where factors explain it. `m1-3-a` therefore uses `setupCode` to supply a six-row data frame, which is also the one place in Part 1 where an exercise needs `setupCode` at all.
4. **`m4-2-b` names Sales and Engineering in its check.** Task M3's rule against naming departments protects against a re-seeded dataset moving the *means* around; which departments exist is fixed by the generator's `DEPARTMENTS` constant, and this exercise is about facets rather than about any effect, so the two names are structural rather than derived.
5. **No `<Simulation>` anywhere in Part 1.** Spec §7's table assigns simulations to Modules 5, 6, 7, 8 and 9 only. Modules 1–4 are therefore independent of the simulations plan, and can be built before, after or alongside it.
