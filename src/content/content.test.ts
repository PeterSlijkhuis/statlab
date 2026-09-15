import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { ALL_LESSONS } from './manifest';
import { getExercise } from './exercises';
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
});
