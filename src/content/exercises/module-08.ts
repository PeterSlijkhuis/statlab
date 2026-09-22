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
