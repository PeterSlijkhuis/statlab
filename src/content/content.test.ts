import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { ALL_LESSONS } from './manifest';
import { getExercise } from './exercises';
import { SIMULATION_NAMES } from '../sims/registry';

const compiled = import.meta.glob('./lessons/*.mdx', { eager: true });
// Read from disk rather than via `?raw`: the MDX plugin compiles `x.mdx?raw` too.
// Paths, not URLs: under jsdom the global URL is not the one node:fs accepts.
const lessonDir = join(import.meta.dirname, 'lessons');
const sources: Record<string, string> = Object.fromEntries(
  readdirSync(lessonDir)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => [`./lessons/${file}`, readFileSync(join(lessonDir, file), 'utf8')]),
);

describe('lesson content', () => {
  test('every lesson in the manifest has a file', () => {
    for (const lesson of ALL_LESSONS) {
      expect(sources[`./lessons/${lesson.file}.mdx`], `missing file for ${lesson.id}`).toBeDefined();
    }
  });

  test('every lesson file compiles to a component', () => {
    for (const [path, module] of Object.entries(compiled)) {
      expect(typeof (module as { default: unknown }).default, `${path} did not compile`).toBe('function');
    }
  });

  test('every referenced simulation is registered', () => {
    for (const [path, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/<Simulation\s+name="([^"]+)"/g)) {
        expect(SIMULATION_NAMES, `${path} references simulation "${match[1]}"`).toContain(match[1]);
      }
    }
  });

  test('every referenced exercise is defined', () => {
    for (const [path, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/<Exercise\s+id="([^"]+)"/g)) {
        expect(getExercise(match[1]), `${path} references exercise "${match[1]}"`).toBeDefined();
      }
    }
  });

  test('block ids are unique within each lesson', () => {
    // Progress is keyed by lesson id plus block id, so two blocks sharing an id
    // in one lesson silently overwrite each other's saved draft or quiz result.
    // Nothing at runtime can detect this; an author would just see answers go
    // missing.
    for (const [path, source] of Object.entries(sources)) {
      const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
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
      const inMdx = [...source.matchAll(/<Exercise\s+id="([^"]+)"/g)].map((match) => match[1]).sort();
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
});
