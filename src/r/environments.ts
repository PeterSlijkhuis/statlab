import type { RObject, WebR } from 'webr';

/**
 * webR 0.6.0 has no `.destroy()` on the RObject proxy itself — destruction
 * lives on `WebR`/`Shelter` (`webR.destroy(x)`, which forwards to
 * `webR.globalShelter.destroy(x)`). `destroyEnv` only takes the env, so the
 * owning WebR instance is recorded here at creation time and looked back up
 * when it's time to free the object.
 */
const owners = new WeakMap<RObject, WebR>();

/**
 * One environment per lesson. Parented to globalenv() so base R and any
 * attached packages resolve normally, while lesson objects stay isolated.
 */
export async function createLessonEnv(webR: WebR): Promise<RObject> {
  const env = await webR.evalR('new.env(parent = globalenv())');
  owners.set(env, webR);
  return env;
}

/**
 * A fresh child of `parent`, discarded after use. Exercise runs use this so
 * objects from a previous attempt cannot influence the check.
 */
export async function createChildEnv(webR: WebR, parent: RObject): Promise<RObject> {
  const env = await webR.evalR('new.env(parent = environment())', { env: parent });
  owners.set(env, webR);
  return env;
}

export async function destroyEnv(env: RObject): Promise<void> {
  const webR = owners.get(env);
  if (!webR) {
    throw new Error('destroyEnv: env was not created by createLessonEnv/createChildEnv');
  }
  await webR.destroy(env);
}
