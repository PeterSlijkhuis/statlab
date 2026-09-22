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
