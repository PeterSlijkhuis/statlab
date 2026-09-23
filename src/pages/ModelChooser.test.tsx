import { readFileSync } from 'node:fs';
import { StrictMode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { findLesson } from '../content/manifest';
import { DATASET_FILES } from '../r/session';
import ModelChooser, { TREE, WhereItRuns, type Answer, type Node } from './ModelChooser';
import { browserSupport } from '../r/packages';
import { allAnswers, GROUPS as SECTIONS, packagesIn, packagesMissingHere } from './modelTree';

function Location() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderChooser(url = '/which-model') {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[url]}>
        <ModelChooser />
        <Location />
      </MemoryRouter>
    </StrictMode>,
  );
}

/** The chooser's own heading: the current question or answer. The index below it has an h2 of its own. */
function heading() {
  return document.querySelector<HTMLElement>('.model-chooser > h2, .model-chooser-answer > h2')!;
}

/** Queries inside the answer card, so the index's filter buttons and badges do not match too. */
function card() {
  return within(document.querySelector<HTMLElement>('.model-chooser-answer')!);
}

const TO_OUTCOME = /predicts, or differs in, one outcome/i;
const NUMBER = [TO_OUTCOME, /^a number/i];
const INDEPENDENT = [...NUMBER, /different people/i];
const NUMERIC = [...INDEPENDENT, /numeric predictors/i];
const GROUPS = [...INDEPENDENT, /grouping variables/i];
const REPEATED = [...NUMBER, /measured more than once/i];
const YES_NO = [TO_OUTCOME, /^yes or no/i, /one per case/i];
const BAYES = /\(bayesian\)/i;

// Written out by hand, not derived from TREE: a path that silently disappears
// from the tree must fail here.
const PATHS: { clicks: RegExp[]; id: string; model: string; code: string; lessonId: string }[] = [
  { clicks: [...INDEPENDENT, /compare the mean/i], id: 'mean-vs-value', model: 'Intercept-only linear model', code: 'lm(I(exam_score - 70) ~ 1', lessonId: '08-3' },
  { clicks: [...NUMERIC, /one numeric predictor/i], id: 'simple-regression', model: 'Simple linear regression', code: 'lm(wellbeing ~ autonomy, data = d)', lessonId: '09-2' },
  { clicks: [...NUMERIC, /several predictors/i], id: 'multiple-regression', model: 'Multiple linear regression', code: 'wellbeing ~ autonomy + workload + tenure_years', lessonId: '10-1' },
  { clicks: [...GROUPS, /with two groups/i], id: 'two-groups', model: 'Linear model with a two-group predictor', code: 'group_by(remote) %>% summarise(', lessonId: '11-1' },
  { clicks: [...GROUPS, /three or more groups/i], id: 'several-groups', model: 'Linear model with a categorical predictor', code: 'emmeans(model, pairwise ~ department, adjust = "tukey")', lessonId: '11-2' },
  { clicks: [...GROUPS, /covariate/i], id: 'groups-with-covariate', model: 'Linear model with a group and a covariate', code: 'lm(engagement_t2 ~ engagement_t1 + training', lessonId: '10-2' },
  { clicks: [...GROUPS, /two grouping variables/i], id: 'factorial', model: 'Linear model with an interaction (factorial design)', code: 'contrasts = list(training = contr.sum, mentoring = contr.sum)', lessonId: '12-2' },
  { clicks: [...REPEATED, /twice/i], id: 'before-after', model: 'Linear mixed-effects model for two time points', code: 'pivot_longer', lessonId: '13-3' },
  { clicks: [...REPEATED, /three or more/i], id: 'repeated-measures', model: 'Linear mixed-effects model', code: 'weight ~ time + (1 | Chick)', lessonId: '13-2' },
  { clicks: [...NUMBER, /teams, classes or sites/i], id: 'nested-groups', model: 'Linear mixed-effects model with a grouping factor', code: '(1 | site)', lessonId: '13-3' },
  { clicks: [...YES_NO, /numbers, groups or both/i], id: 'logistic-regression', model: 'Logistic regression', code: 'family = binomial', lessonId: '14-2' },
  { clicks: [BAYES, /one proportion/i], id: 'bayes-proportion', model: 'Bayesian estimate of a proportion (beta-binomial)', code: 'qbeta(', lessonId: '15-2' },
  { clicks: [BAYES, /in a linear model/i], id: 'bayes-factor-models', model: 'Bayes factor from the BIC', code: 'exp((BIC(null_model) - BIC(model)) / 2)', lessonId: '15-3' },
];

