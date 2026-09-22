import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MODULES, type LessonMeta } from '../content/manifest';
import { getProgress, subscribeProgress } from '../state/progress';

type Props = {
  /** Whether the drawer is showing, on screens narrow enough to have one. */
  open?: boolean;
};

export default function Sidebar({ open = false }: Props) {
  const [, setTick] = useState(0);
  const nav = useRef<HTMLElement | null>(null);
  const { pathname } = useLocation();
  // getProgress() returns a fresh object on every call, so it cannot serve as a
  // useSyncExternalStore snapshot; a counter re-renders on each store write.
  useEffect(() => subscribeProgress(() => setTick((tick) => tick + 1)), []);
  const progress = getProgress();

  // The list is 42 lessons long, so it scrolls on its own. Bring the current
  // lesson into view whenever the page changes or the drawer opens, without
  // scrolling the page itself, which scrollIntoView would also do.
  useEffect(() => {
    const list = nav.current;
    const active = list?.querySelector<HTMLElement>('.sidebar-lesson.active');
    if (!list || !active) return;
    const top = active.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    if (top < list.scrollTop || top + active.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = Math.max(0, top - list.clientHeight / 3);
    }
  }, [pathname, open]);

  function statusClass(lesson: LessonMeta): string {
    const record = progress.lessons[lesson.id];
    if (!record) return '';
    // Complete means every exercise the lesson contains is passed — not merely
    // every exercise the student happens to have touched. A lesson with no
    // exercises is complete once visited.
    const complete =
      lesson.exercises.length === 0
        ? Boolean(record.visitedAt)
        : lesson.exercises.every((id) => record.exercises[id] === 'passed');
    return complete ? 'complete' : 'started';
  }

  return (
    <nav ref={nav} id="course-nav" className={open ? 'sidebar open' : 'sidebar'} aria-label="Course navigation">
      <NavLink to="/" className="sidebar-home">StatLab</NavLink>
      {MODULES.map((module) => (
        <section key={module.id}>
          <h2>{module.number}. {module.title}</h2>
          <ul>
            {module.lessons.map((lesson) => (
              <li key={lesson.id}>
                <NavLink
                  to={`/lesson/${lesson.id}`}
                  className={({ isActive }) => ['sidebar-lesson', statusClass(lesson), isActive ? 'active' : ''].filter(Boolean).join(' ')}
                >
                  {lesson.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section>
        <h2>Reference</h2>
        <ul>
          <li><NavLink to="/which-model" className="sidebar-lesson">Which model should I use?</NavLink></li>
          <li><NavLink to="/playground" className="sidebar-lesson">R playground</NavLink></li>
        </ul>
      </section>
    </nav>
  );
}
