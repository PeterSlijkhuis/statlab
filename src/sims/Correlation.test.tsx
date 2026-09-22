import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Correlation from './Correlation';
import { fitLine } from './rng';

describe('Correlation', () => {
  test('the answer is hidden until the student commits', () => {
    render(<Correlation />);
    expect(screen.queryByTestId('actual-r')).toBeNull();
    fireEvent.change(screen.getByLabelText(/Your guess/), { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
    expect(screen.getByTestId('actual-r')).toBeDefined();
  });

  test('the revealed r is the r of the points on screen', () => {
    render(<Correlation />);
    fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
    const shown = Number(screen.getByTestId('actual-r').textContent);
    const points = screen.getAllByTestId('point').map((node) => ({
      x: Number(node.getAttribute('data-x')), y: Number(node.getAttribute('data-y')),
    }));
    expect(fitLine(points).r).toBeCloseTo(shown, 2);
  });

  test('a new round hides the answer again and changes the points', () => {
    render(<Correlation />);
    fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
    const first = screen.getByTestId('actual-r').textContent;
    fireEvent.click(screen.getByRole('button', { name: /Next scatterplot/ }));
    expect(screen.queryByTestId('actual-r')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
    expect(screen.getByTestId('actual-r').textContent).not.toBe(first);
  });

  test('the running score counts every completed round', () => {
    render(<Correlation />);
    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Reveal/ }));
      fireEvent.click(screen.getByRole('button', { name: /Next scatterplot/ }));
    }
    expect(screen.getByTestId('rounds').textContent).toBe('3');
  });
});
