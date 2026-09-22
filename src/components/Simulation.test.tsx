import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Simulation from './Simulation';
import { SIMULATION_NAMES } from '../sims/registry';

describe('Simulation', () => {
  test('renders a registered simulation', () => {
    render(<Simulation name="clt" />);
    expect(screen.getByText(/sample size/i)).toBeDefined();
  });

  test('reports an unregistered name instead of rendering nothing', () => {
    render(<Simulation name="nope" />);
    expect(screen.getByText(/not registered/i)).toBeDefined();
  });

  test('every simulation the spec names is registered', () => {
    expect([...SIMULATION_NAMES].sort()).toEqual([
      'ci', 'clt', 'correlation', 'distribution', 'leastsquares', 'pvalue',
    ]);
  });

  test('every registered simulation renders without crashing', () => {
    // Cheap, and it would have caught a missing CSS import or a destructuring
    // error in any of the five before a student met it.
    for (const name of SIMULATION_NAMES) {
      const { unmount } = render(<Simulation name={name} />);
      unmount();
    }
  });
});
