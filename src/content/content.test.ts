import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { ALL_LESSONS, MODULES, PLANNED_MODULES } from './manifest';
import { ALL_EXERCISES, getExercise } from './exercises';
import { module01 } from './exercises/module-01';
import { module02 } from './exercises/module-02';
import { module03 } from './exercises/module-03';
import { module04 } from './exercises/module-04';
import { module05 } from './exercises/module-05';
import { module07 } from './exercises/module-07';
import { module08 } from './exercises/module-08';
import { mdxComponents } from './mdxComponents';
import { SIMULATION_NAMES } from '../sims/registry';

const compiled = import.meta.glob('./lessons/*.mdx', { eager: true });
// Read from disk rather than via `?raw`: the MDX plugin compiles `x.mdx?raw` too.
// Paths, not URLs: under jsdom the global URL is not the one node:fs accepts, and
// Vite rewrites new URL('.', import.meta.url) to an http: URL.
const lessonDir = join(dirname(fileURLToPath(import.meta.url)), 'lessons');
const sources: Record<string, string> = Object.fromEntries(
  readdirSync(lessonDir)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => [`./lessons/${file}`, readFileSync(join(lessonDir, file), 'utf8').replace(/\r\n?/g, '\n')]),
);

/**
 * The value of `attribute` in every `<tag …>` in source, as `id="…"`, `id='…'`
 * or `id={"…"}` in any position. A tag whose attribute cannot be read yields
 * `undefined`, so callers can fail on it rather than skip it.
 */
function tagAttributes(source: string, tag: string, attribute: string): (string | undefined)[] {
  const value = new RegExp(`\\b${attribute}=(?:"([^"]*)"|'([^']*)'|\\{"([^"]*)"\\})`);
  return [...source.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map((match) => {
    const found = match[0].match(value);
    return found ? (found[1] ?? found[2] ?? found[3]) : undefined;
  });
}

/** The R inside every `<CodeBlock code={`…`} />` — the only R in a lesson that runs. */
function lessonCode(source: string): string {
  return [...source.matchAll(/code=\{`([\s\S]*?)`\}/g)].map((match) => match[1]).join('\n');
}

/** Every `id="…"`, `id='…'` or `id={"…"}` anywhere in source. */
function allIds(source: string): string[] {
  return [...source.matchAll(/\bid=(?:"([^"]*)"|'([^']*)'|\{"([^"]*)"\})/g)].map(
    (match) => match[1] ?? match[2] ?? match[3],
  );
}

