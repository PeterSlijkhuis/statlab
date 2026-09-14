import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';
import Sidebar from './Sidebar';
import { markExercise } from '../state/progress';

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('Sidebar', () => {
  test('lists modules and their lessons', () => {
    renderSidebar();
    expect(screen.getByRole('heading', { name: '6. Sampling' })).toBeDefined();
    expect(screen.getByText('The Central Limit Theorem')).toBeDefined();
  });

  test('links each lesson to its route', () => {
    renderSidebar();
    const link = screen.getByRole('link', { name: 'The sampling distribution' });
    expect(link.getAttribute('href')).toBe('/lesson/06-2');
  });

  test('marks a lesson as started once any exercise is attempted', () => {
    markExercise('06-1', 'm6-e1', 'attempted');
    renderSidebar();
    const link = screen.getByRole('link', { name: /why two samples never agree/i });
    expect(link.className).toContain('started');
  });
});
