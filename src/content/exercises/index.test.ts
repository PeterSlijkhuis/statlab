import { describe, expect, test } from 'vitest';
import { ALL_EXERCISES, getExercise } from './index';

describe('exercise definitions', () => {
  test('ids are unique', () => {
    const ids = ALL_EXERCISES.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every exercise carries at least one wrong answer', () => {
    for (const exercise of ALL_EXERCISES) {
      expect(exercise.wrongAnswers.length, `${exercise.id} has no wrong answers`).toBeGreaterThan(0);
    }
  });

  test('every exercise carries at least one hint and a solution', () => {
    for (const exercise of ALL_EXERCISES) {
      expect(exercise.hints.length, `${exercise.id} has no hints`).toBeGreaterThan(0);
      expect(exercise.solution.trim().length, `${exercise.id} has no solution`).toBeGreaterThan(0);
    }
  });

  test('no exercise uses a function that hangs on the PostMessage channel', () => {
    const forbidden = /\b(readline|scan|menu|browser)\s*\(/;
    for (const exercise of ALL_EXERCISES) {
      const sources = [exercise.starterCode, exercise.setupCode ?? '', exercise.solution, exercise.check];
      for (const source of sources) {
        expect(forbidden.test(source), `${exercise.id} uses a blocking function`).toBe(false);
      }
    }
  });

  test('every defined exercise can be looked up, and unknown ids return undefined', () => {
    for (const exercise of ALL_EXERCISES) {
      expect(getExercise(exercise.id)).toBe(exercise);
    }
    expect(getExercise('no-such-exercise')).toBeUndefined();
  });

  test('Module 6 defines its exercises', () => {
    expect(ALL_EXERCISES.length).toBeGreaterThanOrEqual(3);
  });
});
