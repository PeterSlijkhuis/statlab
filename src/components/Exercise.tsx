import { useRef, useState } from 'react';
import { getExercise } from '../content/exercises';
import { useLesson } from '../content/LessonContext';
import { runExercise, type CheckOutcome } from '../r/checker';
import { findLesson } from '../content/manifest';
import { getDraft, getProgress, markExercise, saveDraft } from '../state/progress';
import { lessonStatus, POINTS } from '../state/stats';
import { confetti, showToast } from './celebrate';
import { PLOT_SIZE, R_STOPPED_MESSAGE } from './CodeBlock';
import FileUpload from './FileUpload';
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
  const [crashed, setCrashed] = useState(false);
  const checkButton = useRef<HTMLButtonElement | null>(null);

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
    setCrashed(false);
    try {
      const result = await runExercise(webR, definition!, source, env, PLOT_SIZE);
      setOutcome(result);
      // Every evaluated submission counts as an attempt — including a broken
      // check. The student genuinely tried; keeping the solution locked would
      // punish them for a faulty exercise.
      setAttempted(true);
      // A broken check is an infrastructure fault: it records nothing.
      if (result.status === 'pass') {
        const lesson = findLesson(lessonId);
        const alreadyPassed = getProgress().lessons[lessonId]?.exercises[id] === 'passed';
        const wasComplete = lesson ? lessonStatus(lesson, getProgress()) === 'complete' : false;
        markExercise(lessonId, id, 'passed');
        // Rewards only for a first solve: re-checking a solved exercise is practice.
        if (!alreadyPassed) {
          confetti(checkButton.current);
          if (lesson && !wasComplete && lessonStatus(lesson, getProgress()) === 'complete') {
            showToast('Lesson complete!', `+${POINTS.exercise + POINTS.lesson} points. On to the next one.`, 'milestone');
          } else {
            showToast('Exercise solved', `+${POINTS.exercise} points`);
          }
        }
      } else if (result.status === 'fail' || result.status === 'student-error') {
        markExercise(lessonId, id, 'attempted');
      }
    } catch {
      // Neither the student's fault nor the exercise's: R itself stopped
      // responding. Record nothing, and do not count it as an attempt — their
      // answer was never evaluated.
      setOutcome(null);
      setCrashed(true);
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className={`exercise${outcome?.status === 'pass' ? ' exercise-passed' : ''}`}>
      <p className="exercise-label"><span aria-hidden="true">🎯</span> Exercise</p>
      <p className="exercise-prompt">{definition.prompt}</p>

      <REditor value={source} onChange={edit} />

      <div className="exercise-actions">
        <button ref={checkButton} type="button" onClick={check} disabled={!ready || checking}>
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

      {/* Files land beside the course datasets and never replace them, so an
          upload cannot change what a check compares the answer against. */}
      <FileUpload compact />

      {hintsShown > 0 && (
        <ul className="exercise-hints">
          {definition.hints.slice(0, hintsShown).map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      )}

      {crashed && (
        <div className="exercise-outcome outcome-broken-check">
          <p>{R_STOPPED_MESSAGE}</p>
        </div>
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
