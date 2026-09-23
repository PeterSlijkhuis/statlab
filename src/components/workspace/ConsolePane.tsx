import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { ConsoleLine } from '../../r/workspace';

type Props = {
  lines: ConsoleLine[];
  history: string[];
  ready: boolean;
  running: boolean;
  /** Resolves true when the code ran, false when R wants more lines first. */
  onRun: (code: string) => Promise<boolean>;
  onClear: () => void;
  /** Code another pane has sent to the console, to place in the input line. */
  pending: { code: string; at: number } | null;
};

/** R's own labels, so a student reads the same words here as in RStudio. */
const PREFIX: Partial<Record<ConsoleLine['type'], string>> = {
  error: 'Error: ',
  warning: 'Warning: ',
};

/**
 * RStudio's Console: everything run so far, with the prompt at the bottom.
 * Enter runs the line, Shift+Enter starts a new one, the up and down arrows
 * walk back through earlier commands and Ctrl+L clears the screen.
 */
export default function ConsolePane({ lines, history, ready, running, onRun, onClear, pending }: Props) {
  const [input, setInput] = useState('');
  // Where the arrows are in `history`; history.length means "the line being typed".
  const [cursor, setCursor] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const field = useRef<HTMLTextAreaElement | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const box = scroller.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [lines, input]);

  useEffect(() => {
    if (!pending) return;
    setInput(pending.code);
    setCursor(null);
    field.current?.focus();
  }, [pending]);

  function recall(step: -1 | 1) {
    if (!history.length) return false;
    const at = cursor ?? history.length;
    const next = Math.min(history.length, Math.max(0, at + step));
    if (next === at) return false;
    if (cursor === null) setDraft(input);
    setCursor(next);
    setInput(next === history.length ? draft : history[next]);
    return true;
  }

  async function key(event: KeyboardEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (running || !ready) return;
      const code = input;
      if (await onRun(code)) {
        setInput('');
        setCursor(null);
      } else {
        // Unfinished, like `mean(x`: RStudio waits on a + prompt; here the line simply grows.
        setInput(`${code}\n`);
      }
      return;
    }
    if (event.key === 'ArrowUp' && !target.value.slice(0, target.selectionStart).includes('\n')) {
      if (recall(-1)) event.preventDefault();
      return;
    }
    if (event.key === 'ArrowDown' && !target.value.slice(target.selectionEnd).includes('\n')) {
      if (recall(1)) event.preventDefault();
      return;
    }
    if (event.key.toLowerCase() === 'l' && event.ctrlKey) {
      event.preventDefault();
      onClear();
      return;
    }
    if (event.key === 'Escape') {
      setInput('');
      setCursor(null);
    }
  }

  function focusInput() {
    // Clicking the transcript to copy from it must not steal the selection.
    if (window.getSelection()?.toString()) return;
    field.current?.focus();
  }

  return (
    <div className="ide-console" ref={scroller} onClick={focusInput}>
      <div role="log" aria-label="Console output" className="ide-console-log">
        {lines.map((line, index) => (
          <div key={index} className={`ide-console-line ide-console-${line.type}`}>
            {PREFIX[line.type] ?? ''}
            {line.text}
          </div>
        ))}
      </div>
      <div className="ide-console-prompt">
        <span aria-hidden="true">&gt;</span>
        <textarea
          ref={field}
          aria-label="Console input"
          rows={Math.max(1, input.split('\n').length)}
          value={input}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={ready ? '' : 'R is starting…'}
          disabled={!ready}
          onChange={(event) => {
            setInput(event.target.value);
            setCursor(null);
          }}
          onKeyDown={(event) => void key(event)}
        />
      </div>
    </div>
  );
}
