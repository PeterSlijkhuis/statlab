import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import ChoiceBlock, { type Choice } from './ChoiceBlock';
import Predict from './Predict';
import { LessonProvider } from '../content/LessonContext';
import { getProgress } from '../state/progress';

const choices: Choice[] = [
  { text: 'It gets wider', response: 'No — more data means less variability.' },
  { text: 'It gets narrower', correct: true, response: 'Right: the standard error shrinks as n grows.' },
];

function wrap(ui: React.ReactNode) {
  return render(
    <LessonProvider value={{ lessonId: '06-2', webR: null, env: null, ready: true }}>{ui}</LessonProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('ChoiceBlock', () => {
  test('hides every response until the student commits', () => {
    wrap(<ChoiceBlock id="p1" kind="predict" question="What happens?" choices={choices} />);
    expect(screen.queryByText(/standard error shrinks/i)).toBeNull();
    expect(screen.queryByText(/more data means/i)).toBeNull();
  });

  test('reveals only the chosen response after committing', async () => {
    wrap(<ChoiceBlock id="p1" kind="predict" question="What happens?" choices={choices} />);
    await userEvent.click(screen.getByRole('button', { name: /it gets wider/i }));
    expect(screen.getByText(/more data means/i)).toBeDefined();
    expect(screen.queryByText(/standard error shrinks/i)).toBeNull();
  });

  test('marks the correct choice once answered', async () => {
    wrap(<ChoiceBlock id="q1" kind="quiz" question="What happens?" choices={choices} />);
    await userEvent.click(screen.getByRole('button', { name: /it gets narrower/i }));
    expect(screen.getByText(/correct/i)).toBeDefined();
  });

  test('records a quiz result but not a prediction', async () => {
    wrap(<ChoiceBlock id="q1" kind="quiz" question="Q" choices={choices} />);
    await userEvent.click(screen.getByRole('button', { name: /it gets narrower/i }));
    expect(getProgress().lessons['06-2'].quizzes.q1).toBe(true);

    wrap(<Predict id="p9" question="Q" choices={choices} />);
    await userEvent.click(screen.getAllByRole('button', { name: /it gets narrower/i })[1]);
    expect(getProgress().lessons['06-2'].quizzes.p9).toBeUndefined();
  });

  test('cannot be answered twice', async () => {
    wrap(<ChoiceBlock id="q2" kind="quiz" question="Q" choices={choices} />);
    await userEvent.click(screen.getByRole('button', { name: /it gets wider/i }));
    expect(screen.getByRole('button', { name: /it gets narrower/i })).toHaveProperty('disabled', true);
  });
});
