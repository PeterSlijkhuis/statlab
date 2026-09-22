import type { WebR } from 'webr';
import { setStatus } from './webrClient';

/**
 * Spec §3.5: installed at boot. The 40 MB figure the spec quotes was measured
 * with `readr`, which §3.5 has since dropped because every lesson loads data
 * with `read.csv(..., stringsAsFactors = TRUE)`; re-measure when this set
 * changes, because adding to it lengthens the wait before the first code block
 * in every lesson in the course.
 */
export const CORE_PACKAGES = ['dplyr', 'ggplot2', 'tidyr', 'broom'] as const;

/**
 * Spec §3.5: about 49 MB beyond the core, so these install only when a lesson
 * that declares them opens. Listed for the validator, which rejects a lesson
 * declaring a package the course does not know about — a typo in a manifest
 * entry would otherwise surface as a silent install failure mid-lesson.
 */
export const ON_DEMAND_PACKAGES = ['emmeans', 'car', 'lme4', 'lmerTest'] as const;

export const KNOWN_PACKAGES = [...CORE_PACKAGES, ...ON_DEMAND_PACKAGES] as const;

/** Kept as the boot-time set's former name so existing importers still resolve. */
export const COURSE_PACKAGES = CORE_PACKAGES;

export const DATASET_FILES = ['wellbeing-population.csv', 'workplace.csv'] as const;

/** webR's working directory; `read.csv("data/x.csv")` resolves under it. */
const HOME = '/home/web_user';

/** name → the in-flight or settled install. Resolved entries are never reinstalled. */
let packagePromises = new Map<string, Promise<void>>();

/** Test-only: forget what has been installed. */
export function resetPackageCache(): void {
  packagePromises = new Map();
}

async function isInstalled(webR: WebR, name: string): Promise<boolean> {
  return webR.evalRBoolean(`nzchar(system.file(package = "${name}"))`);
}

/**
 * Installs whichever of `names` is not present, at most once per webR instance.
 * `installPackages` only warns when a download fails (verified against webR
 * 0.6.0), so success is confirmed by looking for the installed package rather
 * than by the call returning.
 *
 * Deliberately does not announce `ready` when it is the boot-time caller:
 * installing packages is one step of session setup, not the whole of it, and
 * `prepareSession` owns that transition. An on-demand install after boot does
 * restore `ready`, because by then nothing else is outstanding.
 */
export async function ensurePackages(webR: WebR, names: readonly string[]): Promise<void> {
  const pending: string[] = [];
  const waits: Promise<void>[] = [];

  for (const name of names) {
    const existing = packagePromises.get(name);
    if (existing) {
      waits.push(existing);
    } else {
      pending.push(name);
    }
  }

  if (pending.length) {
    const install = (async () => {
      const missing: string[] = [];
      for (const name of pending) {
        if (!(await isInstalled(webR, name))) missing.push(name);
      }
      if (!missing.length) return;

      setStatus({ phase: 'installing', detail: `Installing ${missing.join(', ')}` });
      await webR.installPackages(missing);

      const failed: string[] = [];
      for (const name of missing) {
        if (!(await isInstalled(webR, name))) failed.push(name);
      }
      if (failed.length) {
        throw new Error(`Could not install ${failed.join(', ')}. Check your connection and try again.`);
      }
    })();

    // A failure must not be cached: the student presses Run again after the
    // network comes back, and a rejected promise left in the map would make
    // every later attempt fail instantly with the original error.
    const tracked = install.catch((err) => {
      for (const name of pending) packagePromises.delete(name);
      throw err;
    });
    for (const name of pending) packagePromises.set(name, tracked);
    waits.push(tracked);
  }

  await Promise.all(waits);
}

/**
 * Reports progress but deliberately does not announce `ready` — installing
 * packages is one step of session setup, not the whole of it. The caller that
 * knows when every step is done owns that transition.
 */
export async function installCoursePackages(webR: WebR): Promise<void> {
  await ensurePackages(webR, CORE_PACKAGES);
}

export async function mountDatasets(
  webR: WebR,
  load: (name: string) => Promise<Uint8Array>,
): Promise<void> {
  // Checked rather than try/catch: an empty catch would also swallow a real
  // failure (bad path, out of space) and surface it later as a confusing
  // "file not found" when a lesson tries to read its data.
  const dir = `${HOME}/data`;
  const info = await webR.FS.analyzePath(dir);
  if (!info.exists) {
    await webR.FS.mkdir(dir);
  }

  for (const name of DATASET_FILES) {
    const bytes = await load(name);
    await webR.FS.writeFile(`${dir}/${name}`, bytes);
  }
}

let prepared: Promise<void> | null = null;

/** Install packages and mount datasets exactly once per webR instance. */
export function prepareSession(
  webR: WebR,
  load: (name: string) => Promise<Uint8Array>,
): Promise<void> {
  if (!prepared) {
    prepared = (async () => {
      await mountDatasets(webR, load);
      await installCoursePackages(webR);
      // Every setup step is done; only this composer knows that.
      setStatus({ phase: 'ready' });
    })().catch((err) => {
      prepared = null; // Allow a retry after a transient network failure.
      // Owned here because callers differ: the lesson hook sets its own error
      // status, but the app-start call cannot, and without this a failed setup
      // would leave the pill stuck on "Installing packages…" with no retry.
      setStatus({ phase: 'error', detail: String(err) });
      throw err;
    });
  }
  return prepared;
}

export async function fetchDataset(name: string): Promise<Uint8Array> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${name}`);
  if (!response.ok) throw new Error(`Could not load dataset ${name}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
