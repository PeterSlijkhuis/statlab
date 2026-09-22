export type LessonMeta = {
  id: string;
  title: string;
  /** Matches the filename in src/content/lessons, without the extension. */
  file: string;
  /** Ids of the checked exercises in this lesson; completion requires all of them. */
  exercises: string[];
  /**
   * Packages this lesson's code attaches beyond the core set, installed when
   * the lesson opens and before its first code block can run. Every name must
   * be in KNOWN_PACKAGES; content.test.ts enforces it. Declaring a core
   * package is harmless and a no-op, so this lists only what would otherwise
   * not be installed at all.
   */
  packages?: string[];
};

export type ModuleMeta = {
  id: string;
  number: number;
  title: string;
  lessons: LessonMeta[];
};

/**
 * The curriculum as planned: spec §7, all fourteen modules, ids frozen.
 * A module appears in MODULES below only once every one of its lesson files
 * exists, so this list can be complete while the course is still being written.
 */
export const PLANNED_MODULES: ModuleMeta[] = [
  {
    id: 'module-01',
    number: 1,
    title: 'First steps in R',
    lessons: [
      {
        id: '01-1',
        title: 'Objects and scripts',
        file: '01-1-objects-and-scripts',
        exercises: ['m1-1-a', 'm1-1-b'],
      },
      {
        id: '01-2',
        title: 'Functions and getting help',
        file: '01-2-functions-and-help',
        exercises: ['m1-2-a', 'm1-2-b'],
      },
      {
        id: '01-3',
        title: 'Packages and library()',
        file: '01-3-packages-and-libraries',
        exercises: ['m1-3-a'],
      },
    ],
  },
  {
    id: 'module-02',
    number: 2,
    title: 'Working with data',
    lessons: [
      {
        id: '02-1',
        title: 'Reading data, and what a factor is',
        file: '02-1-reading-data',
        exercises: ['m2-1-a', 'm2-1-b'],
      },
      {
        id: '02-2',
        title: 'The pipe, and four verbs',
        file: '02-2-pipe-and-verbs',
        exercises: ['m2-2-a', 'm2-2-b'],
      },
      {
        id: '02-3',
        title: 'Wide and long',
        file: '02-3-wide-and-long',
        exercises: ['m2-3-a'],
      },
    ],
  },
  {
    id: 'module-03',
    number: 3,
    title: 'Describing data',
    lessons: [
      {
        id: '03-1',
        title: 'Summarising a column',
        file: '03-1-summaries',
        exercises: ['m3-1-a', 'm3-1-b'],
      },
      {
        id: '03-2',
        title: 'Summaries by group',
        file: '03-2-group-by',
        exercises: ['m3-2-a', 'm3-2-b'],
      },
      {
        id: '03-3',
        title: 'When the mean misleads',
        file: '03-3-mean-vs-median',
        exercises: ['m3-3-a'],
      },
    ],
  },
  {
    id: 'module-04',
    number: 4,
    title: 'Visualising data',
    lessons: [
      {
        id: '04-1',
        title: 'ggplot2 as layers',
        file: '04-1-ggplot-layers',
        exercises: ['m4-1-a'],
      },
      {
        id: '04-2',
        title: 'Comparing groups',
        file: '04-2-boxplots-and-facets',
        exercises: ['m4-2-a', 'm4-2-b'],
      },
      {
        id: '04-3',
        title: 'An APA-ready figure',
        file: '04-3-scatter-and-apa',
        exercises: ['m4-3-a'],
      },
    ],
  },
  {
    id: 'module-05',
    number: 5,
    title: 'The normal distribution',
    lessons: [
      {
        id: '05-1',
        title: 'Density and area',
        file: '05-1-density-and-area',
        exercises: ['m5-1-a'],
      },
      {
        id: '05-2',
        title: 'z-scores',
        file: '05-2-z-scores',
        exercises: ['m5-2-a', 'm5-2-b'],
      },
      {
        id: '05-3',
        title: 'Probabilities both ways',
        file: '05-3-probabilities',
        exercises: ['m5-3-a', 'm5-3-b'],
      },
    ],
  },
  {
    id: 'module-06',
    number: 6,
    title: 'Sampling',
    lessons: [
      {
        id: '06-1',
        title: 'Why two samples never agree',
        file: '06-1-samples-vary',
        exercises: ['m6-1-a'],
      },
      {
        id: '06-2',
        title: 'The sampling distribution',
        file: '06-2-sampling-distribution',
        exercises: ['m6-2-a'],
      },
      {
        id: '06-3',
        title: 'The Central Limit Theorem',
        file: '06-3-central-limit-theorem',
        exercises: ['m6-3-a'],
      },
    ],
  },
  {
    id: 'module-07',
    number: 7,
    title: 'Estimation',
    lessons: [
      {
        id: '07-1',
        title: 'From standard error to interval',
        file: '07-1-standard-error-to-interval',
        exercises: ['m7-1-a', 'm7-1-b'],
      },
      {
        id: '07-2',
        title: 'What 95 % actually means',
        file: '07-2-what-95-percent-means',
        exercises: ['m7-2-a'],
      },
      {
        id: '07-3',
        title: 'SD, SE and CI error bars',
        file: '07-3-error-bars',
        exercises: ['m7-3-a'],
      },
    ],
  },
  {
    id: 'module-08',
    number: 8,
    title: 'Hypothesis testing',
    lessons: [
      {
        id: '08-1',
        title: 'The null distribution',
        file: '08-1-null-distribution',
        exercises: ['m8-1-a'],
      },
      {
        id: '08-2',
        title: 'p-values and alpha',
        file: '08-2-p-values-and-alpha',
        exercises: ['m8-2-a', 'm8-2-b'],
      },
      {
        id: '08-3',
        title: 'Two errors, and power',
        file: '08-3-errors-and-power',
        exercises: ['m8-3-a'],
      },
    ],
  },
  {
    id: 'module-09',
    number: 9,
    title: 'Correlation and simple regression',
    lessons: [
      {
        id: '09-1',
        title: 'Seeing association',
        file: '09-1-seeing-association',
        exercises: ['m9-1-a'],
      },
      {
        id: '09-2',
        title: 'Fitting a line',
        file: '09-2-fitting-a-line',
        exercises: ['m9-2-a', 'm9-2-b'],
      },
      {
        id: '09-3',
        title: 'Reading the model',
        file: '09-3-reading-model-output',
        exercises: ['m9-3-a', 'm9-3-b'],
      },
    ],
  },
  {
    id: 'module-10',
    number: 10,
    title: 'Multiple regression',
    lessons: [
      {
        id: '10-1',
        title: 'A second predictor',
        file: '10-1-two-predictors',
        exercises: ['m10-1-a'],
      },
      {
        id: '10-2',
        title: 'Holding the others constant',
        file: '10-2-holding-constant',
        exercises: ['m10-2-a', 'm10-2-b'],
      },
      {
        id: '10-3',
        title: 'Model fit, and the APA report',
        file: '10-3-model-fit-and-reporting',
        exercises: ['m10-3-a'],
      },
    ],
  },
  {
    id: 'module-11',
    number: 11,
    title: 'Categorical predictors',
    lessons: [
      {
        id: '11-1',
        title: 'Two groups',
        file: '11-1-two-groups',
        exercises: ['m11-1-a', 'm11-1-b'],
      },
      {
        id: '11-2',
        title: 'Three or more, and dummy coding',
        file: '11-2-dummy-coding',
        exercises: ['m11-2-a', 'm11-2-b'],
      },
      {
        id: '11-3',
        title: 'Which groups differ',
        file: '11-3-pairwise-comparisons',
        exercises: ['m11-3-a'],
        packages: ['emmeans'],
      },
    ],
  },
  {
    id: 'module-12',
    number: 12,
    title: 'Interactions and factorial designs',
    lessons: [
      {
        id: '12-1',
        title: 'What an interaction is',
        file: '12-1-what-an-interaction-is',
        exercises: ['m12-1-a'],
      },
      {
        id: '12-2',
        title: 'Factorial designs',
        file: '12-2-factorial-and-type-iii',
        exercises: ['m12-2-a', 'm12-2-b'],
        packages: ['car'],
      },
      {
        id: '12-3',
        title: 'Plotting and reporting it',
        file: '12-3-interaction-plots',
        exercises: ['m12-3-a'],
      },
    ],
  },
  {
    id: 'module-13',
    number: 13,
    title: 'Repeated measures and nested data',
    lessons: [
      {
        id: '13-1',
        title: 'When independence breaks',
        file: '13-1-why-independence-breaks',
        exercises: ['m13-1-a'],
      },
      {
        id: '13-2',
        title: 'Random intercepts',
        file: '13-2-random-intercepts',
        exercises: ['m13-2-a', 'm13-2-b'],
        packages: ['lme4', 'lmerTest'],
      },
      {
        id: '13-3',
        title: 'Nesting, and the paired t-test',
        file: '13-3-nesting-and-paired-t',
        exercises: ['m13-3-a'],
        packages: ['lme4', 'lmerTest'],
      },
    ],
  },
  {
    id: 'module-14',
    number: 14,
    title: 'Binary outcomes',
    lessons: [
      {
        id: '14-1',
        title: 'Why not a linear model',
        file: '14-1-why-not-a-linear-model',
        exercises: ['m14-1-a'],
      },
      {
        id: '14-2',
        title: 'glm and log odds',
        file: '14-2-glm-and-log-odds',
        exercises: ['m14-2-a', 'm14-2-b'],
      },
      {
        id: '14-3',
        title: 'Odds ratios, and reporting',
        file: '14-3-odds-ratios-and-reporting',
        exercises: ['m14-3-a'],
      },
    ],
  },
];

