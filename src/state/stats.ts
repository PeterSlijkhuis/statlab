import { ALL_LESSONS, MODULES, type LessonMeta, type ModuleMeta } from '../content/manifest';
import { currentStreak, type Progress } from './progress';

export type LessonStatus = 'new' | 'started' | 'complete';

/**
 * Complete means every exercise the lesson contains is passed, not merely
 * every exercise the student happens to have touched. A lesson with no
 * exercises is complete once visited.
 */
export function lessonStatus(lesson: LessonMeta, progress: Progress): LessonStatus {
  const record = progress.lessons[lesson.id];
  if (!record) return 'new';
  const complete =
    lesson.exercises.length === 0
      ? Boolean(record.visitedAt)
      : lesson.exercises.every((id) => record.exercises[id] === 'passed');
  return complete ? 'complete' : 'started';
}

export function exercisesPassed(lesson: LessonMeta, progress: Progress): number {
  const record = progress.lessons[lesson.id];
  return record ? lesson.exercises.filter((id) => record.exercises[id] === 'passed').length : 0;
}

export function moduleProgress(module: ModuleMeta, progress: Progress): { done: number; total: number } {
  return {
    done: module.lessons.filter((lesson) => lessonStatus(lesson, progress) === 'complete').length,
    total: module.lessons.length,
  };
}

/** What each thing is worth, so the numbers on screen add up the same way everywhere. */
export const POINTS = { exercise: 10, quiz: 5, lesson: 20 } as const;

export type CourseStats = {
  lessonsComplete: number;
  lessonsTotal: number;
  exercisesPassed: number;
  exercisesTotal: number;
  points: number;
  streak: number;
};

export function courseStats(progress: Progress): CourseStats {
  const lessonsComplete = ALL_LESSONS.filter((lesson) => lessonStatus(lesson, progress) === 'complete').length;
  const passed = ALL_LESSONS.reduce((sum, lesson) => sum + exercisesPassed(lesson, progress), 0);
  const quizzesRight = Object.values(progress.lessons).reduce(
    (sum, lesson) => sum + Object.values(lesson.quizzes).filter(Boolean).length,
    0,
  );
  return {
    lessonsComplete,
    lessonsTotal: ALL_LESSONS.length,
    exercisesPassed: passed,
    exercisesTotal: ALL_LESSONS.reduce((sum, lesson) => sum + lesson.exercises.length, 0),
    points: passed * POINTS.exercise + quizzesRight * POINTS.quiz + lessonsComplete * POINTS.lesson,
    streak: currentStreak(progress),
  };
}

/** The first lesson not yet complete, for a student with no lesson to resume. */
export function firstUnfinished(progress: Progress): LessonMeta | undefined {
  return ALL_LESSONS.find((lesson) => lessonStatus(lesson, progress) !== 'complete');
}

export function moduleOf(lessonId: string): ModuleMeta | undefined {
  return MODULES.find((module) => module.lessons.some((lesson) => lesson.id === lessonId));
}