/** Answers beyond the course, reached by the same clicks a student would make. */
const BEYOND: { clicks: RegExp[]; id: string; code: string }[] = [
  { clicks: [...NUMERIC, /curved/i], id: 'curved-relationship', code: 'poly(sleep_hours, 2)' },
  { clicks: [...NUMERIC, /moderator/i], id: 'continuous-moderation', code: 'workload_c * autonomy_c' },
  { clicks: [...GROUPS, /several outcomes/i], id: 'several-outcomes', code: 'manova(' },
  { clicks: [...REPEATED, /also in different groups/i], id: 'time-by-group', code: 'time * training' },
  { clicks: [...REPEATED, /different rates/i], id: 'growth-curve', code: '(Time | Chick)' },
  { clicks: [...REPEATED, /many items or stimuli/i], id: 'crossed-random-effects', code: '(1 | lecturer)' },
  { clicks: [...YES_NO, /cross-table/i], id: 'cross-table', code: 'chisq.test(' },
  { clicks: [...YES_NO, /one proportion/i], id: 'proportion-vs-value', code: 'binom.test(' },
  { clicks: [TO_OUTCOME, /^yes or no/i, /more than once, or grouped/i], id: 'repeated-binary', code: 'glmer(' },
  { clicks: [TO_OUTCOME, /^yes or no/i, /trials per row/i], id: 'successes-of-trials', code: 'cbind(left, staff - left)' },
  { clicks: [TO_OUTCOME, /ordered categories/i], id: 'ordinal-regression', code: 'polr(' },
  { clicks: [TO_OUTCOME, /no order/i, /predicted from other variables/i], id: 'multinomial-regression', code: 'multinom(' },
  { clicks: [TO_OUTCOME, /no order/i, /one other categorical variable/i], id: 'cross-table', code: 'chisq.test(' },
  { clicks: [TO_OUTCOME, /no order/i, /expected shares/i], id: 'goodness-of-fit', code: 'chisq.test(counts, p =' },
  { clicks: [TO_OUTCOME, /a count of events/i, /start here/i], id: 'poisson-regression', code: 'family = poisson' },
  { clicks: [TO_OUTCOME, /a count of events/i, /overdispersion/i], id: 'negative-binomial', code: 'glm.nb(' },
  { clicks: [TO_OUTCOME, /a count of events/i, /more zeros/i], id: 'zero-inflated', code: 'zeroinfl(' },
  { clicks: [TO_OUTCOME, /time until/i, /groups differ/i], id: 'survival-curves', code: 'survfit(Surv(tenure_years, left_company) ~ remote' },
  { clicks: [TO_OUTCOME, /time until/i, /which predictors/i], id: 'cox-regression', code: 'coxph(' },
  { clicks: [/third variable/i, /mediator/i], id: 'mediation', code: 'indirect := a * b' },
  { clicks: [/third variable/i, /reliability/i], id: 'scale-reliability', code: 'psych::alpha(items)' },
  { clicks: [/third variable/i, /factors I expect/i], id: 'confirmatory-factors', code: 'cfa(model, data = HolzingerSwineford1939)' },
  { clicks: [/third variable/i, /theory of paths/i], id: 'structural-equation-model', code: 'sem(model, data = HolzingerSwineford1939)' },
  { clicks: [/boil down/i, /summary scores/i], id: 'principal-components', code: 'prcomp(' },
  { clicks: [/boil down/i, /traits behind them/i], id: 'exploratory-factors', code: 'factanal(' },
  { clicks: [/boil down/i, /clusters/i], id: 'cluster-analysis', code: 'kmeans(' },
  { clicks: [/over time/i, /forecast/i], id: 'forecast-series', code: 'arima(' },
  { clicks: [/over time/i, /intervention/i], id: 'interrupted-time-series', code: 'time + after + time_after' },
  { clicks: [/predict new cases/i, /only the useful predictors/i], id: 'lasso', code: 'cv.glmnet(' },
  { clicks: [/predict new cases/i, /hard to read/i], id: 'random-forest', code: 'randomForest(' },
  { clicks: [BAYES, /two groups/i], id: 'bayes-t-test', code: 'ttestBF(' },
  { clicks: [BAYES, /prior on each coefficient/i], id: 'bayesian-regression', code: 'brm(' },
];