describe('lesson content', () => {
  test('every lesson in the manifest has a file', () => {
    for (const lesson of ALL_LESSONS) {
      expect(sources[`./lessons/${lesson.file}.mdx`], `missing file for ${lesson.id}`).toBeDefined();
    }
  });

  test('every lesson file compiles to a component', () => {
    // Guards against the glob matching nothing, which would make the loop below pass vacuously.
    expect(Object.keys(compiled).length).toBe(Object.keys(sources).length);
    expect(Object.keys(compiled).length).toBeGreaterThan(0);
    for (const [path, module] of Object.entries(compiled)) {
      expect(typeof (module as { default: unknown }).default, `${path} did not compile`).toBe('function');
    }
  });

  test('every capitalised tag is a known component', () => {
    // A misspelt component (<Simulaton />) compiles, then crashes the page at render.
    for (const [path, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/<([A-Z]\w*)/g)) {
        expect(Object.keys(mdxComponents), `${path} uses unknown component <${match[1]}>`).toContain(match[1]);
      }
    }
  });

  test('every referenced simulation is registered', () => {
    for (const [path, source] of Object.entries(sources)) {
      const names = tagAttributes(source, 'Simulation', 'name');
      expect(names.length, `${path}: a <Simulation> tag could not be parsed`).toBe(source.match(/<Simulation\b/g)?.length ?? 0);
      for (const name of names) {
        expect(name, `${path} has a <Simulation> whose name could not be read`).toBeDefined();
        expect(SIMULATION_NAMES, `${path} references simulation "${name}"`).toContain(name);
      }
    }
  });

  test('every referenced exercise is defined', () => {
    for (const [path, source] of Object.entries(sources)) {
      const ids = tagAttributes(source, 'Exercise', 'id');
      expect(ids.length, `${path}: an <Exercise> tag could not be parsed`).toBe(source.match(/<Exercise\b/g)?.length ?? 0);
      for (const id of ids) {
        expect(id, `${path} has an <Exercise> whose id could not be read`).toBeDefined();
        expect(getExercise(id!), `${path} references exercise "${id}"`).toBeDefined();
      }
    }
  });

  test('block ids are unique within each lesson', () => {
    // Progress is keyed by lesson id plus block id, so two blocks sharing an id
    // in one lesson silently overwrite each other's saved draft or quiz result.
    // Nothing at runtime can detect this; an author would just see answers go
    // missing.
    for (const [path, source] of Object.entries(sources)) {
      const ids = allIds(source);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      expect(duplicates, `${path} reuses block id(s): ${[...new Set(duplicates)].join(', ')}`).toEqual([]);
    }
  });

  test('each lesson lists exactly the exercises its MDX contains', () => {
    // The sidebar marks a lesson complete only when every exercise listed in the
    // manifest is passed. If the list and the lesson's <Exercise> blocks drift
    // apart, a lesson either can never be completed or is marked complete early.
    for (const lesson of ALL_LESSONS) {
      const source = sources[`./lessons/${lesson.file}.mdx`] ?? '';
      const inMdx = tagAttributes(source, 'Exercise', 'id').sort();
      expect(inMdx, `${lesson.id}: manifest exercises disagree with its MDX`).toEqual([...lesson.exercises].sort());
    }
  });

  test('no lesson uses a function that hangs on the PostMessage channel', () => {
    const forbidden = /\b(readline|scan|menu|browser)\s*\(/;
    for (const [path, source] of Object.entries(sources)) {
      expect(forbidden.test(source), `${path} uses a blocking function`).toBe(false);
    }
  });

  test('every dataset referenced in a lesson exists in the mount list', async () => {
    const { DATASET_FILES } = await import('../r/session');
    for (const [path, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/data\/([\w-]+\.csv)/g)) {
        expect(DATASET_FILES as readonly string[], `${path} reads ${match[1]}`).toContain(match[1]);
      }
    }
  });

  test('every planned lesson has a unique id and a unique file', () => {
    const ids = PLANNED_MODULES.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    const files = PLANNED_MODULES.flatMap((module) => module.lessons.map((lesson) => lesson.file));
    expect([...new Set(ids)].length, `duplicate lesson id(s)`).toBe(ids.length);
    expect([...new Set(files)].length, `two lessons share a file`).toBe(files.length);
  });

  test('every planned exercise id is unique across the whole course', () => {
    // Exercise ids are global: two modules reusing one id would make the second
    // definition unreachable, and the lesson that references it uncompletable.
    const ids = PLANNED_MODULES.flatMap((module) =>
      module.lessons.flatMap((lesson) => lesson.exercises),
    );
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    expect(duplicates, `duplicate exercise id(s)`).toEqual([]);
  });

  test('every planned module number matches its id, in order', () => {
    const numbers = PLANNED_MODULES.map((module) => module.number);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    for (const module of PLANNED_MODULES) {
      expect(module.id, `${module.id} does not match number ${module.number}`).toBe(
        `module-${String(module.number).padStart(2, '0')}`,
      );
    }
  });

  test('every declared package is one the course knows how to install', async () => {
    // A typo in a manifest entry would otherwise surface as a silent install
    // failure halfway through a lesson, with no clue where it came from.
    const { KNOWN_PACKAGES } = await import('../r/session');
    for (const module of PLANNED_MODULES) {
      for (const lesson of module.lessons) {
        for (const name of lesson.packages ?? []) {
          expect(KNOWN_PACKAGES as readonly string[], `${lesson.id} declares ${name}`).toContain(name);
        }
      }
    }
  });

  test('a live lesson attaches no package it did not declare', async () => {
    // library(emmeans) in a lesson that does not declare it works only if some
    // other lesson happened to install it first. It then fails for the student
    // who opens this lesson first.
    //
    // Scanned over the code blocks, not the whole file: a lesson may
    // legitimately name library(tidyverse) in prose as the line students meet
    // in every other tutorial, or quote a library() call in a quiz choice.
    // Neither runs. The forbidden-function rule above still scans the whole
    // file, because prose telling a student to call readline() is as harmful as
    // code that does.
    const { CORE_PACKAGES } = await import('../r/session');
    for (const module of MODULES) {
      for (const lesson of module.lessons) {
        const code = lessonCode(sources[`./lessons/${lesson.file}.mdx`] ?? '');
        const declared = new Set<string>([...(lesson.packages ?? []), ...CORE_PACKAGES]);
        for (const match of code.matchAll(/library\((\w+)\)/g)) {
          expect([...declared], `${lesson.id} attaches ${match[1]}`).toContain(match[1]);
        }
      }
    }
  });

  test('every defined exercise is referenced by some lesson', () => {
    // An orphaned exercise is never seen by a student, is never opened in
    // review, and passes every other check in this file.
    const referenced = new Set(
      PLANNED_MODULES.flatMap((module) => module.lessons.flatMap((lesson) => lesson.exercises)),
    );
    for (const exercise of ALL_EXERCISES) {
      expect([...referenced], `${exercise.id} is defined but no lesson uses it`).toContain(exercise.id);
    }
  });

  test('every inferential lesson closes with an Interpret block', () => {
    // Spec §4.1. Modules 1-4 teach tools rather than inference, so they are out.
    const inferential = /^(05|0[78]|09|1[0-4])-/;
    for (const module of MODULES) {
      for (const lesson of module.lessons) {
        if (!inferential.test(lesson.id)) continue;
        const source = sources[`./lessons/${lesson.file}.mdx`] ?? '';
        expect(source, `${lesson.id} has no <Interpret>`).toMatch(/<Interpret\b/);
      }
    }
  });

  test('every exercise carries a wrong answer and an alternate solution', () => {
    for (const exercise of ALL_EXERCISES) {
      expect(exercise.wrongAnswers.length, `${exercise.id} has no wrong answers`).toBeGreaterThan(0);
      expect(
        exercise.alternateSolutions?.length ?? 0,
        `${exercise.id} has no alternate solution`,
      ).toBeGreaterThan(0);
    }
  });

  test('checks read the student\'s objects only through answer()', () => {
    // The defect class that once passed an empty submission: exists("x") and a
    // bare `x` reach past the attempt environment into the lesson's own objects.
    // validate.itest.ts catches it dynamically by grading each check a second
    // time in the environment the lesson leaves behind; this catches it in a
    // second, so an author writing thirty-nine lessons' worth of checks is told
    // straight away rather than after a long R run.
    for (const exercise of ALL_EXERCISES) {
      expect(exercise.check, `${exercise.id} uses exists() instead of has_answer()`)
        .not.toMatch(/\bexists\s*\(/);
    }
  });

  test('Module 1 defines exactly its five exercises, in order', () => {
    expect(module01.map((exercise) => exercise.id)).toEqual([
      'm1-1-a', 'm1-1-b', 'm1-2-a', 'm1-2-b', 'm1-3-a',
    ]);
  });

  test('Module 1 teaches without a dataset', () => {
    // Module 1 is about objects, functions and packages. A student meets read.csv
    // for the first time in lesson 02-1, where factors are explained alongside it;
    // showing a file here would teach the incantation without the idea.
    const module = PLANNED_MODULES.find((m) => m.id === 'module-01')!;
    for (const lesson of module.lessons) {
      const source = sources[`./lessons/${lesson.file}.mdx`] ?? '';
      expect(source, `${lesson.id} reads a dataset`).not.toMatch(/read\.csv/);
    }
    for (const exercise of module01) {
      const code = [exercise.starterCode, exercise.solution, exercise.check].join('\n');
      expect(code, `${exercise.id} reads a dataset`).not.toMatch(/read\.csv/);
    }
  });

  test('Module 2 defines exactly its five exercises, in order', () => {
    expect(module02.map((exercise) => exercise.id)).toEqual([
      'm2-1-a', 'm2-1-b', 'm2-2-a', 'm2-2-b', 'm2-3-a',
    ]);
  });

  test('Module 2 reads only the workplace dataset', () => {
    // Part 1 and Part 3 share one codebook (overview, decision 2). A second CSV
    // here would mean a student learning two of them before Module 3.
    const module = PLANNED_MODULES.find((m) => m.id === 'module-02')!;
    for (const lesson of module.lessons) {
      const source = sources[`./lessons/${lesson.file}.mdx`] ?? '';
      for (const match of source.matchAll(/data\/([\w-]+\.csv)/g)) {
        expect(match[1], `${lesson.id} reads ${match[1]}`).toBe('workplace.csv');
      }
    }
  });

  test('lesson 02-1 is written in base R', () => {
    // Its manifest entry declares no packages, so a library() call here would work
    // only for a student who had already opened a lesson that installed it.
    const source = sources['./lessons/02-1-reading-data.mdx'] ?? '';
    expect(source, '02-1 attaches a package it did not declare').not.toMatch(/library\(/);
    expect(source, '02-1 uses the pipe before it has been taught').not.toMatch(/%>%/);
  });

  test('Module 3 defines exactly its five exercises, in order', () => {
    expect(module03.map((exercise) => exercise.id)).toEqual([
      'm3-1-a', 'm3-1-b', 'm3-2-a', 'm3-2-b', 'm3-3-a',
    ]);
  });

  test('Module 3 checks recompute from the dataset instead of naming a department', () => {
    // P2 step 4 allows re-seeding workplace.csv if a designed effect fails to land.
    // The Engineering surprise survives that, because it comes from the department
    // profiles rather than the seed - but which department has the highest mean can
    // move. A check that spelled a department name would then fail a correct answer.
    for (const exercise of module03) {
      expect(exercise.check, `${exercise.id} names a department`).not.toMatch(
        /\b(Sales|Engineering|Support|Marketing)\b/,
      );
      expect(exercise.check, `${exercise.id} never reads the dataset`).toMatch(
        /read\.csv\("data\/workplace\.csv"/,
      );
    }
  });

  test('Module 4 defines exactly its four exercises, in order', () => {
    expect(module04.map((exercise) => exercise.id)).toEqual([
      'm4-1-a', 'm4-2-a', 'm4-2-b', 'm4-3-a',
    ]);
  });

  test('Module 4 checks inspect the plot object rather than an image', () => {
    // Graphics capture is off under Node, so a check that tried to render would
    // report every answer as a broken exercise.
    for (const exercise of module04) {
      expect(exercise.check, `${exercise.id} does not inspect the plot`).toMatch(
        /ggplot2::layer_data|\$layers/,
      );
      expect(exercise.check, `${exercise.id} tries to render`).not.toMatch(/ggsave|png\(|print\(/);
    }
  });

  test('the APA figure exercise asks for all three of labels, a linear fit and theme_classic', () => {
    const apa = module04.find((exercise) => exercise.id === 'm4-3-a')!;
    expect(apa.solution).toMatch(/labs\(/);
    expect(apa.solution).toMatch(/geom_smooth\(method = lm\)/);
    expect(apa.solution).toMatch(/theme_classic\(\)/);
    // Each of the three has its own negative fixture, so a check that silently
    // stopped testing one of them would be caught by the R validator.
    expect(apa.wrongAnswers.length).toBeGreaterThanOrEqual(3);
  });

  test('lessons 04-1 and 04-3 avoid the pipe, which ggplot2 does not export', () => {
    for (const file of ['04-1-ggplot-layers', '04-3-scatter-and-apa']) {
      const source = sources[`./lessons/${file}.mdx`] ?? '';
      expect(source, `${file} uses %>% without attaching dplyr`).not.toMatch(/%>%/);
    }
  });
});

describe('Module 5', () => {
  const lessons = ['05-1-density-and-area', '05-2-z-scores', '05-3-probabilities'];

  test('its three lesson files exist and are live in MODULES', () => {
    for (const file of lessons) expect(sources[`./lessons/${file}.mdx`], `missing ${file}`).toBeDefined();
    expect(MODULES.map((m) => m.id)).toContain('module-05');
  });

  test('the distribution simulation is embedded, and only where planned', () => {
    // 05-2 deliberately has none: standardising is arithmetic, not a picture.
    expect(sources['./lessons/05-1-density-and-area.mdx']).toMatch(/<Simulation name="distribution" \/>/);
    expect(sources['./lessons/05-3-probabilities.mdx']).toMatch(/<Simulation name="distribution" \/>/);
    expect(sources['./lessons/05-2-z-scores.mdx']).not.toMatch(/<Simulation\b/);
  });

  test('no Module 5 lesson attaches a package beyond the core set', () => {
    // The P3 table gives Module 5 no `packages`, so anything outside CORE_PACKAGES
    // would never be installed for a student who opens this lesson first.
    for (const file of lessons) {
      for (const match of sources[`./lessons/${file}.mdx`].matchAll(/library\((\w+)\)/g)) {
        expect(['dplyr', 'ggplot2'], `${file} attaches ${match[1]}`).toContain(match[1]);
      }
    }
  });

  test('every Module 5 exercise compares with a stated tolerance', () => {
    // A check that reaches for == on a double is the defect this catches.
    for (const exercise of module05) {
      expect(exercise.check, `${exercise.id} has no all.equal comparison`).toMatch(/all\.equal\(/);
      expect(exercise.check, `${exercise.id} compares doubles with ==`).not.toMatch(/==\s*(expected|want_)/);
    }
  });

  test('Module 5 defines exactly the exercises the manifest lists', () => {
    const planned = PLANNED_MODULES.find((m) => m.id === 'module-05')!;
    expect(module05.map((e) => e.id)).toEqual(planned.lessons.flatMap((l) => l.exercises));
  });
});

describe('Module 7', () => {
  const lessons = [
    '07-1-standard-error-to-interval',
    '07-2-what-95-percent-means',
    '07-3-error-bars',
  ];

  test('its three lesson files exist and are live in MODULES', () => {
    for (const file of lessons) expect(sources[`./lessons/${file}.mdx`], `missing ${file}`).toBeDefined();
    expect(MODULES.map((m) => m.id)).toContain('module-07');
  });

  test('the ci simulation is embedded in 07-2', () => {
    expect(sources['./lessons/07-2-what-95-percent-means.mdx']).toMatch(/<Simulation name="ci" \/>/);
  });

  test('07-3 is the only Module 7 lesson that declares packages', () => {
    const module = PLANNED_MODULES.find((m) => m.id === 'module-07')!;
    expect(module.lessons.map((l) => l.packages ?? [])).toEqual([[], [], ['dplyr', 'ggplot2']]);
  });

  test('every Module 7 lesson distinguishes SD from SE in prose', () => {
    // The module exists to separate these two. A lesson that never names both
    // has lost the thread, and no other test would notice.
    for (const file of lessons) {
      const source = sources[`./lessons/${file}.mdx`];
      expect(source, `${file} never mentions the standard error`).toMatch(/standard error/i);
    }
  });

  test('no Module 7 exercise builds an interval with a hard-coded 1.96', () => {
    // 1.96 is the normal quantile and belongs only in a wrong answer or a
    // teaching message; a solution must reach for qt().
    for (const exercise of module07) {
      expect(exercise.solution, `${exercise.id} uses 1.96 in its solution`).not.toMatch(/1\.96/);
      for (const alternate of exercise.alternateSolutions ?? []) {
        expect(alternate, `${exercise.id} has an alternate using 1.96`).not.toMatch(/1\.96/);
      }
    }
  });

  test('Module 7 defines exactly the exercises the manifest lists', () => {
    const planned = PLANNED_MODULES.find((m) => m.id === 'module-07')!;
    expect(module07.map((e) => e.id)).toEqual(planned.lessons.flatMap((l) => l.exercises));
  });
});

describe('Module 8', () => {
  const lessons = ['08-1-null-distribution', '08-2-p-values-and-alpha', '08-3-errors-and-power'];

  test('its three lesson files exist and are live in MODULES', () => {
    for (const file of lessons) expect(sources[`./lessons/${file}.mdx`], `missing ${file}`).toBeDefined();
    expect(MODULES.map((m) => m.id)).toContain('module-08');
  });

  test('the pvalue simulation is embedded in 08-2 and 08-3', () => {
    expect(sources['./lessons/08-2-p-values-and-alpha.mdx']).toMatch(/<Simulation name="pvalue" \/>/);
    expect(sources['./lessons/08-3-errors-and-power.mdx']).toMatch(/<Simulation name="pvalue" \/>/);
  });

  test('no Module 8 lesson contains a markdown table', () => {
    // MDX runs without remark-gfm, so a pipe table renders as literal text.
    // 08-3 is the lesson that wants one, for the two-by-two of errors.
    for (const file of lessons) {
      expect(sources[`./lessons/${file}.mdx`], `${file} has a pipe table`).not.toMatch(/^\s*\|.*\|\s*$/m);
    }
  });

  test('every Module 8 Interpret block carries the two standard misreadings', () => {
    // Spec §4.1: distractors are drawn from the standard misinterpretations.
    // These two are the ones the module exists to kill, so their absence is a
    // content regression no other test would catch.
    const all = lessons.map((file) => sources[`./lessons/${file}.mdx`]).join('\n');
    expect(all, 'no Interpret offers "p is the probability the null is true"').toMatch(
      /probability that the null hypothesis is true/,
    );
    expect(all, 'no Interpret offers "a large p proves no effect"').toMatch(/no effect of .*p = \./);
  });

  test('Module 8 defines exactly the exercises the manifest lists', () => {
    const planned = PLANNED_MODULES.find((m) => m.id === 'module-08')!;
    expect(module08.map((e) => e.id)).toEqual(planned.lessons.flatMap((l) => l.exercises));
  });

  test('Part 2 is complete: Modules 5 to 8 are all live', () => {
    const live = MODULES.map((m) => m.id);
    for (const id of ['module-05', 'module-06', 'module-07', 'module-08']) {
      expect(live, `${id} is not live`).toContain(id);
    }
  });
});
