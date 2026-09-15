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

describe('TestChooser', () => {
  test('walking the numeric branch reaches the independent-samples t-test', async () => {
    renderChooser();
    await userEvent.click(screen.getByRole('button', { name: /a number/i }));
    await userEvent.click(screen.getByRole('button', { name: /two groups/i }));
    await userEvent.click(screen.getByRole('button', { name: /different people/i }));
    expect(heading().textContent).toMatch(/independent-samples t-test/i);
  });

  test('the categorical branch reaches the chi-square test of independence', async () => {
    renderChooser();
    await userEvent.click(screen.getByRole('button', { name: /a category/i }));
    await userEvent.click(screen.getByRole('button', { name: /two variables/i }));
    expect(heading().textContent).toMatch(/chi-square test of independence/i);
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

    expect(answers.length).toBeGreaterThan(0);
    for (const answer of answers) {
      expect(answer.test.trim()).not.toBe('');
      expect(answer.rFunction.trim(), answer.test).not.toBe('');
      expect(answer.note.trim(), answer.test).not.toBe('');
      if (answer.lessonId !== undefined) expect(findLesson(answer.lessonId), answer.test).toBeDefined();
    }
  });

  test('choosing an option moves focus to the next heading, but landing does not', async () => {
    renderChooser();
    expect(document.activeElement).not.toBe(heading());

    await userEvent.click(screen.getByRole('button', { name: /a number/i }));
    expect(heading().textContent).toMatch(/how many groups/i);
    expect(document.activeElement).toBe(heading());
  });

  test('a single Start over returns to the first question and focuses it', async () => {
    renderChooser();
    await userEvent.click(screen.getByRole('button', { name: /a category/i }));
    await userEvent.click(screen.getByRole('button', { name: /two variables/i }));

    await userEvent.click(screen.getByRole('button', { name: /start over/i }));

    expect(heading().textContent).toMatch(/what kind of outcome/i);
    expect(document.querySelector('.test-chooser-trail')).toBeNull();
    expect(document.activeElement).toBe(heading());
  });
});
