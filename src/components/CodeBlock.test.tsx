import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import CodeBlock, { R_STOPPED_MESSAGE } from './CodeBlock';
import { LessonProvider } from '../content/LessonContext';
import { getDraft } from '../state/progress';

vi.mock('./REditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="R code" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const evaluateR = vi.hoisted(() => vi.fn());
vi.mock('../r/evaluate', () => ({ evaluateR }));

function renderBlock(ready = true) {
  return render(
    <LessonProvider value={{ lessonId: '06-1', webR: {} as never, env: {} as never, ready }}>
      <CodeBlock id="b1" code="1 + 1" />
    </LessonProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  evaluateR.mockReset();
  evaluateR.mockResolvedValue({ output: [{ type: 'stdout', data: '[1] 2' }], images: [], errored: false });
});

describe('CodeBlock', () => {
  test('shows the starter code', () => {
    renderBlock();
    expect(screen.getByLabelText('R code')).toHaveProperty('value', '1 + 1');
  });

  test('runs the code and shows the output', async () => {
    renderBlock();
    await userEvent.click(screen.getByRole('button', { name: /run/i }));
    await waitFor(() => expect(screen.getByText('[1] 2')).toBeDefined());
    expect(evaluateR).toHaveBeenCalledOnce();
  });

  test('disables running until R is ready', () => {
    renderBlock(false);
    expect(screen.getByRole('button', { name: /run/i })).toHaveProperty('disabled', true);
  });

  test('persists edits as a draft', async () => {
    renderBlock();
    await userEvent.clear(screen.getByLabelText('R code'));
    await userEvent.type(screen.getByLabelText('R code'), 'mean(x)');
    await waitFor(() => expect(getDraft('06-1', 'b1')).toBe('mean(x)'));
  });

  test('a fresh mount initialises from the saved draft, not the starter code', async () => {
    const first = renderBlock();
    await userEvent.clear(screen.getByLabelText('R code'));
    await userEvent.type(screen.getByLabelText('R code'), 'sd(x)');
    await waitFor(() => expect(getDraft('06-1', 'b1')).toBe('sd(x)'));

    // Unmount before re-rendering, so the assertion below can only be
    // satisfied by state initialised from storage on the new mount.
    first.unmount();

    renderBlock();
    expect(screen.getByLabelText('R code')).toHaveProperty('value', 'sd(x)');
  });

  test('reset restores the starter code', async () => {
    renderBlock();
    await userEvent.clear(screen.getByLabelText('R code'));
    await userEvent.type(screen.getByLabelText('R code'), 'nonsense');
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByLabelText('R code')).toHaveProperty('value', '1 + 1');
  });

  test('a rejected evaluation (worker crash) shows an explanation and resets the button', async () => {
    evaluateR.mockReset();
    evaluateR.mockRejectedValue(new Error('worker died'));
    renderBlock();
    await userEvent.click(screen.getByRole('button', { name: /run/i }));
    // OutputPane prefixes error lines with "Error: ", so match the message as
    // a substring rather than the exact node text.
    await waitFor(() =>
      expect(screen.getByText(R_STOPPED_MESSAGE, { exact: false })).toBeDefined(),
    );
    expect(screen.getByRole('button', { name: /run/i })).toHaveProperty('disabled', false);
  });
});
