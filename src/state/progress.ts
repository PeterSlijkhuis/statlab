export const STORAGE_KEY = 'statlab.progress.v1';
/** Written and removed by hasStorageFailed() to test whether writes work at all. */
const PROBE_KEY = 'statlab.probe';

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
  /**
   * Local calendar days (YYYY-MM-DD) on which the student did anything, oldest
   * first, for the streak. Optional so that files exported before it existed
   * still import, and an empty store still reads as `{ version, lessons }`.
   */
  activity?: string[];
};

/** Enough for any streak worth showing, and small enough never to matter. */
const ACTIVITY_DAYS_KEPT = 120;

const empty = (): Progress => ({ version: 1, lessons: {} });

const emptyLesson = (): LessonProgress => ({ exercises: {}, quizzes: {}, drafts: {} });

const listeners = new Set<() => void>();

export function subscribeProgress(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isLessonProgress(value: unknown): value is LessonProgress {
  if (!isRecord(value)) return false;
  return isRecord(value.exercises) && isRecord(value.quizzes) && isRecord(value.drafts);
}

/**
 * Validates every lesson, not just the envelope. `importProgress` accepts a
 * file the student supplies — the only untrusted input in the app — and a
 * payload with the right version but a malformed lesson would otherwise be
 * stored and then throw out of `markExercise` on the next write.
 */
function isProgress(value: unknown): value is Progress {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (!isRecord(value.lessons)) return false;
  if (value.activity !== undefined) {
    if (!Array.isArray(value.activity) || !value.activity.every((day) => typeof day === 'string')) return false;
  }
  return Object.values(value.lessons).every(isLessonProgress);
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

let storageFailed = false;

/**
 * True once a write has been refused (Safari private browsing refuses every
 * one, and a full quota refuses later ones). Not saving is acceptable; telling
 * the student their work is saved when it is not is the part that is not, so
 * the UI needs to be able to ask.
 */
export function hasStorageFailed(): boolean {
  // A refused write stands until a later one succeeds: a full quota would let
  // a probe this small through and wrongly look healthy.
  if (storageFailed) return true;
  // Nothing written yet, so probe. A student reads the home page before doing
  // anything that saves, and that is exactly where "your progress is saved in
  // this browser" would otherwise go unchallenged. Not recorded in the flag:
  // this asks about now, and storage can be refused now and work later.
  try {
    localStorage.setItem(PROBE_KEY, '1');
    localStorage.removeItem(PROBE_KEY);
    return false;
  } catch {
    return true;
  }
}

function write(next: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    storageFailed = false;
  } catch {
    // Progress simply is not saved; never break the lesson over it.
    storageFailed = true;
  }
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // One broken subscriber must not stop the others, nor fail the write
      // it is reacting to.
    }
  }
}

/** The student's own calendar day, not UTC: a streak is about their evenings. */
export function localDay(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function recordActivity(progress: Progress): void {
  const today = localDay();
  const days = progress.activity ?? [];
  if (days[days.length - 1] === today) return;
  progress.activity = [...days.filter((day) => day !== today), today].slice(-ACTIVITY_DAYS_KEPT);
}

function update(lessonId: string, fn: (lesson: LessonProgress) => void): void {
  const progress = getProgress();
  const lesson = progress.lessons[lessonId] ?? emptyLesson();
  fn(lesson);
  progress.lessons[lessonId] = lesson;
  recordActivity(progress);
  write(progress);
}

/**
 * Consecutive active days ending today, or ending yesterday so that a streak
 * does not read as broken in the morning before the student has started.
 */
export function currentStreak(progress: Progress = getProgress(), today = new Date()): number {
  const days = new Set(progress.activity ?? []);
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDay(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
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
