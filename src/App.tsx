import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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

  return (
    <div className="app">
      <Sidebar />
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
