import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  exportProgress,
  getDraft,
  getProgress,
  hasStorageFailed,
  importProgress,
  lastVisitedLesson,
  markExercise,
  markQuiz,
  saveDraft,
  subscribeProgress,
  touchLesson,
} from './progress';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks(); // A storage spy left behind by a failing test would cascade.
});

describe('progress store', () => {
  test('starts empty with a version stamp', () => {
    expect(getProgress()).toEqual({ version: 1, lessons: {} });
  });

  test('records exercise results', () => {
    markExercise('06-1', 'm6-e1', 'passed');
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('passed');
  });

  test('a pass is never downgraded by a later attempt', () => {
    markExercise('06-1', 'm6-e1', 'passed');
    markExercise('06-1', 'm6-e1', 'attempted');
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('passed');
  });

  test('records quiz answers', () => {
    markQuiz('06-1', 'q1', true);
    expect(getProgress().lessons['06-1'].quizzes.q1).toBe(true);
  });

  test('round-trips code drafts', () => {
    saveDraft('06-1', 'block-2', 'mean(x)');
    expect(getDraft('06-1', 'block-2')).toBe('mean(x)');
  });

  test('tracks the most recently visited lesson', () => {
    touchLesson('06-1');
    touchLesson('06-2');
    expect(lastVisitedLesson()).toBe('06-2');
  });

  test('exports and re-imports progress', () => {
    markExercise('06-1', 'm6-e1', 'passed');
    const json = exportProgress();
    localStorage.clear();
    expect(importProgress(json)).toBe(true);
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('passed');
  });

  test('rejects malformed or wrong-version imports without corrupting state', () => {
    markExercise('06-1', 'm6-e1', 'passed');
    expect(importProgress('not json')).toBe(false);
    expect(importProgress(JSON.stringify({ version: 99, lessons: {} }))).toBe(false);
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('passed');
  });

  test('survives corrupt stored data by starting fresh', () => {
    localStorage.setItem('statlab.progress.v1', '{{{');
    expect(getProgress()).toEqual({ version: 1, lessons: {} });
  });

  test('works when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => markExercise('06-1', 'm6-e1', 'passed')).not.toThrow();
    spy.mockRestore();
  });

  test('a refused write is recorded, still notifies, and clears on the next good one', () => {
    const seen: string[] = [];
    const off = subscribeProgress(() => seen.push('notified'));
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('private browsing');
    });

    expect(() => markExercise('06-1', 'm6-e1', 'passed')).not.toThrow();
    expect(hasStorageFailed()).toBe(true);
    expect(seen).toHaveLength(1); // The sidebar must still repaint, just unsaved.

    spy.mockRestore();
    markExercise('06-1', 'm6-e1', 'passed');
    expect(hasStorageFailed()).toBe(false);

    off();
  });

  test('rejects an import whose version is right but whose lessons are malformed', () => {
    // The one untrusted input in the app: a file the student supplies.
    expect(importProgress(JSON.stringify({ version: 1, lessons: { '06-1': {} } }))).toBe(false);
    expect(importProgress(JSON.stringify({ version: 1, lessons: { '06-1': 'nope' } }))).toBe(false);
  });

  test('a malformed stored payload cannot make a later write throw', () => {
    localStorage.setItem('statlab.progress.v1', JSON.stringify({ version: 1, lessons: { '06-1': {} } }));
    expect(() => markExercise('06-1', 'm6-e1', 'passed')).not.toThrow();
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('passed');
  });

  test('a throwing subscriber breaks neither the write nor the other subscribers', () => {
    const seen: string[] = [];
    const offA = subscribeProgress(() => {
      throw new Error('subscriber exploded');
    });
    const offB = subscribeProgress(() => seen.push('b'));

    expect(() => markExercise('06-1', 'm6-e1', 'passed')).not.toThrow();
    expect(seen).toContain('b');
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('passed');

    offA();
    offB();
  });
});
