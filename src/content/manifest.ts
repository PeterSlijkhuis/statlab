export type LessonMeta = {
  id: string;
  title: string;
  /** Matches the filename in src/content/lessons, without the extension. */
  file: string;
};

export type ModuleMeta = {
  id: string;
  number: number;
  title: string;
  lessons: LessonMeta[];
};

export const MODULES: ModuleMeta[] = [
  {
    id: 'module-06',
    number: 6,
    title: 'Sampling',
    lessons: [
      { id: '06-1', title: 'Why two samples never agree', file: '06-1-samples-vary' },
      { id: '06-2', title: 'The sampling distribution', file: '06-2-sampling-distribution' },
      { id: '06-3', title: 'The Central Limit Theorem', file: '06-3-central-limit-theorem' },
    ],
  },
];

export const ALL_LESSONS: LessonMeta[] = MODULES.flatMap((module) => module.lessons);

export function findLesson(id: string): LessonMeta | undefined {
  return ALL_LESSONS.find((lesson) => lesson.id === id);
}

export function lessonNeighbours(id: string): { previous?: LessonMeta; next?: LessonMeta } {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === id);
  if (index === -1) return {};
  return { previous: ALL_LESSONS[index - 1], next: ALL_LESSONS[index + 1] };
}
