import { describe, expect, test } from 'vitest';
import { ALL_EXERCISES, getExercise } from './index';
import { ALL_LESSONS } from '../manifest';

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

  test('every exercise belongs to a lesson, and every lesson exercise is defined', () => {
    // An orphan is never shown to a student, so nothing else would notice it.
    const inLessons = new Set(ALL_LESSONS.flatMap((lesson) => lesson.exercises));
    expect([...inLessons].sort(), 'manifest lesson exercises and ALL_EXERCISES disagree').toEqual(ALL_EXERCISES.map((exercise) => exercise.id).sort());
  });

  test('checks read student objects only through has_answer() and answer()', () => {
    // exists()/get() inherit from the lesson environment, where lesson code has
    // already created the objects an exercise asks for (spec §5.1).
    for (const exercise of ALL_EXERCISES) {
      expect(exercise.check, `${exercise.id} calls exists(), get() or get0() directly`).not.toMatch(
        /\b(exists|get|get0)\s*\(/,
      );
    }
  });

  test('Module 6 defines its exercises', () => {
    expect(ALL_EXERCISES.length).toBeGreaterThanOrEqual(3);
  });
});
