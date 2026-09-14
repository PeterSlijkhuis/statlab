import { useState } from 'react';
import { useLesson } from '../content/LessonContext';
import { evaluateR, type RunResult } from '../r/evaluate';
import { getDraft, saveDraft } from '../state/progress';
import OutputPane from './OutputPane';
import REditor from './REditor';
import './CodeBlock.css';

type Props = {
  id: string;
  code: string;
};

export const PLOT_SIZE = { width: 640, height: 400 };

export default function CodeBlock({ id, code }: Props) {
  const { lessonId, webR, env, ready } = useLesson();
  const [source, setSource] = useState(() => getDraft(lessonId, id) ?? code);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);

  function edit(next: string) {
    setSource(next);
    saveDraft(lessonId, id, next);
  }

  function reset() {
    setSource(code);
    saveDraft(lessonId, id, code);
  }

  async function run() {
    if (!webR || !ready) return;
    setRunning(true);
    try {
      setResult(await evaluateR(webR, source, { env: env ?? undefined, graphics: PLOT_SIZE }));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="code-block">
      <REditor value={source} onChange={edit} />
      <div className="code-block-actions">
        <button type="button" onClick={run} disabled={!ready || running}>
          {running ? 'Running…' : 'Run'}
        </button>
        <button type="button" onClick={reset} className="secondary">
          Reset
        </button>
        {!ready && <span className="code-block-hint">R is still starting…</span>}
      </div>
      <OutputPane result={result} running={running} />
    </div>
  );
}
