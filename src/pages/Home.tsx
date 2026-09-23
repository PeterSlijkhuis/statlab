import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Credits from '../components/Credits';
import Logo from '../components/Logo';
import { ALL_LESSONS, findLesson, MODULES } from '../content/manifest';
import { PARTS } from '../content/parts';
import {
  exportProgress,
  getProgress,
  hasStorageFailed,
  importProgress,
  lastVisitedLesson,
  subscribeProgress,
} from '../state/progress';
import { courseStats, firstUnfinished, lessonStatus, moduleProgress } from '../state/stats';

function download(contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'statlab-progress.json';
  // In the document, and revoked a tick later. Firefox ignores click() on an
  // anchor that is not in the document, and revoking in the same task can pull
  // the blob away before the browser has finished reading it.
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function Home() {
  const [, setTick] = useState(0);
  useEffect(() => subscribeProgress(() => setTick((tick) => tick + 1)), []);
  const progress = getProgress();
  const stats = courseStats(progress);
  const resumeId = lastVisitedLesson();
  const resume = resumeId ? findLesson(resumeId) : undefined;
  // A returning student picks up where they were; a new one starts at lesson 1.
  const target = resume ?? firstUnfinished(progress) ?? ALL_LESSONS[0];
  const percent = Math.round((stats.lessonsComplete / stats.lessonsTotal) * 100);

  async function onImport(file: File) {
    // Importing replaces the whole store, so work done in this browser since
    // the file was exported would go without warning, and the reload below
    // would hide the evidence.
    const existing = Object.keys(getProgress().lessons).length;
    if (existing && !window.confirm('Importing replaces all progress saved in this browser. Continue?')) return;
    const ok = importProgress(await file.text());
    if (ok) window.location.reload();
    else window.alert('That file could not be read as StatLab progress.');
  }

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <p className="hero-eyebrow"><Logo size={18} /> University of Twente</p>
          <h1>StatLab</h1>
          <p className="home-tagline">Data analysis and statistics in R for psychology and business students, in short, hands-on lessons.</p>
          <p className="hero-sub">Everything runs in your browser. Nothing is installed, nothing is uploaded, and your progress stays on this computer.</p>
          {target && (
            <Link to={`/lesson/${target.id}`} className="button-primary hero-cta home-resume">
              {resume ? 'Continue' : 'Start the course'}: {target.title}
              <span aria-hidden="true"> →</span>
            </Link>
          )}
        </div>
        <div className="hero-ring" aria-hidden="true">
          <ProgressRing value={percent} />
        </div>
      </section>

      <ul className="stat-tiles" aria-label="Your progress so far">
        <li className="stat-tile"><span className="stat-emoji" aria-hidden="true">🔥</span><strong>{stats.streak}</strong><span>day streak</span></li>
        <li className="stat-tile"><span className="stat-emoji" aria-hidden="true">⭐</span><strong>{stats.points}</strong><span>points</span></li>
        <li className="stat-tile"><span className="stat-emoji" aria-hidden="true">📘</span><strong>{stats.lessonsComplete}/{stats.lessonsTotal}</strong><span>lessons done</span></li>
        <li className="stat-tile"><span className="stat-emoji" aria-hidden="true">✅</span><strong>{stats.exercisesPassed}/{stats.exercisesTotal}</strong><span>exercises solved</span></li>
      </ul>

      {PARTS.map((part, partIndex) => (
        <section key={part.title} className="home-part">
          <header className="home-part-header">
            <p className="home-part-eyebrow">Part {partIndex + 1}</p>
            <h2>{part.title}</h2>
            <p>{part.blurb}</p>
          </header>
          <div className="module-grid">
            {MODULES.filter((module) => (part.modules as readonly number[]).includes(module.number)).map((module) => {
              const { done, total } = moduleProgress(module, progress);
              return (
                <article key={module.id} className={`module-card${done === total ? ' done' : ''}`}>
                  <div className="module-card-head">
                    <span className="module-card-number">{done === total ? '✓' : module.number}</span>
                    <h3>{module.title}</h3>
                  </div>
                  <div className="meter" role="progressbar" aria-label={`${module.title}: lessons done`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
                    <span style={{ width: `${(done / total) * 100}%` }} />
                  </div>
                  <ol>
                    {module.lessons.map((lesson) => (
                      <li key={lesson.id} className={`lesson-link ${lessonStatus(lesson, progress)}`}>
                        <Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="home-save">
        <h2>Your progress</h2>
        {hasStorageFailed()
          ? <p role="alert">This browser is not saving your progress, so it will be lost when you close the tab. Export it now to keep it.</p>
          : <p>Progress is saved only in this browser. Export it to move to another computer, or to hand in as evidence of completion.</p>}
        <div className="home-save-actions">
          <button type="button" className="button-secondary" onClick={() => download(exportProgress())}>Export progress</button>
          <label className="home-import button-secondary">
            Import progress
            <input type="file" accept="application/json" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImport(file);
              // Cleared so picking the same file again fires another change event:
              // a student who declines the overwrite can change their mind.
              event.target.value = '';
            }} />
          </label>
        </div>
      </section>

      <Credits />
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 120 120" className="progress-ring">
      <circle cx="60" cy="60" r={radius} className="progress-ring-track" />
      <circle
        cx="60" cy="60" r={radius} className="progress-ring-value"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value / 100)}
      />
      <text x="60" y="58" textAnchor="middle" className="progress-ring-number">{value}%</text>
      <text x="60" y="78" textAnchor="middle" className="progress-ring-label">complete</text>
    </svg>
  );
}
