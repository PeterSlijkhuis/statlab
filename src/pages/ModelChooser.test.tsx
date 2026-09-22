import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { findLesson } from '../content/manifest';
import ModelChooser, { TREE, type Node } from './ModelChooser';

function renderChooser() {
  return render(
    <StrictMode>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ModelChooser />
      </MemoryRouter>
    </StrictMode>,
  );
}

function heading() {
  return screen.getByRole('heading', { level: 2 });
}

// Written out by hand, not derived from TREE: a path that silently disappears
// from the tree must fail here.
const PATHS: { clicks: RegExp[]; model: string; code: string; lessonId: string }[] = [
  {
    clicks: [/^a number/i, /different people/i, /one continuous predictor/i],
    model: 'Simple linear regression',
    code: 'lm(outcome ~ predictor, data = d)',
    lessonId: '09-2',
  },
  {
    clicks: [/^a number/i, /different people/i, /several predictors/i],
    model: 'Multiple linear regression',
    code: 'outcome ~ predictor1 + predictor2',
    lessonId: '10-1',
  },
  {
    clicks: [/^a number/i, /different people/i, /with two groups/i],
    model: 'Linear model with a two-group predictor',
    code: 'group_by(group) %>% summarise(',
    lessonId: '11-1',
  },
  {
    clicks: [/^a number/i, /different people/i, /three or more groups/i],
    model: 'Linear model with a categorical predictor',
    code: 'emmeans(model, pairwise ~ group, adjust = "tukey")',
    lessonId: '11-2',
  },
  {
    clicks: [/^a number/i, /different people/i, /two grouping variables/i],
    model: 'Linear model with an interaction (factorial design)',
    code: 'contrasts = list(factor1 = contr.sum, factor2 = contr.sum)',
    lessonId: '12-2',
  },
  {
    clicks: [/^a number/i, /measured more than once/i],
    model: 'Linear mixed-effects model',
    code: 'pivot_longer',
    lessonId: '13-2',
  },
  {
    clicks: [/^a number/i, /teams, classes or sites/i],
    model: 'Linear mixed-effects model with a grouping factor',
    code: '(1 | site)',
    lessonId: '13-3',
  },
  {
    clicks: [/^yes or no/i],
    model: 'Logistic regression',
    code: 'family = binomial',
    lessonId: '14-2',
  },
];

