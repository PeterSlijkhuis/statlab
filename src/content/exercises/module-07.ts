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
