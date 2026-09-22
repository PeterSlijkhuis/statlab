import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Profiler } from 'react';
import { describe, expect, test } from 'vitest';
import CLT from './CLT';
import { POPULATIONS } from './rng';

function readout() {
  const caption = screen.getByText(/each from n = \d+$/).textContent ?? '';
  const n = Number(caption.match(/n = (\d+)$/)?.[1]);
  const predicts = screen.getByRole('rowheader', { name: 'σ / √n predicts' });
  return { n, predicts: predicts.nextElementSibling?.textContent };
}

describe('CLT', () => {
  test('the σ / √n readout uses the same n as the sampling distribution', async () => {
    // The deferred simulation commits once with the old n and again with the
    // new one; act() flushes both, so the in-between commit is only visible
    // from inside React. Every commit must pair the caption with its own σ / √n.
    const commits: { n: number; predicts: string | null | undefined }[] = [];
    render(
      <Profiler id="clt" onRender={() => commits.push(readout())}>
        <CLT />
      </Profiler>,
    );

    fireEvent.change(screen.getByRole('slider'), { target: { value: '25' } });
    await waitFor(() => expect(screen.getByText(/each from n = 25$/)).toBeDefined());
    expect(readout().predicts).toBe((POPULATIONS.skewed.sd / 5).toFixed(2));

    expect(commits.length).toBeGreaterThan(1);
    for (const commit of commits) {
      expect(commit.predicts).toBe((POPULATIONS.skewed.sd / Math.sqrt(commit.n)).toFixed(2));
    }
  });
});
