import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { findLesson } from '../content/manifest';

export type Node =
  | { kind: 'question'; text: string; options: { label: string; next: Node }[] }
  | {
      kind: 'answer';
      /** The model's name, as the course teaches it. */
      model: string;
      /** Course-style R, one statement per line. */
      rCode: string;
      /** What to check before trusting the result; names a rank-based alternative where one exists. */
      check: string;
      /** The traditional test this model reproduces, with its R call, when there is one. */
      traditional?: string;
      note: string;
      lessonId?: string;
    };

export const TREE: Node = {
  kind: 'question',
  text: 'What kind of outcome are you analysing?',
  options: [
    {
      label: 'A number (a score, time, rating or amount)',
      next: {
        kind: 'question',
        text: 'How were the scores collected?',
        options: [
          {
            label: 'One score per person, from different people',
            next: {
              kind: 'question',
              text: 'What are you using to predict the outcome?',
              options: [
                {
                  label: 'One continuous predictor',
                  next: {
                    kind: 'answer',
                    model: 'Simple linear regression',
                    rCode:
                      'library(dplyr)\nlibrary(broom)\nmodel <- lm(outcome ~ predictor, data = d)\nmodel %>% tidy()\nmodel %>% glance()',
                    check:
                      'A scatterplot with geom_smooth(method = lm) shows a roughly straight-line pattern; no extreme outliers; residuals with similar spread along the whole line; residuals roughly normal, which matters mainly in small samples. For a curved-but-consistent pattern, ranks or outliers, Spearman\'s correlation: cor.test(d$outcome, d$predictor, method = "spearman").',
                    traditional:
                      "Pearson correlation: cor.test(d$outcome, d$predictor). Its t and p match the slope's.",
                    note: 'The slope b is the change in the outcome for each one-unit increase in the predictor.',
    lessonId: '09-2',
                  },
                },
                {
                  label: 'Several predictors',
                  next: {
                    kind: 'answer',
                    model: 'Multiple linear regression',
                    rCode:
                      'library(dplyr)\nlibrary(broom)\nmodel <- lm(outcome ~ predictor1 + predictor2, data = d)\nmodel %>% tidy()\nmodel %>% glance()',
                    check:
                      'Roughly linear relationships; no extreme outliers; residuals with similar spread across the fitted values; residuals roughly normal (mainly a concern in small samples); predictors not almost perfectly correlated with each other.',
                    note: 'Each b is the change in the outcome for a one-unit increase in that predictor, holding the other predictors constant. Report R², F and each b with its SE, t and p.',
    lessonId: '10-1',
                  },
                },
                {
                  label: 'One grouping variable with two groups',
                  next: {
                    kind: 'answer',
                    model: 'Linear model with a two-group predictor',
                    rCode:
                      'library(dplyr)\nlibrary(broom)\nmodel <- lm(outcome ~ group, data = d)\nmodel %>% tidy()\nd %>% group_by(group) %>% summarise(mean = mean(outcome), sd = sd(outcome))',
                    check:
                      'Similar spread in each group, which matters especially when group sizes differ. Residuals roughly normal, which matters mainly in small samples; with large groups the Central Limit Theorem covers moderate skew. For a small, clearly skewed sample or extreme outliers, the Mann-Whitney test: wilcox.test(outcome ~ group, data = d).',
                    traditional:
                      'The independent-samples t-test: t.test(outcome ~ group, data = d, var.equal = TRUE). Same t with the sign reversed — t.test subtracts the groups the other way round — and the same p.',
                    note: 'The slope is the difference between the two group means. Always look at the means: the sign of b depends on which group R took as the reference.',
    lessonId: '11-1',
                  },
                },
                {
                  label: 'One grouping variable with three or more groups',
                  next: {
                    kind: 'answer',
                    model: 'Linear model with a categorical predictor',
                    rCode:
                      'library(dplyr)\nlibrary(broom)\nlibrary(emmeans)\nmodel <- lm(outcome ~ group, data = d)\nmodel %>% glance()\nmodel %>% tidy()\nemmeans(model, pairwise ~ group, adjust = "tukey")',
                    check:
                      'Similar spread in each group, which matters especially when group sizes differ. Residuals roughly normal, which matters mainly in small samples; with large groups the Central Limit Theorem covers moderate skew. For a small, clearly skewed sample or extreme outliers, the Kruskal-Wallis test: kruskal.test(outcome ~ group, data = d).',
                    traditional: 'One-way ANOVA: summary(aov(outcome ~ group, data = d)). Same F, same p.',
                    note: 'Each b compares one group with the reference group. glance() gives the overall F; emmeans gives every pairwise comparison, corrected for multiple testing.',
    lessonId: '11-2',
                  },
                },
                {
                  label: 'Two grouping variables that may interact',
                  next: {
                    kind: 'answer',
                    model: 'Linear model with an interaction (factorial design)',
                    rCode:
                      'library(car)\nlibrary(emmeans)\nmodel <- lm(outcome ~ factor1 * factor2, data = d,\n            contrasts = list(factor1 = contr.sum, factor2 = contr.sum))\nAnova(model, type = "III")\nemmeans(model, pairwise ~ factor1:factor2, adjust = "tukey")',
                    check:
                      'Similar spread in each cell, which matters especially when group sizes differ. Residuals roughly normal, which matters mainly in small samples. Plot the cell means before interpreting main effects.',
                    traditional:
                      'Two-way (factorial) ANOVA. Anova(model, type = "III") gives its F tests for each main effect and the interaction.',
                    // Type III main-effect tests are only meaningful with sum-to-zero contrasts. Under R's
                    // default treatment contrasts they test each factor at the other's reference level.
                    note: 'The contrasts = list(...) line matters: type III tests of the main effects are only correct with sum-to-zero contrasts, and R does not use those by default. An interaction means the effect of one factor depends on the level of the other: in an interaction plot, the lines are not parallel.',
    lessonId: '12-2',
                  },
                },
              ],
            },
          },
          {
            label: 'The same people measured more than once',
            next: {
              kind: 'answer',
              model: 'Linear mixed-effects model',
              rCode:
                'library(dplyr)\nlibrary(tidyr)\nlibrary(lmerTest)\nlong_d <- d %>% pivot_longer(cols = c(before, after), names_to = "time", values_to = "score") %>%\n  mutate(time = factor(time, levels = c("before", "after")))\nmodel <- lmer(score ~ time + (1 | id), data = long_d)\nsummary(model)',
              check:
                'Data in long format: one row per person per measurement. Residuals roughly normal, which matters mainly in small samples. With only two time points and skewed differences, the Wilcoxon signed-rank test: wilcox.test(d$before, d$after, paired = TRUE).',
              traditional:
                'With two time points, the paired-samples t-test: t.test(d$before, d$after, paired = TRUE). With more, repeated-measures ANOVA.',
              note: '(1 | id) gives every person their own starting level, so the model knows which scores belong together. Setting the factor levels makes "before" the reference, so the time coefficient is the change from before to after. Unlike repeated-measures ANOVA, it keeps people who missed a measurement.',
    lessonId: '13-2',
            },
          },
          {
            label: 'People grouped in teams, classes or sites',
            next: {
              kind: 'answer',
              model: 'Linear mixed-effects model with a grouping factor',
              rCode: 'library(lmerTest)\nmodel <- lmer(outcome ~ predictor + (1 | site), data = d)\nsummary(model)',
              check: 'Enough groups to estimate how they vary (a handful at the very least). Residuals roughly normal, which matters mainly in small samples.',
              note: 'People in the same site are more alike than people in different sites; (1 | site) accounts for that. If people are also measured repeatedly, nest them: (1 | site/id).',
    lessonId: '13-3',
            },
          },
        ],
      },
    },
    {
      label: 'Yes or no (two possible outcomes)',
      next: {
        kind: 'answer',
        model: 'Logistic regression',
        rCode:
          'model <- glm(outcome ~ predictor, data = d, family = binomial)\nsummary(model)\nexp(cbind(OR = coef(model), confint(model)))',
        check:
          'Independent observations, and enough cases of the rarer outcome — a common rule of thumb is at least 10 per estimated coefficient (a factor with k levels uses k − 1).',
        traditional:
          'With one categorical predictor, the chi-square test of independence: chisq.test(table(d$outcome, d$predictor), correct = FALSE), which matches anova(model, test = "Rao").',
        note: 'The coefficients are in log odds. exp() turns them into odds ratios: above 1, the outcome becomes more likely; below 1, less likely.',
    lessonId: '14-2',
      },
    },
  ],
};

