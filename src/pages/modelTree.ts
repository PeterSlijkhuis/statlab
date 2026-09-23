import { KNOWN_PACKAGES } from '../r/session';

/**
 * The decision tree behind the model chooser. Everything here is data: the
 * page in ModelChooser.tsx only walks it. Leaves are "answers"; every answer
 * has an id, which is what the page's ?model= link and the tests refer to.
 */
export type Node = Question | Answer;

export type Question = {
  kind: 'question';
  text: string;
  /** A sentence under the question for the student who is not sure which option fits. */
  help?: string;
  options: Option[];
};

export type Option = {
  label: string;
  /** Starts a section of the "every model on this page" index. The deepest group on a path wins. */
  group?: string;
  next: Node;
};

export type Answer = {
  kind: 'answer';
  /** Stable and URL-safe: /which-model?model=<id> opens this answer directly. */
  id: string;
  /** The model's name, as the course teaches it. */
  model: string;
  /** One sentence: the situation this model fits. */
  when: string;
  /** Course-style R, one statement per line. Its library() calls decide where it can run. */
  rCode: string;
  /** What to check before trusting the result; names the alternative where one exists. */
  check: string;
  /** The traditional test this model reproduces, with its R call, when there is one. */
  traditional?: string;
  /** How to read the result. */
  note: string;
  /** The lesson that teaches this model. Set only when a lesson really does. */
  lessonId?: string;
  /** For a model the course does not teach: the lesson it extends, if one does. */
  buildsOn?: string;
  /** For a model the course does not teach: where to learn it. */
  further?: string;
};

/** Packages that come with every R installation and are always there, on this site too. */
export const BASE_PACKAGES = ['base', 'stats', 'utils', 'graphics', 'grDevices', 'methods', 'datasets', 'splines', 'stats4', 'tools', 'grid'];

/**
 * R's recommended packages: installed with R itself, so library() works in
 * RStudio without install.packages(). This site does not have them.
 */
export const SHIPS_WITH_R = ['MASS', 'nnet', 'survival', 'mgcv', 'cluster', 'nlme', 'boot', 'lattice', 'Matrix', 'rpart', 'class', 'KernSmooth', 'foreign', 'spatial', 'codetools'];

/** Every package the snippet attaches or calls with ::, in order of first mention. */
export function packagesIn(rCode: string): string[] {
  const found: string[] = [];
  for (const match of rCode.matchAll(/\blibrary\(\s*([A-Za-z][\w.]*)\s*\)|\b([A-Za-z][\w.]*)::/g)) {
    const name = match[1] ?? match[2];
    if (!found.includes(name)) found.push(name);
  }
  return found;
}

/** The packages a snippet needs that this site cannot install. Empty means it runs in the Playground. */
export function packagesMissingHere(answer: Pick<Answer, 'rCode'>): string[] {
  const here: readonly string[] = [...BASE_PACKAGES, ...KNOWN_PACKAGES];
  return packagesIn(answer.rCode).filter((name) => !here.includes(name));
}

