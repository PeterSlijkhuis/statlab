import { useEffect, useState } from 'react';
import type { RObject, WebR } from 'webr';
import CodeBlock from '../components/CodeBlock';
import { LessonProvider } from '../content/LessonContext';
import { createLessonEnv, destroyEnv } from '../r/environments';
import { fetchDataset, prepareSession } from '../r/session';
import { getWebR, setStatus } from '../r/webrClient';

export default function Playground() {
  const [webR, setWebR] = useState<WebR | null>(null);
  const [env, setEnv] = useState<RObject | null>(null);

  useEffect(() => {
    let live = true;
    let created: RObject | null = null;
    let createdBy: WebR | null = null;

    void (async () => {
      try {
        const instance = await getWebR();
        await prepareSession(instance, fetchDataset);
        const playgroundEnv = await createLessonEnv(instance);
        if (!live) {
          await destroyEnv(instance, playgroundEnv);
          return;
        }
        created = playgroundEnv;
        createdBy = instance;
        setWebR(instance);
        setEnv(playgroundEnv);
        setStatus({ phase: 'ready' });
      } catch (err) {
        setStatus({ phase: 'error', detail: String(err) });
      }
    })();

    return () => {
      live = false;
      if (created && createdBy) void destroyEnv(createdBy, created);
    };
  }, []);

  return (
    <LessonProvider value={{ lessonId: 'playground', webR, env, ready: Boolean(webR && env) }}>
      <h1>R playground</h1>
      <p>
        A scratch space with the course datasets already loaded. Nothing here is marked or saved
        beyond this browser.
      </p>
      <CodeBlock
        id="playground"
        code={`population <- read.csv("data/wellbeing-population.csv")

summary(population)`}
      />
    </LessonProvider>
  );
}
