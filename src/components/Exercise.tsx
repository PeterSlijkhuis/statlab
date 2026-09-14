import { useState } from 'react';
import { getExercise } from '../content/exercises';
import { useLesson } from '../content/LessonContext';
import { runExercise, type CheckOutcome } from '../r/checker';
import { getDraft, markExercise, saveDraft } from '../state/progress';
import { PLOT_SIZE } from './CodeBlock';
import OutputPane from './OutputPane';
import REditor from './REditor';
import './Exercise.css';

export default function Exercise({ id }: { id: string }) {
  const { lessonId, webR, env, ready } = useLesson();
  const definition = getExercise(id);
  const [source, setSource] = useState(() => getDraft(lessonId, id) ?? definition?.starterCode ?? '');
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [checking, setChecking] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  if (!definition) {
    return <p className="exercise-missing">Exercise “{id}” is not defined.</p>;
  }

  function edit(next: string) {
    setSource(next);
    saveDraft(lessonId, id, next);
  }

  async function check() {
    if (!webR || !env || !ready) return;
    setChecking(true);
    try {
      const result = await runExercise(webR, definition!, source, env, PLOT_SIZE);
      setOutcome(result);
      setAttempted(true);
      // A broken check is an infrastructure fault: it records nothing.
      if (result.status === 'pass') markExercise(lessonId, id, 'passed');
      else if (result.status === 'fail' || result.status === 'student-error') {
        markExercise(lessonId, id, 'attempted');
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="exercise">
      <p className="exercise-label">Exercise</p>
      <p className="exercise-prompt">{definition.prompt}</p>

      <REditor value={source} onChange={edit} />

      <div className="exercise-actions">
        <button type="button" onClick={check} disabled={!ready || checking}>
          {checking ? 'Checking…' : 'Check my answer'}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => setHintsShown((n) => Math.min(n + 1, definition.hints.length))}
          disabled={hintsShown >= definition.hints.length}
        >
          Show a hint
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => setShowSolution(true)}
          disabled={!attempted || showSolution}
          title={attempted ? undefined : 'Try the exercise first'}
        >
          Show solution
        </button>
      </div>

      {hintsShown > 0 && (
        <ul className="exercise-hints">
          {definition.hints.slice(0, hintsShown).map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      )}

      {outcome && (
        <div className={`exercise-outcome outcome-${outcome.status}`}>
          {outcome.status === 'pass' && <p>{outcome.message}</p>}
          {outcome.status === 'fail' && <p>{outcome.message}</p>}
          {outcome.status === 'student-error' && (
            <p>Your code did not run. R reported the error shown below.</p>
          )}
          {outcome.status === 'broken-check' && (
            <p>
              There is a problem with this exercise itself, not with your answer. Please report it.
            </p>
          )}
        </div>
      )}

      {outcome && <OutputPane result={outcome.run} running={false} />}

      {showSolution && (
        <pre className="exercise-solution">
          <code>{definition.solution}</code>
        </pre>
      )}
    </section>
  );
}
