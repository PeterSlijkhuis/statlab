import type { ExerciseDef } from '../../r/checker';

export const module13: ExerciseDef[] = [
  {
    id: 'm13-1-a',
    prompt:
      'Reshape the two engagement columns into long format. Store the result in long_d, with one row per employee per measurement, a factor column time whose levels are t1 then t2, and a numeric column engagement. Then build time_means: the mean, SD and n of engagement at each time point. The means are what tell you which way engagement moved.',
    starterCode:
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\n\nlong_d <- d %>%\n  pivot_longer(\n    cols = ,\n    names_to = ,\n    values_to = \n  )\n\ntime_means <- ',
    solution:
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(\n    cols = c(engagement_t1, engagement_t2),\n    names_to = "time",\n    values_to = "engagement"\n  ) %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\ntime_means <- long_d %>%\n  group_by(time) %>%\n  summarise(mean_engagement = mean(engagement), sd_engagement = sd(engagement), n = n())',
    wrongAnswers: [
      // names_to and values_to the wrong way round: the columns swap roles.
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(\n    cols = c(engagement_t1, engagement_t2),\n    names_to = "engagement",\n    values_to = "time"\n  )\ntime_means <- long_d %>%\n  group_by(engagement) %>%\n  summarise(mean_engagement = mean(time), sd_engagement = sd(time), n = n())',
      // The wrong pair of columns reshaped.
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(\n    cols = c(wellbeing, performance),\n    names_to = "time",\n    values_to = "engagement"\n  ) %>%\n  mutate(time = factor(time))\ntime_means <- long_d %>%\n  group_by(time) %>%\n  summarise(mean_engagement = mean(engagement), sd_engagement = sd(engagement), n = n())',
      // Only one time point kept: 480 rows, and no comparison possible.
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  select(employee_id, site, engagement = engagement_t1) %>%\n  mutate(time = factor("t1"))\ntime_means <- long_d %>%\n  group_by(time) %>%\n  summarise(mean_engagement = mean(engagement), sd_engagement = sd(engagement), n = n())',
      // Grouped by department rather than by time.
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(\n    cols = c(engagement_t1, engagement_t2),\n    names_to = "time",\n    values_to = "engagement"\n  ) %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\ntime_means <- long_d %>%\n  group_by(department) %>%\n  summarise(mean_engagement = mean(engagement), sd_engagement = sd(engagement), n = n())',
    ],
    alternateSolutions: [
      // names_prefix strips the shared start, so the levels are already t1 and t2.
      'library(dplyr)\nlibrary(tidyr)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(\n    cols = starts_with("engagement_"),\n    names_to = "time",\n    names_prefix = "engagement_",\n    values_to = "engagement"\n  ) %>%\n  mutate(time = factor(time))\ntime_means <- long_d %>%\n  group_by(time) %>%\n  summarise(mean_engagement = mean(engagement), sd_engagement = sd(engagement), n = n())',
      // Base R: two stacked frames, and aggregate() for the summary.
      'd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- rbind(\n  data.frame(employee_id = d$employee_id, site = d$site, time = "t1", engagement = d$engagement_t1),\n  data.frame(employee_id = d$employee_id, site = d$site, time = "t2", engagement = d$engagement_t2)\n)\nlong_d$time <- factor(long_d$time, levels = c("t1", "t2"))\ntime_means <- aggregate(engagement ~ time, data = long_d,\n  FUN = function(x) c(mean = mean(x), sd = sd(x), n = length(x)))',
    ],
    check: `
      if (!has_answer("long_d") || !has_answer("time_means")) {
        list(pass = FALSE, message = "I need both long_d and time_means.")
      } else {
        long_d <- answer("long_d")
        tbl <- answer("time_means")
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        expected_values <- sort(c(d$engagement_t1, d$engagement_t2))
        exp_m1 <- mean(d$engagement_t1)
        exp_m2 <- mean(d$engagement_t2)
        if (!is.data.frame(long_d)) {
          list(pass = FALSE, message = "long_d should be a data frame.")
        } else if (nrow(long_d) != 2L * nrow(d)) {
          list(pass = FALSE, message = paste0("long_d has ", nrow(long_d), " rows. Two measurements for each of ", nrow(d), " employees is ", 2L * nrow(d), " rows - one row per employee per time point."))
        } else if (!("engagement" %in% names(long_d)) || !is.numeric(long_d$engagement)) {
          list(pass = FALSE, message = paste0("long_d needs a numeric column called engagement holding the scores. Its columns are: ", paste(names(long_d), collapse = ", "), ". names_to gets the name of the column the value came FROM; values_to gets the values themselves - it is easy to write them the wrong way round."))
        } else if (!("time" %in% names(long_d))) {
          list(pass = FALSE, message = paste0("long_d needs a column called time saying which measurement each row is. Its columns are: ", paste(names(long_d), collapse = ", "), "."))
        } else if (!isTRUE(all.equal(sort(as.vector(long_d$engagement)), as.vector(expected_values), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = "The values in long_d$engagement are not the two engagement columns. Reshape engagement_t1 and engagement_t2, not another pair.")
        } else if (length(unique(as.character(long_d$time))) != 2L) {
          list(pass = FALSE, message = "time should take exactly two values, one per measurement.")
        } else {
          labels <- sort(unique(as.character(long_d$time)))
          first_label <- labels[1]
          means_by_time <- tapply(long_d$engagement, as.character(long_d$time), mean)
          if (!isTRUE(all.equal(as.vector(means_by_time[[labels[1]]]), exp_m1, tolerance = 1e-6, check.attributes = FALSE))) {
            list(pass = FALSE, message = "The first level of time does not hold the time 1 scores. Set the levels explicitly so that the earlier measurement comes first - otherwise the model in the next lesson reports the change backwards.")
          } else if (!is.data.frame(tbl) || nrow(tbl) != 2L) {
            list(pass = FALSE, message = paste0("time_means should have two rows, one per time point. Yours has ", if (is.data.frame(tbl)) nrow(tbl) else 0, ". Group by time."))
          } else {
            found <- FALSE
            for (value in numeric_columns(tbl)) {
              if (length(value) == 2L &&
                  isTRUE(all.equal(sort(value), sort(c(exp_m1, exp_m2)), tolerance = 1e-6, check.attributes = FALSE))) found <- TRUE
            }
            if (!found) {
              list(pass = FALSE, message = paste0("No column of time_means holds the two mean engagement scores, which are ", round(exp_m1, 2), " and ", round(exp_m2, 2), ". Check that you grouped by time."))
            } else {
              list(pass = TRUE, message = paste0("960 rows, two per employee. Engagement went from ", round(exp_m1, 2), " at time 1 to ", round(exp_m2, 2), " at time 2, a rise of ", round(exp_m2 - exp_m1, 2), " points. Keep that direction in mind: the model in the next lesson should report the same sign, and if it does not, the level order of time is the first thing to check."))
            }
          }
        }
      }
    `,
    hints: [
      'pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement").',
      'names_to names the new column that holds the OLD column names; values_to names the column that holds the numbers.',
      'factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")) fixes both the order and the labels.',
    ],
  },
  {
    id: 'm13-2-a',
    prompt:
      'Fit the mixed-effects model for the two measurements: engagement predicted by time, with a random intercept for each employee. Store the model in m_time and the fixed effect of time in b_time.',
    starterCode:
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\n\n# (1 | employee_id) gives every employee their own starting level.\nm_time <- \nb_time <- ',
    solution:
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nb_time <- fixef(m_time)[["timet2"]]',
    wrongAnswers: [
      // An ordinary lm: it ignores that each employee appears twice.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lm(engagement ~ time, data = long_d)\nb_time <- coef(m_time)[["timet2"]]',
      // The wrong grouping factor: site does not identify the repeated measure.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | site), data = long_d)\nb_time <- fixef(m_time)[["timet2"]]',
      // The intercept read as the effect of time.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nb_time <- fixef(m_time)[[1]]',
      // The level order reversed, so the fixed effect reports the fall from t2 to t1.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t2", "engagement_t1"), labels = c("t2", "t1")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nb_time <- fixef(m_time)[[2]]',
    ],
    alternateSolutions: [
      // The fixed effect read off the summary table instead of with fixef().
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nb_time <- summary(m_time)$coefficients["timet2", "Estimate"]',
      // names_prefix leaves the levels as t1 and t2 without a second mutate,
      // and the effect is taken by position.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = starts_with("engagement_"), names_to = "time", names_prefix = "engagement_", values_to = "engagement")\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nb_time <- fixef(m_time)[[2]]',
    ],
    check: `
      if (!has_answer("m_time") || !has_answer("b_time")) {
        list(pass = FALSE, message = "I need both m_time and b_time.")
      } else {
        m_time <- answer("m_time")
        b <- as.vector(answer("b_time"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        long <- data.frame(
          employee_id = rep(d$employee_id, 2),
          site = rep(d$site, 2),
          time = factor(rep(c("t1", "t2"), each = nrow(d)), levels = c("t1", "t2")),
          engagement = c(d$engagement_t1, d$engagement_t2)
        )
        reference <- lmerTest::lmer(engagement ~ time + (1 | employee_id), data = long)
        exp_b <- as.vector(lme4::fixef(reference)[[2]])
        exp_intercept <- as.vector(lme4::fixef(reference)[[1]])
        if (!inherits(m_time, "merMod")) {
          list(pass = FALSE, message = "m_time is not a mixed-effects model. An lm() on the long data treats each employee's two rows as two unrelated people, which throws away the pairing and gets the standard error wrong. Use lmer(engagement ~ time + (1 | employee_id), data = long_d).")
        } else if (!("employee_id" %in% names(m_time@flist))) {
          list(pass = FALSE, message = paste0("The random intercept is grouped by ", paste(names(m_time@flist), collapse = ", "), ". The repeated measurement is within employees, so the grouping factor has to be employee_id: the model needs to know which two rows belong to the same person."))
        } else if (!is.numeric(b) || length(b) != 1L) {
          list(pass = FALSE, message = "b_time should be a single number.")
        } else if (isTRUE(all.equal(b, exp_intercept, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the intercept (", round(exp_intercept, 2), "), the predicted engagement at time 1. The effect of time is the second fixed effect, ", round(exp_b, 2), "."))
        } else if (isTRUE(all.equal(b, -exp_b, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("Right size, wrong sign: your time factor has t2 as its first level, so the coefficient reports the fall from time 2 back to time 1. Set levels = c(\\"engagement_t1\\", \\"engagement_t2\\") so the earlier measurement is the reference and the coefficient is the rise, ", round(exp_b, 2), "."))
        } else if (!isTRUE(all.equal(b, exp_b, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("b_time is ", round(b, 4), " but the fixed effect of time is ", round(exp_b, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("Engagement rose by ", round(exp_b, 2), " points from time 1 to time 2. Because each employee has their own intercept, that estimate is built from within-employee changes rather than from the difference between two piles of scores - which is why it is the right model for data where the same people were measured twice."))
        }
      }
    `,
    hints: [
      'lmer(engagement ~ time + (1 | employee_id), data = long_d) - the fixed part before the plus, the random part in brackets.',
      'The vertical bar reads "grouped by": (1 | employee_id) is an intercept for each employee.',
      'fixef(m_time) returns the fixed effects; the one you want is the second, named after the second level of time.',
    ],
  },
  {
    id: 'm13-2-b',
    prompt:
      'Split the leftover variation in two. From the same model, store the standard deviation of the employee random intercepts in sd_employee, the residual standard deviation in sd_residual, and the intraclass correlation - the share of the variance that is between employees - in icc.',
    starterCode:
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\n\nvc <- as.data.frame(VarCorr(m_time))\nvc\n\nsd_employee <- \nsd_residual <- \n# The ICC compares VARIANCES, not standard deviations.\nicc <- ',
    solution:
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nvc <- as.data.frame(VarCorr(m_time))\nsd_employee <- vc$sdcor[vc$grp == "employee_id"]\nsd_residual <- vc$sdcor[vc$grp == "Residual"]\nicc <- sd_employee^2 / (sd_employee^2 + sd_residual^2)',
    wrongAnswers: [
      // Variances handed in where SDs were asked for.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nvc <- as.data.frame(VarCorr(m_time))\nsd_employee <- vc$vcov[vc$grp == "employee_id"]\nsd_residual <- vc$vcov[vc$grp == "Residual"]\nicc <- sd_employee / (sd_employee + sd_residual)',
      // The ICC computed from standard deviations rather than variances.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nvc <- as.data.frame(VarCorr(m_time))\nsd_employee <- vc$sdcor[vc$grp == "employee_id"]\nsd_residual <- vc$sdcor[vc$grp == "Residual"]\nicc <- sd_employee / (sd_employee + sd_residual)',
      // The two components swapped.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nvc <- as.data.frame(VarCorr(m_time))\nsd_employee <- vc$sdcor[vc$grp == "Residual"]\nsd_residual <- vc$sdcor[vc$grp == "employee_id"]\nicc <- sd_employee^2 / (sd_employee^2 + sd_residual^2)',
      // The ICC as the share of variance that is WITHIN employees.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nvc <- as.data.frame(VarCorr(m_time))\nsd_employee <- vc$sdcor[vc$grp == "employee_id"]\nsd_residual <- vc$sdcor[vc$grp == "Residual"]\nicc <- sd_residual^2 / (sd_employee^2 + sd_residual^2)',
    ],
    alternateSolutions: [
      // sigma() for the residual SD, and the variance components pulled by position.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nsd_employee <- attr(VarCorr(m_time)$employee_id, "stddev")[["(Intercept)"]]\nsd_residual <- sigma(m_time)\nicc <- sd_employee^2 / (sd_employee^2 + sd_residual^2)',
      // The variances taken first, then square-rooted.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nvc <- as.data.frame(VarCorr(m_time))\nvar_employee <- vc$vcov[vc$grp == "employee_id"]\nvar_residual <- vc$vcov[vc$grp == "Residual"]\nsd_employee <- sqrt(var_employee)\nsd_residual <- sqrt(var_residual)\nicc <- var_employee / (var_employee + var_residual)',
    ],
    check: `
      if (!has_answer("sd_employee") || !has_answer("sd_residual") || !has_answer("icc")) {
        list(pass = FALSE, message = "I need all three: sd_employee, sd_residual and icc.")
      } else {
        sd_e <- as.vector(answer("sd_employee"))
        sd_r <- as.vector(answer("sd_residual"))
        icc <- as.vector(answer("icc"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        long <- data.frame(
          employee_id = rep(d$employee_id, 2),
          time = factor(rep(c("t1", "t2"), each = nrow(d)), levels = c("t1", "t2")),
          engagement = c(d$engagement_t1, d$engagement_t2)
        )
        reference <- lmerTest::lmer(engagement ~ time + (1 | employee_id), data = long)
        vc <- as.data.frame(lme4::VarCorr(reference))
        exp_sd_e <- as.vector(vc$sdcor[vc$grp == "employee_id"])
        exp_sd_r <- as.vector(vc$sdcor[vc$grp == "Residual"])
        exp_icc <- exp_sd_e^2 / (exp_sd_e^2 + exp_sd_r^2)
        sd_icc <- exp_sd_e / (exp_sd_e + exp_sd_r)
        if (!is.numeric(sd_e) || length(sd_e) != 1L || !is.numeric(sd_r) || length(sd_r) != 1L || !is.numeric(icc) || length(icc) != 1L) {
          list(pass = FALSE, message = "All three should be single numbers.")
        } else if (isTRUE(all.equal(sd_e, exp_sd_e^2, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the variance (", round(exp_sd_e^2, 2), "), not the standard deviation. In as.data.frame(VarCorr(m)) the vcov column holds variances and the sdcor column holds their square roots; report SDs, which are in the units of engagement."))
        } else if (isTRUE(all.equal(sd_e, exp_sd_r, tolerance = 1e-4, check.attributes = FALSE)) && isTRUE(all.equal(sd_r, exp_sd_e, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = "You have the two components the wrong way round. The employee_id row is the between-employee SD; the Residual row is what is left within an employee across the two measurements.")
        } else if (!isTRUE(all.equal(sd_e, exp_sd_e, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("sd_employee is ", round(sd_e, 4), " but the employee_id standard deviation is ", round(exp_sd_e, 4), "."))
        } else if (!isTRUE(all.equal(sd_r, exp_sd_r, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("sd_residual is ", round(sd_r, 4), " but the residual standard deviation is ", round(exp_sd_r, 4), "."))
        } else if (isTRUE(all.equal(icc, sd_icc, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("You divided standard deviations. The ICC is a share of VARIANCE, so square both first: ", round(exp_sd_e, 2), " squared over ", round(exp_sd_e, 2), " squared plus ", round(exp_sd_r, 2), " squared, which is ", round(exp_icc, 3), "."))
        } else if (isTRUE(all.equal(icc, 1 - exp_icc, tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the share of variance WITHIN employees (", round(1 - exp_icc, 3), "). The ICC is the between-employee share, ", round(exp_icc, 3), " - the proportion of the total that the random intercepts account for."))
        } else if (!isTRUE(all.equal(icc, exp_icc, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("icc is ", round(icc, 4), " but should be ", round(exp_icc, 4), "."))
        } else {
          list(pass = TRUE, message = paste0("Between employees SD = ", round(exp_sd_e, 2), ", within-employee residual SD = ", round(exp_sd_r, 2), ", ICC = ", round(exp_icc, 3), ". So about ", round(100 * exp_icc), " % of the variation in engagement is stable differences between people. That is exactly the dependence an ordinary lm would have ignored, and the reason its standard error for time would be wrong."))
        }
      }
    `,
    hints: [
      'as.data.frame(VarCorr(m_time)) gives one row per variance component, with grp, vcov and sdcor columns.',
      'vc$sdcor[vc$grp == "employee_id"] picks the between-employee SD; the residual row is labelled "Residual".',
      'The ICC is between-variance over total variance, so square the SDs before dividing.',
    ],
  },
  {
    id: 'm13-3-a',
    prompt:
      'Show that with two time points the mixed model reproduces the paired-samples t-test. Fit the model and store it in m_time, store its t statistic for time in t_lmer, and store the t from the paired t-test in t_paired. They should agree.',
    starterCode:
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\n\nm_time <- \nt_lmer <- \n# t.test needs paired = TRUE, or it forgets who is who.\nt_paired <- ',
    solution:
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nt_lmer <- summary(m_time)$coefficients["timet2", "t value"]\nt_paired <- t.test(d$engagement_t2, d$engagement_t1, paired = TRUE)$statistic',
    wrongAnswers: [
      // paired left out: the pairing is discarded and the t is much smaller.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nt_lmer <- summary(m_time)$coefficients["timet2", "t value"]\nt_paired <- t.test(d$engagement_t2, d$engagement_t1)$statistic',
      // An lm on the long data instead of a mixed model.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lm(engagement ~ time, data = long_d)\nt_lmer <- summary(m_time)$coefficients["timet2", "t value"]\nt_paired <- t.test(d$engagement_t2, d$engagement_t1, paired = TRUE)$statistic',
      // The intercept row read as the time effect.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nt_lmer <- summary(m_time)$coefficients["(Intercept)", "t value"]\nt_paired <- t.test(d$engagement_t2, d$engagement_t1, paired = TRUE)$statistic',
      // A one-sample test on the time 2 scores, which runs and answers nothing.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nt_lmer <- summary(m_time)$coefficients["timet2", "t value"]\nt_paired <- t.test(d$engagement_t2)$statistic',
    ],
    alternateSolutions: [
      // The paired test written the other way round: the t flips sign, and the
      // check compares sizes, which is what the equivalence is about.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nt_lmer <- summary(m_time)$coefficients["timet2", "t value"]\nt_paired <- t.test(d$engagement_t1, d$engagement_t2, paired = TRUE)$statistic',
      // The paired test as a one-sample test on the differences - the same test.
      'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nd <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)\nlong_d <- d %>%\n  pivot_longer(cols = c(engagement_t1, engagement_t2), names_to = "time", values_to = "engagement") %>%\n  mutate(time = factor(time, levels = c("engagement_t1", "engagement_t2"), labels = c("t1", "t2")))\nm_time <- lmer(engagement ~ time + (1 | employee_id), data = long_d)\nt_lmer <- coef(summary(m_time))[2, "t value"]\nt_paired <- t.test(d$engagement_t2 - d$engagement_t1)$statistic',
    ],
    check: `
      if (!has_answer("m_time") || !has_answer("t_lmer") || !has_answer("t_paired")) {
        list(pass = FALSE, message = "I need all three: m_time, t_lmer and t_paired.")
      } else {
        m_time <- answer("m_time")
        t_lmer <- as.vector(answer("t_lmer"))
        t_paired <- as.vector(answer("t_paired"))
        d <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)
        long <- data.frame(
          employee_id = rep(d$employee_id, 2),
          time = factor(rep(c("t1", "t2"), each = nrow(d)), levels = c("t1", "t2")),
          engagement = c(d$engagement_t1, d$engagement_t2)
        )
        reference <- lmerTest::lmer(engagement ~ time + (1 | employee_id), data = long)
        exp_t <- as.vector(coef(summary(reference))[2, "t value"])
        exp_intercept_t <- as.vector(coef(summary(reference))[1, "t value"])
        exp_paired <- as.vector(t.test(d$engagement_t2, d$engagement_t1, paired = TRUE)$statistic)
        unpaired <- as.vector(t.test(d$engagement_t2, d$engagement_t1)$statistic)
        if (!inherits(m_time, "merMod")) {
          list(pass = FALSE, message = "m_time is not a mixed-effects model. An lm() on the long data pretends the 960 rows come from 960 different people, which inflates the residual variance and shrinks the t. Use lmer with (1 | employee_id).")
        } else if (!is.numeric(t_lmer) || length(t_lmer) != 1L || !is.numeric(t_paired) || length(t_paired) != 1L) {
          list(pass = FALSE, message = "Both t statistics should be single numbers.")
        } else if (isTRUE(all.equal(t_lmer, exp_intercept_t, tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = "t_lmer is the intercept's t, which tests whether engagement at time 1 differs from zero. The row you want is the one named after the second level of time.")
        } else if (!isTRUE(all.equal(abs(t_lmer), abs(exp_t), tolerance = 1e-4, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("t_lmer is ", round(t_lmer, 4), " but the fixed effect of time has t = ", round(exp_t, 4), "."))
        } else if (isTRUE(all.equal(abs(t_paired), abs(unpaired), tolerance = 1e-6, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("That is the independent-samples t (", round(unpaired, 3), "), which treats the two measurements as two unrelated groups and throws away the fact that they come from the same 480 people. With paired = TRUE it becomes ", round(exp_paired, 3), " - far larger, because each employee acts as their own control."))
        # Tolerance 1e-3, not 1e-6: REML fits the variance components by
        # optimisation, so the equivalence with the paired t is exact in
        # algebra and agrees only to several decimals in floating point.
        } else if (!isTRUE(all.equal(abs(t_paired), abs(exp_t), tolerance = 1e-3, check.attributes = FALSE))) {
          list(pass = FALSE, message = paste0("t_paired is ", round(t_paired, 4), ", which does not match the model's ", round(exp_t, 4), ". Check that you compared engagement_t2 with engagement_t1 and passed paired = TRUE."))
        } else {
          list(pass = TRUE, message = paste0("Both are about ", round(abs(exp_t), 3), " in size. With exactly two time points and nobody missing, lmer(engagement ~ time + (1 | employee_id)) and t.test(paired = TRUE) are the same test - the random intercept is doing precisely what taking a difference score does. The model keeps working when there are three time points, or when someone missed one; the paired t-test does not."))
        }
      }
    `,
    hints: [
      'summary(m_time)$coefficients is a matrix with a "t value" column; take the timet2 row.',
      't.test(d$engagement_t2, d$engagement_t1, paired = TRUE) compares each employee with themselves.',
      'Without paired = TRUE you get the independent-samples test, which is a different and much less powerful comparison.',
    ],
  },
];