describe('ModelChooser', () => {
  test('lands on the first question under the page title', () => {
    renderChooser();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Which model should I use?');
    expect(heading().textContent).toBe('What kind of outcome are you analysing?');
  });

  test.each(PATHS)('reaches $model', async ({ clicks, model, code }) => {
    renderChooser();
    for (const name of clicks) {
      await userEvent.click(screen.getByRole('button', { name }));
    }
    expect(heading().textContent).toBe(model);
    expect(document.querySelector('.model-chooser-answer pre code')?.textContent).toContain(code);
    expect(screen.getByText('Check first:')).toBeTruthy();
  });

  test('the traditional name is shown only when the leaf has one', async () => {
    renderChooser();
    await userEvent.click(screen.getByRole('button', { name: /^a number/i }));
    await userEvent.click(screen.getByRole('button', { name: /different people/i }));
    await userEvent.click(screen.getByRole('button', { name: /with two groups/i }));
    expect(screen.getByText('Traditional name:')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /start over/i }));
    await userEvent.click(screen.getByRole('button', { name: /^a number/i }));
    await userEvent.click(screen.getByRole('button', { name: /different people/i }));
    await userEvent.click(screen.getByRole('button', { name: /several predictors/i }));
    expect(screen.queryByText('Traditional name:')).toBeNull();
  });

  test('every node in the tree is well formed', () => {
    const answers: Extract<Node, { kind: 'answer' }>[] = [];
    function walk(node: Node) {
      if (node.kind === 'answer') {
        answers.push(node);
        return;
      }
      expect(node.options.length, node.text).toBeGreaterThanOrEqual(2);
      const labels = node.options.map((option) => option.label);
      expect(new Set(labels).size, node.text).toBe(labels.length);
      node.options.forEach((option) => walk(option.next));
    }
    walk(TREE);

    expect(answers.length).toBe(PATHS.length);
    for (const answer of answers) {
      expect(answer.model.trim()).not.toBe('');
      expect(answer.rCode.trim(), answer.model).not.toBe('');
      expect(answer.check.trim(), answer.model).not.toBe('');
      expect(answer.note.trim(), answer.model).not.toBe('');
      if (answer.traditional !== undefined) expect(answer.traditional.trim(), answer.model).not.toBe('');
      if (answer.lessonId !== undefined) expect(findLesson(answer.lessonId), answer.model).toBeDefined();
    }
  });

  test('every snippet attaches the package its pipes and verbs come from', () => {
    // broom does not export %>%, so a snippet pasted into a fresh session must attach it.
    const snippets: { model: string; rCode: string }[] = [];
    (function walk(node: Node) {
      if (node.kind === 'answer') snippets.push(node);
      else node.options.forEach((option) => walk(option.next));
    })(TREE);

    for (const { model, rCode } of snippets) {
      // tidyr re-exports %>% but not the dplyr verbs.
      if (/%>%/.test(rCode)) {
        expect(/library\((dplyr|tidyr)\)/.test(rCode), model).toBe(true);
      }
      if (/group_by\(|summarise\(|mutate\(/.test(rCode)) {
        expect(/library\(dplyr\)/.test(rCode), model).toBe(true);
      }
    }
  });

  test('choosing an option moves focus to the next heading, but landing does not', async () => {
    renderChooser();
    expect(document.activeElement).not.toBe(heading());

    await userEvent.click(screen.getByRole('button', { name: /^a number/i }));
    expect(heading().textContent).toMatch(/how were the scores collected/i);
    expect(document.activeElement).toBe(heading());
  });

  test('a single Start over returns to the first question and focuses it', async () => {
    renderChooser();
    await userEvent.click(screen.getByRole('button', { name: /^yes or no/i }));

    await userEvent.click(screen.getByRole('button', { name: /start over/i }));

    expect(heading().textContent).toMatch(/what kind of outcome/i);
    expect(document.querySelector('.model-chooser-trail')).toBeNull();
    expect(document.activeElement).toBe(heading());
  });
});

describe('leaf links', () => {
  test.each(PATHS)('$model links to lesson $lessonId', async ({ clicks, lessonId }) => {
    renderChooser();
    for (const name of clicks) {
      await userEvent.click(screen.getByRole('button', { name }));
    }
    const link = screen.getByRole('link', { name: /go to the lesson/i });
    expect(link.getAttribute('href')).toBe(`/lesson/${lessonId}`);
  });

  test('every leaf of the tree links to a lesson', () => {
    // Spec 4.2: the chooser "links each leaf to the lesson that teaches it".
    // A leaf with no lessonId is a dead end for the student who reached it.
    const answers: Extract<Node, { kind: 'answer' }>[] = [];
    (function walk(node: Node) {
      if (node.kind === 'answer') answers.push(node);
      else node.options.forEach((option) => walk(option.next));
    })(TREE);

    expect(answers.length).toBe(PATHS.length);
    for (const answer of answers) {
      expect(answer.lessonId, `${answer.model} has no lessonId`).toBeDefined();
    }
  });

  test('every lessonId resolves to a lesson a student can open', () => {
    // findLesson reads MODULES, which holds a module only once all its lesson
    // files exist. This test therefore also proves Modules 9 to 14 are complete.
    (function walk(node: Node) {
      if (node.kind === 'answer') {
        if (node.lessonId) {
          expect(findLesson(node.lessonId), `${node.model} -> ${node.lessonId}`).toBeDefined();
        }
        return;
      }
      node.options.forEach((option) => walk(option.next));
    })(TREE);
  });

  test('the link names the lesson it goes to', async () => {
    renderChooser();
    await userEvent.click(screen.getByRole('button', { name: /^yes or no/i }));
    expect(screen.getByRole('link', { name: /go to the lesson: glm and log odds/i })).toBeTruthy();
  });
});
