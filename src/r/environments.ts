import type { RObject, WebR } from 'webr';

/**
 * One environment per lesson. Parented to globalenv() so base R and any
 * attached packages resolve normally, while lesson objects stay isolated.
 */
export async function createLessonEnv(webR: WebR): Promise<RObject> {
  return webR.evalR('new.env(parent = globalenv())');
}

/**
 * A fresh child of `parent`, discarded after use. Exercise runs use this so
 * objects from a previous attempt cannot influence the check.
 */
export async function createChildEnv(webR: WebR, parent: RObject): Promise<RObject> {
  return webR.evalR('new.env(parent = environment())', { env: parent });
}

/**
 * webR 0.6.0 has no `.destroy()` on the RObject proxy itself — destruction
 * lives on `WebR`/`Shelter` (`webR.destroy(x)` forwards to
 * `webR.globalShelter.destroy(x)`), so the instance that created `env` has
 * to be passed back in here.
 */
export async function destroyEnv(webR: WebR, env: RObject): Promise<void> {
  await webR.destroy(env);
}
