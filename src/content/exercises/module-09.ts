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
