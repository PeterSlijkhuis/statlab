import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MODULES } from '../content/manifest';
import { PARTS } from '../content/parts';
import { getProgress, subscribeProgress } from '../state/progress';
import { courseStats, lessonStatus, moduleOf, moduleProgress } from '../state/stats';
import Credits from './Credits';
import Logo from './Logo';

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
  const stats = courseStats(progress);

  // One module open at a time by default: the one holding the current lesson.
  // Opening another by hand keeps both open until the page changes.
  const currentModule = moduleOf(pathname.split('/lesson/')[1] ?? '')?.id;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(currentModule ? [currentModule] : []));
  useEffect(() => {
    if (currentModule) setExpanded((previous) => (previous.has(currentModule) ? previous : new Set([...previous, currentModule])));
  }, [currentModule]);

  function toggle(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // The list is long, so it scrolls on its own. Bring the current lesson into
  // view whenever the page changes or the drawer opens, without scrolling the
  // page itself, which scrollIntoView would also do.
  useEffect(() => {
    const list = nav.current;
    const active = list?.querySelector<HTMLElement>('.sidebar-lesson.active');
    if (!list || !active) return;
    const top = active.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    if (top < list.scrollTop || top + active.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = Math.max(0, top - list.clientHeight / 3);
    }
  }, [pathname, open]);

  return (
    <nav ref={nav} id="course-nav" className={open ? 'sidebar open' : 'sidebar'} aria-label="Course navigation">
      <NavLink to="/" className="sidebar-home"><Logo /> StatLab</NavLink>

      <div className="sidebar-stats" aria-label="Your progress">
        <span title="Days in a row with some work done"><span aria-hidden="true">🔥</span> {stats.streak} day{stats.streak === 1 ? '' : 's'}</span>
        <span title="Points from exercises, questions and finished lessons"><span aria-hidden="true">⭐</span> {stats.points} pts</span>
        <span title="Lessons finished">{stats.lessonsComplete}/{stats.lessonsTotal}</span>
      </div>

      {PARTS.map((part) => (
        <div key={part.title} className="sidebar-part">
          <p className="sidebar-part-title">{part.title}</p>
          {MODULES.filter((module) => (part.modules as readonly number[]).includes(module.number)).map((module) => {
            const isOpen = expanded.has(module.id);
            const { done, total } = moduleProgress(module, progress);
            const panelId = `module-panel-${module.id}`;
            // React 18 has no `inert` prop; the empty string is how the DOM
            // attribute is switched on. A folded module's links drop out of the
            // tab order and the accessibility tree while they are out of sight.
            const inert = (isOpen ? {} : { inert: '' }) as Record<string, string>;
            return (
              <section key={module.id} className={`sidebar-module${isOpen ? ' open' : ''}${done === total ? ' done' : ''}`}>
                <h2>
                  <button type="button" className="sidebar-module-toggle" aria-expanded={isOpen} aria-controls={panelId} aria-describedby={`${panelId}-count`} onClick={() => toggle(module.id)}>
                    <span className="sidebar-module-number" aria-hidden="true">{done === total ? '✓' : module.number}</span>
                    <span className="sidebar-module-title"><span className="visually-hidden">{module.number}. </span>{module.title}</span>
                    <span className="sidebar-module-count" aria-hidden="true">{done}/{total}</span>
                    <svg className="sidebar-chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </h2>
                <span id={`${panelId}-count`} className="visually-hidden">{done} of {total} lessons done</span>
                <div id={panelId} className="sidebar-module-panel" {...inert}>
                  <ul>
                    {module.lessons.map((lesson) => {
                      const status = lessonStatus(lesson, progress);
                      return (
                        <li key={lesson.id}>
                          <NavLink
                            to={`/lesson/${lesson.id}`}
                            className={({ isActive }) => ['sidebar-lesson', status === 'new' ? '' : status, isActive ? 'active' : ''].filter(Boolean).join(' ')}
                          >
                            <span className="sidebar-lesson-dot" aria-hidden="true" />
                            {lesson.title}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      ))}

      <div className="sidebar-part">
        <p className="sidebar-part-title">Reference</p>
        <ul>
          <li><NavLink to="/which-model" className="sidebar-lesson"><span className="sidebar-lesson-icon" aria-hidden="true">🧭</span>Which model should I use?</NavLink></li>
          <li><NavLink to="/workspace" className="sidebar-lesson"><span className="sidebar-lesson-icon" aria-hidden="true">⌨️</span>R Workspace</NavLink></li>
        </ul>
      </div>

      <Credits variant="compact" />
    </nav>
  );
}
