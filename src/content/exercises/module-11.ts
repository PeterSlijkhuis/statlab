import type { ExerciseDef } from '../../r/checker';

export const module11: ExerciseDef[] = [
  {
    id: 'm11-1-a',
    prompt:
      'Fit wellbeing on remote as the only predictor. Store the model in model_remote, the remote coefficient in b_remote, and the two group means, SDs and group sizes in group_means. Then satisfy yourself that b_remote is exactly the difference between the two means in your table, in that order.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nlevels(d$remote)\n\nmodel_remote <- \nb_remote <- \ngroup_means <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nb_remote <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(estimate)\ngroup_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
    wrongAnswers: [
      // The intercept read as the effect. It is the reference group's mean.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nb_remote <- model_remote %>% tidy() %>% slice(1) %>% pull(estimate)\ngroup_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
      // The difference taken the other way round: office-based minus remote.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nb_remote <- mean(d$wellbeing[d$remote == "No"]) - mean(d$wellbeing[d$remote == "Yes"])\ngroup_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
      // A different predictor entirely.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ autonomy, data = d)\nb_remote <- model_remote %>% tidy() %>% slice(2) %>% pull(estimate)\ngroup_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
      // The table grouped by the wrong factor, so it cannot check the coefficient.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nb_remote <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(estimate)\ngroup_means <- d %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())',
    ],
    alternateSolutions: [
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nb_remote <- coef(model_remote)[["remoteYes"]]\ngroup_means <- aggregate(wellbeing ~ remote, data = d, FUN = function(x) c(mean = mean(x), sd = sd(x), n = length(x)))',
      // The coefficient computed from the means instead of read off the model.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\ngroup_means <- d %>%\n  group_by(remote) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())\nb_remote <- group_means$mean_wellbeing[group_means$remote == "Yes"] - group_means$mean_wellbeing[group_means$remote == "No"]',
    ],
    check: `
      if (!has_answer("model_remote") || !has_answer("b_remote") || !has_answer("group_means")) {
        list(pass = FALSE, message = "I need all three: model_remote, b_remote and group_means.")
      } else {
        model_remote <- answer("model_remote")
        b <- as.vector(answer("b_remote"))
        tbl <- answer("group_means")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- lm(wellbeing ~ remote, data = d)
        exp_b <- as.vector(coef(reference)["remoteYes"])
        intercept <- as.vector(coef(reference)["(Intercept)"])
        raw <- tapply(d$wellbeing, d$remote, mean)
        if (!inherits(model_remote, "lm")) {
          list(pass = FALSE, message = "model_remote is not a fitted linear model.")
        } else if (!("remoteYes" %in% names(coef(model_remote)))) {
          list(pass = FALSE, message = paste0("model_remote has no remoteYes coefficient; its predictors are ", paste(setdiff(names(coef(model_remote)), "(Intercept)"), collapse = ", "), ". The predictor for this exercise is remote."))
        } else if (!is.numeric(b) || length(b) != 1L) {
          list(pass = FALSE, message = "b_remote should be a single number.")
        } else if (isTRUE(all.equal(b, intercept, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the intercept, ", round(intercept, 2), ", which with a single two-level factor is the mean of the reference group - office-based employees. It is not the difference between the groups, and it is not the grand mean, which is ", round(mean(d$wellbeing), 2), "."))
        } else if (isTRUE(all.equal(b, -exp_b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("Right size, wrong direction. levels(d$remote) is No then Yes, so R takes No as the reference and remoteYes is Yes minus No, which is ", round(exp_b, 2), ". You have computed No minus Yes."))
        } else if (!isTRUE(all.equal(b, exp_b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("b_remote is ", round(b, 4), " but the remoteYes coefficient is ", round(exp_b, 4), "."))
        } else if (!is.data.frame(tbl) || nrow(tbl) != 2L) {
          list(pass = FALSE, message = "group_means should have exactly two rows, one for each level of remote. Check which variable you grouped by.")
        } else {
          has_levels <- FALSE
          for (nm in names(tbl)) {
            if (identical(sort(as.character(unique(tbl[[nm]]))), c("No", "Yes"))) has_levels <- TRUE
          }
          if (!has_levels) {
            list(pass = FALSE, message = "group_means has no column holding the levels No and Yes, so it is not grouped by remote.")
          } else {
            list(pass = TRUE, message = paste0("Intercept ", round(intercept, 2), " is the office-based mean (", round(raw[["No"]], 2), "), and b = ", round(exp_b, 2), " carries you to the remote mean (", round(raw[["Yes"]], 2), "). With one two-level factor and nothing else in the model, the coefficients are the group means rewritten."))
          }
        }
      }
    `,
    hints: [
      'A factor goes into the formula by name: lm(wellbeing ~ remote, data = d).',
      'levels(d$remote) shows which level R will use as the reference - the first one.',
      'The coefficient is named after the other level, so filter(term == "remoteYes").',
    ],
  },
  {
    id: 'm11-1-b',
    prompt:
      'Show that the model reproduces the independent-samples t-test. Store the t statistic for remoteYes from the model in t_model, and the t statistic from the equal-variance t-test in t_ttest. The two should be identical in size. Work out for yourself why the signs differ.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\n\nt_model <- \n# t.test defaults to Welch, which does NOT match the model. Ask for the pooled version.\nt_ttest <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(statistic)\nt_ttest <- t.test(wellbeing ~ remote, data = d, var.equal = TRUE)$statistic',
    wrongAnswers: [
      // Welch: close, and not the same test.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(statistic)\nt_ttest <- t.test(wellbeing ~ remote, data = d)$statistic',
      // The intercept row read as the group comparison.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- model_remote %>% tidy() %>% slice(1) %>% pull(statistic)\nt_ttest <- t.test(wellbeing ~ remote, data = d, var.equal = TRUE)$statistic',
      // The p value handed in where the t statistic was asked for.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(p.value)\nt_ttest <- t.test(wellbeing ~ remote, data = d, var.equal = TRUE)$p.value',
      // A paired test on two unrelated groups of different sizes would error, so
      // instead: the one-sample test against zero, which runs and means nothing here.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(statistic)\nt_ttest <- t.test(d$wellbeing)$statistic',
    ],
    alternateSolutions: [
      // Base R on both sides.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- summary(model_remote)$coefficients["remoteYes", "t value"]\nt_ttest <- t.test(d$wellbeing[d$remote == "No"], d$wellbeing[d$remote == "Yes"], var.equal = TRUE)$statistic',
      // The t-test written with the groups the other way round, which flips its
      // sign back into agreement with the model. Still a correct answer to the ask.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\nt_model <- model_remote %>% tidy() %>% filter(term == "remoteYes") %>% pull(statistic)\nt_ttest <- t.test(d$wellbeing[d$remote == "Yes"], d$wellbeing[d$remote == "No"], var.equal = TRUE)$statistic',
    ],
    check: `
      if (!has_answer("t_model") || !has_answer("t_ttest")) {
        list(pass = FALSE, message = "I need both t_model and t_ttest.")
      } else {
        t_model <- as.vector(answer("t_model"))
        t_ttest <- as.vector(answer("t_ttest"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- summary(lm(wellbeing ~ remote, data = d))
        exp_t <- as.vector(reference$coefficients["remoteYes", "t value"])
        int_t <- as.vector(reference$coefficients["(Intercept)", "t value"])
        welch <- as.vector(t.test(wellbeing ~ remote, data = d)$statistic)
        if (!is.numeric(t_model) || length(t_model) != 1L || !is.numeric(t_ttest) || length(t_ttest) != 1L) {
          list(pass = FALSE, message = "Both should be single numbers.")
        } else if (isTRUE(all.equal(t_model, int_t, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "t_model is the intercept's t, which tests whether the office-based mean differs from zero - true of every wellbeing score in the study and of no interest. Filter tidy() to the remoteYes row.")
        } else if (abs(t_model) < 1e-3 || abs(t_ttest) < 1e-3) {
          list(pass = FALSE, message = "One of your two values looks like a p value rather than a t statistic. In tidy() the t is the statistic column; from t.test() it is the $statistic element.")
        } else if (!isTRUE(all.equal(abs(t_model), abs(exp_t), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("t_model is ", round(t_model, 4), " but the remoteYes t is ", round(exp_t, 4), "."))
        } else if (isTRUE(all.equal(abs(t_ttest), abs(welch), tolerance = 1e-9, check.attributes = FALSE)) && !isTRUE(all.equal(abs(welch), abs(exp_t), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is Welch's t (", round(welch, 4), "), which t.test() runs by default. Welch does not pool the two variances, so it is not the test the linear model runs. Add var.equal = TRUE and you get ", round(exp_t, 4), "."))
        } else if (!isTRUE(all.equal(abs(t_ttest), abs(exp_t), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("t_ttest is ", round(t_ttest, 4), " but the equal-variance t-test on wellbeing by remote gives ", round(abs(exp_t), 4), " in size. Check that you compared the two remote groups and not something else."))
        } else {
          same_sign <- if (t_model * t_ttest > 0) "the same sign" else "opposite signs"
          list(pass = TRUE, message = paste0("Both are ", round(abs(exp_t), 4), " in size, and yours have ", same_sign, ". t.test(y ~ g) subtracts the first level from the second, and lm codes the second relative to the first, so the sign flips whenever you write them in that order. The test is the same test; only the direction of the subtraction differs."))
        }
      }
    `,
    hints: [
      'The model t is the statistic column of the remoteYes row in tidy().',
      't.test(wellbeing ~ remote, data = d, var.equal = TRUE) runs the pooled-variance test; without var.equal you get Welch, which is a different test.',
      'The result of t.test() is a list; its t statistic is in $statistic.',
    ],
  },
  {
    id: 'm11-2-a',
    prompt:
      'Fit wellbeing on department, which has four levels. Store the model in model_dept, the name of the level R used as the reference in reference_level, and the coefficient for the Support department in b_support.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nlevels(d$department)\n\nmodel_dept <- \nreference_level <- \nb_support <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nreference_level <- levels(d$department)[1]\nb_support <- model_dept %>% tidy() %>% filter(term == "departmentSupport") %>% pull(estimate)',
    wrongAnswers: [
      // The intercept read as Support's mean - the named mistake of this module.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nreference_level <- levels(d$department)[1]\nb_support <- model_dept %>% tidy() %>% slice(1) %>% pull(estimate)',
      // The Support group mean offered as the coefficient.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nreference_level <- levels(d$department)[1]\nb_support <- mean(d$wellbeing[d$department == "Support"])',
      // The reference guessed rather than read off the factor.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nreference_level <- "Support"\nb_support <- model_dept %>% tidy() %>% filter(term == "departmentSupport") %>% pull(estimate)',
      // department treated as a number, which collapses four groups into one slope.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$department_num <- as.numeric(d$department)\nmodel_dept <- lm(wellbeing ~ department_num, data = d)\nreference_level <- levels(d$department)[1]\nb_support <- model_dept %>% tidy() %>% slice(2) %>% pull(estimate)',
    ],
    alternateSolutions: [
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nreference_level <- levels(d$department)[[1]]\nb_support <- coef(model_dept)["departmentSupport"]',
      // The reference recovered from the model rather than from the data.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nreference_level <- model_dept$xlevels$department[1]\nb_support <- model_dept %>% tidy() %>% filter(term == "departmentSupport") %>% pull(estimate)',
    ],
    check: `
      if (!has_answer("model_dept") || !has_answer("reference_level") || !has_answer("b_support")) {
        list(pass = FALSE, message = "I need all three: model_dept, reference_level and b_support.")
      } else {
        model_dept <- answer("model_dept")
        ref <- as.vector(answer("reference_level"))
        b <- as.vector(answer("b_support"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- lm(wellbeing ~ department, data = d)
        exp_ref <- levels(d$department)[1]
        exp_b <- as.vector(coef(reference)["departmentSupport"])
        intercept <- as.vector(coef(reference)["(Intercept)"])
        means <- tapply(d$wellbeing, d$department, mean)
        if (!inherits(model_dept, "lm")) {
          list(pass = FALSE, message = "model_dept is not a fitted linear model.")
        } else if (length(coef(model_dept)) != 4L || !("departmentSupport" %in% names(coef(model_dept)))) {
          list(pass = FALSE, message = paste0("A four-level factor costs three coefficients plus an intercept, so the model should have four in all. Yours has ", length(coef(model_dept)), ": ", paste(names(coef(model_dept)), collapse = ", "), ". If you converted department to a number, R fitted one straight line across four labels whose order carries no meaning."))
        } else if (!is.character(ref) || length(ref) != 1L) {
          list(pass = FALSE, message = "reference_level should be a single piece of text: the name of the level R left out of the coefficient list.")
        } else if (!identical(ref, exp_ref)) {
          list(pass = FALSE, message = paste0("reference_level is \\"", ref, "\\", but R takes the FIRST level of the factor, which is \\"", exp_ref, "\\". Factor levels are alphabetical unless you change them, and the reference is the one with no coefficient of its own."))
        } else if (!is.numeric(b) || length(b) != 1L) {
          list(pass = FALSE, message = "b_support should be a single number.")
        } else if (isTRUE(all.equal(b, intercept, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the intercept, ", round(intercept, 2), ". With one factor and nothing else in the model the intercept is the mean of the reference department (", exp_ref, "), not of Support and not of everybody."))
        } else if (isTRUE(all.equal(b, as.vector(means[["Support"]]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is Support's own mean (", round(means[["Support"]], 2), "). The coefficient is a difference: Support's mean minus the reference department's, which is ", round(exp_b, 2), "."))
        } else if (!isTRUE(all.equal(b, exp_b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("b_support is ", round(b, 4), " but the departmentSupport coefficient is ", round(exp_b, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("The reference is ", exp_ref, ", whose mean is the intercept, ", round(intercept, 2), ". b = ", round(exp_b, 2), " for Support means its mean is ", round(means[["Support"]], 2), ". Every coefficient in this model is a comparison with ", exp_ref, " - so none of them compares Marketing with Sales, which is what lesson 11-3 is for."))
        }
      }
    `,
    hints: [
      'levels(d$department) lists the levels in the order R uses; the first is the reference.',
      'lm(wellbeing ~ department, data = d) produces three coefficients for four groups.',
      'The coefficient names are the factor name glued to the level name: departmentSupport.',
    ],
  },
  {
    id: 'm11-2-b',
    prompt:
      'Build dept_summary: one row per department with the mean, the median, the SD and the n of wellbeing. Then store in top_by_median the name of the department with the highest MEDIAN wellbeing. It is not the department with the highest mean, and working out why is the point of the exercise.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\ndept_summary <- \ntop_by_median <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- d %>%\n  group_by(department) %>%\n  summarise(\n    mean_wellbeing = mean(wellbeing),\n    median_wellbeing = median(wellbeing),\n    sd_wellbeing = sd(wellbeing),\n    n = n()\n  )\ntop_by_median <- dept_summary %>%\n  arrange(desc(median_wellbeing)) %>%\n  slice(1) %>%\n  pull(department) %>%\n  as.character()',
    wrongAnswers: [
      // Sorted on the mean instead of the median: the whole trap.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- d %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), sd_wellbeing = sd(wellbeing), n = n())\ntop_by_median <- dept_summary %>%\n  arrange(desc(mean_wellbeing)) %>%\n  slice(1) %>%\n  pull(department) %>%\n  as.character()',
      // The table has no median column at all.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- d %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), sd_wellbeing = sd(wellbeing), n = n())\ntop_by_median <- dept_summary %>%\n  arrange(desc(mean_wellbeing)) %>%\n  slice(1) %>%\n  pull(department) %>%\n  as.character()',
      // Grouped by site rather than department.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- d %>%\n  group_by(site) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), sd_wellbeing = sd(wellbeing), n = n())\ntop_by_median <- dept_summary %>%\n  arrange(desc(median_wellbeing)) %>%\n  slice(1) %>%\n  pull(site) %>%\n  as.character()',
      // The lowest median rather than the highest.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- d %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), sd_wellbeing = sd(wellbeing), n = n())\ntop_by_median <- dept_summary %>%\n  arrange(median_wellbeing) %>%\n  slice(1) %>%\n  pull(department) %>%\n  as.character()',
    ],
    alternateSolutions: [
      // Base R throughout.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- aggregate(wellbeing ~ department, data = d,\n  FUN = function(x) c(mean = mean(x), median = median(x), sd = sd(x), n = length(x)))\nmedians <- tapply(d$wellbeing, d$department, median)\ntop_by_median <- names(which.max(medians))',
      // which.max() on the summarised column instead of arrange() + slice().
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\ndept_summary <- d %>%\n  group_by(department) %>%\n  summarise(mean_wellbeing = mean(wellbeing), median_wellbeing = median(wellbeing), sd_wellbeing = sd(wellbeing), n = n())\ntop_by_median <- as.character(dept_summary$department[which.max(dept_summary$median_wellbeing)])',
    ],
    check: `
      if (!has_answer("dept_summary") || !has_answer("top_by_median")) {
        list(pass = FALSE, message = "I need both dept_summary and top_by_median.")
      } else {
        tbl <- answer("dept_summary")
        top <- as.vector(answer("top_by_median"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        means <- tapply(d$wellbeing, d$department, mean)
        medians <- tapply(d$wellbeing, d$department, median)
        exp_top <- names(which.max(medians))
        exp_top_mean <- names(which.max(means))
        if (!is.data.frame(tbl) || nrow(tbl) != nlevels(d$department)) {
          list(pass = FALSE, message = paste0("dept_summary should have one row per department, so ", nlevels(d$department), " rows. Yours has ", if (is.data.frame(tbl)) nrow(tbl) else 0, ". Check which variable you grouped by."))
        } else {
          has_median <- FALSE
          for (nm in names(tbl)) {
            value <- tbl[[nm]]
            if (is.numeric(value) && length(value) == nrow(tbl) &&
                isTRUE(all.equal(sort(as.vector(value)), sort(as.vector(medians)), tolerance = 1e-6, check.attributes = FALSE))) has_median <- TRUE
          }
          if (!has_median) {
            list(pass = FALSE, message = "dept_summary has no column of medians. Add median_wellbeing = median(wellbeing) to your summarise() - you cannot answer the second half from means alone.")
          } else if (!is.character(top) || length(top) != 1L) {
            list(pass = FALSE, message = "top_by_median should be a single department name as text. pull() on a factor column gives a factor; wrap it in as.character().")
          } else if (identical(top, exp_top_mean) && !identical(exp_top_mean, exp_top)) {
            list(pass = FALSE, message = paste0("\\"", exp_top_mean, "\\" has the highest MEAN. The highest MEDIAN is a different department, and that is the finding: one department has both the heaviest workload and the most autonomy, so its wellbeing scores are pulled apart at both ends. Its mean lands mid-table while its typical employee is the best off in the company."))
          } else if (!identical(top, exp_top)) {
            list(pass = FALSE, message = paste0("top_by_median is \\"", top, "\\" but the highest median belongs to \\"", exp_top, "\\". Sort on the median column, descending."))
          } else {
            list(pass = TRUE, message = paste0(exp_top, " has the highest median (", round(medians[[exp_top]], 1), ") while ", exp_top_mean, " has the highest mean (", round(means[[exp_top_mean]], 1), "). A model of wellbeing on department compares MEANS, so it will rank ", exp_top_mean, " top and say nothing about this. That is why every model in Part 3 is read next to the descriptives."))
          }
        }
      }
    `,
    hints: [
      'group_by(department) %>% summarise(...) with both mean(wellbeing) and median(wellbeing).',
      'arrange(desc(median_wellbeing)) %>% slice(1) puts the top row first and keeps only it.',
      'pull(department) on a factor gives a factor; as.character() turns it into plain text.',
    ],
  },
  {
    id: 'm11-3-a',
    prompt:
      'The overall F says at least two departments differ. Find out which. Store the Tukey-adjusted pairwise comparisons in pairs_tbl as a data frame, and the number of those comparisons whose adjusted p value is below .05 in n_significant.',
    starterCode:
      'library(broom)\nlibrary(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\n\npairs_tbl <- \nn_significant <- ',
    solution:
      'library(broom)\nlibrary(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\ncomparisons <- emmeans(model_dept, pairwise ~ department, adjust = "tukey")\npairs_tbl <- as.data.frame(comparisons$contrasts)\nn_significant <- sum(pairs_tbl$p.value < 0.05)',
    wrongAnswers: [
      // No adjustment: six tests at .05 each, and a different p column.
      'library(broom)\nlibrary(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\ncomparisons <- emmeans(model_dept, pairwise ~ department, adjust = "none")\npairs_tbl <- as.data.frame(comparisons$contrasts)\nn_significant <- sum(pairs_tbl$p.value < 0.05)',
      // Bonferroni instead of Tukey: also adjusted, also not what was asked.
      'library(broom)\nlibrary(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\ncomparisons <- emmeans(model_dept, pairwise ~ department, adjust = "bonferroni")\npairs_tbl <- as.data.frame(comparisons$contrasts)\nn_significant <- sum(pairs_tbl$p.value < 0.05)',
      // The estimated marginal means rather than the comparisons between them.
      'library(broom)\nlibrary(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\ncomparisons <- emmeans(model_dept, pairwise ~ department, adjust = "tukey")\npairs_tbl <- as.data.frame(comparisons$emmeans)\nn_significant <- sum(pairs_tbl$p.value < 0.05, na.rm = TRUE)',
      // Pairwise on the two-level factor, which gives a single comparison.
      'library(broom)\nlibrary(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_remote <- lm(wellbeing ~ remote, data = d)\ncomparisons <- emmeans(model_remote, pairwise ~ remote, adjust = "tukey")\npairs_tbl <- as.data.frame(comparisons$contrasts)\nn_significant <- sum(pairs_tbl$p.value < 0.05)',
    ],
    alternateSolutions: [
      // contrast() rather than the pairwise formula.
      'library(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\nemm <- emmeans(model_dept, ~ department)\npairs_tbl <- as.data.frame(contrast(emm, method = "pairwise", adjust = "tukey"))\nn_significant <- length(which(pairs_tbl$p.value < 0.05))',
      // Tukey by its other name: emmeans treats "mvt"-free pairwise as Tukey by default.
      'library(emmeans)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nmodel_dept <- lm(wellbeing ~ department, data = d)\npairs_tbl <- as.data.frame(emmeans(model_dept, pairwise ~ department)$contrasts)\nn_significant <- sum(pairs_tbl$p.value < 0.05)',
    ],
    check: `
      if (!has_answer("pairs_tbl") || !has_answer("n_significant")) {
        list(pass = FALSE, message = "I need both pairs_tbl and n_significant.")
      } else {
        tbl <- answer("pairs_tbl")
        n_sig <- as.vector(answer("n_significant"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        reference <- lm(wellbeing ~ department, data = d)
        emm <- emmeans::emmeans(reference, ~ department)
        tukey <- as.data.frame(emmeans::contrast(emm, method = "pairwise", adjust = "tukey"))
        none <- as.data.frame(emmeans::contrast(emm, method = "pairwise", adjust = "none"))
        exp_n <- sum(tukey$p.value < 0.05)
        if (!is.data.frame(tbl)) {
          list(pass = FALSE, message = "pairs_tbl should be a data frame. as.data.frame() on the contrasts element of the emmeans result turns it into one.")
        } else if (!("p.value" %in% names(tbl)) || !("estimate" %in% names(tbl))) {
          list(pass = FALSE, message = paste0("pairs_tbl has columns ", paste(names(tbl), collapse = ", "), ". The comparisons table has estimate, SE, df, t.ratio and p.value - you may have taken the emmeans element (the group means) instead of the contrasts element."))
        } else if (nrow(tbl) != nrow(tukey)) {
          list(pass = FALSE, message = paste0("Four departments give ", nrow(tukey), " pairwise comparisons; pairs_tbl has ", nrow(tbl), ". Check that you ran the comparisons on department."))
        } else if (isTRUE(all.equal(sort(as.vector(tbl$p.value)), sort(as.vector(none$p.value)), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Those p values are unadjusted. Six comparisons at .05 each give about a 26 % chance of at least one false positive, which is exactly what the adjustment is for. Pass adjust = \\"tukey\\".")
        } else if (!isTRUE(all.equal(sort(as.vector(tbl$p.value)), sort(as.vector(tukey$p.value)), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Your p values are adjusted, but not with Tukey's method. Tukey is the one designed for all pairwise comparisons after a linear model; Bonferroni is more conservative here. Pass adjust = \\"tukey\\".")
        } else if (!is.numeric(n_sig) || length(n_sig) != 1L) {
          list(pass = FALSE, message = "n_significant should be a single number: how many rows of pairs_tbl have p.value below .05.")
        } else if (!isTRUE(all.equal(as.numeric(n_sig), as.numeric(exp_n), tolerance = 1e-9, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("n_significant is ", n_sig, " but ", exp_n, " of the ", nrow(tukey), " Tukey-adjusted comparisons fall below .05."))
        } else {
          biggest <- tukey[which.max(abs(tukey$estimate)), ]
          list(pass = TRUE, message = paste0(exp_n, " of ", nrow(tukey), " comparisons survive the Tukey adjustment. The largest gap is ", as.character(biggest$contrast), ", a difference of ", round(abs(biggest$estimate), 2), " points. Report the comparison, its difference and its adjusted p - never just the overall F, which tells a reader only that something differs somewhere."))
        }
      }
    `,
    hints: [
      'emmeans(model, pairwise ~ department, adjust = "tukey") returns a list with an emmeans element and a contrasts element.',
      'The comparisons are in the contrasts element; as.data.frame() makes it a plain table.',
      'sum(pairs_tbl$p.value < 0.05) counts the rows below .05, because sum() over TRUE and FALSE counts the TRUEs.',
    ],
  },
];
