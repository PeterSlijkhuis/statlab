import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { MODULES, type LessonMeta } from '../content/manifest';
import { getProgress, subscribeProgress } from '../state/progress';

export default function Sidebar() {
  const [, setTick] = useState(0);
  // getProgress() returns a fresh object on every call, so it cannot serve as a
  // useSyncExternalStore snapshot; a counter re-renders on each store write.
  useEffect(() => subscribeProgress(() => setTick((tick) => tick + 1)), []);
  const progress = getProgress();

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
    <nav className="sidebar" aria-label="Course navigation">
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
          <li><NavLink to="/which-test" className="sidebar-lesson">Which model should I use?</NavLink></li>
          <li><NavLink to="/playground" className="sidebar-lesson">R playground</NavLink></li>
        </ul>
      </section>
    </nav>
  );
}
