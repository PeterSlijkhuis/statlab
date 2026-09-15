import { Route, Routes } from 'react-router-dom';
import RStatus from './components/RStatus';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Lesson from './pages/Lesson';
import Playground from './pages/Playground';
import TestChooser from './pages/TestChooser';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <main className="app-main">
        <RStatus />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lesson/:lessonId" element={<Lesson />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/which-test" element={<TestChooser />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}
