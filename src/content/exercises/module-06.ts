import type { ExerciseDef } from '../../r/checker';

export const module06: ExerciseDef[] = [
  {
    id: 'm6-1-a',
    prompt:
      'Draw a random sample of 25 students from the population with slice_sample(). Store the sample in my_sample, and the mean of its stress scores in sample_mean.',
    starterCode:
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(1)\n\n# Draw 25 students at random, then compute the mean of their stress scores.\nmy_sample <- \nsample_mean <- ',
    setupCode: 'set.seed(1)',
    solution:
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(1)\nmy_sample <- population %>% slice_sample(n = 25)\nsample_mean <- my_sample %>% summarise(m = mean(stress)) %>% pull(m)',
    wrongAnswers: [
      // The whole population, not a sample.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmy_sample <- population\nsample_mean <- my_sample %>% summarise(m = mean(stress)) %>% pull(m)',
      // The wrong sample size.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(1)\nmy_sample <- population %>% slice_sample(n = 250)\nsample_mean <- my_sample %>% summarise(m = mean(stress)) %>% pull(m)',
      // A real sample, but the mean of the whole population.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(1)\nmy_sample <- population %>% slice_sample(n = 25)\nsample_mean <- population %>% summarise(m = mean(stress)) %>% pull(m)',
      // The stress column was dropped.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(1)\nmy_sample <- population %>% slice_sample(n = 25) %>% select(sleep_hours)\nsample_mean <- my_sample %>% summarise(m = mean(sleep_hours)) %>% pull(m)',
      // A summary table with more than the mean in it.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(1)\nmy_sample <- population %>% slice_sample(n = 25)\nsample_mean <- my_sample %>% summarise(m = mean(stress), n = n())',
      // Not random: the first 25 students in the file.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmy_sample <- population %>% slice_head(n = 25)\nsample_mean <- my_sample %>% summarise(m = mean(stress)) %>% pull(m)',
      // Not random, and a 25x1 matrix: the first 25 scores.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmy_sample <- population$stress[1:25] %>% as.matrix()\nsample_mean <- mean(my_sample)',
      // Not random: the last 25 students in the file.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nmy_sample <- tail(population, 25)\nsample_mean <- my_sample %>% summarise(m = mean(stress)) %>% pull(m)',
    ],
    alternateSolutions: [
      // Base R: a vector of scores.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(1)\nmy_sample <- sample(population$stress, 25)\nsample_mean <- mean(my_sample)',
      // No pull(): a one-cell data frame.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(1)\nmy_sample <- population %>% slice_sample(n = 25)\nsample_mean <- my_sample %>% summarise(m = mean(stress))',
      // unlist() leaves a named number.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(1)\nmy_sample <- population %>% slice_sample(n = 25)\nsample_mean <- my_sample %>% summarise(m = mean(stress)) %>% unlist()',
      // colMeans() also leaves a named number.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(1)\nmy_sample <- population %>% slice_sample(n = 25)\nsample_mean <- colMeans(my_sample["stress"])',
      // as.matrix() leaves a 1x1 matrix.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(1)\nmy_sample <- population %>% slice_sample(n = 25)\nsample_mean <- my_sample %>% summarise(m = mean(stress)) %>% as.matrix()',
    ],
    check: `
      if (!has_answer("my_sample") || !has_answer("sample_mean")) {
        list(pass = FALSE, message = "I need both my_sample (your 25 students) and sample_mean (the mean of their stress scores).")
      } else {
        my_sample <- answer("my_sample")
        sample_mean <- answer("sample_mean")
        if (is.data.frame(my_sample) && !("stress" %in% names(my_sample))) {
          list(pass = FALSE, message = "my_sample has no stress column, so I cannot find the stress scores. Keep the stress column in your sample.")
        } else if (!is.data.frame(my_sample) && !is.numeric(my_sample)) {
          list(pass = FALSE, message = "my_sample should be the 25 sampled students (a data frame) or their stress scores (numbers).")
        } else {
          # Tidyverse route: a data frame of students. Base route: a vector of scores.
          # as.vector(): a 25x1 matrix of the first 25 scores must not dodge identical() below via its dim.
          scores <- as.vector(if (is.data.frame(my_sample)) my_sample$stress else my_sample)
          # A student who forgot pull() has a 1x1 data frame; accept its value.
          one_cell <- is.data.frame(sample_mean) && nrow(sample_mean) == 1L && ncol(sample_mean) == 1L
          # as.vector(): unlist() and colMeans() give a correct but named number, and
          # as.matrix() a 1x1 matrix. It drops names and dim from atomic values but
          # leaves a data frame a list, so the table branch below still catches it.
          mean_value <- as.vector(if (one_cell) sample_mean[[1]] else sample_mean)
          population <- read.csv("data/wellbeing-population.csv")
          if (length(scores) == nrow(population)) {
            list(pass = FALSE, message = "my_sample holds all 5000 students - that is the whole population, not a sample of 25.")
          } else if (length(scores) != 25L) {
            list(pass = FALSE, message = paste0("my_sample has ", length(scores), " scores, but a sample of 25 needs exactly 25."))
          } else if (identical(scores, head(population$stress, 25))) {
            list(pass = FALSE, message = "Those are the first 25 students in the file, not a random sample. Use slice_sample(n = 25) so every student has the same chance of being picked.")
          } else if (identical(scores, tail(population$stress, 25))) {
            list(pass = FALSE, message = "Those are the last 25 students in the file, not a random sample. Use slice_sample(n = 25) so every student has the same chance of being picked.")
          } else if (!all(scores %in% population$stress)) {
            list(pass = FALSE, message = "Some values in my_sample are not stress scores from the population.")
          } else if (is.data.frame(sample_mean) && nrow(sample_mean) * ncol(sample_mean) > 1L) {
            list(pass = FALSE, message = "sample_mean should be a single number, but it is a table with several columns or rows. Keep only the mean, then use pull() to turn it into a number.")
          } else if (!is.numeric(mean_value) || length(mean_value) != 1L ||
                     # check.attributes = FALSE: a second guard, so names never fail a correct value.
                     !isTRUE(all.equal(mean_value, mean(scores), tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "sample_mean should be the mean of the 25 stress scores in my_sample.")
          } else {
            mu <- mean(population$stress)
            tip <- if (one_cell) " Your sample_mean is a one-cell table; pull() turns a one-cell table into a number." else ""
            list(pass = TRUE, message = paste0("Your sample mean is ", round(mean_value, 2), ". The population mean is ", round(mu, 2), " - close, but not identical. That gap is sampling error.", tip))
          }
        }
      }
    `,
    hints: [
      'slice_sample(n = 25) draws 25 rows at random: my_sample <- population %>% slice_sample(n = 25).',
      'summarise(m = mean(stress)) computes the mean of the stress column.',
      'pull(m) turns the one-cell result into a number: sample_mean <- my_sample %>% summarise(m = mean(stress)) %>% pull(m).',
    ],
  },
  {
    id: 'm6-2-a',
    prompt:
      'Build a sampling distribution: take 1000 samples of size 10 from `population$stress`, and store the 1000 sample means in `means`.',
    starterCode:
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(42)\n\nmeans <- replicate(1000, )\n',
    setupCode: 'set.seed(42)',
    solution:
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nset.seed(42)\nmeans <- replicate(1000, mean(sample(population$stress, 10)))',
    wrongAnswers: [
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(42)\nmeans <- replicate(1000, mean(sample(population$stress, 100)))',
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(42)\nmeans <- sample(population$stress, 1000)',
    ],
    check: `
      if (!has_answer("means")) {
        list(pass = FALSE, message = "I could not find an object called means.")
      } else {
        means <- answer("means")
        if (length(means) != 1000L) {
          list(pass = FALSE, message = paste0("means has ", length(means), " values, but you need 1000 sample means."))
        } else {
          population <- read.csv("data/wellbeing-population.csv")
          sigma <- sd(population$stress)
          expected_se <- sigma / sqrt(10)
          observed_se <- sd(means)
          if (abs(observed_se - sigma) < abs(observed_se - expected_se)) {
            list(pass = FALSE, message = "Your values vary as much as individual students do. Did you take means of samples, or just individual scores?")
          } else if (abs(observed_se - expected_se) > expected_se * 0.25) {
            list(pass = FALSE, message = paste0("The spread of your means is ", round(observed_se, 2), ", but for n = 10 it should be near ", round(expected_se, 2), ". Check your sample size."))
          } else {
            list(pass = TRUE, message = paste0("The standard deviation of your 1000 sample means is ", round(observed_se, 2), " - close to sigma/sqrt(n) = ", round(expected_se, 2), "."))
          }
        }
      }
    `,
    hints: [
      'replicate(1000, expr) runs expr 1000 times and collects the results.',
      'The expression you want to repeat is one sample mean: mean(sample(population$stress, 10)).',
      'Put them together: replicate(1000, mean(sample(population$stress, 10))).',
    ],
  },
  {
    id: 'm6-3-a',
    prompt:
      'The population of stress scores is strongly skewed. How much do sample means of 40 students vary? Compute the standard error for samples of size 40 using the formula, not simulation, and store it in se_40.',
    starterCode:
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\n\n# Standard error = population SD divided by the square root of n.\nse_40 <- ',
    solution:
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nse_40 <- population %>% summarise(se = sd(stress) / sqrt(40)) %>% pull(se)',
    wrongAnswers: [
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nse_40 <- population %>% summarise(se = sd(stress)) %>% pull(se)',
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nse_40 <- population %>% summarise(se = sd(stress) / 40) %>% pull(se)',
    ],
    alternateSolutions: [
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nse_40 <- sd(population$stress) / sqrt(40)',
      // No pull(): a one-cell data frame.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nse_40 <- population %>% summarise(se = sd(stress) / sqrt(40))',
      // unlist() leaves a named number.
      'library(dplyr)\npopulation <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nse_40 <- population %>% summarise(se = sd(stress) / sqrt(40)) %>% unlist()',
      // sapply() over a one-column data frame leaves a named number.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nse_40 <- sapply(population["stress"], sd) / sqrt(40)',
      // The population SD with denominator N rather than n - 1.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nse_40 <- sqrt(mean((population$stress - mean(population$stress))^2)) / sqrt(40)',
      // var() on a one-column data frame leaves a 1x1 matrix.
      'population <- read.csv("data/wellbeing-population.csv", stringsAsFactors = TRUE)\nse_40 <- sqrt(var(population["stress"])) / sqrt(40)',
    ],
    check: `
      if (!has_answer("se_40")) {
        list(pass = FALSE, message = "I could not find an object called se_40.")
      } else {
        se_40 <- answer("se_40")
        # A student who forgot pull() has a 1x1 data frame; accept its value.
        # as.vector(): unlist() and sapply() give a correct but named number, and
        # var() on a data frame a 1x1 matrix. It drops names and dim from atomic
        # values but leaves a data frame a list, so the shape branch still catches it.
        value <- as.vector(if (is.data.frame(se_40) && nrow(se_40) == 1L && ncol(se_40) == 1L) se_40[[1]] else se_40)
        if (!is.numeric(value) || length(value) != 1L) {
          list(pass = FALSE, message = "se_40 should be a single number.")
        } else {
          population <- read.csv("data/wellbeing-population.csv")
          sigma <- sd(population$stress)
          expected <- sigma / sqrt(40)
          # 1e-3 rather than 1e-6: admits a population SD computed with denominator N
          # instead of sd()'s n - 1, which differs by ~1e-4 here. Both wrong answers
          # below (sigma ~10.6, sigma/40 ~0.27) are far outside this band.
          # check.attributes = FALSE on each comparison: a second guard, so names never pick the wrong branch.
          if (isTRUE(all.equal(value, expected, tolerance = 1e-3, check.attributes = FALSE))) {
            list(pass = TRUE, message = paste0("Correct: ", round(expected, 3), ". Individual students vary by about ", round(sigma, 2), ", but sample means of 40 vary by only ", round(expected, 3), "."))
          } else if (isTRUE(all.equal(value, sigma, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "That is the standard deviation of individual scores. Divide it by the square root of n.")
          } else if (isTRUE(all.equal(value, sigma / 40, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "You divided by n. The standard error divides by the square root of n.")
          } else {
            list(pass = FALSE, message = paste0("se_40 is ", round(value, 3), " but should be ", round(expected, 3), "."))
          }
        }
      }
    `,
    hints: [
      'The standard error of the mean is sigma / sqrt(n).',
      'sd(population$stress) gives sigma; sqrt(40) gives the denominator.',
      'In a pipeline: se_40 <- population %>% summarise(se = sd(stress) / sqrt(40)) %>% pull(se).',
    ],
  },
];
