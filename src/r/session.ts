import type { WebR } from 'webr';
import { setStatus } from './webrClient';

export const COURSE_PACKAGES = ['dplyr', 'ggplot2'] as const;

export const DATASET_FILES = ['wellbeing-population.csv'] as const;

/** webR's working directory; `read.csv("data/x.csv")` resolves under it. */
const HOME = '/home/web_user';

export async function installCoursePackages(webR: WebR): Promise<void> {
  setStatus({ phase: 'installing', detail: 'Installing dplyr and ggplot2' });
  await webR.installPackages([...COURSE_PACKAGES]);
  setStatus({ phase: 'ready' });
}

export async function mountDatasets(
  webR: WebR,
  load: (name: string) => Promise<Uint8Array>,
): Promise<void> {
  try {
    await webR.FS.mkdir(`${HOME}/data`);
  } catch {
    // Already exists after a restart; writing the files again is still correct.
  }

  for (const name of DATASET_FILES) {
    const bytes = await load(name);
    await webR.FS.writeFile(`${HOME}/data/${name}`, bytes);
  }
}
