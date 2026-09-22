import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import RStatus from './components/RStatus';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Lesson from './pages/Lesson';
import Playground from './pages/Playground';
import ModelChooser from './pages/ModelChooser';
import { fetchDataset, prepareSession } from './r/session';
import { getWebR } from './r/webrClient';
import './App.css';

export default function App() {
  // Spec 3.5: webR starts in the background on first app load, not when the
  // first lesson opens. Mounted here rather than in main.tsx so it is testable
  // by rendering App. Both calls are memoised, so StrictMode's double mount and
  // useLessonSession's later await all share this one boot.
  useEffect(() => {
    // Not swallowing: prepareSession's own catch has already set the error
    // status that RStatus renders. This only stops an unhandled rejection.
    void getWebR().then((r) => prepareSession(r, fetchDataset)).catch(() => {});
  }, []);

  // Below the desktop breakpoint the sidebar is a drawer behind the menu
  // button. On wider screens the CSS always shows it and ignores this flag.
  const [navOpen, setNavOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement | null>(null);
  const { pathname } = useLocation();

  // A new page starts at its top and with the drawer shut. React Router keeps
  // the old scroll position, which on a phone lands the student halfway down
  // a lesson they have not started reading.
  useEffect(() => {
    setNavOpen(false);
    window.scrollTo?.(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setNavOpen(false);
      menuButton.current?.focus();
    }
    document.addEventListener('keydown', onKey);
    document.body.classList.add('nav-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('nav-open');
    };
  }, [navOpen]);

  return (
    <div className="app">
      <header className="topbar">
        <button
          ref={menuButton}
          type="button"
          className="topbar-menu"
          aria-expanded={navOpen}
          aria-controls="course-nav"
          onClick={() => setNavOpen((open) => !open)}
        >
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            {navOpen
              ? <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              : <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
          </svg>
          <span>{navOpen ? 'Close' : 'Lessons'}</span>
        </button>
        <Link to="/" className="topbar-home">StatLab</Link>
      </header>
      <Sidebar open={navOpen} />
      {navOpen && <div className="nav-backdrop" aria-hidden="true" onClick={() => setNavOpen(false)} />}
      <main className="app-main">
        <RStatus />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lesson/:lessonId" element={<Lesson />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/which-model" element={<ModelChooser />} />
          {/* The page was called "which test" until the curriculum settled on
              teaching one model under many names. Kept so links already shared
              with students, and any bookmark, still land somewhere. */}
          <Route path="/which-test" element={<Navigate to="/which-model" replace />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}