async function clickThrough(clicks: RegExp[]) {
  for (const name of clicks) {
    // Within the options: the index further down has buttons of its own.
    const options = document.querySelector<HTMLElement>('.model-chooser-options')!;
    await userEvent.click(within(options).getByRole('button', { name }));
  }
}

function answers(): Answer[] {
  return allAnswers().map((entry) => entry.answer);
}

describe('ModelChooser', () => {
  test('lands on the first question under the page title', () => {
    renderChooser();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Which model should I use?');
    expect(heading().textContent).toBe('What do you want to find out?');
  });

  test.each(PATHS)('reaches $model', async ({ clicks, model, code }) => {
    renderChooser();
    await clickThrough(clicks);
    expect(heading().textContent).toBe(model);
    expect(document.querySelector('.model-chooser-answer pre code')?.textContent).toContain(code);
    expect(card().getByText('Check first:')).toBeTruthy();
    expect(card().getByText('Taught in this course')).toBeTruthy();
  });

  test.each(BEYOND)('reaches $id, marked as beyond the course', async ({ clicks, id, code }) => {
    renderChooser();
    await clickThrough(clicks);
    const answer = answers().find((candidate) => candidate.id === id)!;
    expect(heading().textContent).toBe(answer.model);
    expect(document.querySelector('.model-chooser-answer pre code')?.textContent).toContain(code);
    expect(card().getByText('Beyond this course')).toBeTruthy();
    expect(card().getByText('Learn more:')).toBeTruthy();
  });

  test('the hand-written paths reach every answer in the tree', () => {
    const reached = new Set([...PATHS, ...BEYOND].map((path) => path.id));
    expect([...reached].sort()).toEqual(answers().map((answer) => answer.id).sort());
  });

  test('the traditional name is shown only when the leaf has one', async () => {
    renderChooser();
    await clickThrough([...GROUPS, /with two groups/i]);
    expect(screen.getByText('Traditional name:')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /start over/i }));
    await clickThrough([...NUMERIC, /several predictors/i]);
    expect(screen.queryByText('Traditional name:')).toBeNull();
  });

  test('every node in the tree is well formed', () => {
    const ids: string[] = [];
    (function walk(node: Node) {
      if (node.kind === 'answer') {
        ids.push(node.id);
        return;
      }
      expect(node.options.length, node.text).toBeGreaterThanOrEqual(2);
      const labels = node.options.map((option) => option.label);
      expect(new Set(labels).size, node.text).toBe(labels.length);
      node.options.forEach((option) => walk(option.next));
    })(TREE);

    for (const answer of answers()) {
      expect(answer.id, answer.model).toMatch(/^[a-z0-9-]+$/);
      for (const field of ['model', 'when', 'rCode', 'check', 'note'] as const) {
        expect(answer[field].trim(), `${answer.id}.${field}`).not.toBe('');
      }
      if (answer.traditional !== undefined) expect(answer.traditional.trim(), answer.id).not.toBe('');
    }
    // An id reached twice must be the same answer, written once.
    const byId = new Map<string, string>();
    (function walk(node: Node) {
      if (node.kind === 'answer') {
        const json = JSON.stringify(node);
        expect(byId.get(node.id) ?? json, node.id).toBe(json);
        byId.set(node.id, json);
      } else node.options.forEach((option) => walk(option.next));
    })(TREE);
    expect(new Set(ids).size).toBe(answers().length);
  });

  test('every answer sits in a named section of the index', () => {
    for (const { answer, group } of allAnswers()) expect(group, answer.id).not.toBe('');
  });

  test('every snippet attaches the package its pipes and verbs come from', () => {
    // broom does not export %>%, so a snippet pasted into a fresh session must attach it.
    for (const { id, rCode } of answers()) {
      // tidyr re-exports %>% but not the dplyr verbs.
      if (/%>%/.test(rCode)) {
        expect(/library\((dplyr|tidyr)\)/.test(rCode), id).toBe(true);
      }
      if (/group_by\(|summarise\(|mutate\(|select\(/.test(rCode)) {
        expect(/library\(dplyr\)/.test(rCode), id).toBe(true);
      }
      if (/\b(tidy|glance)\(/.test(rCode)) {
        expect(/library\(broom\)/.test(rCode), id).toBe(true);
      }
    }
  });

  test('no text on the page uses an em dash', () => {
    expect(JSON.stringify(TREE)).not.toContain('\u2014');
  });

  test('choosing an option moves focus to the next heading, but landing does not', async () => {
    renderChooser();
    expect(document.activeElement).not.toBe(heading());

    await userEvent.click(screen.getByRole('button', { name: TO_OUTCOME }));
    expect(heading().textContent).toMatch(/what kind of outcome/i);
    expect(document.activeElement).toBe(heading());
  });

  test('Back goes up one question', async () => {
    renderChooser();
    await clickThrough([...INDEPENDENT]);
    expect(heading().textContent).toMatch(/what are you using to predict/i);

    await userEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(heading().textContent).toMatch(/how were the scores collected/i);
    expect(document.activeElement).toBe(heading());
  });

  test('a single Start over returns to the first question and focuses it', async () => {
    renderChooser();
    await clickThrough([...YES_NO, /numbers, groups or both/i]);

    await userEvent.click(screen.getByRole('button', { name: /start over/i }));

    expect(heading().textContent).toMatch(/what do you want to find out/i);
    expect(document.querySelector('.model-chooser-trail')).toBeNull();
    expect(document.activeElement).toBe(heading());
  });
});

describe('links and the index', () => {
  test('an answer is addressable: reaching it puts its id in the URL', async () => {
    renderChooser();
    await clickThrough([...YES_NO, /numbers, groups or both/i]);
    expect(screen.getByTestId('location').textContent).toBe('/which-model?model=logistic-regression');

    await userEvent.click(screen.getByRole('button', { name: /start over/i }));
    expect(screen.getByTestId('location').textContent).toBe('/which-model');
  });

  test('a link with ?model= opens that answer, with the path that leads to it', () => {
    renderChooser('/which-model?model=poisson-regression');
    expect(heading().textContent).toBe('Poisson regression');
    expect(document.querySelector('.model-chooser-trail')?.textContent).toMatch(/a count of events/i);
  });

  test('an unknown ?model= falls back to the first question', () => {
    renderChooser('/which-model?model=no-such-model');
    expect(heading().textContent).toBe('What do you want to find out?');
  });

  test('the index lists every answer once, in sections, and opens the one picked', async () => {
    renderChooser();
    const index = screen.getByRole('region', { name: /browse all 44 models/i });
    const listed = [...index.querySelectorAll('.model-card button')].map((button) => button.textContent);
    expect([...listed].sort()).toEqual(answers().map((answer) => answer.model).sort());
    expect(index.querySelectorAll('.model-index-section h3').length).toBe(SECTIONS.length);

    await userEvent.click(within(index).getByRole('button', { name: 'Structural equation model (SEM)' }));
    expect(heading().textContent).toBe('Structural equation model (SEM)');
    expect(document.activeElement).toBe(heading());
  });

  test('the index sections follow the order of the questions', () => {
    const order = allAnswers().map((entry) => SECTIONS.findIndex((section) => section.name === entry.group));
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test('search finds a model by name or by the test it replaces', async () => {
    renderChooser();
    const index = screen.getByRole('region', { name: /browse all/i });
    const search = within(index).getByRole('searchbox', { name: 'Search the models' });

    await userEvent.type(search, 'kruskal');
    expect([...index.querySelectorAll('.model-card button')].map((button) => button.textContent)).toEqual([
      'Linear model with a categorical predictor',
    ]);

    await userEvent.clear(search);
    await userEvent.type(search, 'xylophone');
    expect(within(index).getByText(/no model matches/i)).toBeTruthy();
  });

  test('the filter shows only taught or only beyond-the-course models', async () => {
    renderChooser();
    const index = screen.getByRole('region', { name: /browse all/i });
    await userEvent.click(within(index).getByRole('button', { name: 'Taught in this course' }));
    expect(index.querySelectorAll('.model-card').length).toBe(answers().filter((answer) => answer.lessonId).length);
    expect(index.querySelectorAll('.model-card.beyond').length).toBe(0);

    await userEvent.click(within(index).getByRole('button', { name: 'Beyond this course' }));
    expect(index.querySelectorAll('.model-card.taught').length).toBe(0);
  });
});

describe('where each snippet runs', () => {
  test('every snippet runs as pasted: it reads a course dataset, or says which built-in one it uses', () => {
    for (const { answer } of allAnswers()) {
      const file = DATASET_FILES.find((name) => answer.rCode.includes(`read.csv("data/${name}", stringsAsFactors = TRUE)`));
      expect(file !== undefined || /^# .*(built into R|from [\w.]+:)/m.test(answer.rCode), answer.id).toBe(true);
      if (!file) continue;
      // Every d$column the snippet reads is in the file, or made by the snippet itself.
      const header = readFileSync(`public/data/${file}`, 'utf8').split('\n')[0].split(',');
      const mutated = [...answer.rCode.matchAll(/mutate\((.*)/g)].flatMap((match) => [...match[1].matchAll(/(\w+) = /g)].map((name) => name[1]));
      const made = [...answer.rCode.matchAll(/d\$(\w+) <-/g)].map((match) => match[1]).concat(mutated);
      for (const match of answer.rCode.matchAll(/d\$(\w+)/g)) expect([...header, ...made], answer.id).toContain(match[1]);
    }
  });

  test('packagesIn reads library() calls and :: prefixes', () => {
    expect(packagesIn('library(dplyr)\nlibrary( lavaan )\nx <- MASS::polr(y ~ x)\npsych::alpha(d)')).toEqual(['dplyr', 'lavaan', 'MASS', 'psych']);
  });

  test('base R and every package the R Workspace offers run there; anything else needs RStudio', () => {
    expect(packagesMissingHere({ rCode: 'library(emmeans)\nlibrary(lavaan)\nstats::lm(y ~ x)' })).toEqual([]);
    expect(packagesMissingHere({ rCode: 'library(dplyr)\nlibrary(ranger)' })).toEqual(['ranger']);
  });

  test('an answer that runs here says so and links to the R Workspace', async () => {
    renderChooser();
    await clickThrough([...GROUPS, /three or more groups/i]);
    expect(card().getByText('Runs in the R Workspace')).toBeTruthy();
    expect(card().getByRole('link', { name: 'R Workspace' }).getAttribute('href')).toBe('/workspace');
    expect(document.querySelector('.model-chooser-answer')?.textContent).toContain('The first run downloads emmeans');
  });

  test('advanced methods run in the R Workspace too, after a download', async () => {
    renderChooser();
    await clickThrough([/third variable/i, /mediator/i]);
    expect(card().getByText('Runs in the R Workspace')).toBeTruthy();
    expect(document.querySelector('.model-chooser-answer')?.textContent).toContain('The first run downloads lavaan');
  });

  test('a package the R Workspace cannot load sends the student to RStudio, with the install line', () => {
    render(
      <MemoryRouter>
        <WhereItRuns answer={{ ...answers()[0], rCode: 'library(ranger)\nlibrary(mgcv)' }} />
      </MemoryRouter>,
    );
    const text = document.body.textContent!;
    expect(text).toContain('in RStudio, because this site does not have ranger and mgcv');
    expect(text).toContain('mgcv comes with R');
    expect(text).toContain('install.packages("ranger")');
  });

  test('every answer on the page runs in the R Workspace, unless no browser can run it', () => {
    // Only a package that needs a compiler, such as brms for Stan, may send a
    // student to RStudio. Anything that installs in webR belongs in the catalogue.
    for (const answer of answers()) {
      expect(packagesMissingHere(answer).filter((name) => browserSupport(name) !== 'unavailable'), answer.id).toEqual([]);
    }
  });

  test('the BayesFactor t-test needs RStudio: the browser repository lacks deSolve', async () => {
    renderChooser();
    await clickThrough([BAYES, /two groups/i]);
    expect(card().getByText('Needs RStudio')).toBeTruthy();
  });

  test('Bayesian regression needs RStudio, and says why', async () => {
    renderChooser();
    await clickThrough([BAYES, /prior on each coefficient/i]);
    expect(card().getByText('Needs RStudio')).toBeTruthy();
    expect(document.querySelector('.model-chooser-answer')?.textContent).toContain('this site does not have brms');
  });

  test('every answer the course teaches runs in the R Workspace', () => {
    for (const answer of answers().filter((candidate) => candidate.lessonId)) {
      expect(packagesMissingHere(answer), answer.id).toEqual([]);
    }
  });
});

describe('lesson links', () => {
  test.each(PATHS)('$model links to lesson $lessonId', async ({ clicks, lessonId }) => {
    renderChooser();
    await clickThrough(clicks);
    const link = screen.getByRole('link', { name: /go to the lesson/i });
    expect(link.getAttribute('href')).toBe(`/lesson/${lessonId}`);
  });

  test('every answer either links to its lesson or says where to learn it', () => {
    // Spec 4.2: the chooser "links each leaf to the lesson that teaches it".
    // A model the course does not teach gets a pointer instead, never nothing.
    for (const answer of answers()) {
      if (answer.lessonId) {
        expect(answer.further, `${answer.id} is taught, so needs no pointer`).toBeUndefined();
        expect(answer.buildsOn, answer.id).toBeUndefined();
      } else {
        expect(answer.further?.trim(), `${answer.id} has no pointer`).toBeTruthy();
      }
    }
  });

  test('every lesson id resolves to a lesson a student can open', () => {
    // findLesson reads MODULES, which holds a module only once all its lesson
    // files exist. This test therefore also proves the linked modules are complete.
    for (const answer of answers()) {
      for (const lessonId of [answer.lessonId, answer.buildsOn]) {
        if (lessonId) expect(findLesson(lessonId), `${answer.id} -> ${lessonId}`).toBeDefined();
      }
    }
  });

  test('the link names the lesson it goes to', async () => {
    renderChooser();
    await clickThrough([...YES_NO, /numbers, groups or both/i]);
    expect(screen.getByRole('link', { name: /go to the lesson: glm and log odds/i })).toBeTruthy();
  });

  test('a model beyond the course links to the lesson it builds on', async () => {
    renderChooser();
    await clickThrough([...REPEATED, /different rates/i]);
    expect(screen.getByRole('link', { name: /builds on the lesson: random intercepts/i }).getAttribute('href')).toBe('/lesson/13-2');
  });
});
