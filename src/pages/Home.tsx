import { Link } from 'react-router-dom';
import { ALL_LESSONS, findLesson, MODULES } from '../content/manifest';
import {
  exportProgress,
  getProgress,
  hasStorageFailed,
  importProgress,
  lastVisitedLesson,
} from '../state/progress';

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
  const progress = getProgress();
  const resumeId = lastVisitedLesson();
  const resume = resumeId ? findLesson(resumeId) : undefined;
  const started = ALL_LESSONS.filter((lesson) => progress.lessons[lesson.id]).length;

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
      <h1>StatLab</h1>
      <p className="home-tagline">Statistics and R for psychology and business students — University of Twente.</p>
      <p>Everything here runs in your browser. Nothing is installed, nothing is uploaded, and your progress stays on this computer.</p>
      {resume && <p className="home-resume"><Link to={`/lesson/${resume.id}`}>Continue: {resume.title}</Link></p>}
      <p>{started} of {ALL_LESSONS.length} lessons started.</p>
      {MODULES.map((module) => (
        <section key={module.id}>
          <h2>{module.number}. {module.title}</h2>
          <ol>{module.lessons.map((lesson) => <li key={lesson.id}><Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link></li>)}</ol>
        </section>
      ))}
      <section>
        <h2>Your progress</h2>
        {hasStorageFailed()
          ? <p role="alert">This browser is not saving your progress — it will be lost when you close the tab. Export it now to keep it.</p>
          : <p>Progress is saved only in this browser. Export it to move to another computer, or to hand in as evidence of completion.</p>}
        <button type="button" onClick={() => download(exportProgress())}>Export progress</button>
        <label className="home-import">
          Import progress
          <input type="file" accept="application/json" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onImport(file);
            // Cleared so picking the same file again fires another change event:
            // a student who declines the overwrite can change their mind.
            event.target.value = '';
          }} />
        </label>
      </section>
    </div>
  );
}