export const TREE: Question = {
  kind: 'question',
  text: 'What do you want to find out?',
  help: 'Start from your research question, not from the data you happen to have. Most questions are the first kind.',
  options: [
    {
      label: 'Whether something predicts, or differs in, one outcome',
      next: {
        kind: 'question',
        text: 'What kind of outcome are you analysing?',
        help: 'The outcome is the variable you want to explain. A total or mean of several questionnaire items counts as a number; a single 5-point item counts as ordered categories.',
        options: [
          {
            label: 'A number on a scale (a score, time, rating or amount)',
            group: 'A numeric outcome',
            next: {
              kind: 'question',
              text: 'How were the scores collected?',
              help: 'This decides whether the observations are independent, which matters more than anything else about the choice.',
              options: [
                {
                  label: 'One score per case, from different people',
                  next: {
                    kind: 'question',
                    text: 'What are you using to predict the outcome?',
                    options: [
                      {
                        label: 'Nothing: compare the mean with a fixed value',
                        next: {
                          kind: 'answer',
                          id: 'mean-vs-value',
                          model: 'Intercept-only linear model',
                          when: 'One set of scores, and the question is whether their mean differs from a fixed value such as a scale midpoint or a published norm.',
                          rCode: `library(dplyr)
library(broom)
model <- lm(I(outcome - 70) ~ 1, data = d)
model %>% tidy(conf.int = TRUE)`,
                          check:
                            'Independent scores and no extreme outliers; roughly normal scores, which matters mainly in small samples. For a small, clearly skewed sample, the one-sample Wilcoxon signed-rank test: wilcox.test(d$outcome, mu = 70).',
                          traditional: 'The one-sample t-test: t.test(d$outcome, mu = 70). Same t, same p.',
                          note: 'Replace 70 with your comparison value. ~ 1 means a model with no predictors, so the intercept is how far the mean lies from that value, with its confidence interval.',
                          lessonId: '08-3',
                        },
                      },
                      {
                        label: 'One or more numeric predictors',
                        next: {
                          kind: 'question',
                          text: 'Which describes your predictors?',
                          options: [
                            {
                              label: 'One numeric predictor',
                              next: {
                                kind: 'answer',
                                id: 'simple-regression',
                                model: 'Simple linear regression',
                                when: 'One numeric outcome and one numeric predictor, and the relationship looks roughly like a straight line.',
                                rCode: `library(dplyr)
library(broom)
model <- lm(outcome ~ predictor, data = d)
model %>% tidy()
model %>% glance()`,
                                check:
                                  "A scatterplot with geom_smooth(method = lm) shows a roughly straight-line pattern; no extreme outliers; residuals with similar spread along the whole line; residuals roughly normal, which matters mainly in small samples. For a curved-but-consistent pattern, ranks or outliers, Spearman's correlation: cor.test(d$outcome, d$predictor, method = \"spearman\").",
                                traditional: "Pearson correlation: cor.test(d$outcome, d$predictor). Its t and p match the slope's.",
                                note: 'The slope b is the change in the outcome for each one-unit increase in the predictor.',
                                lessonId: '09-2',
                              },
                            },
                            {
                              label: 'Several predictors',
                              next: {
                                kind: 'answer',
                                id: 'multiple-regression',
                                model: 'Multiple linear regression',
                                when: 'One numeric outcome and several predictors, and you want the effect of each one with the others held constant.',
                                rCode: `library(dplyr)
library(broom)
model <- lm(outcome ~ predictor1 + predictor2, data = d)
model %>% tidy()
model %>% glance()`,
                                check:
                                  'Roughly linear relationships; no extreme outliers; residuals with similar spread across the fitted values; residuals roughly normal (mainly a concern in small samples); predictors not almost perfectly correlated with each other.',
                                note: 'Each b is the change in the outcome for a one-unit increase in that predictor, holding the other predictors constant. Report R², F and each b with its SE, t and p. Predictors can be numbers or groups: a factor enters the formula the same way.',
                                lessonId: '10-1',
                              },
                            },
                            {
                              label: 'The relationship is curved',
                              next: {
                                kind: 'answer',
                                id: 'curved-relationship',
                                model: 'Polynomial regression',
                                when: 'A scatterplot shows a bend, for example a benefit that levels off or a middle value that works best.',
                                rCode: `library(dplyr)
library(broom)
straight <- lm(outcome ~ predictor, data = d)
curved <- lm(outcome ~ poly(predictor, 2), data = d)
anova(straight, curved)
curved %>% glance()`,
                                check:
                                  'Plot first: geom_smooth() without method = lm shows the shape. A squared term fits one bend. For a more complex shape, or to let the data find it, a generalised additive model: mgcv::gam(outcome ~ s(predictor), data = d) in RStudio.',
                                note: 'anova() tests whether the bend improves the fit beyond a straight line. poly() keeps the linear and squared terms uncorrelated, which makes the fit stable but the coefficients hard to read, so describe the curve from a plot of the predictions.',
                                buildsOn: '10-3',
                                further:
                                  "For smooth curves of any shape, Simon Wood's book Generalized Additive Models: An Introduction with R, and the mgcv package that comes with R.",
                              },
                            },
                            {
                              label: "A predictor's effect depends on another number (a moderator)",
                              next: {
                                kind: 'answer',
                                id: 'continuous-moderation',
                                model: 'Linear model with a continuous interaction (moderation)',
                                when: 'You expect the effect of one numeric predictor to be stronger or weaker depending on the value of another, for example workload hurting more when support is low.',
                                rCode: `library(dplyr)
library(broom)
library(emmeans)
d <- d %>% mutate(predictor_c = predictor - mean(predictor), moderator_c = moderator - mean(moderator))
model <- lm(outcome ~ predictor_c * moderator_c, data = d)
model %>% tidy(conf.int = TRUE)
s <- sd(d$moderator_c)
emtrends(model, ~ moderator_c, var = "predictor_c", at = list(moderator_c = c(-s, 0, s)))`,
                                check:
                                  'The same as for multiple regression. Interactions need much larger samples to detect than main effects, so a non-significant interaction is weak evidence that there is none.',
                                traditional: 'Moderation analysis, as in PROCESS model 1.',
                                note: 'The predictor_c:moderator_c coefficient is the moderation: how much the slope of the predictor changes for each one-unit increase in the moderator. Centring makes each main effect the slope at the other variable\'s mean. emtrends() gives the simple slopes: the predictor\'s slope at one SD below the moderator\'s mean, at the mean, and one SD above.',
                                buildsOn: '12-1',
                                further:
                                  'Andrew Hayes, Introduction to Mediation, Moderation, and Conditional Process Analysis, which also covers the Johnson-Neyman technique for finding where the slope stops being significant.',
                              },
                            },
                          ],
                        },
                      },
                      {
                        label: 'One or more grouping variables (conditions, groups, categories)',
                        next: {
                          kind: 'question',
                          text: 'Which describes your groups?',
                          options: [
                            {
                              label: 'One grouping variable with two groups',
                              next: {
                                kind: 'answer',
                                id: 'two-groups',
                                model: 'Linear model with a two-group predictor',
                                when: 'Two independent groups, such as a treatment and a control group, compared on one numeric outcome.',
                                rCode: `library(dplyr)
library(broom)
model <- lm(outcome ~ group, data = d)
model %>% tidy()
d %>% group_by(group) %>% summarise(mean = mean(outcome), sd = sd(outcome))`,
                                check:
                                  'Similar spread in each group, which matters especially when group sizes differ. Residuals roughly normal, which matters mainly in small samples; with large groups the Central Limit Theorem covers moderate skew. For a small, clearly skewed sample or extreme outliers, the Mann-Whitney test: wilcox.test(outcome ~ group, data = d).',
                                traditional:
                                  'The independent-samples t-test: t.test(outcome ~ group, data = d, var.equal = TRUE). Same t with the sign reversed, because t.test subtracts the groups the other way round, and the same p. When the spreads differ, leave out var.equal = TRUE to get Welch\'s test.',
                                note: 'The slope is the difference between the two group means. Always look at the means: the sign of b depends on which group R took as the reference.',
                                lessonId: '11-1',
                              },
                            },
                            {
                              label: 'One grouping variable with three or more groups',
                              next: {
                                kind: 'answer',
                                id: 'several-groups',
                                model: 'Linear model with a categorical predictor',
                                when: 'Three or more independent groups compared on one numeric outcome.',
                                rCode: `library(dplyr)
library(broom)
library(emmeans)
model <- lm(outcome ~ group, data = d)
model %>% glance()
model %>% tidy()
emmeans(model, pairwise ~ group, adjust = "tukey")`,
                                check:
                                  'Similar spread in each group, which matters especially when group sizes differ. Residuals roughly normal, which matters mainly in small samples; with large groups the Central Limit Theorem covers moderate skew. For a small, clearly skewed sample or extreme outliers, the Kruskal-Wallis test: kruskal.test(outcome ~ group, data = d).',
                                traditional: 'One-way ANOVA: summary(aov(outcome ~ group, data = d)). Same F, same p.',
                                note: 'Each b compares one group with the reference group. glance() gives the overall F; emmeans gives every pairwise comparison, corrected for multiple testing.',
                                lessonId: '11-2',
                              },
                            },
                            {
                              label: 'Groups, adjusting for a numeric covariate',
                              next: {
                                kind: 'answer',
                                id: 'groups-with-covariate',
                                model: 'Linear model with a group and a covariate',
                                when: 'Groups compared on an outcome while holding a numeric variable constant, such as a pre-test score or age.',
                                rCode: `library(dplyr)
library(broom)
library(emmeans)
model <- lm(outcome ~ covariate + group, data = d)
model %>% tidy(conf.int = TRUE)
emmeans(model, pairwise ~ group)`,
                                check:
                                  'The covariate relates to the outcome in a roughly straight line with a similar slope in every group: fit lm(outcome ~ covariate * group, data = d) and check that the interaction is small. The covariate is measured before the groups could have changed it.',
                                traditional: 'ANCOVA: anova(model) gives the F test for the groups, adjusted for the covariate entered before them.',
                                note: 'The group coefficients are differences between groups at the same value of the covariate. emmeans gives each group\'s adjusted mean, its predicted mean at the average covariate, and the pairwise differences between them.',
                                lessonId: '10-2',
                              },
                            },
                            {
                              label: 'Two grouping variables that may interact',
                              next: {
                                kind: 'answer',
                                id: 'factorial',
                                model: 'Linear model with an interaction (factorial design)',
                                when: 'Two grouping variables crossed with each other, such as training (yes or no) by mentoring (yes or no), and the question includes whether their effects combine.',
                                rCode: `library(car)
library(emmeans)
model <- lm(outcome ~ factor1 * factor2, data = d,
            contrasts = list(factor1 = contr.sum, factor2 = contr.sum))
Anova(model, type = "III")
emmeans(model, pairwise ~ factor1:factor2, adjust = "tukey")`,
                                check:
                                  'Similar spread in each cell, which matters especially when group sizes differ. Residuals roughly normal, which matters mainly in small samples. Plot the cell means before interpreting main effects.',
                                traditional: 'Two-way (factorial) ANOVA. Anova(model, type = "III") gives its F tests for each main effect and the interaction.',
                                // Type III main-effect tests are only meaningful with sum-to-zero contrasts. Under R's
                                // default treatment contrasts they test each factor at the other's reference level.
                                note: 'The contrasts = list(...) line matters: type III tests of the main effects are only correct with sum-to-zero contrasts, and R does not use those by default. An interaction means the effect of one factor depends on the level of the other: in an interaction plot, the lines are not parallel.',
                                lessonId: '12-2',
                              },
                            },
                            {
                              label: 'Groups compared on several outcomes at once',
                              next: {
                                kind: 'answer',
                                id: 'several-outcomes',
                                model: 'Multivariate linear model (MANOVA)',
                                when: 'Several related numeric outcomes, such as three subscales of one questionnaire, and the question is whether the groups differ on them taken together.',
                                rCode: `model <- manova(cbind(outcome1, outcome2, outcome3) ~ group, data = d)
summary(model, test = "Pillai")
summary.aov(model)`,
                                check:
                                  "The outcomes correlate moderately with each other; if they do not, analyse them one at a time. No extreme outliers, and more cases in every group than there are outcomes. Pillai's trace is the most robust of the four test statistics.",
                                traditional: 'One-way MANOVA.',
                                note: 'The overall test asks whether the groups differ on the combination of outcomes. summary.aov() then gives one ANOVA per outcome; correct those for multiple testing, for example with p.adjust(p, method = "holm").',
                                buildsOn: '11-2',
                                further: 'Field, Miles and Field, Discovering Statistics Using R, has a chapter on MANOVA and the discriminant analysis that often follows it.',
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  label: 'The same people measured more than once',
                  next: {
                    kind: 'question',
                    text: 'What does the design look like?',
                    help: 'All of these need the data in long format: one row per person per measurement, which pivot_longer() makes.',
                    options: [
                      {
                        label: 'Twice, such as before and after',
                        next: {
                          kind: 'answer',
                          id: 'before-after',
                          model: 'Linear mixed-effects model for two time points',
                          when: 'Each person measured twice, and the question is whether their scores changed.',
                          rCode: `library(dplyr)
library(tidyr)
library(lmerTest)
long_d <- d %>% pivot_longer(cols = c(before, after), names_to = "time", values_to = "score") %>%
  mutate(time = factor(time, levels = c("before", "after")))
model <- lmer(score ~ time + (1 | id), data = long_d)
summary(model)`,
                          check:
                            'Data in long format: one row per person per measurement. Residuals roughly normal, which matters mainly in small samples. With skewed differences in a small sample, the Wilcoxon signed-rank test: wilcox.test(d$after, d$before, paired = TRUE).',
                          traditional: 'The paired-samples t-test: t.test(d$after, d$before, paired = TRUE). Same t, same p, when nobody is missing a measurement.',
                          note: '(1 | id) gives every person their own starting level, so the model knows which scores belong together. Setting the factor levels makes "before" the reference, so the time coefficient is the change from before to after. Unlike the paired t-test, it keeps people who missed a measurement.',
                          lessonId: '13-3',
                        },
                      },
                      {
                        label: 'Three or more times or conditions',
                        next: {
                          kind: 'answer',
                          id: 'repeated-measures',
                          model: 'Linear mixed-effects model',
                          when: 'Each person measured under three or more conditions or at three or more time points.',
                          rCode: `library(dplyr)
library(tidyr)
library(lmerTest)
library(emmeans)
long_d <- d %>% pivot_longer(cols = c(time1, time2, time3), names_to = "time", values_to = "score") %>%
  mutate(time = factor(time))
model <- lmer(score ~ time + (1 | id), data = long_d)
anova(model)
emmeans(model, pairwise ~ time, adjust = "holm")`,
                          check:
                            'Data in long format: one row per person per measurement. Residuals roughly normal, which matters mainly in small samples. For a small, clearly skewed sample with no missing measurements, the Friedman test: friedman.test(score ~ time | id, data = long_d).',
                          traditional: 'Repeated-measures ANOVA. With complete data the F matches its uncorrected F: both assume the time points are equally correlated.',
                          note: 'anova() tests whether the scores differ across time at all; emmeans then compares each pair of time points. (1 | id) lets each person have their own level. Unlike repeated-measures ANOVA, the model keeps people who missed a measurement.',
                          lessonId: '13-2',
                        },
                      },
                      {
                        label: 'Repeatedly, and people are also in different groups',
                        next: {
                          kind: 'answer',
                          id: 'time-by-group',
                          model: 'Linear mixed-effects model with a time-by-group interaction',
                          when: 'A mixed design: everyone measured more than once, and people belong to different groups, such as a treatment and a control group measured before and after.',
                          rCode: `library(lmerTest)
library(emmeans)
model <- lmer(score ~ time * group + (1 | id), data = long_d)
anova(model)
emmeans(model, pairwise ~ group | time)`,
                          check:
                            'Data in long format, with time and group as factors. Residuals with similar spread in each group, and roughly normal in small samples.',
                          traditional: 'Mixed (split-plot) ANOVA.',
                          note: 'The time:group interaction is usually the question: did the groups change differently? In a randomised trial it is the treatment effect. emmeans compares the groups at each time point.',
                          buildsOn: '13-2',
                          further: 'Singer and Willett, Applied Longitudinal Data Analysis, and the lme4 and lmerTest package documentation.',
                        },
                      },
                      {
                        label: 'Many time points, and people change at different rates',
                        next: {
                          kind: 'answer',
                          id: 'growth-curve',
                          model: 'Linear mixed-effects model with random slopes (growth curve)',
                          when: 'Several measurements per person over time, and the question is about the rate of change and how much people differ in it.',
                          rCode: `library(lmerTest)
model <- lmer(score ~ time + (time | id), data = long_d)
summary(model)`,
                          check:
                            'Time coded as a number that starts at 0, so the intercept is the starting level; at least three time points per person. If R reports a singular fit, the data cannot support a separate slope for each person: go back to (1 | id).',
                          note: '(time | id) gives every person their own starting level and their own rate of change. The fixed effect of time is the average rate of change; the random-effect variance for time shows how much people differ in it.',
                          buildsOn: '13-2',
                          further: 'Singer and Willett, Applied Longitudinal Data Analysis, the standard text on growth models.',
                        },
                      },
                      {
                        label: 'Each person responds to many items or stimuli',
                        next: {
                          kind: 'answer',
                          id: 'crossed-random-effects',
                          model: 'Linear mixed-effects model with crossed random effects',
                          when: 'Every participant responds to many items (words, images, vignettes), every item is seen by many participants, and you want conclusions that hold for new people and new items.',
                          rCode: `library(lmerTest)
model <- lmer(outcome ~ condition + (1 | participant) + (1 | item), data = long_d)
summary(model)`,
                          check:
                            'One row per participant per item. Enough participants and enough items, since both are samples. Add random slopes, such as (condition | participant), when the design supports them.',
                          traditional: 'Separate by-participant and by-item ANOVAs (F1 and F2), which this model replaces.',
                          note: 'Both participants and items vary, so both get their own random intercept, and the condition effect then generalises across both. Averaging over items first, as F1 analyses did, treats the items as if they were the only ones possible.',
                          buildsOn: '13-3',
                          further: 'Baayen, Davidson and Bates (2008), Mixed-effects modeling with crossed random effects for subjects and items, Journal of Memory and Language.',
                        },
                      },
                    ],
                  },
                },
                {
                  label: 'People grouped in teams, classes or sites',
                  next: {
                    kind: 'answer',
                    id: 'nested-groups',
                    model: 'Linear mixed-effects model with a grouping factor',
                    when: 'People belong to clusters, such as pupils in classes or employees in sites, so people in the same cluster are more alike than people in different ones.',
                    rCode: `library(lmerTest)
model <- lmer(outcome ~ predictor + (1 | site), data = d)
summary(model)`,
                    check: 'Enough groups to estimate how they vary: a handful at the very least, and ideally twenty or more. Residuals roughly normal, which matters mainly in small samples.',
                    note: 'People in the same site are more alike than people in different sites; (1 | site) accounts for that. If people are also measured repeatedly, nest them: (1 | site/id). If a predictor\'s effect may differ between sites, add a random slope: (predictor | site).',
                    lessonId: '13-3',
                  },
                },
              ],
            },
          },
          {
            label: 'Yes or no (two possible outcomes)',
            group: 'A yes-or-no outcome',
            next: {
              kind: 'question',
              text: 'How were the outcomes collected?',
              options: [
                {
                  label: 'One per case, from different people',
                  next: {
                    kind: 'question',
                    text: 'What are you using to predict the outcome?',
                    options: [
                      {
                        label: 'Numbers, groups or both',
                        next: {
                          kind: 'answer',
                          id: 'logistic-regression',
                          model: 'Logistic regression',
                          when: 'A yes-or-no outcome, such as passed or failed, and one or more predictors of any kind.',
                          rCode: `model <- glm(outcome ~ predictor, data = d, family = binomial)
summary(model)
exp(cbind(OR = coef(model), confint(model)))`,
                          check:
                            'Independent observations, and enough cases of the rarer outcome: a common rule of thumb is at least 10 per estimated coefficient (a factor with k levels uses k − 1). If R warns that fitted probabilities of 0 or 1 occurred, a predictor separates the outcomes perfectly; Firth\'s method, logistf::logistf(), handles that in RStudio.',
                          traditional:
                            'With one categorical predictor, the chi-square test of independence: chisq.test(table(d$outcome, d$predictor), correct = FALSE), which matches anova(model, test = "Rao").',
                          note: 'The coefficients are in log odds. exp() turns them into odds ratios: above 1, the outcome becomes more likely; below 1, less likely.',
                          lessonId: '14-2',
                        },
                      },
                      {
                        label: 'One other categorical variable, as a cross-table',
                        next: crossTable(),
                      },
                      {
                        label: 'Nothing: compare one proportion with a fixed value',
                        next: {
                          kind: 'answer',
                          id: 'proportion-vs-value',
                          model: 'Exact binomial test',
                          when: 'One yes-or-no variable, and the question is whether the proportion of yes differs from a fixed value, such as 50% or a known pass rate.',
                          rCode: `successes <- sum(d$outcome == "yes")
binom.test(successes, nrow(d), p = 0.5)`,
                          check: 'Independent cases, each counted once, and no missing values in the outcome (nrow() would count them).',
                          traditional: 'The same question as an intercept-only logistic regression: glm(outcome ~ 1, family = binomial).',
                          note: 'Replace "yes" with the level you count and 0.5 with the proportion you compare against. The output gives the observed proportion with its exact 95% confidence interval.',
                          buildsOn: '14-2',
                          further: 'Alan Agresti, An Introduction to Categorical Data Analysis.',
                        },
                      },
                    ],
                  },
                },
                {
                  label: 'The same people measured more than once, or grouped in sites',
                  next: {
                    kind: 'answer',
                    id: 'repeated-binary',
                    model: 'Mixed-effects logistic regression',
                    when: 'A yes-or-no outcome measured repeatedly for each person, or for people in clusters such as classes or sites.',
                    rCode: `library(lme4)
model <- glmer(outcome ~ time + (1 | id), data = long_d, family = binomial)
summary(model)
exp(fixef(model))`,
                    check:
                      'Long format, one row per person per measurement. With few people or a rare outcome the model may fail to converge; simplify the random part first. With exactly two time points and nothing else in the model, McNemar\'s test is the simple alternative.',
                    traditional: "For two time points, McNemar's test: mcnemar.test(table(d$before, d$after)).",
                    note: 'exp() turns the coefficients into odds ratios for the same person, holding their random intercept fixed. These are usually further from 1 than the population-average odds ratios an ordinary logistic regression gives.',
                    buildsOn: '13-2',
                    further: 'Gelman and Hill, Data Analysis Using Regression and Multilevel/Hierarchical Models.',
                  },
                },
                {
                  label: 'Several yes-or-no trials per row (such as 7 correct out of 10)',
                  next: {
                    kind: 'answer',
                    id: 'successes-of-trials',
                    model: 'Binomial regression for successes out of trials',
                    when: 'Each row records how many of a number of trials succeeded, such as items correct on a test or seeds that germinated in a tray.',
                    rCode: `model <- glm(cbind(correct, trials - correct) ~ predictor, data = d, family = binomial)
summary(model)
exp(cbind(OR = coef(model), confint(model)))`,
                    check:
                      'Trials independent within a row. If the residual deviance is much larger than its degrees of freedom, the proportions vary more than a binomial allows: refit with family = quasibinomial.',
                    note: 'cbind() gives the successes and failures, so a row with 7 of 10 correct weighs ten trials. The coefficients are log odds of a success, read exactly as in logistic regression.',
                    buildsOn: '14-2',
                    further: 'Dunn and Smyth, Generalized Linear Models With Examples in R.',
                  },
                },
              ],
            },
          },
          {
            label: 'Ordered categories (a single Likert item, a grade, a stage)',
            group: 'A categorical outcome',
            next: {
              kind: 'answer',
              id: 'ordinal-regression',
              model: 'Ordinal logistic regression (proportional odds)',
              when: 'An outcome with a few ordered categories where the distances between them are not equal or not known, such as never, sometimes, often.',
              rCode: `library(MASS)
d$outcome <- factor(d$outcome, levels = c("low", "medium", "high"), ordered = TRUE)
model <- polr(outcome ~ predictor, data = d, Hess = TRUE)
summary(model)
exp(cbind(OR = coef(model), confint(model)))`,
              check:
                'Proportional odds: each predictor shifts the odds of being above any cut-off by the same amount. The ordinal package tests it: ordinal::clm(outcome ~ predictor, nominal = ~ predictor, data = d). A total of many Likert items is usually analysed as a number instead. MASS hides dplyr\'s select(), so attach MASS before dplyr, or write dplyr::select().',
              note: 'An odds ratio above 1 means higher values of the predictor go with higher categories of the outcome. The intercepts (the zeta values in the output) are the cut-offs between adjacent categories.',
              buildsOn: '14-2',
              further: 'Alan Agresti, Analysis of Ordinal Categorical Data, and the ordinal package\'s vignettes.',
            },
          },
          {
            label: 'Three or more categories with no order (a choice, a type)',
            group: 'A categorical outcome',
            next: {
              kind: 'question',
              text: 'What is the question about the categories?',
              options: [
                {
                  label: 'Which category, predicted from other variables',
                  next: {
                    kind: 'answer',
                    id: 'multinomial-regression',
                    model: 'Multinomial logistic regression',
                    when: 'An outcome with three or more unordered categories, such as how people travel to work, and predictors of any kind.',
                    rCode: `library(nnet)
library(broom)
d$outcome <- relevel(factor(d$outcome), ref = "bike")
model <- multinom(outcome ~ predictor, data = d)
tidy(model, conf.int = TRUE, exponentiate = TRUE)`,
                    check:
                      'Enough cases in every category, including the rarest. The odds between two categories do not depend on which other categories are on offer (independence of irrelevant alternatives).',
                    note: 'Replace "bike" with the category every other one is compared with. The model fits one comparison per category against that reference; an odds ratio above 1 means the predictor makes that category more likely relative to the reference.',
                    buildsOn: '14-2',
                    further: 'Alan Agresti, An Introduction to Categorical Data Analysis.',
                  },
                },
                {
                  label: 'Whether it is related to one other categorical variable',
                  next: crossTable(),
                },
                {
                  label: 'Whether the shares match expected shares',
                  next: {
                    kind: 'answer',
                    id: 'goodness-of-fit',
                    model: 'Chi-square goodness-of-fit test',
                    when: 'One categorical variable, and the question is whether its categories occur in the proportions you expected, such as equal shares or last year\'s figures.',
                    rCode: `counts <- table(d$outcome)
counts
chisq.test(counts, p = c(0.5, 0.3, 0.2))`,
                    check: 'Each case counted once. Expected counts of at least 5 in every category; chisq.test() warns when they are lower.',
                    note: 'p lists the expected share of each category, in the order table() prints them, and must add up to 1. Leave p out to test for equal shares.',
                    further: 'Alan Agresti, An Introduction to Categorical Data Analysis.',
                  },
                },
              ],
            },
          },
          {
            label: 'A count of events (0, 1, 2, and so on)',
            group: 'A count outcome',
            next: {
              kind: 'question',
              text: 'What do the counts look like?',
              help: 'Start with the first option. Its check tells you whether you need the second.',
              options: [
                {
                  label: 'Counts of events per case (start here)',
                  next: {
                    kind: 'answer',
                    id: 'poisson-regression',
                    model: 'Poisson regression',
                    when: 'The outcome counts how often something happened, such as sick days, errors or visits, and cannot be negative.',
                    rCode: `library(dplyr)
library(broom)
model <- glm(count ~ predictor, data = d, family = poisson)
model %>% tidy(conf.int = TRUE, exponentiate = TRUE)
sum(residuals(model, type = "pearson")^2) / df.residual(model)`,
                    check:
                      'Whole-number counts, independent between cases. The last line estimates the dispersion: near 1 is fine; clearly above 1 (say, 1.5 or more) means overdispersion, and the negative binomial model is the better choice. If cases were observed for different lengths of time, add + offset(log(exposure)) to the formula.',
                    note: 'exponentiate = TRUE turns the coefficients into rate ratios: 1.20 means 20% more events for each one-unit increase in the predictor. For counts measured repeatedly or in groups, lme4\'s glmer(..., family = poisson) adds a random intercept.',
                    buildsOn: '14-2',
                    further: 'Dunn and Smyth, Generalized Linear Models With Examples in R.',
                  },
                },
                {
                  label: 'The counts vary far more than their mean (overdispersion)',
                  next: {
                    kind: 'answer',
                    id: 'negative-binomial',
                    model: 'Negative binomial regression',
                    when: 'Count data where the Poisson dispersion check came out well above 1, which is common: a few cases with very many events.',
                    rCode: `library(MASS)
model <- glm.nb(count ~ predictor, data = d)
summary(model)
exp(cbind(RR = coef(model), confint(model)))`,
                    check: 'Whole-number counts, independent between cases. Compare with the Poisson model: AIC(poisson_model, model), lower is better.',
                    note: 'Read the exponentiated coefficients as rate ratios, exactly as in Poisson regression. theta in the output measures the extra spread: the smaller it is, the more overdispersed the counts.',
                    buildsOn: '14-2',
                    further: 'Dunn and Smyth, Generalized Linear Models With Examples in R.',
                  },
                },
                {
                  label: 'Far more zeros than the other counts suggest',
                  next: {
                    kind: 'answer',
                    id: 'zero-inflated',
                    model: 'Zero-inflated negative binomial regression',
                    when: 'Many zeros come from cases that could never have an event, such as non-smokers asked how many cigarettes they smoked.',
                    rCode: `library(pscl)
model <- zeroinfl(count ~ predictor | predictor, data = d, dist = "negbin")
summary(model)`,
                    check:
                      'A real reason for the extra zeros. Compare with a plain negative binomial model by AIC(): it often copes with many zeros on its own. If every zero comes from the same process, a hurdle model, pscl::hurdle(), fits better.',
                    note: 'The formula has two parts. Before the | is the count model for cases that could have events; after it is the model for the chance of being a structural zero. Both parts take their own predictors.',
                    buildsOn: '14-2',
                    further: 'Zuur, Savel\'ev and Ieno, A Beginner\'s Guide to Zero-Inflated Models with R.',
                  },
                },
              ],
            },
          },
          {
            label: 'Time until something happens, where some cases have not had it yet',
            group: 'A time-to-event outcome',
            next: {
              kind: 'question',
              text: 'What is the question?',
              help: 'Cases that leave the study, or reach its end, before the event are censored: you know only that the event had not happened by then. These models use that information; a t-test on the times would not.',
              options: [
                {
                  label: 'Do groups differ in how long it takes?',
                  next: {
                    kind: 'answer',
                    id: 'survival-curves',
                    model: 'Kaplan-Meier estimate and log-rank test',
                    when: 'Time to an event, such as leaving a job or relapse, compared between groups, with some cases censored.',
                    rCode: `library(survival)
fit <- survfit(Surv(time, event) ~ group, data = d)
summary(fit)$table
survdiff(Surv(time, event) ~ group, data = d)`,
                    check:
                      'Censoring unrelated to the outcome: cases that leave early are not more or less at risk than those who stay. The log-rank test has most power when the curves do not cross.',
                    traditional: 'Kaplan-Meier curves with the log-rank test.',
                    note: 'Surv(time, event) pairs each follow-up time with whether the event happened (1) or the case was censored (0). summary(fit)$table gives each group\'s median time to the event; survdiff() is the log-rank test; plot(fit) draws the curves.',
                    further: 'Kleinbaum and Klein, Survival Analysis: A Self-Learning Text, and the survival package\'s vignettes.',
                  },
                },
                {
                  label: 'Which predictors change how soon it happens?',
                  next: {
                    kind: 'answer',
                    id: 'cox-regression',
                    model: 'Cox proportional hazards regression',
                    when: 'Time to an event, with censoring, and several predictors of any kind.',
                    rCode: `library(survival)
library(broom)
model <- coxph(Surv(time, event) ~ predictor + group, data = d)
tidy(model, conf.int = TRUE, exponentiate = TRUE)
cox.zph(model)`,
                    check:
                      'Proportional hazards: each predictor multiplies the risk by the same factor at every point in time. cox.zph() tests this for each predictor; a small p flags a problem. Roughly 10 events or more per predictor.',
                    note: 'The exponentiated coefficients are hazard ratios: 1.5 means a 50% higher risk of the event at any moment for each one-unit increase in the predictor.',
                    further: 'Kleinbaum and Klein, Survival Analysis: A Self-Learning Text, and the survival package\'s vignettes.',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      label: 'Whether an effect runs through a third variable, or how items measure a construct',
      group: 'Mediation, reliability and latent variables',
      next: {
        kind: 'question',
        text: 'Which describes your question?',
        options: [
          {
            label: 'Does X affect Y through a mediator M?',
            next: {
              kind: 'answer',
              id: 'mediation',
              model: 'Mediation model',
              when: 'You expect a predictor to affect an outcome partly or wholly through a third variable, such as training raising confidence, which raises performance.',
              rCode: `library(lavaan)
model <- "
  mediator ~ a * predictor
  outcome ~ b * mediator + c * predictor
  indirect := a * b
  total := c + a * b
"
set.seed(1)
fit <- sem(model, data = d, se = "bootstrap", bootstrap = 1000)
parameterEstimates(fit, boot.ci.type = "perc")`,
              check:
                'Mediation is a causal claim: the predictor comes before the mediator, and the mediator before the outcome, ideally measured at different times. With data from one moment, say the pattern is consistent with mediation rather than that it shows it.',
              traditional: 'Mediation analysis, as in PROCESS model 4. The older Baron and Kenny steps and the Sobel test are no longer recommended.',
              note: 'The indirect effect a × b is the part of the effect that runs through the mediator; it is supported when its bootstrap confidence interval excludes 0. c is the direct effect that remains, and total is their sum.',
              further: 'Andrew Hayes, Introduction to Mediation, Moderation, and Conditional Process Analysis, and the lavaan tutorial at lavaan.ugent.be.',
            },
          },
          {
            label: 'Do my questionnaire items hang together (reliability)?',
            next: {
              kind: 'answer',
              id: 'scale-reliability',
              model: "Scale reliability (Cronbach's alpha)",
              when: 'Several items meant to measure one thing, and you need to know whether their total or mean is reliable enough to use.',
              rCode: `library(dplyr)
library(psych)
items <- d %>% select(item1:item5)
psych::alpha(items)`,
              check:
                'Reverse-worded items recoded first (on a 1 to 5 scale, 6 minus the score). Alpha rises with the number of items, so a long scale can reach .80 without measuring one thing; a confirmatory factor analysis checks that.',
              note: "raw_alpha is Cronbach's alpha: .70 is a common minimum for research, .80 is better. The table of reliability if an item is dropped points to items that weaken the scale. psych::omega() gives McDonald's omega, which many journals now prefer.",
              further: 'The psych package\'s documentation, and its author William Revelle\'s free online book on psychometric theory.',
            },
          },
          {
            label: 'Do my items measure the factors I expect?',
            next: {
              kind: 'answer',
              id: 'confirmatory-factors',
              model: 'Confirmatory factor analysis (CFA)',
              when: 'A questionnaire with a known structure, such as six items meant to measure two traits, and you want to test that the data fit it.',
              rCode: `library(lavaan)
model <- "
  factor1 =~ item1 + item2 + item3
  factor2 =~ item4 + item5 + item6
"
fit <- cfa(model, data = d)
summary(fit, fit.measures = TRUE, standardized = TRUE)`,
              check:
                'At least three items per factor, and a sample of 200 or more is a common guide. Items are treated as continuous; for items with few response options, add ordered = TRUE to cfa() to treat them as ordinal.',
              note: 'Common rules of thumb for good fit are CFI and TLI of .95 or more, RMSEA of .06 or less and SRMR of .08 or less (Hu and Bentler, 1999). Standardised loadings (the Std.all column) above about .5 show that an item reflects its factor.',
              further: 'Timothy Brown, Confirmatory Factor Analysis for Applied Research, and the lavaan tutorial at lavaan.ugent.be.',
            },
          },
          {
            label: 'Test a theory of paths between several constructs',
            next: {
              kind: 'answer',
              id: 'structural-equation-model',
              model: 'Structural equation model (SEM)',
              when: 'A theory with several constructs, each measured by items, and paths between them, tested as one model.',
              rCode: `library(lavaan)
model <- "
  predictor_f =~ x1 + x2 + x3
  outcome_f =~ y1 + y2 + y3
  outcome_f ~ predictor_f + covariate
"
fit <- sem(model, data = d)
summary(fit, fit.measures = TRUE, standardized = TRUE)`,
              check:
                'A model specified before looking at the data: SEM tests the paths you draw and nothing else. Check that the measurement part fits as a CFA before trusting the paths. Samples of a few hundred are typical.',
              note: '=~ defines a latent variable measured by items; ~ is a regression. Paths between latent variables are free of the measurement error that weakens correlations between scale totals. Judge the fit as for a CFA.',
              further: 'Rex Kline, Principles and Practice of Structural Equation Modeling, and the lavaan tutorial at lavaan.ugent.be.',
            },
          },
        ],
      },
    },
    {
      label: 'Whether many variables boil down to a few, or which cases form groups',
      group: 'Dimension reduction and clustering',
      next: {
        kind: 'question',
        text: 'What do you want to reduce?',
        options: [
          {
            label: 'Many numeric variables into a few summary scores',
            next: {
              kind: 'answer',
              id: 'principal-components',
              model: 'Principal component analysis (PCA)',
              when: 'Many correlated numeric variables, and you want a few scores that keep most of their information, for description or as predictors in a later model.',
              rCode: `library(dplyr)
numbers <- d %>% select(where(is.numeric))
pca <- prcomp(numbers, scale. = TRUE)
summary(pca)
pca$rotation[, 1:2]`,
              check:
                'Numeric variables that correlate with each other. scale. = TRUE puts them on a common scale, which you want unless they share units. No missing values: prcomp() stops on NA, so drop or impute them first.',
              note: 'summary() shows how much of the total variance each component explains; keep the components before the explained variance levels off, which screeplot(pca) draws. The rotation matrix gives each variable\'s loading on each component. Components are summaries, not measured traits: for traits, use factor analysis.',
              further: 'James, Witten, Hastie and Tibshirani, An Introduction to Statistical Learning (free online), the chapter on unsupervised learning.',
            },
          },
          {
            label: 'Questionnaire items into the traits behind them',
            next: {
              kind: 'answer',
              id: 'exploratory-factors',
              model: 'Exploratory factor analysis (EFA)',
              when: 'Many items and no settled idea of their structure, and you want to find the few underlying traits that explain how they correlate.',
              rCode: `library(dplyr)
items <- d %>% select(item1:item9)
efa <- factanal(items, factors = 3, rotation = "promax")
print(efa, cutoff = 0.3, sort = TRUE)`,
              check:
                'A sample of 200 or so, and at least five cases per item. Choose the number of factors before fitting, with a scree plot or parallel analysis: psych::fa.parallel(items) in RStudio.',
              note: 'promax lets the factors correlate, which is realistic for psychological traits. An item loading above about .3 on one factor and weakly on the others helps define that factor. To confirm the structure, fit a CFA on new data.',
              further: 'Fabrigar and Wegener, Exploratory Factor Analysis, and psych::fa() for more estimation and rotation options.',
            },
          },
          {
            label: 'Cases into groups of similar cases (clusters)',
            next: {
              kind: 'answer',
              id: 'cluster-analysis',
              model: 'Cluster analysis (k-means)',
              when: 'You want to find groups of similar people or cases from several numeric variables, without a grouping known in advance.',
              rCode: `library(dplyr)
scaled <- d %>% select(where(is.numeric)) %>% scale()
set.seed(1)
clusters <- kmeans(scaled, centers = 3, nstart = 25)
clusters$size
d <- d %>% mutate(cluster = factor(clusters$cluster))
d %>% group_by(cluster) %>% summarise(across(where(is.numeric), mean))`,
              check:
                'Numeric variables on comparable scales, which scale() provides. k-means looks for round clusters of similar size and needs the number of clusters in advance: compare several, for example by how kmeans(...)$tot.withinss falls as centers goes from 1 to 8.',
              note: 'nstart = 25 runs the algorithm from 25 random starts and keeps the best. The last line describes each cluster by its means. For a tree of nested groupings instead, hierarchical clustering: hclust(dist(scaled), method = "ward.D2"), then cutree() to cut it into groups. Clusters describe this sample; they do not prove that distinct types exist.',
              further: 'An Introduction to Statistical Learning, the chapter on unsupervised learning; for model-based clusters (latent profile analysis), the mclust package.',
            },
          },
        ],
      },
    },
    {
      label: 'How a series of measurements over time moves, and what comes next',
      group: 'Time series',
      next: {
        kind: 'question',
        text: 'What is the question about the series?',
        help: 'This is for one long series measured at regular intervals, such as monthly sales. Many people each measured a few times is a repeated-measures design instead.',
        options: [
          {
            label: 'Describe it and forecast the next values',
            next: {
              kind: 'answer',
              id: 'forecast-series',
              model: 'ARIMA model',
              when: 'One series measured at regular intervals, and you want to model how each value depends on the ones before and forecast the next.',
              rCode: `series <- ts(d$value, start = c(2020, 1), frequency = 12)
model <- arima(series, order = c(1, 0, 0))
model
predict(model, n.ahead = 12)`,
              check:
                'Equally spaced observations with no gaps. A trend or a seasonal pattern needs differencing or a seasonal term first; plot(series) and acf(series) show both. In RStudio, forecast::auto.arima(series) chooses the orders for you.',
              note: 'order = c(p, d, q) sets the autoregressive terms, the number of differences and the moving-average terms. predict() gives forecasts with standard errors, which grow the further ahead you look. Compare candidate orders by AIC: lower is better.',
              further: 'Hyndman and Athanasopoulos, Forecasting: Principles and Practice (free online at otexts.com), which uses the fable package.',
            },
          },
          {
            label: 'Did an intervention change its level or trend?',
            next: {
              kind: 'answer',
              id: 'interrupted-time-series',
              model: 'Segmented regression (interrupted time series)',
              when: 'A series measured before and after a change, such as a new policy, with no control group, and the question is whether the change shifted the level or the trend.',
              rCode: `library(dplyr)
library(broom)
d <- d %>% mutate(after = as.numeric(time >= 25), time_after = pmax(0, time - 25))
model <- lm(value ~ time + after + time_after, data = d)
model %>% tidy(conf.int = TRUE)
acf(residuals(model), plot = FALSE)`,
              check:
                'Enough time points before and after, at least eight on each side as a common guide. Values next to each other in time are often correlated, which makes the standard errors too small: if acf() shows autocorrelation, fit nlme::gls(..., correlation = nlme::corAR1()) in RStudio instead.',
              note: 'time is the trend before the change, after is the immediate jump when it happens, and time_after is the change in slope afterwards. Replace 25 with the first time point after the intervention.',
              buildsOn: '10-1',
              further: 'Bernal, Cummins and Gasparrini (2017), Interrupted time series regression for the evaluation of public health interventions: a tutorial, International Journal of Epidemiology.',
            },
          },
        ],
      },
    },
    {
      label: 'How to predict new cases as accurately as possible',
      group: 'Prediction',
      next: {
        kind: 'question',
        text: 'What matters most?',
        help: 'Prediction asks how well a model does on cases it has not seen, not whether a coefficient is significant. Every answer here judges the model on held-out data.',
        options: [
          {
            label: 'A simple model that keeps only the useful predictors',
            next: {
              kind: 'answer',
              id: 'lasso',
              model: 'Penalised regression (the lasso)',
              when: 'Many candidate predictors, possibly more than you have cases, and you want a model that picks the useful ones and predicts well.',
              rCode: `library(glmnet)
x <- model.matrix(outcome ~ ., data = d)[, -1]
y <- d$outcome
set.seed(1)
cv <- cv.glmnet(x, y, alpha = 1)
coef(cv, s = "lambda.1se")`,
              check:
                'Complete cases only, since model.matrix() drops rows with missing values. glmnet standardises the predictors for you. For a yes-or-no outcome, add family = "binomial". Avoid stepwise selection: its p-values and R² are biased upwards.',
              note: 'The lasso shrinks coefficients towards zero and sets the weakest to exactly zero, so the predictors left over are the selection. lambda.1se is the simplest model whose cross-validated error is within one standard error of the best. The coefficients are shrunk on purpose, so they come without p-values.',
              further: 'An Introduction to Statistical Learning, the chapter on linear model selection and regularisation.',
            },
          },
          {
            label: 'Accuracy, even if the model is hard to read',
            next: {
              kind: 'answer',
              id: 'random-forest',
              model: 'Random forest',
              when: 'Enough data to learn complex, non-linear patterns and interactions, and accurate prediction matters more than a readable equation.',
              rCode: `library(ranger)
set.seed(1)
model <- ranger(outcome ~ ., data = d, importance = "permutation")
model
sort(model$variable.importance, decreasing = TRUE)`,
              check:
                'Hundreds of cases or more. Missing values handled before fitting. For a yes-or-no or categorical outcome, make it a factor and ranger grows a classification forest.',
              note: 'The OOB prediction error in the printout is measured on the cases each tree did not see, a built-in test on new data. Variable importance ranks predictors by how much accuracy drops when each is shuffled; it does not say in which direction a predictor works.',
              further: 'An Introduction to Statistical Learning, the chapter on tree-based methods, and Kuhn and Silge, Tidy Modeling with R (free online), for tuning and cross-validation.',
            },
          },
        ],
      },
    },
  ],
};

/** Shared by two branches, so it is built by a function: each copy is its own object with the same id. */
function crossTable(): Answer {
  return {
    kind: 'answer',
    id: 'cross-table',
    model: 'Chi-square test of independence',
    when: 'Two categorical variables, such as department and whether people left, and the question is whether they are related.',
    rCode: `counts <- table(d$outcome, d$predictor)
counts
chisq.test(counts, correct = FALSE)
prop.table(counts, margin = 2)`,
    check:
      "Each case counted once, in one cell. Expected counts of at least 5 in nearly every cell; chisq.test() warns when they are lower, and then Fisher's exact test is the alternative: fisher.test(counts).",
    note: 'A significant result means the outcome is distributed differently across the categories of the predictor. The last line shows how: the proportion of each outcome within each predictor category. For a yes-or-no outcome, logistic regression with this one predictor gives the same answer and extends to more predictors.',
    buildsOn: '14-2',
    further: 'Alan Agresti, An Introduction to Categorical Data Analysis.',
  };
}

/** Every answer once, in tree order, with the option labels that lead to it and its index group. */
export function allAnswers(): { answer: Answer; path: string[]; group: string }[] {
  const found: { answer: Answer; path: string[]; group: string }[] = [];
  const seen = new Set<string>();
  (function walk(node: Node, path: string[], group: string) {
    if (node.kind === 'answer') {
      if (!seen.has(node.id)) {
        seen.add(node.id);
        found.push({ answer: node, path, group });
      }
      return;
    }
    for (const option of node.options) walk(option.next, [...path, option.label], option.group ?? group);
  })(TREE, [], '');
  return found;
}

/** The option labels from the first question to the answer with this id, or null. */
export function pathTo(id: string): string[] | null {
  return allAnswers().find((entry) => entry.answer.id === id)?.path ?? null;
}

/** Follows option labels from the first question. Stops at the last label that matches. */
export function follow(path: string[]): { node: Node; path: string[] } {
  let node: Node = TREE;
  const taken: string[] = [];
  for (const label of path) {
    if (node.kind !== 'question') break;
    const option: Option | undefined = node.options.find((candidate) => candidate.label === label);
    if (!option) break;
    node = option.next;
    taken.push(label);
  }
  return { node, path: taken };
}