/**
 * The link to the lesson a leaf teaches. findLesson reads MODULES, which holds
 * only modules whose lesson files all exist, so a lessonId added before its
 * module is written resolves to undefined. The link still works in that case -
 * the route renders its own not-found state - but it loses its title, which is
 * what ModelChooser.test.tsx watches for.
 */
function LessonLink({ lessonId }: { lessonId: string }) {
  const lesson = findLesson(lessonId);
  return (
    <p className="model-chooser-lesson">
      <Link to={`/lesson/${lessonId}`}>
        {lesson ? `Go to the lesson: ${lesson.title}` : 'Go to the lesson'}
      </Link>
    </p>
  );
}

export default function ModelChooser() {
  const [node, setNode] = useState<Node>(TREE);
  const [trail, setTrail] = useState<string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Set by choose() and restart(): both unmount the button that was clicked, so
  // focus would otherwise fall to <body>. Never set on mount, so landing on the
  // page does not steal focus (also under StrictMode's double effect run).
  const moveFocus = useRef(false);
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    headingRef.current?.focus();
  }, [node]);

  function choose(label: string, next: Node) {
    moveFocus.current = true;
    setTrail((current) => [...current, label]);
    setNode(next);
  }

  function restart() {
    moveFocus.current = true;
    setTrail([]);
    setNode(TREE);
  }

  return (
    <div className="model-chooser">
      <h1>Which model should I use?</h1>
      <p>
        Work down from the question you want your data to answer. Almost every analysis in this course is one of three
        models — lm(), lmer() or glm() — and the chain is always the same: question → assumptions →
        choice of model → computation → interpretation → report.
      </p>

      {trail.length > 0 && (
        <p className="model-chooser-trail">
          {trail.join(' → ')}{' '}
          <button type="button" onClick={restart} className="link-button">
            Start over
          </button>
        </p>
      )}

      {node.kind === 'question' ? (
        <>
          <h2 ref={headingRef} tabIndex={-1}>
            {node.text}
          </h2>
          <ul className="model-chooser-options">
            {node.options.map((option) => (
              <li key={option.label}>
                <button type="button" onClick={() => choose(option.label, option.next)}>
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="model-chooser-answer">
          <h2 ref={headingRef} tabIndex={-1}>
            {node.model}
          </h2>
          <pre>
            <code>{node.rCode}</code>
          </pre>
          <p>
            <strong>Check first:</strong> {node.check}
          </p>
          {node.traditional && (
            <p>
              <strong>Traditional name:</strong> {node.traditional}
            </p>
          )}
          <p>{node.note}</p>
          {node.lessonId && <LessonLink lessonId={node.lessonId} />}
        </div>
      )}
    </div>
  );
}
