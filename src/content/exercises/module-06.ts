import type { ExerciseDef } from '../../r/checker';

export const module06: ExerciseDef[] = [
  {
    id: 'm6-1-a',
    prompt:
      'Draw a random sample of 25 students from the population and store their mean stress score in `sample_mean`.',
    starterCode:
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(1)\n\n# Take 25 stress scores at random and store their mean.\nsample_mean <- ',
    setupCode: 'set.seed(1)',
    solution:
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(1)\nsample_mean <- mean(sample(population$stress, 25))',
    wrongAnswers: [
      'population <- read.csv("data/wellbeing-population.csv")\nsample_mean <- mean(population$stress)',
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(1)\nsample_mean <- mean(sample(population$stress, 250))',
    ],
    check: `
      if (!exists("sample_mean", inherits = TRUE)) {
        list(pass = FALSE, message = "I could not find an object called sample_mean.")
      } else if (!is.numeric(sample_mean) || length(sample_mean) != 1L) {
        list(pass = FALSE, message = "sample_mean should be a single number.")
      } else {
        population <- read.csv("data/wellbeing-population.csv")
        mu <- mean(population$stress)
        se <- sd(population$stress) / sqrt(25)
        if (isTRUE(all.equal(sample_mean, mu, tolerance = 1e-6))) {
          list(pass = FALSE, message = "That is the mean of the whole population, not of a sample of 25.")
        } else if (abs(sample_mean - mu) > 4 * se) {
          list(pass = FALSE, message = "That is too far from the population mean to be a sample of 25. Check your sample size.")
        } else {
          list(pass = TRUE, message = paste0("Your sample mean is ", round(sample_mean, 2), ". The population mean is ", round(mu, 2), " - close, but not identical. That gap is sampling error."))
        }
      }
    `,
    hints: [
      'sample(x, 25) draws 25 values at random from the vector x.',
      'The stress column is population$stress.',
      'Combine them: mean(sample(population$stress, 25)).',
    ],
  },
  {
    id: 'm6-2-a',
    prompt:
      'Build a sampling distribution: take 1000 samples of size 10 from `population$stress`, and store the 1000 sample means in `means`.',
    starterCode:
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(42)\n\nmeans <- replicate(1000, )\n',
    setupCode: 'set.seed(42)',
    solution:
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(42)\nmeans <- replicate(1000, mean(sample(population$stress, 10)))',
    wrongAnswers: [
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(42)\nmeans <- replicate(1000, mean(sample(population$stress, 100)))',
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(42)\nmeans <- sample(population$stress, 1000)',
    ],
    check: `
      if (!exists("means", inherits = TRUE)) {
        list(pass = FALSE, message = "I could not find an object called means.")
      } else if (length(means) != 1000L) {
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
      'The population of stress scores is strongly skewed. Show that the sampling distribution is not: compute the standard error for samples of size 40 and store it in `se_40`, using the formula rather than simulation.',
    starterCode:
      'population <- read.csv("data/wellbeing-population.csv")\n\n# Standard error = population SD divided by the square root of n.\nse_40 <- ',
    solution:
      'population <- read.csv("data/wellbeing-population.csv")\nse_40 <- sd(population$stress) / sqrt(40)',
    wrongAnswers: [
      'population <- read.csv("data/wellbeing-population.csv")\nse_40 <- sd(population$stress)',
      'population <- read.csv("data/wellbeing-population.csv")\nse_40 <- sd(population$stress) / 40',
    ],
    check: `
      if (!exists("se_40", inherits = TRUE)) {
        list(pass = FALSE, message = "I could not find an object called se_40.")
      } else if (!is.numeric(se_40) || length(se_40) != 1L) {
        list(pass = FALSE, message = "se_40 should be a single number.")
      } else {
        population <- read.csv("data/wellbeing-population.csv")
        sigma <- sd(population$stress)
        expected <- sigma / sqrt(40)
        if (isTRUE(all.equal(se_40, expected, tolerance = 1e-6))) {
          list(pass = TRUE, message = paste0("Correct: ", round(expected, 3), ". Individual students vary by about ", round(sigma, 2), ", but sample means of 40 vary by only ", round(expected, 3), "."))
        } else if (isTRUE(all.equal(se_40, sigma, tolerance = 1e-6))) {
          list(pass = FALSE, message = "That is the standard deviation of individual scores. Divide it by the square root of n.")
        } else if (isTRUE(all.equal(se_40, sigma / 40, tolerance = 1e-6))) {
          list(pass = FALSE, message = "You divided by n. The standard error divides by the square root of n.")
        } else {
          list(pass = FALSE, message = paste0("se_40 is ", round(se_40, 3), " but should be ", round(expected, 3), "."))
        }
      }
    `,
    hints: [
      'The standard error of the mean is sigma / sqrt(n).',
      'sd(population$stress) gives sigma; sqrt(40) gives the denominator.',
    ],
  },
];
