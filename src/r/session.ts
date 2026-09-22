import type { WebR } from 'webr';
import { setStatus } from './webrClient';

export const COURSE_PACKAGES = ['dplyr', 'ggplot2'] as const;

export const DATASET_FILES = ['wellbeing-population.csv'] as const;

/** webR's working directory; `read.csv("data/x.csv")` resolves under it. */
const HOME = '/home/web_user';

/**
 * Reports progress but deliberately does not announce `ready` — installing
 * packages is one step of session setup, not the whole of it. The caller that
 * knows when every step is done owns that transition.
 */
export async function installCoursePackages(webR: WebR): Promise<void> {
  setStatus({ phase: 'installing', detail: 'Installing dplyr and ggplot2' });
  await webR.installPackages([...COURSE_PACKAGES]);

  // installPackages only warns when a download fails (verified against webR 0.6.0),
  // so a half-finished install would otherwise be announced as "R is ready".
  const missing: string[] = [];
  for (const pkg of COURSE_PACKAGES) {
    if (!(await webR.evalRBoolean(`nzchar(system.file(package = "${pkg}"))`))) missing.push(pkg);
  }
  if (missing.length) {
    throw new Error(`Could not install ${missing.join(', ')}. Check your connection and try again.`);
  }
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
