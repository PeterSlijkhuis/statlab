import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import LeastSquares from './LeastSquares';

describe('LeastSquares', () => {
  test('the student line starts worse than the OLS line', () => {
    render(<LeastSquares />);
    expect(Number(screen.getByTestId('your-rss').textContent))
      .toBeGreaterThan(Number(screen.getByTestId('best-rss').textContent));
  });

  test('no slope the student can choose beats the revealed best', () => {
    render(<LeastSquares />);
    const best = Number(screen.getByTestId('best-rss').textContent);
    for (const value of ['-2', '-0.5', '0', '0.5', '1', '2']) {
      fireEvent.change(screen.getByLabelText(/Slope/), { target: { value } });
      expect(Number(screen.getByTestId('your-rss').textContent)).toBeGreaterThanOrEqual(best - 1e-6);
    }
  });

  test('Show the best line sets the controls to the OLS fit', () => {
    render(<LeastSquares />);
    fireEvent.click(screen.getByRole('button', { name: /Show the best line/ }));
    expect(Number(screen.getByTestId('your-rss').textContent))
      .toBeCloseTo(Number(screen.getByTestId('best-rss').textContent), 3);
  });

  test('one residual square is drawn per point, sized by its residual', () => {
    render(<LeastSquares />);
    const squares = screen.getAllByTestId('residual-square');
    expect(squares).toHaveLength(screen.getAllByTestId('point').length);
    // Area, not length: the square of the residual is what is being summed.
    const total = squares.reduce((sum, node) => sum + Number(node.getAttribute('data-area')), 0);
    expect(total).toBeCloseTo(Number(screen.getByTestId('your-rss').textContent), 3);
  });

  test('a vertical run of points reports no line rather than crashing', () => {
    render(<LeastSquares />);
    fireEvent.click(screen.getByRole('button', { name: /Stack the points/ }));
    expect(screen.getByTestId('best-rss').textContent).toMatch(/—|no line/i);
  });
});