/**
 * The lesson files that actually exist. Resolved by Vite at build time, which
 * is why nothing under scripts/ may read MODULES: `import.meta.glob` returns
 * {} under plain Node, and MODULES would silently come out empty.
 */
const lessonFiles = new Set(
  Object.keys(import.meta.glob('./lessons/*.mdx')).map((path) =>
    path.replace('./lessons/', '').replace('.mdx', ''),
  ),
);

/**
 * The modules a student can open. A planned module joins this list the moment
 * its last lesson file lands, which is what lets the fourteen module tasks
 * proceed without editing one shared array - and what stops a half-written
 * module appearing in the sidebar as a row of dead links.
 */
export const MODULES: ModuleMeta[] = PLANNED_MODULES.filter((module) =>
  module.lessons.every((lesson) => lessonFiles.has(lesson.file)),
);

export const ALL_LESSONS: LessonMeta[] = MODULES.flatMap((module) => module.lessons);

export function findLesson(id: string): LessonMeta | undefined {
  return ALL_LESSONS.find((lesson) => lesson.id === id);
}

export function lessonNeighbours(id: string): { previous?: LessonMeta; next?: LessonMeta } {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === id);
  if (index === -1) return {};
  return { previous: ALL_LESSONS[index - 1], next: ALL_LESSONS[index + 1] };
}
