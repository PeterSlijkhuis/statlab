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
