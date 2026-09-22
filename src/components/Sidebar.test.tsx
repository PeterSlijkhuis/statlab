import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Sidebar from './Sidebar';
import type { ModuleMeta } from '../content/manifest';
import { markExercise, touchLesson } from '../state/progress';

// The real manifest gives each lesson one exercise. Tests that need a lesson
// with several exercises, or none, swap in their own modules here.
const manifestOverride = vi.hoisted(() => ({ modules: null as ModuleMeta[] | null }));
vi.mock('../content/manifest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../content/manifest')>();
  return {
    ...actual,
    get MODULES() {
      return manifestOverride.modules ?? actual.MODULES;
    },
  };
});

function renderSidebar() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Sidebar />
    </MemoryRouter>,
  );
}

function useSyntheticLesson(exercises: string[]) {
  manifestOverride.modules = [
    {
      id: 'module-x',
      number: 9,
      title: 'Synthetic',
      lessons: [{ id: 'x-1', title: 'Synthetic lesson', file: 'x-1', exercises }],
    },
  ];
}

beforeEach(() => {
  localStorage.clear();
  manifestOverride.modules = null;
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

  test('shows a lesson as complete as soon as its exercise is passed, without a re-render', () => {
    renderSidebar();
    act(() => markExercise('06-1', 'm6-1-a', 'passed'));
    const link = screen.getByRole('link', { name: /why two samples never agree/i });
    expect(link.className).toContain('complete');
  });

  test('a lesson is not complete while some of its exercises are unpassed', () => {
    useSyntheticLesson(['a', 'b', 'c']);
    markExercise('x-1', 'a', 'passed');
    renderSidebar();
    const link = screen.getByRole('link', { name: 'Synthetic lesson' });
    expect(link.className).toContain('started');
    expect(link.className).not.toContain('complete');
  });

  test('a lesson with no exercises is complete once visited', () => {
    useSyntheticLesson([]);
    touchLesson('x-1');
    renderSidebar();
    const link = screen.getByRole('link', { name: 'Synthetic lesson' });
    expect(link.className).toContain('complete');
  });
});
