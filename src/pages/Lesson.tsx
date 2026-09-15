import { useEffect, useState, type ComponentType } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { RObject, WebR } from 'webr';
import { LessonProvider } from '../content/LessonContext';
import { findLesson, lessonNeighbours } from '../content/manifest';
import { mdxComponents } from '../content/mdxComponents';
import { createLessonEnv, destroyEnv } from '../r/environments';
import { fetchDataset, prepareSession } from '../r/session';
import { getWebR, setStatus } from '../r/webrClient';
import { touchLesson } from '../state/progress';

const lessonModules = import.meta.glob<{ default: ComponentType<{ components?: unknown }> }>(
  '../content/lessons/*.mdx',
);

export default function Lesson() {
  const { lessonId = '' } = useParams();
  const meta = findLesson(lessonId);

  const [Content, setContent] = useState<ComponentType<{ components?: unknown }> | null>(null);
  const [webR, setWebR] = useState<WebR | null>(null);
  const [env, setEnv] = useState<RObject | null>(null);

  useEffect(() => {
    if (!meta) return;
    // Recorded before the loader lookup: a visit counts even when the lesson's
    // file is missing, or "continue where you left off" silently skips it.
    touchLesson(meta.id);
    let live = true;
    const loader = lessonModules[`../content/lessons/${meta.file}.mdx`];
    if (loader) {
      void loader().then((module) => {
        if (live) setContent(() => module.default);
      });
    }
    return () => {
      live = false;
      // This route reuses the component when only :lessonId changes, so the
      // previous lesson's content must not stay on screen under a new title.
      setContent(null);
    };
  }, [meta]);

  useEffect(() => {
    if (!meta) return;
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
  }, [meta]);

  if (!meta) {
    return (
      <div>
        <h1>Lesson not found</h1>
        <p>
          <Link to="/">Back to the course overview</Link>
        </p>
      </div>
    );
  }

  const { previous, next } = lessonNeighbours(meta.id);

  return (
    <LessonProvider value={{ lessonId: meta.id, webR, env, ready: Boolean(webR && env) }}>
      <article className="lesson">
        <h1>{meta.title}</h1>
        {Content ? <Content components={mdxComponents} /> : <p>Loading lesson…</p>}
      </article>

      <nav className="lesson-nav">
        {previous && <Link to={`/lesson/${previous.id}`}>← {previous.title}</Link>}
        {next && (
          <Link to={`/lesson/${next.id}`} className="lesson-next">
            {next.title} →
          </Link>
        )}
      </nav>
    </LessonProvider>
  );
}
