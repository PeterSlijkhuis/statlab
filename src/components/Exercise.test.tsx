import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Exercise from './Exercise';
import { LessonProvider } from '../content/LessonContext';
import { getProgress } from '../state/progress';
import type { ExerciseDef } from '../r/checker';

vi.mock('./REditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="R code" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const definition: ExerciseDef = {
  id: 'm6-e1',
  prompt: 'Assign the mean of x to m.',
  starterCode: 'm <- ',
  solution: 'm <- mean(x)',
  wrongAnswers: ['m <- 0'],
  check: 'list(pass = TRUE, message = "ok")',
  hints: ['Use mean().', 'Write m <- mean(x).'],
};

vi.mock('../content/exercises', () => ({
  getExercise: (id: string) => (id === 'm6-e1' ? definition : undefined),
}));

const runExercise = vi.hoisted(() => vi.fn());
vi.mock('../r/checker', async (original) => ({
  ...(await original<typeof import('../r/checker')>()),
  runExercise,
}));

const emptyRun = { output: [], images: [], errored: false };

function renderExercise() {
  return render(
    <LessonProvider value={{ lessonId: '06-1', webR: {} as never, env: {} as never, ready: true }}>
      <Exercise id="m6-e1" />
    </LessonProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  runExercise.mockReset();
});

describe('Exercise', () => {
  test('shows the prompt and starter code', () => {
    renderExercise();
    expect(screen.getByText(/assign the mean/i)).toBeDefined();
    expect(screen.getByLabelText('R code')).toHaveProperty('value', 'm <- ');
  });

  test('a pass is recorded and announced', async () => {
    runExercise.mockResolvedValue({ status: 'pass', message: 'Correct.', run: emptyRun });
    renderExercise();
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    await waitFor(() => expect(screen.getByText('Correct.')).toBeDefined());
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('passed');
  });

  test('a failed check records an attempt, not a pass', async () => {
    runExercise.mockResolvedValue({ status: 'fail', message: 'm is 0 but should be 5.', run: emptyRun });
    renderExercise();
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    await waitFor(() => expect(screen.getByText(/should be 5/)).toBeDefined());
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('attempted');
  });

  test('a student error is shown as an R error, not as a wrong answer', async () => {
    runExercise.mockResolvedValue({
      status: 'student-error',
      message: 'Your code did not run.',
      run: { output: [{ type: 'error', data: 'could not find function' }], images: [], errored: true },
    });
    renderExercise();
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    await waitFor(() => expect(screen.getByText(/could not find function/)).toBeDefined());
    expect(screen.queryByText(/not quite/i)).toBeNull();
  });

  test('a broken check blames the exercise, never the student', async () => {
    runExercise.mockResolvedValue({ status: 'broken-check', message: 'check exploded', run: emptyRun });
    renderExercise();
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    await waitFor(() => expect(screen.getByText(/problem with this exercise/i)).toBeDefined());
    expect(getProgress().lessons['06-1']?.exercises['m6-e1']).toBeUndefined();
  });

  test('hints reveal one at a time', async () => {
    renderExercise();
    expect(screen.queryByText('Use mean().')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /hint/i }));
    expect(screen.getByText('Use mean().')).toBeDefined();
    expect(screen.queryByText('Write m <- mean(x).')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /hint/i }));
    expect(screen.getByText('Write m <- mean(x).')).toBeDefined();
  });

  test('the solution is locked until at least one attempt', async () => {
    runExercise.mockResolvedValue({ status: 'fail', message: 'Not quite.', run: emptyRun });
    renderExercise();
    expect(screen.getByRole('button', { name: /solution/i })).toHaveProperty('disabled', true);
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /solution/i })).toHaveProperty('disabled', false),
    );
  });
});
