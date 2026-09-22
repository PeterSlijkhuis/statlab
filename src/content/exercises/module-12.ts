import type { ExerciseDef } from '../../r/checker';

export const module12: ExerciseDef[] = [
  {
    id: 'm12-1-a',
    prompt:
      'Build the change score - engagement at time 2 minus time 1 - as a new column called change, then fit the model in which training and mentoring interact. Store the fitted model in model_int and the interaction coefficient in b_int.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nd2 <- d %>% mutate(change = )\n\n# A star fits both main effects AND their interaction.\nmodel_int <- \nb_int <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\nmodel_int <- lm(change ~ training * mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes:mentoringYes") %>% pull(estimate)',
    wrongAnswers: [
      // A plus sign: no interaction term at all, so nothing to read.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\nmodel_int <- lm(change ~ training + mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes:mentoringYes") %>% pull(estimate)',
      // A colon without the main effects: the interaction term is there but means
      // something different, because the main effects are not partialled out.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\nmodel_int <- lm(change ~ training:mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes:mentoringYes") %>% pull(estimate)',
      // The change score computed backwards.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t1 - engagement_t2)\nmodel_int <- lm(change ~ training * mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes:mentoringYes") %>% pull(estimate)',
      // Time 2 modelled directly: not a change score, and a different answer.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2)\nmodel_int <- lm(change ~ training * mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes:mentoringYes") %>% pull(estimate)',
      // A main effect read as the interaction.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\nmodel_int <- lm(change ~ training * mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes") %>% pull(estimate)',
    ],
    alternateSolutions: [
      // The star written out in full: identical model.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\nmodel_int <- lm(change ~ training + mentoring + training:mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% filter(term == "trainingYes:mentoringYes") %>% pull(estimate)',
      // Base R throughout, and the column added with $.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d\nd2$change <- d2$engagement_t2 - d2$engagement_t1\nmodel_int <- lm(change ~ training * mentoring, data = d2)\nb_int <- coef(model_int)["trainingYes:mentoringYes"]',
      // The change computed inside the formula with I().
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\nmodel_int <- lm(I(engagement_t2 - engagement_t1) ~ training * mentoring, data = d2)\nb_int <- model_int %>% tidy() %>% slice(4) %>% pull(estimate)',
    ],
    check: `
      if (!has_answer("model_int") || !has_answer("b_int")) {
        list(pass = FALSE, message = "I need both model_int and b_int.")
      } else {
        model_int <- answer("model_int")
        b <- as.vector(answer("b_int"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        d$change <- d$engagement_t2 - d$engagement_t1
        reference <- lm(change ~ training * mentoring, data = d)
        exp_b <- as.vector(coef(reference)["trainingYes:mentoringYes"])
        exp_training <- as.vector(coef(reference)["trainingYes"])
        exp_mentoring <- as.vector(coef(reference)["mentoringYes"])
        flipped <- as.vector(coef(lm(I(-change) ~ training * mentoring, data = d))["trainingYes:mentoringYes"])
        if (!inherits(model_int, "lm")) {
          list(pass = FALSE, message = "model_int is not a fitted linear model.")
        } else if (!("trainingYes:mentoringYes" %in% names(coef(model_int)))) {
          list(pass = FALSE, message = paste0("model_int has no interaction term. Its coefficients are: ", paste(names(coef(model_int)), collapse = ", "), ". A plus sign fits the two effects side by side and forces them to be the same whatever the other factor is doing; a star adds the term that lets them differ."))
        } else if (length(coef(model_int)) != 4L) {
          list(pass = FALSE, message = paste0("A 2 x 2 design needs four coefficients: an intercept, two main effects and one interaction. Yours has ", length(coef(model_int)), ". A colon on its own gives the interaction without the main effects, which makes every coefficient mean something else."))
        } else if (!is.numeric(b) || length(b) != 1L) {
          list(pass = FALSE, message = "b_int should be a single number: the estimate on the trainingYes:mentoringYes row.")
        } else if (isTRUE(all.equal(b, exp_training, tolerance = 1e-6, check.attributes = FALSE)) || isTRUE(all.equal(b, exp_mentoring, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is a main effect, not the interaction. In tidy() the interaction is the row whose term contains a colon: trainingYes:mentoringYes, which is ", round(exp_b, 2), "."))
        } else if (isTRUE(all.equal(b, flipped, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Your change score runs the wrong way: you computed time 1 minus time 2, so every effect has the wrong sign. Change is the later measurement minus the earlier one.")
        } else if (!isTRUE(all.equal(b, exp_b, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("b_int is ", round(b, 4), " but the interaction coefficient is ", round(exp_b, 4), ". Check that change is engagement_t2 - engagement_t1 and that the model uses a star."))
        } else {
          list(pass = TRUE, message = paste0("The interaction is ", round(exp_b, 2), ". Training alone adds ", round(exp_training, 2), " and mentoring alone ", round(exp_mentoring, 2), ", but employees who got both gained a further ", round(exp_b, 2), " on top of the two. That extra is what the interaction term is."))
        }
      }
    `,
    hints: [
      'mutate(change = engagement_t2 - engagement_t1) adds the change column - later minus earlier.',
      'training * mentoring fits both main effects and the interaction in one go.',
      'tidy() names the interaction row trainingYes:mentoringYes, with a colon.',
    ],
  },
  {
    id: 'm12-2-a',
    prompt:
      'Before any test, the four cell means. Build cell_means with one row for each combination of training and mentoring, holding the mean change, its SD and the cell n. Then compute boost: how much more the both-interventions group gained than you would predict by adding the two separate gains to the neither group.',
    starterCode:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\n\ncell_means <- \n\n# boost = (both - neither) - (training only - neither) - (mentoring only - neither)\nboost <- ',
    solution:
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncell_means <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), .groups = "drop")\nm <- function(t, mt) cell_means$mean_change[cell_means$training == t & cell_means$mentoring == mt]\nboost <- (m("Yes", "Yes") - m("No", "No")) - (m("Yes", "No") - m("No", "No")) - (m("No", "Yes") - m("No", "No"))',
    wrongAnswers: [
      // The raw gap between the corners, which is the whole combined gain and
      // not the extra over and above the two separate ones.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncell_means <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), .groups = "drop")\nm <- function(t, mt) cell_means$mean_change[cell_means$training == t & cell_means$mentoring == mt]\nboost <- m("Yes", "Yes") - m("No", "No")',
      // The two separate gains added together: the additive prediction, not the excess.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncell_means <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), .groups = "drop")\nm <- function(t, mt) cell_means$mean_change[cell_means$training == t & cell_means$mentoring == mt]\nboost <- (m("Yes", "No") - m("No", "No")) + (m("No", "Yes") - m("No", "No"))',
      // Only two cells, because only one factor was grouped on.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncell_means <- d2 %>%\n  group_by(training) %>%\n  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), .groups = "drop")\nboost <- cell_means$mean_change[cell_means$training == "Yes"] - cell_means$mean_change[cell_means$training == "No"]',
      // Time 2 means rather than change means.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2)\ncell_means <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), .groups = "drop")\nm <- function(t, mt) cell_means$mean_change[cell_means$training == t & cell_means$mentoring == mt]\nboost <- (m("Yes", "Yes") - m("No", "No")) - (m("Yes", "No") - m("No", "No")) - (m("No", "Yes") - m("No", "No"))',
    ],
    alternateSolutions: [
      // Base R: the 2 x 2 table of means, and the same contrast written directly.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\ncells <- tapply(d$change, list(d$training, d$mentoring), mean)\ncell_means <- as.data.frame(as.table(cells))\nnames(cell_means) <- c("training", "mentoring", "mean_change")\nboost <- cells["Yes", "Yes"] - cells["Yes", "No"] - cells["No", "Yes"] + cells["No", "No"]',
      // The algebraically identical short form, and a summarise() with extra columns.
      'library(dplyr)\nlibrary(broom)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncell_means <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), sd_change = sd(change), n = n(), se = sd(change) / sqrt(n()), .groups = "drop")\nm <- function(t, mt) cell_means$mean_change[cell_means$training == t & cell_means$mentoring == mt]\nboost <- m("Yes", "Yes") - m("Yes", "No") - m("No", "Yes") + m("No", "No")',
    ],
    check: `
      if (!has_answer("cell_means") || !has_answer("boost")) {
        list(pass = FALSE, message = "I need both cell_means and boost.")
      } else {
        tbl <- answer("cell_means")
        boost <- as.vector(answer("boost"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        d$change <- d$engagement_t2 - d$engagement_t1
        cells <- tapply(d$change, list(d$training, d$mentoring), mean)
        exp_boost <- as.vector(cells["Yes", "Yes"] - cells["Yes", "No"] - cells["No", "Yes"] + cells["No", "No"])
        corner <- as.vector(cells["Yes", "Yes"] - cells["No", "No"])
        additive <- as.vector((cells["Yes", "No"] - cells["No", "No"]) + (cells["No", "Yes"] - cells["No", "No"]))
        if (!is.data.frame(tbl) || nrow(tbl) != 4L) {
          list(pass = FALSE, message = paste0("cell_means should have four rows - one per combination of two yes/no factors. Yours has ", if (is.data.frame(tbl)) nrow(tbl) else 0, ". group_by() takes both factors: group_by(training, mentoring)."))
        } else {
          found <- FALSE
          for (nm in names(tbl)) {
            value <- tbl[[nm]]
            if (is.numeric(value) && length(value) == 4L &&
                isTRUE(all.equal(sort(as.vector(value)), sort(as.vector(cells)), tolerance = 1e-6, check.attributes = FALSE))) found <- TRUE
          }
          if (!found) {
            list(pass = FALSE, message = paste0("No column of cell_means holds the four mean change scores, which are ", paste(round(sort(as.vector(cells)), 2), collapse = ", "), ". Check that you summarised change (engagement_t2 minus engagement_t1) rather than engagement itself."))
          } else if (!is.numeric(boost) || length(boost) != 1L) {
            list(pass = FALSE, message = "boost should be a single number.")
          } else if (isTRUE(all.equal(boost, corner, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("That is the whole gap between the both-interventions cell and the neither cell (", round(corner, 2), "). Most of that gap is the two interventions doing their separate jobs. Subtract both separate gains to get what is left over."))
          } else if (isTRUE(all.equal(boost, additive, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("That is the additive prediction (", round(additive, 2), "): what the both cell would gain if the two interventions simply stacked. The boost is how far the real both cell beats that prediction."))
          } else if (!isTRUE(all.equal(boost, exp_boost, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = paste0("boost is ", round(boost, 4), " but should be ", round(exp_boost, 4), ". The short form is mean(Yes,Yes) - mean(Yes,No) - mean(No,Yes) + mean(No,No)."))
          } else {
            list(pass = TRUE, message = paste0("boost = ", round(exp_boost, 2), ". The both cell gained ", round(corner, 2), " over the neither cell, but adding the two separate gains only predicts ", round(additive, 2), " - the rest is the two working together. Fit the model with a star and you will find this same number sitting on the interaction row."))
          }
        }
      }
    `,
    hints: [
      'group_by(training, mentoring) groups on both factors at once and gives four rows.',
      'Add .groups = "drop" to summarise() to leave the result ungrouped.',
      'Written out fully, boost is mean(Yes,Yes) - mean(Yes,No) - mean(No,Yes) + mean(No,No).',
    ],
  },
  {
    id: 'm12-2-b',
    prompt:
      'Produce the factorial ANOVA table for the change score with type III sums of squares, correctly. Fit the model with sum-to-zero contrasts for both factors, store it in model_sum, store the car::Anova table as a data frame in aov_tbl, and store the F value for the training main effect in f_training.',
    starterCode:
      'library(broom)\nlibrary(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\n\n# Type III main-effect tests are only meaningful with sum-to-zero contrasts.\nmodel_sum <- \naov_tbl <- \nf_training <- ',
    solution:
      'library(broom)\nlibrary(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\nmodel_sum <- lm(change ~ training * mentoring, data = d,\n                contrasts = list(training = contr.sum, mentoring = contr.sum))\naov_tbl <- as.data.frame(Anova(model_sum, type = "III"))\nf_training <- aov_tbl["training", "F value"]',
    wrongAnswers: [
      // The contrasts argument left off: R uses treatment contrasts, and the
      // type III main-effect tests then answer a different question.
      'library(broom)\nlibrary(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\nmodel_sum <- lm(change ~ training * mentoring, data = d)\naov_tbl <- as.data.frame(Anova(model_sum, type = "III"))\nf_training <- aov_tbl["training", "F value"]',
      // Type II, which ignores the interaction when testing the main effects.
      'library(broom)\nlibrary(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\nmodel_sum <- lm(change ~ training * mentoring, data = d,\n                contrasts = list(training = contr.sum, mentoring = contr.sum))\naov_tbl <- as.data.frame(Anova(model_sum, type = "II"))\nf_training <- aov_tbl["training", "F value"]',
      // The interaction row read as the training main effect.
      'library(broom)\nlibrary(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\nmodel_sum <- lm(change ~ training * mentoring, data = d,\n                contrasts = list(training = contr.sum, mentoring = contr.sum))\naov_tbl <- as.data.frame(Anova(model_sum, type = "III"))\nf_training <- aov_tbl["training:mentoring", "F value"]',
      // Sum-to-zero contrasts applied to only one of the two factors.
      'library(broom)\nlibrary(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\nmodel_sum <- lm(change ~ training * mentoring, data = d,\n                contrasts = list(training = contr.sum))\naov_tbl <- as.data.frame(Anova(model_sum, type = "III"))\nf_training <- aov_tbl["training", "F value"]',
    ],
    alternateSolutions: [
      // The contrasts set on the data instead of in the call: the same model.
      'library(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\ncontrasts(d$training) <- contr.sum\ncontrasts(d$mentoring) <- contr.sum\nmodel_sum <- lm(change ~ training * mentoring, data = d)\naov_tbl <- as.data.frame(Anova(model_sum, type = "III"))\nf_training <- aov_tbl$"F value"[rownames(aov_tbl) == "training"]',
      // The type given as the number 3, which car accepts, and the table indexed by number.
      'library(car)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\nmodel_sum <- lm(change ~ training * mentoring, data = d,\n                contrasts = list(training = contr.sum, mentoring = contr.sum))\naov_tbl <- as.data.frame(Anova(model_sum, type = 3))\nf_training <- aov_tbl[["F value"]][which(rownames(aov_tbl) == "training")]',
    ],
    check: `
      if (!has_answer("model_sum") || !has_answer("aov_tbl") || !has_answer("f_training")) {
        list(pass = FALSE, message = "I need all three: model_sum, aov_tbl and f_training.")
      } else {
        model_sum <- answer("model_sum")
        tbl <- answer("aov_tbl")
        f_training <- as.vector(answer("f_training"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        d$change <- d$engagement_t2 - d$engagement_t1
        correct_fit <- lm(change ~ training * mentoring, data = d,
                          contrasts = list(training = contr.sum, mentoring = contr.sum))
        default_fit <- lm(change ~ training * mentoring, data = d)
        correct3 <- as.data.frame(car::Anova(correct_fit, type = "III"))
        default3 <- as.data.frame(car::Anova(default_fit, type = "III"))
        type2 <- as.data.frame(car::Anova(correct_fit, type = "II"))
        exp_f <- as.vector(correct3["training", "F value"])
        exp_int <- as.vector(correct3["training:mentoring", "F value"])
        if (!inherits(model_sum, "lm")) {
          list(pass = FALSE, message = "model_sum is not a fitted linear model.")
        } else if (!("trainingYes:mentoringYes" %in% names(coef(model_sum))) && !any(grepl(":", names(coef(model_sum))))) {
          list(pass = FALSE, message = "model_sum has no interaction term. Use change ~ training * mentoring.")
        } else if (!is.data.frame(tbl) || !("F value" %in% names(tbl))) {
          list(pass = FALSE, message = "aov_tbl should be the car::Anova table turned into a data frame with as.data.frame(); it has columns Sum Sq, Df, F value and Pr(>F).")
        } else if (!is.numeric(f_training) || length(f_training) != 1L) {
          list(pass = FALSE, message = "f_training should be a single number: the F value on the training row.")
        } else if (isTRUE(all.equal(f_training, exp_int, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the interaction's F (", round(exp_int, 2), "), on the training:mentoring row. The training main effect is on the row called training."))
        } else if (isTRUE(all.equal(f_training, as.vector(default3["training", "F value"]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("You fitted without sum-to-zero contrasts, so that F (", round(as.vector(default3["training", "F value"]), 2), ") is not the main effect of training. Under R's default treatment contrasts a type III main-effect test asks about training among employees with NO mentoring only - a simple effect wearing a main effect's name. With contrasts = list(training = contr.sum, mentoring = contr.sum) the same row becomes ", round(exp_f, 2), "."))
        } else if (isTRUE(all.equal(f_training, as.vector(type2["training", "F value"]), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the type II F (", round(as.vector(type2["training", "F value"]), 2), "). Type II tests each main effect while ignoring the interaction, which is only defensible when the interaction is negligible. This exercise asks for type III."))
        } else if (!isTRUE(all.equal(f_training, exp_f, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("f_training is ", round(f_training, 4), " but the type III F for training with sum-to-zero contrasts is ", round(exp_f, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("F for training = ", round(exp_f, 2), " and for the interaction = ", round(exp_int, 2), ". Worth knowing: the interaction's type III F is the same under either contrast coding - it is only the main-effect rows that change, which is exactly why the contrasts argument is not optional."))
        }
      }
    `,
    hints: [
      'Pass contrasts = list(training = contr.sum, mentoring = contr.sum) inside the lm() call, alongside data = d.',
      'Anova() with a capital A comes from car; anova() with a lower-case a is a different function that gives sequential (type I) sums of squares.',
      'as.data.frame() on the result lets you index it by row name: aov_tbl["training", "F value"].',
    ],
  },
  {
    id: 'm12-3-a',
    prompt:
      'An interaction means the effect of one factor depends on the other, so report each effect where it actually applies. From the cell means, store the effect of training among employees with no mentoring in effect_no_mentoring, and among employees who also got mentoring in effect_yes_mentoring. Each is the Yes-minus-No difference in mean change within that half of the data.',
    starterCode:
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\n\ncells <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), .groups = "drop")\ncells\n\neffect_no_mentoring <- \neffect_yes_mentoring <- ',
    solution:
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncells <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), .groups = "drop")\ncell <- function(t, mt) cells$mean_change[cells$training == t & cells$mentoring == mt]\neffect_no_mentoring <- cell("Yes", "No") - cell("No", "No")\neffect_yes_mentoring <- cell("Yes", "Yes") - cell("No", "Yes")',
    wrongAnswers: [
      // The overall training effect used for both: the interaction erased.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\noverall <- mean(d2$change[d2$training == "Yes"]) - mean(d2$change[d2$training == "No"])\neffect_no_mentoring <- overall\neffect_yes_mentoring <- overall',
      // Split by training instead of by mentoring: the other pair of simple effects.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncells <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), .groups = "drop")\ncell <- function(t, mt) cells$mean_change[cells$training == t & cells$mentoring == mt]\neffect_no_mentoring <- cell("No", "Yes") - cell("No", "No")\neffect_yes_mentoring <- cell("Yes", "Yes") - cell("Yes", "No")',
      // Both differences taken the wrong way round.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\ncells <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), .groups = "drop")\ncell <- function(t, mt) cells$mean_change[cells$training == t & cells$mentoring == mt]\neffect_no_mentoring <- cell("No", "No") - cell("Yes", "No")\neffect_yes_mentoring <- cell("No", "Yes") - cell("Yes", "Yes")',
      // Cell means of engagement at time 2 rather than of the change.
      'library(dplyr)\nlibrary(ggplot2)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2)\ncells <- d2 %>%\n  group_by(training, mentoring) %>%\n  summarise(mean_change = mean(change), .groups = "drop")\ncell <- function(t, mt) cells$mean_change[cells$training == t & cells$mentoring == mt]\neffect_no_mentoring <- cell("Yes", "No") - cell("No", "No")\neffect_yes_mentoring <- cell("Yes", "Yes") - cell("No", "Yes")',
    ],
    alternateSolutions: [
      // Base R via a 2 x 2 table of means.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd$change <- d$engagement_t2 - d$engagement_t1\ncells <- tapply(d$change, list(d$training, d$mentoring), mean)\neffect_no_mentoring <- cells["Yes", "No"] - cells["No", "No"]\neffect_yes_mentoring <- cells["Yes", "Yes"] - cells["No", "Yes"]',
      // Two separate models, each fitted within one half of the data. The slope
      // of training in each is that half\'s simple effect.
      'library(dplyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nd2 <- d %>% mutate(change = engagement_t2 - engagement_t1)\neffect_no_mentoring <- coef(lm(change ~ training, data = filter(d2, mentoring == "No")))[["trainingYes"]]\neffect_yes_mentoring <- coef(lm(change ~ training, data = filter(d2, mentoring == "Yes")))[["trainingYes"]]',
    ],
    check: `
      if (!has_answer("effect_no_mentoring") || !has_answer("effect_yes_mentoring")) {
        list(pass = FALSE, message = "I need both effect_no_mentoring and effect_yes_mentoring.")
      } else {
        no_m <- as.vector(answer("effect_no_mentoring"))
        yes_m <- as.vector(answer("effect_yes_mentoring"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        d$change <- d$engagement_t2 - d$engagement_t1
        cells <- tapply(d$change, list(d$training, d$mentoring), mean)
        exp_no <- as.vector(cells["Yes", "No"] - cells["No", "No"])
        exp_yes <- as.vector(cells["Yes", "Yes"] - cells["No", "Yes"])
        overall <- mean(d$change[d$training == "Yes"]) - mean(d$change[d$training == "No"])
        if (!is.numeric(no_m) || length(no_m) != 1L || !is.numeric(yes_m) || length(yes_m) != 1L) {
          list(pass = FALSE, message = "Both should be single numbers.")
        } else if (isTRUE(all.equal(no_m, yes_m, tolerance = 1e-12, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("Your two simple effects are identical, so you have reported the overall training effect (", round(overall, 2), ") twice. The whole point of a simple effect is that it differs between the levels of the other factor - here they are ", round(exp_no, 2), " and ", round(exp_yes, 2), "."))
        } else if (isTRUE(all.equal(no_m, -exp_no, tolerance = 1e-6, check.attributes = FALSE)) && isTRUE(all.equal(yes_m, -exp_yes, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "Both of your differences run backwards. Each simple effect is the training-Yes cell minus the training-No cell within that level of mentoring.")
        } else if (!isTRUE(all.equal(no_m, exp_no, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("effect_no_mentoring is ", round(no_m, 4), " but the training effect among employees without mentoring is ", round(exp_no, 4), ". Hold mentoring at No and take the difference across training."))
        } else if (!isTRUE(all.equal(yes_m, exp_yes, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("effect_yes_mentoring is ", round(yes_m, 4), " but the training effect among mentored employees is ", round(exp_yes, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("Training is worth ", round(exp_no, 2), " points without mentoring and ", round(exp_yes, 2), " points with it - a difference of ", round(exp_yes - exp_no, 2), ", which is the interaction coefficient again. The overall training effect, ", round(overall, 2), ", is an average of these two and describes neither group. When an interaction is present, report the simple effects."))
        }
      }
    `,
    hints: [
      'A simple effect is a difference computed inside one level of the other factor.',
      'cells$mean_change[cells$training == "Yes" & cells$mentoring == "No"] picks out one cell mean.',
      'Both effects are Yes minus No on training; only the level of mentoring you hold fixed changes.',
    ],
  },
];
