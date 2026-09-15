import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { findLesson } from '../content/manifest';
import TestChooser, { TREE, type Node } from './TestChooser';

function renderChooser() {
  return render(
    <StrictMode>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TestChooser />
      </MemoryRouter>
    </StrictMode>,
  );
}

function heading() {
  return screen.getByRole('heading', { level: 2 });
}

// Written out by hand, not derived from TREE: a path that silently disappears
// from the tree must fail here.
const PATHS: { clicks: RegExp[]; model: string; code: string }[] = [
  {
    clicks: [/^a number/i, /different people/i, /one continuous predictor/i],
    model: 'Simple linear regression',
    code: 'lm(outcome ~ predictor, data = d)',
  },
  {
    clicks: [/^a number/i, /different people/i, /several predictors/i],
    model: 'Multiple linear regression',
    code: 'outcome ~ predictor1 + predictor2',
  },
  {
    clicks: [/^a number/i, /different people/i, /with two groups/i],
    model: 'Linear model with a two-group predictor',
    code: 'group_by(group) %>% summarise(',
  },
  {
    clicks: [/^a number/i, /different people/i, /three or more groups/i],
    model: 'Linear model with a categorical predictor',
    code: 'emmeans(model, pairwise ~ group, adjust = "tukey")',
  },
  {
    clicks: [/^a number/i, /different people/i, /two grouping variables/i],
    model: 'Linear model with an interaction (factorial design)',
    code: 'Anova(model, type = "III")',
  },
  {
    clicks: [/^a number/i, /measured more than once/i],
    model: 'Linear mixed-effects model',
    code: 'pivot_longer',
  },
  {
    clicks: [/^a number/i, /teams, classes or sites/i],
    model: 'Linear mixed-effects model with a grouping factor',
    code: '(1 | site)',
  },
  {
    clicks: [/^yes or no/i],
    model: 'Logistic regression',
    code: 'family = binomial',
  },
];

describe('TestChooser', () => {
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
    expect(document.querySelector('.test-chooser-answer pre code')?.textContent).toContain(code);
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
    expect(document.querySelector('.test-chooser-trail')).toBeNull();
    expect(document.activeElement).toBe(heading());
  });
});
