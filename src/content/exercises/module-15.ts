import type { ExerciseDef } from '../../r/checker';

const READ = 'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)';

/** Engineering's leavers and headcount, shared by 15-1 and 15-2. */
const ENGINEERING =
  `${READ}\n` +
  'eng <- d[d$department == "Engineering", ]\n' +
  'left_eng <- sum(eng$left_company)\n' +
  'n_eng <- nrow(eng)';

/** Leavers and headcount for remote and office workers, for 15-2. */
const REMOTE =
  `${READ}\n` +
  'left_remote <- sum(d$left_company[d$remote == "Yes"])\n' +
  'n_remote <- sum(d$remote == "Yes")\n' +
  'left_office <- sum(d$left_company[d$remote == "No"])\n' +
  'n_office <- sum(d$remote == "No")';

/** The workload model's slope and standard error, for 15-4. */
const WORKLOAD =
  `${READ}\n` +
  'm_workload <- lm(wellbeing ~ workload, data = d)\n' +
  'b_hat <- coef(m_workload)[["workload"]]\n' +
  'se_hat <- summary(m_workload)$coefficients["workload", "Std. Error"]';

export const module15: ExerciseDef[] = [
  {
    id: 'm15-1-a',
    prompt:
      'In Engineering, 33 of 128 employees left. Using the grid and the sector prior dbeta(p_grid, 3, 17), compute the posterior for Engineering\'s leaving rate and store it, normalised to sum to 1, in posterior_eng. Store the posterior mean in eng_mean.',
    starterCode:
      `${ENGINEERING}\nc(left = left_eng, employees = n_eng)\n\np_grid <- seq(0, 1, length.out = 1001)\nprior <- dbeta(p_grid, 3, 17)\n\n# Prior times likelihood, then divide by the total.\nposterior_eng <- \neng_mean <- `,
    solution:
      `${ENGINEERING}\np_grid <- seq(0, 1, length.out = 1001)\nprior <- dbeta(p_grid, 3, 17)\nposterior_eng <- prior * dbinom(left_eng, size = n_eng, prob = p_grid)\nposterior_eng <- posterior_eng / sum(posterior_eng)\neng_mean <- sum(p_grid * posterior_eng)`,
    wrongAnswers: [
      // The flat prior of the lesson instead of the sector prior.
      `${ENGINEERING}\np_grid <- seq(0, 1, length.out = 1001)\nposterior_eng <- dbinom(left_eng, size = n_eng, prob = p_grid)\nposterior_eng <- posterior_eng / sum(posterior_eng)\neng_mean <- sum(p_grid * posterior_eng)`,
      // Never normalised, so the "probabilities" do not sum to 1.
      `${ENGINEERING}\np_grid <- seq(0, 1, length.out = 1001)\nprior <- dbeta(p_grid, 3, 17)\nposterior_eng <- prior * dbinom(left_eng, size = n_eng, prob = p_grid)\neng_mean <- sum(p_grid * posterior_eng)`,
      // Counted the employees who stayed as the successes.
      `${ENGINEERING}\np_grid <- seq(0, 1, length.out = 1001)\nprior <- dbeta(p_grid, 3, 17)\nposterior_eng <- prior * dbinom(n_eng - left_eng, size = n_eng, prob = p_grid)\nposterior_eng <- posterior_eng / sum(posterior_eng)\neng_mean <- sum(p_grid * posterior_eng)`,
      // The whole company rather than Engineering.
      `${READ}\np_grid <- seq(0, 1, length.out = 1001)\nprior <- dbeta(p_grid, 3, 17)\nposterior_eng <- prior * dbinom(sum(d$left_company), size = nrow(d), prob = p_grid)\nposterior_eng <- posterior_eng / sum(posterior_eng)\neng_mean <- sum(p_grid * posterior_eng)`,
      // The peak of the posterior instead of its mean.
      `${ENGINEERING}\np_grid <- seq(0, 1, length.out = 1001)\nprior <- dbeta(p_grid, 3, 17)\nposterior_eng <- prior * dbinom(left_eng, size = n_eng, prob = p_grid)\nposterior_eng <- posterior_eng / sum(posterior_eng)\neng_mean <- p_grid[which.max(posterior_eng)]`,
    ],
    alternateSolutions: [
      // The beta shortcut of lesson 15.2, evaluated on the grid.
      `${ENGINEERING}\np_grid <- seq(0, 1, length.out = 1001)\nposterior_eng <- dbeta(p_grid, 3 + left_eng, 17 + n_eng - left_eng)\nposterior_eng <- posterior_eng / sum(posterior_eng)\neng_mean <- (3 + left_eng) / (3 + 17 + n_eng)`,
      // Counted inline, with weighted.mean() for the posterior mean.
      `d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\np_grid <- seq(0, 1, length.out = 1001)\nlikelihood <- dbinom(33, 128, p_grid)\nunnormalised <- dbeta(p_grid, 3, 17) * likelihood\nposterior_eng <- unnormalised / sum(unnormalised)\neng_mean <- weighted.mean(p_grid, posterior_eng)`,
    ],
    check: `
      if (!has_answer("posterior_eng") || !has_answer("eng_mean")) {
        list(pass = FALSE, message = "I need both posterior_eng and eng_mean.")
      } else {
        post <- answer("posterior_eng")
        m <- as.vector(answer("eng_mean"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        eng <- d[d$department == "Engineering", ]
        k <- sum(eng$left_company)
        n <- nrow(eng)
        p_grid <- seq(0, 1, length.out = 1001)
        normalise <- function(x) x / sum(x)
        expected <- normalise(dbeta(p_grid, 3, 17) * dbinom(k, n, p_grid))
        exp_mean <- sum(p_grid * expected)
        close <- function(a, b) isTRUE(abs(a - b) < 1e-4)
        flat_mean <- sum(p_grid * normalise(dbinom(k, n, p_grid)))
        stayed_mean <- sum(p_grid * normalise(dbeta(p_grid, 3, 17) * dbinom(n - k, n, p_grid)))
        company_mean <- sum(p_grid * normalise(dbeta(p_grid, 3, 17) * dbinom(sum(d$left_company), nrow(d), p_grid)))
        if (!is.numeric(post) || length(post) != length(p_grid)) {
          list(pass = FALSE, message = "posterior_eng should hold one probability for each of the 1001 values in p_grid.")
        } else if (any(!is.finite(post))) {
          list(pass = FALSE, message = "posterior_eng contains NA or NaN values. Check that the likelihood uses the counts left_eng and n_eng.")
        } else if (!close(sum(post), 1)) {
          list(pass = FALSE, message = paste0("posterior_eng adds up to ", signif(sum(post), 3), ", not 1. Divide prior times likelihood by its own sum, so the posterior is a probability distribution."))
        } else if (!is.numeric(m) || length(m) != 1L || !is.finite(m)) {
          list(pass = FALSE, message = "eng_mean should be a single number.")
        } else if (close(m, flat_mean)) {
          list(pass = FALSE, message = paste0("That is the posterior mean with a flat prior (", round(flat_mean, 3), "). Multiply the likelihood by the sector prior, dbeta(p_grid, 3, 17), before normalising."))
        } else if (close(m, stayed_mean)) {
          list(pass = FALSE, message = "That is the rate of STAYING. The first argument of dbinom() is the number of leavers, left_eng.")
        } else if (close(m, company_mean)) {
          list(pass = FALSE, message = "That is the posterior for the whole company. Use Engineering's counts: left_eng out of n_eng.")
        } else if (close(m, p_grid[which.max(expected)])) {
          list(pass = FALSE, message = "That is the peak of the posterior, the single most plausible rate. The posterior mean averages every rate, weighted by its probability: sum(p_grid * posterior_eng).")
        } else if (!close(m, exp_mean)) {
          list(pass = FALSE, message = paste0("eng_mean is ", round(m, 4), ", but the posterior mean for Engineering with the sector prior is ", round(exp_mean, 4), "."))
        } else if (max(abs(post - expected)) > 1e-6) {
          list(pass = FALSE, message = "eng_mean is right, but posterior_eng is not the posterior it came from. Store prior times likelihood, divided by its sum.")
        } else {
          list(pass = TRUE, message = paste0("Correct: ", round(exp_mean, 3), ". The data alone say ", round(k / n, 3), " and the prior says 0.15. With 128 employees against a prior worth about 20, the posterior sits much closer to the data."))
        }
      }
    `,
    hints: [
      'The likelihood is dbinom(left_eng, size = n_eng, prob = p_grid): one value for each candidate rate.',
      'posterior_eng <- prior * likelihood, and then posterior_eng <- posterior_eng / sum(posterior_eng).',
      'The posterior mean is sum(p_grid * posterior_eng).',
    ],
  },
  {
    id: 'm15-2-a',
    prompt:
      'Give a 95 % credible interval for Engineering\'s leaving rate, with a flat Beta(1, 1) prior. Store it in ci_engineering: two numbers, the lower bound first.',
    starterCode:
      `${ENGINEERING}\nc(left = left_eng, employees = n_eng)\n\n# Posterior: Beta(1 + leavers, 1 + stayers). qbeta() gives its percentiles.\nci_engineering <- `,
    solution: `${ENGINEERING}\nci_engineering <- qbeta(c(0.025, 0.975), 1 + left_eng, 1 + n_eng - left_eng)`,
    wrongAnswers: [
      // Forgot the prior's 1 + 1, which is Beta(0, 0), not flat.
      `${ENGINEERING}\nci_engineering <- qbeta(c(0.025, 0.975), left_eng, n_eng - left_eng)`,
      // A 90 % interval.
      `${ENGINEERING}\nci_engineering <- qbeta(c(0.05, 0.95), 1 + left_eng, 1 + n_eng - left_eng)`,
      // The second shape parameter given the headcount instead of the stayers.
      `${ENGINEERING}\nci_engineering <- qbeta(c(0.025, 0.975), 1 + left_eng, 1 + n_eng)`,
      // The whole company.
      `${READ}\nci_engineering <- qbeta(c(0.025, 0.975), 1 + sum(d$left_company), 1 + nrow(d) - sum(d$left_company))`,
    ],
    alternateSolutions: [
      // Each bound on its own.
      `${ENGINEERING}\nlower <- qbeta(0.025, 1 + left_eng, 1 + n_eng - left_eng)\nupper <- qbeta(0.975, 1 + left_eng, 1 + n_eng - left_eng)\nci_engineering <- c(lower = lower, upper = upper)`,
      // Read off a fine grid, as in lesson 15.1.
      `${ENGINEERING}\np_grid <- seq(0, 1, length.out = 100001)\npost <- dbinom(left_eng, n_eng, p_grid)\npost <- post / sum(post)\ncdf <- cumsum(post)\nci_engineering <- c(p_grid[which(cdf >= 0.025)[1]], p_grid[which(cdf >= 0.975)[1]])`,
    ],
    check: `
      if (!has_answer("ci_engineering")) {
        list(pass = FALSE, message = "I could not find an object called ci_engineering.")
      } else {
        ci <- as.vector(unlist(answer("ci_engineering")))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        eng <- d[d$department == "Engineering", ]
        k <- sum(eng$left_company)
        n <- nrow(eng)
        expected <- qbeta(c(0.025, 0.975), 1 + k, 1 + n - k)
        close <- function(a, b) isTRUE(all(abs(a - b) < 5e-4))
        if (!is.numeric(ci) || length(ci) != 2L || any(!is.finite(ci))) {
          list(pass = FALSE, message = "ci_engineering should be two numbers: the lower and the upper bound.")
        } else if (ci[1] > ci[2]) {
          list(pass = FALSE, message = "The bounds are the wrong way round. Put the lower bound first.")
        } else if (close(ci, qbeta(c(0.025, 0.975), k, n - k))) {
          list(pass = FALSE, message = "Close, but that posterior has no prior in it. A flat prior is Beta(1, 1), so add 1 to each shape: Beta(1 + left_eng, 1 + n_eng - left_eng).")
        } else if (close(ci, qbeta(c(0.05, 0.95), 1 + k, 1 + n - k))) {
          list(pass = FALSE, message = "That is a 90 % interval. A 95 % interval leaves 2.5 % in each tail: qbeta(c(0.025, 0.975), ...).")
        } else if (close(ci, binom.test(k, n)$conf.int)) {
          list(pass = FALSE, message = "That is the frequentist confidence interval from binom.test(). Here the interval should come from the posterior, with qbeta().")
        } else if (!close(ci, expected)) {
          list(pass = FALSE, message = paste0("ci_engineering is [", paste(round(ci, 3), collapse = ", "), "]. The posterior is Beta(1 + ", k, ", 1 + ", n - k, "): leavers in the first shape, stayers in the second."))
        } else {
          list(pass = TRUE, message = paste0("Correct: [", paste(round(expected, 3), collapse = ", "), "]. Given these data and a flat prior, there is a 95 % probability that Engineering's leaving rate lies in this range. It is wider than the company's, because it rests on 128 people instead of 480."))
        }
      }
    `,
    hints: [
      'With a Beta(1, 1) prior the posterior is Beta(1 + left_eng, 1 + n_eng - left_eng).',
      'The middle 95 % runs from the 2.5th to the 97.5th percentile.',
      'ci_engineering <- qbeta(c(0.025, 0.975), 1 + left_eng, 1 + n_eng - left_eng)',
    ],
  },
  {
    id: 'm15-2-b',
    prompt:
      'Do remote workers leave less often than office workers? With flat Beta(1, 1) priors, draw 10,000 plausible leaving rates for each group into rate_remote and rate_office, and store the probability that the remote rate is the lower one in prob_remote_lower.',
    starterCode:
      `${REMOTE}\nc(left_remote = left_remote, n_remote = n_remote, left_office = left_office, n_office = n_office)\n\nset.seed(1502)\nrate_remote <- \nrate_office <- \nprob_remote_lower <- `,
    solution:
      `${REMOTE}\nset.seed(1502)\nrate_remote <- rbeta(10000, 1 + left_remote, 1 + n_remote - left_remote)\nrate_office <- rbeta(10000, 1 + left_office, 1 + n_office - left_office)\nprob_remote_lower <- mean(rate_remote < rate_office)`,
    wrongAnswers: [
      // The comparison the wrong way round.
      `${REMOTE}\nset.seed(1502)\nrate_remote <- rbeta(10000, 1 + left_remote, 1 + n_remote - left_remote)\nrate_office <- rbeta(10000, 1 + left_office, 1 + n_office - left_office)\nprob_remote_lower <- mean(rate_remote > rate_office)`,
      // Compared the two averages once, which gives TRUE, not a probability.
      `${REMOTE}\nset.seed(1502)\nrate_remote <- rbeta(10000, 1 + left_remote, 1 + n_remote - left_remote)\nrate_office <- rbeta(10000, 1 + left_office, 1 + n_office - left_office)\nprob_remote_lower <- mean(rate_remote) < mean(rate_office)`,
      // The lesson's training groups instead of remote working.
      `${READ}\nset.seed(1502)\nrate_remote <- rbeta(10000, 1 + sum(d$left_company[d$training == "Yes"]), 1 + sum(d$training == "Yes" & d$left_company == 0))\nrate_office <- rbeta(10000, 1 + sum(d$left_company[d$training == "No"]), 1 + sum(d$training == "No" & d$left_company == 0))\nprob_remote_lower <- mean(rate_remote < rate_office)`,
    ],
    alternateSolutions: [
      // Another seed and more draws: the answer moves by Monte Carlo noise only.
      `${REMOTE}\nset.seed(42)\nrate_remote <- rbeta(50000, 1 + left_remote, 1 + n_remote - left_remote)\nrate_office <- rbeta(50000, 1 + left_office, 1 + n_office - left_office)\nprob_remote_lower <- mean(rate_office - rate_remote > 0)`,
      // Stayers counted directly, and the share written as a sum.
      `d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ncounts <- table(d$remote, d$left_company)\nset.seed(1)\nrate_remote <- rbeta(10000, 1 + counts["Yes", "1"], 1 + counts["Yes", "0"])\nrate_office <- rbeta(10000, 1 + counts["No", "1"], 1 + counts["No", "0"])\nprob_remote_lower <- sum(rate_remote < rate_office) / 10000`,
    ],
    check: `
      if (!has_answer("prob_remote_lower")) {
        list(pass = FALSE, message = "I could not find an object called prob_remote_lower.")
      } else {
        p <- as.vector(answer("prob_remote_lower"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        shapes <- function(group) {
          k <- sum(d$left_company[group])
          c(1 + k, 1 + sum(group) - k)
        }
        # The exact probability that a draw from the first posterior is below one from the second.
        p_lower <- function(a, b) integrate(function(x) dbeta(x, a[1], a[2]) * pbeta(x, b[1], b[2], lower.tail = FALSE), 0, 1)$value
        exact <- p_lower(shapes(d$remote == "Yes"), shapes(d$remote == "No"))
        training <- p_lower(shapes(d$training == "Yes"), shapes(d$training == "No"))
        if (is.logical(p) && length(p) == 1L) {
          list(pass = FALSE, message = "prob_remote_lower is TRUE or FALSE, a single comparison. Compare the draws pair by pair, rate_remote < rate_office, and take the mean() of that to get the share of draws where remote is lower.")
        } else if (!is.numeric(p) || length(p) != 1L || !is.finite(p)) {
          list(pass = FALSE, message = "prob_remote_lower should be a single number between 0 and 1.")
        } else if (abs(p - (1 - exact)) < 0.015) {
          list(pass = FALSE, message = "That is the probability that remote workers leave MORE often. Flip the comparison: rate_remote < rate_office.")
        } else if (abs(p - training) < 0.03) {
          list(pass = FALSE, message = "That looks like the training comparison from the lesson. Use the remote column: left_remote out of n_remote, and left_office out of n_office.")
        } else if (abs(p - exact) >= 0.015) {
          list(pass = FALSE, message = paste0("prob_remote_lower is ", round(p, 3), ", but it should come out close to ", round(exact, 2), ". Draw each group's rates from Beta(1 + leavers, 1 + stayers)."))
        } else {
          list(pass = TRUE, message = paste0("Correct: about ", round(exact, 2), ". Given these data, it is very probable that remote workers leave less often. Compare that with lesson 11: a p-value would only have said whether a difference of zero is ruled out."))
        }
      }
    `,
    hints: [
      'rbeta(10000, 1 + left_remote, 1 + n_remote - left_remote) draws 10,000 plausible rates for the remote group.',
      'rate_remote < rate_office compares the draws pair by pair and gives 10,000 TRUEs and FALSEs.',
      'The mean of a TRUE/FALSE vector is the share of TRUEs: mean(rate_remote < rate_office).',
    ],
  },
  {
    id: 'm15-3-a',
    prompt:
      'Remote workers report higher wellbeing, p = .008. How strong is the evidence? Fit lm(wellbeing ~ remote) as m_remote and store the Bayes factor for a remote effect against the null model, BF10 from the BIC approximation, in bf10.',
    starterCode:
      `${READ}\nm0 <- lm(wellbeing ~ 1, data = d)\n\n# BF10 = exp((BIC of the null model - BIC of the alternative) / 2)\nm_remote <- \nbf10 <- `,
    solution:
      `${READ}\nm0 <- lm(wellbeing ~ 1, data = d)\nm_remote <- lm(wellbeing ~ remote, data = d)\nbf10 <- exp((BIC(m0) - BIC(m_remote)) / 2)`,
    wrongAnswers: [
      // BF01 instead of BF10.
      `${READ}\nm0 <- lm(wellbeing ~ 1, data = d)\nm_remote <- lm(wellbeing ~ remote, data = d)\nbf10 <- exp((BIC(m_remote) - BIC(m0)) / 2)`,
      // Forgot to halve the difference.
      `${READ}\nm0 <- lm(wellbeing ~ 1, data = d)\nm_remote <- lm(wellbeing ~ remote, data = d)\nbf10 <- exp(BIC(m0) - BIC(m_remote))`,
      // AIC in place of BIC.
      `${READ}\nm0 <- lm(wellbeing ~ 1, data = d)\nm_remote <- lm(wellbeing ~ remote, data = d)\nbf10 <- exp((AIC(m0) - AIC(m_remote)) / 2)`,
      // The training model from the lesson.
      `${READ}\nm0 <- lm(wellbeing ~ 1, data = d)\nm_remote <- lm(wellbeing ~ training, data = d)\nbf10 <- exp((BIC(m0) - BIC(m_remote)) / 2)`,
    ],
    alternateSolutions: [
      // Through BF01.
      `${READ}\nm0 <- lm(wellbeing ~ 1, data = d)\nm_remote <- lm(wellbeing ~ remote, data = d)\nbf01 <- exp((BIC(m_remote) - BIC(m0)) / 2)\nbf10 <- 1 / bf01`,
      // The null model written inline, and the formula rearranged.
      `d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nm_remote <- lm(wellbeing ~ remote, data = d)\nbf10 <- exp(-0.5 * (BIC(m_remote) - BIC(lm(wellbeing ~ 1, data = d))))`,
    ],
    check: `
      if (!has_answer("bf10")) {
        list(pass = FALSE, message = "I could not find an object called bf10.")
      } else {
        bf <- as.vector(answer("bf10"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        m0 <- lm(wellbeing ~ 1, data = d)
        m1 <- lm(wellbeing ~ remote, data = d)
        expected <- exp((BIC(m0) - BIC(m1)) / 2)
        close <- function(a, b) isTRUE(abs(a / b - 1) < 1e-4)
        if (!is.numeric(bf) || length(bf) != 1L || !is.finite(bf)) {
          list(pass = FALSE, message = "bf10 should be a single number.")
        } else if (has_answer("m_remote") && inherits(answer("m_remote"), "lm") && !("remoteYes" %in% names(coef(answer("m_remote"))))) {
          list(pass = FALSE, message = "m_remote has no remote coefficient. Fit lm(wellbeing ~ remote, data = d).")
        } else if (close(bf, 1 / expected)) {
          list(pass = FALSE, message = "That is BF01, the evidence for the null. For BF10 the null model's BIC comes first: exp((BIC(m0) - BIC(m_remote)) / 2).")
        } else if (close(bf, expected^2)) {
          list(pass = FALSE, message = "Nearly: halve the BIC difference before exponentiating.")
        } else if (close(bf, exp((AIC(m0) - AIC(m1)) / 2))) {
          list(pass = FALSE, message = "That uses AIC. The approximation to a Bayes factor uses BIC, whose penalty grows with the sample size.")
        } else if (!close(bf, expected)) {
          list(pass = FALSE, message = paste0("bf10 is ", signif(bf, 3), ", but the BIC approximation for wellbeing ~ remote gives ", signif(expected, 3), "."))
        } else {
          list(pass = TRUE, message = paste0("Correct: BF10 = ", round(expected, 2), ". With p = .008 you might have called this a clear effect, but the data favour it over the null by less than 2 to 1: anecdotal evidence. Report both, and let readers see how strong the evidence really is."))
        }
      }
    `,
    hints: [
      'm_remote <- lm(wellbeing ~ remote, data = d)',
      'BIC(m0) and BIC(m_remote) give the two BIC values. The better model has the lower BIC.',
      'bf10 <- exp((BIC(m0) - BIC(m_remote)) / 2)',
    ],
  },
  {
    id: 'm15-4-a',
    prompt:
      'Workload lowers wellbeing by about 3.3 points per point. Combine that estimate with a sceptical Normal(0, 1) prior on the slope. Store the posterior mean in post_mean_b and a 95 % credible interval, lower bound first, in cri_b.',
    starterCode:
      `${WORKLOAD}\nc(b_hat = b_hat, se_hat = se_hat)\n\nprior_sd <- 1\n# Weight each source by its precision, 1 / variance.\npost_mean_b <- \ncri_b <- `,
    solution:
      `${WORKLOAD}\nprior_sd <- 1\nw_data <- 1 / se_hat^2\nw_prior <- 1 / prior_sd^2\npost_mean_b <- (w_data * b_hat + w_prior * 0) / (w_data + w_prior)\npost_sd_b <- sqrt(1 / (w_data + w_prior))\ncri_b <- qnorm(c(0.025, 0.975), mean = post_mean_b, sd = post_sd_b)`,
    wrongAnswers: [
      // No prior at all: the least-squares estimate and its confidence interval.
      `${WORKLOAD}\npost_mean_b <- b_hat\ncri_b <- qnorm(c(0.025, 0.975), mean = b_hat, sd = se_hat)`,
      // Weighted by 1 / SE rather than 1 / SE squared.
      `${WORKLOAD}\nprior_sd <- 1\nw_data <- 1 / se_hat\nw_prior <- 1 / prior_sd\npost_mean_b <- (w_data * b_hat) / (w_data + w_prior)\npost_sd_b <- sqrt(1 / (1 / se_hat^2 + 1 / prior_sd^2))\ncri_b <- qnorm(c(0.025, 0.975), mean = post_mean_b, sd = post_sd_b)`,
      // Right mean, but the interval uses the standard error instead of the posterior SD.
      `${WORKLOAD}\nprior_sd <- 1\nw_data <- 1 / se_hat^2\nw_prior <- 1 / prior_sd^2\npost_mean_b <- (w_data * b_hat) / (w_data + w_prior)\ncri_b <- qnorm(c(0.025, 0.975), mean = post_mean_b, sd = se_hat)`,
      // Halfway between the estimate and the prior mean.
      `${WORKLOAD}\npost_mean_b <- (b_hat + 0) / 2\ncri_b <- qnorm(c(0.025, 0.975), mean = post_mean_b, sd = se_hat)`,
    ],
    alternateSolutions: [
      // The grid method of the lesson, on a fine grid.
      `${WORKLOAD}\nb_grid <- seq(-6, 2, length.out = 80001)\npost <- dnorm(b_grid, 0, 1) * dnorm(b_hat, mean = b_grid, sd = se_hat)\npost <- post / sum(post)\npost_mean_b <- sum(b_grid * post)\ncdf <- cumsum(post)\ncri_b <- c(b_grid[which(cdf >= 0.025)[1]], b_grid[which(cdf >= 0.975)[1]])`,
      // Written with variances, and the interval as mean plus or minus 1.96 SD.
      `d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nfit <- summary(lm(wellbeing ~ workload, data = d))$coefficients\nv_data <- fit["workload", "Std. Error"]^2\nv_prior <- 1\npost_var <- 1 / (1 / v_data + 1 / v_prior)\npost_mean_b <- post_var * fit["workload", "Estimate"] / v_data\ncri_b <- post_mean_b + c(-1, 1) * qnorm(0.975) * sqrt(post_var)`,
    ],
    check: `
      if (!has_answer("post_mean_b") || !has_answer("cri_b")) {
        list(pass = FALSE, message = "I need both post_mean_b and cri_b.")
      } else {
        m <- as.vector(unlist(answer("post_mean_b")))
        ci <- as.vector(unlist(answer("cri_b")))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        fit <- summary(lm(wellbeing ~ workload, data = d))$coefficients
        b <- fit["workload", "Estimate"]
        se <- fit["workload", "Std. Error"]
        precision <- 1 / se^2 + 1
        exp_mean <- (b / se^2) / precision
        exp_sd <- sqrt(1 / precision)
        exp_ci <- qnorm(c(0.025, 0.975), exp_mean, exp_sd)
        close <- function(a, b, tol = 1e-3) isTRUE(all(abs(a - b) < tol))
        if (!is.numeric(m) || length(m) != 1L || !is.finite(m)) {
          list(pass = FALSE, message = "post_mean_b should be a single number.")
        } else if (close(m, b)) {
          list(pass = FALSE, message = paste0("That is the least-squares estimate, ", round(b, 3), ", with no prior in it. Weight it against the prior's mean of 0 by precision: 1 / se_hat^2 for the data, 1 / prior_sd^2 for the prior."))
        } else if (close(m, b / 2)) {
          list(pass = FALSE, message = "Halfway between the estimate and the prior would be right only if both were equally precise. Weight each by its precision, 1 / variance.")
        } else if (close(m, (b / se) / (1 / se + 1))) {
          list(pass = FALSE, message = "The weights should be precisions, 1 / variance: 1 / se_hat^2, not 1 / se_hat.")
        } else if (!close(m, exp_mean)) {
          list(pass = FALSE, message = paste0("post_mean_b is ", round(m, 3), ", but the precision-weighted posterior mean is ", round(exp_mean, 3), "."))
        } else if (!is.numeric(ci) || length(ci) != 2L || any(!is.finite(ci))) {
          list(pass = FALSE, message = "cri_b should be two numbers: the lower and the upper bound.")
        } else if (ci[1] > ci[2]) {
          list(pass = FALSE, message = "The bounds of cri_b are the wrong way round. Put the lower bound first.")
        } else if (close(ci, qnorm(c(0.025, 0.975), exp_mean, se))) {
          list(pass = FALSE, message = "The mean is right, but the interval uses the standard error. The posterior is narrower than the data alone: its SD is sqrt(1 / (w_data + w_prior)).")
        } else if (!close(ci, exp_ci, 2e-3)) {
          list(pass = FALSE, message = paste0("cri_b is [", paste(round(ci, 3), collapse = ", "), "], but the 95 % credible interval is [", paste(round(exp_ci, 3), collapse = ", "), "]. Use qnorm() with the posterior mean and the posterior SD."))
        } else {
          list(pass = TRUE, message = paste0("Correct: ", round(exp_mean, 2), ", 95 % CrI [", paste(round(exp_ci, 2), collapse = ", "), "]. The prior pulled the estimate from ", round(b, 2), " towards zero even though the data are precise, because an effect this large is far out in a Normal(0, 1) prior. A sceptical prior has to be one you can defend."))
        }
      }
    `,
    hints: [
      'w_data <- 1 / se_hat^2 and w_prior <- 1 / prior_sd^2 are the two precisions.',
      'post_mean_b <- (w_data * b_hat + w_prior * 0) / (w_data + w_prior)',
      'The posterior SD is sqrt(1 / (w_data + w_prior)); then cri_b <- qnorm(c(0.025, 0.975), post_mean_b, that SD).',
    ],
  },
];
