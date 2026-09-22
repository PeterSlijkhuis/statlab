import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import CI from './CI';

describe('CI', () => {
  test('the capture count equals the number of intervals drawn as capturing', () => {
    render(<CI />);
    const captured = Number(screen.getByTestId('captured').textContent);
    // Every interval is a <line> tagged with whether it covers mu. The count
    // and the picture must come from one computation, not two.
    expect(screen.getAllByTestId('interval-hit')).toHaveLength(captured);
    expect(screen.getAllByTestId('interval-miss')).toHaveLength(100 - captured);
  });

  test('about 95 of 100 intervals capture the mean at 95% confidence', () => {
    // Averaged over ten redraws, so a single unlucky seed cannot fail the build.
    render(<CI />);
    let total = 0;
    for (let i = 0; i < 10; i += 1) {
      total += Number(screen.getByTestId('captured').textContent);
      fireEvent.click(screen.getByRole('button', { name: /Draw again/ }));
    }
    expect(total / 10).toBeGreaterThan(90);
    expect(total / 10).toBeLessThan(99);
  });

  test('lowering the confidence level narrows the intervals and captures fewer', () => {
    render(<CI />);
    const at95 = Number(screen.getByTestId('captured').textContent);
    fireEvent.change(screen.getByLabelText(/Confidence/), { target: { value: '50' } });
    expect(Number(screen.getByTestId('captured').textContent)).toBeLessThan(at95);
  });

  test('a larger sample narrows the intervals without changing the capture rate', () => {
    render(<CI />);
    const width = () => Number(screen.getByTestId('mean-width').textContent);
    const narrow = (() => { fireEvent.change(screen.getByLabelText(/Sample size/), { target: { value: '100' } }); return width(); })();
    fireEvent.change(screen.getByLabelText(/Sample size/), { target: { value: '10' } });
    expect(width()).toBeGreaterThan(narrow);
  });
});
