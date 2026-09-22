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
            found_means <- FALSE
            for (value in numeric_columns(means_tbl)) {
              if (length(value) == 2L &&
                  isTRUE(all.equal(sort(value), sort(as.vector(raw)), tolerance = 1e-6, check.attributes = FALSE))) found_means <- TRUE
            }
            if (!found_means) {
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
