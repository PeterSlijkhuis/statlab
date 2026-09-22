import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LessonProvider } from '../content/LessonContext';
import { findLesson, lessonNeighbours } from '../content/manifest';
import { mdxComponents } from '../content/mdxComponents';
import { useLessonSession } from '../r/useLessonSession';
import { LessonFinish, ReadingProgress, SectionGuide, useReveal } from '../components/LessonChrome';
import { getProgress, subscribeProgress, touchLesson } from '../state/progress';
import { exercisesPassed, lessonStatus, moduleOf } from '../state/stats';

const lessonModules = import.meta.glob<{ default: ComponentType<{ components?: unknown }> }>(
  '../content/lessons/*.mdx',
);

export default function Lesson() {
  const { lessonId = '' } = useParams();
  const meta = findLesson(lessonId);

  const [Content, setContent] = useState<ComponentType<{ components?: unknown }> | null>(null);
  const { webR, env } = useLessonSession(meta ?? null);
  const article = useRef<HTMLElement | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => subscribeProgress(() => setTick((tick) => tick + 1)), []);
  useReveal(article, Content);

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
  const module = moduleOf(meta.id);
  const position = module ? module.lessons.findIndex((lesson) => lesson.id === meta.id) + 1 : 0;
  const progress = getProgress();
  // Defensive: a lesson entry without an exercise list reads as having none.
  const lesson = { ...meta, exercises: meta.exercises ?? [] };
  const passed = exercisesPassed(lesson, progress);
  const total = lesson.exercises.length;

  return (
    <LessonProvider value={{ lessonId: meta.id, webR, env, ready: Boolean(webR && env) }}>
      <ReadingProgress />
      <div className="lesson-layout">
        <article className="lesson" ref={article}>
          <header className="lesson-header">
            {module && (
              <p className="lesson-crumb">
                <span className="lesson-crumb-module">Module {module.number} · {module.title}</span>
                <span className="lesson-crumb-step">Lesson {position} of {module.lessons.length}</span>
              </p>
            )}
            <h1>{meta.title}</h1>
            {total > 0 && (
              <p className="lesson-chips">
                <span className={`chip${passed === total ? ' chip-done' : ''}`}>
                  {passed === total ? '✓ ' : ''}{passed}/{total} exercise{total === 1 ? '' : 's'} solved
                </span>
              </p>
            )}
          </header>
          {Content ? <Content components={mdxComponents} /> : <p>Loading lesson…</p>}
        </article>
        <SectionGuide article={article} contentKey={Content} />
      </div>

      <LessonFinish
        complete={lessonStatus(lesson, progress) === 'complete'}
        passed={passed}
        total={total}
        next={next}
        previous={previous}
      />
    </LessonProvider>
  );
}
