import { Route, Routes } from 'react-router-dom';
import RStatus from './components/RStatus';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <main className="app-main">
        <RStatus />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}
