export const STORAGE_KEY = 'statlab.progress.v1';

export type ExerciseStatus = 'attempted' | 'passed';

export type LessonProgress = {
  exercises: Record<string, ExerciseStatus>;
  quizzes: Record<string, boolean>;
  drafts: Record<string, string>;
  visitedAt?: string;
};

export type Progress = {
  version: 1;
  lessons: Record<string, LessonProgress>;
};

const empty = (): Progress => ({ version: 1, lessons: {} });

const emptyLesson = (): LessonProgress => ({ exercises: {}, quizzes: {}, drafts: {} });

const listeners = new Set<() => void>();

export function subscribeProgress(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function isProgress(value: unknown): value is Progress {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Progress>;
  return candidate.version === 1 && typeof candidate.lessons === 'object' && candidate.lessons !== null;
}

export function getProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed: unknown = JSON.parse(raw);
    return isProgress(parsed) ? parsed : empty();
  } catch {
    // Unavailable, blocked, or corrupt storage: the app still works, unsaved.
    return empty();
  }
}

function write(next: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Progress simply is not saved; never break the lesson over it.
  }
  for (const fn of listeners) fn();
}

function update(lessonId: string, fn: (lesson: LessonProgress) => void): void {
  const progress = getProgress();
  const lesson = progress.lessons[lessonId] ?? emptyLesson();
  fn(lesson);
  progress.lessons[lessonId] = lesson;
  write(progress);
}

export function markExercise(lessonId: string, exerciseId: string, status: ExerciseStatus): void {
  update(lessonId, (lesson) => {
    // A pass is permanent: re-opening a solved exercise must not undo it.
    if (lesson.exercises[exerciseId] === 'passed') return;
    lesson.exercises[exerciseId] = status;
  });
}

export function markQuiz(lessonId: string, quizId: string, correct: boolean): void {
  update(lessonId, (lesson) => {
    lesson.quizzes[quizId] = correct;
  });
}

export function saveDraft(lessonId: string, blockId: string, code: string): void {
  update(lessonId, (lesson) => {
    lesson.drafts[blockId] = code;
  });
}

export function getDraft(lessonId: string, blockId: string): string | undefined {
  return getProgress().lessons[lessonId]?.drafts[blockId];
}

export function touchLesson(lessonId: string): void {
  update(lessonId, (lesson) => {
    lesson.visitedAt = new Date().toISOString();
  });
}

export function lastVisitedLesson(): string | undefined {
  const entries = Object.entries(getProgress().lessons)
    .filter(([, lesson]) => lesson.visitedAt)
    .sort(([, a], [, b]) => (a.visitedAt! < b.visitedAt! ? 1 : -1));
  return entries[0]?.[0];
}

export function exportProgress(): string {
  return JSON.stringify(getProgress(), null, 2);
}

export function importProgress(json: string): boolean {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isProgress(parsed)) return false;
    write(parsed);
    return true;
  } catch {
    return false;
  }
}
