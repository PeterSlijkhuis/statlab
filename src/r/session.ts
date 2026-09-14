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
