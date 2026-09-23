import { useEffect, useState } from 'react';
import type { RObject, WebR } from 'webr';
import { createLessonEnv, destroyEnv } from './environments';
import { ensurePackages, fetchDataset, prepareSession } from './session';
import { restoreUploads } from './uploads';
import { getWebR, setStatus } from './webrClient';

/** What the hook needs from a lesson: its identity, and what it must attach. */
export type SessionLesson = { id: string; packages?: string[] };

/**
 * Owns one R environment for the page identified by `lesson.id`: created once
 * the session is prepared and the lesson's declared packages are installed,
 * destroyed when the id changes or the page unmounts. Pass null to hold no
 * environment (for example, an unknown lesson id).
 */
export function useLessonSession(
  lesson: SessionLesson | null,
): { webR: WebR | null; env: RObject | null } {
  // The effect keys on the id alone. A manifest entry's `packages` is a new
  // array literal on every render, so keying on the object or the array would
  // rebuild the lesson environment on every render and discard the student's
  // objects mid-lesson.
  const key = lesson ? lesson.id : null;
  const packages = lesson?.packages;
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
        // Before the page reads as ready, so a student's first Run can read
        // the file they uploaded on an earlier visit.
        await restoreUploads(instance);
        if (packages?.length) {
          await ensurePackages(instance, packages);
        }
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
