import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Simulation from './Simulation';

describe('Simulation', () => {
  test('renders a registered simulation', () => {
    render(<Simulation name="clt" />);
    expect(screen.getByText(/sample size/i)).toBeDefined();
  });

  test('reports an unregistered name instead of rendering nothing', () => {
    render(<Simulation name="nope" />);
    expect(screen.getByText(/not registered/i)).toBeDefined();
  });
});
