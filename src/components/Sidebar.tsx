import { NavLink } from 'react-router-dom';
import { MODULES } from '../content/manifest';
import { getProgress } from '../state/progress';

export default function Sidebar() {
  const progress = getProgress();

  function statusClass(lessonId: string): string {
    const lesson = progress.lessons[lessonId];
    if (!lesson) return '';
    const results = Object.values(lesson.exercises);
    if (results.length > 0 && results.every((status) => status === 'passed')) return 'complete';
    if (results.length > 0 || lesson.visitedAt) return 'started';
    return '';
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
                  className={({ isActive }) => ['sidebar-lesson', statusClass(lesson.id), isActive ? 'active' : ''].filter(Boolean).join(' ')}
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
          <li><NavLink to="/which-test" className="sidebar-lesson">Which test should I use?</NavLink></li>
          <li><NavLink to="/playground" className="sidebar-lesson">R playground</NavLink></li>
        </ul>
      </section>
    </nav>
  );
}
