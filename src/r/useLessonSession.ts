import { useEffect, useState } from 'react';
import type { RObject, WebR } from 'webr';
import { createLessonEnv, destroyEnv } from './environments';
import { fetchDataset, prepareSession } from './session';
import { getWebR, setStatus } from './webrClient';

/**
 * Owns one R environment for the page identified by `key`: created once the
 * session is prepared, destroyed when `key` changes or the page unmounts.
 * Pass null to hold no environment (for example, an unknown lesson id).
 */
export function useLessonSession(key: string | null): { webR: WebR | null; env: RObject | null } {
  const [webR, setWebR] = useState<WebR | null>(null);
  const [env, setEnv] = useState<RObject | null>(null);

  useEffect(() => {
    if (key === null) return;
    let live = true;
    let created: RObject | null = null;
    let createdBy: WebR | null = null;

    void (async () => {
      try {
        const instance = await getWebR();
        await prepareSession(instance, fetchDataset);
        const lessonEnv = await createLessonEnv(instance);
        if (!live) {
          await destroyEnv(instance, lessonEnv);
          return;
        }
        created = lessonEnv;
        createdBy = instance;
        setWebR(instance);
        setEnv(lessonEnv);
        setStatus({ phase: 'ready' });
      } catch (err) {
        setStatus({ phase: 'error', detail: String(err) });
      }
    })();

    return () => {
      live = false;
      // Cleared before destroying: code blocks gate Run on the context's `ready`,
      // which derives from these, so an env being freed must never read as ready.
      setEnv(null);
      setWebR(null);
      if (created && createdBy) void destroyEnv(createdBy, created);
    };
  }, [key]);

  return { webR, env };
}
