import { useEffect, useState } from 'react';
import { onStatus, type RStatus as Status } from '../r/webrClient';

/**
 * Restarting reloads the page rather than respawning the worker in place.
 * webR's PostMessage channel cannot interrupt running R code, so a student's
 * infinite loop has no other escape. A reload clears the dead lesson
 * environment, the memoised session promise and stale component state in one
 * move, and nothing is lost because code drafts live in localStorage.
 */
function restart() {
  window.location.reload();
}

export default function RStatus() {
  const [status, setStatus] = useState<Status>({ phase: 'idle' });
  useEffect(() => onStatus(setStatus), []);

  // Nothing has started yet, so claim nothing: an amber "Starting R…" pill for
  // idle would be a lie on any page reached before the boot effect runs.
  if (status.phase === 'idle') return null;

  if (status.phase === 'ready') {
    return <div className="r-status ready"><span>R is ready</span><button type="button" onClick={restart} title="Use this if R stops responding">Restart R</button></div>;
  }

  if (status.phase === 'error') {
    return (
      <div className="r-status error">
        <p>R could not start. StatLab needs a recent browser and an internet connection the first time it loads. You can still read the lessons and answer the questions.</p>
        <p className="r-status-detail">{status.detail}</p>
        <button type="button" onClick={restart}>Try again</button>
      </div>
    );
  }

  return <div className="r-status busy"><span>{status.detail ?? (status.phase === 'installing' ? 'Installing packages…' : 'Starting R…')}</span></div>;
}
