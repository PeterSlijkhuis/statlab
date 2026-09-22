import { fireEvent, render, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { describe, expect, test } from 'vitest';
import Distribution from './Distribution';
import { normalCdf } from './rng';

const shaded = () => screen.getByTestId('tail-probability').textContent;

describe('Distribution', () => {
  test('the shaded probability is the area to the left of the cut', () => {
    render(<Distribution />);
    // Defaults: mean 70, SD 10, cut at 70 -> exactly half the area.
    expect(shaded()).toBe('0.500');
    fireEvent.change(screen.getByLabelText(/Cut-off/), { target: { value: '90' } });
    expect(shaded()).toBe('0.977'); // pnorm(90, 70, 10)
  });

  test('the z-score readout and the shaded area never disagree', () => {
    const seen: (string | null)[] = [];
    render(
      <Profiler id="d" onRender={() => seen.push(
        `${screen.getByTestId('z-score').textContent}|${shaded()}`,
      )}>
        <Distribution />
      </Profiler>,
    );
    fireEvent.change(screen.getByLabelText(/Standard deviation/), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/Cut-off/), { target: { value: '80' } });
    for (const frame of seen) {
      const [z, p] = frame!.split('|');
      expect(Number(p)).toBeCloseTo(normalCdf(Number(z)), 3);
    }
  });

  test('changing the SD does not change the area at the mean', () => {
    // The height of the curve changes; the area to the left of the mean is
    // always 0.5. This is the point of the simulation.
    render(<Distribution />);
    for (const value of ['4', '12', '20']) {
      fireEvent.change(screen.getByLabelText(/Standard deviation/), { target: { value } });
      fireEvent.change(screen.getByLabelText(/Cut-off/), { target: { value: '70' } });
      expect(shaded()).toBe('0.500');
    }
  });

  test('the curve is described in words for screen readers', () => {
    render(<Distribution />);
    expect(screen.getByRole('img').getAttribute('aria-label'))
      .toMatch(/mean 70.*standard deviation 10.*0\.500/);
  });
});
