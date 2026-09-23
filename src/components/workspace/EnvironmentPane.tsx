import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ObjectSummary } from '../../r/workspace';

const SECTIONS: { kind: ObjectSummary['kind']; title: string }[] = [
  { kind: 'data', title: 'Data' },
  { kind: 'value', title: 'Values' },
  { kind: 'function', title: 'Functions' },
];

type EnvironmentProps = {
  objects: ObjectSummary[];
  ready: boolean;
  onView: (name: string) => void;
  onClear: () => void;
};

/** Every object the student has made, grouped and described as RStudio's Environment pane does. */
export function EnvironmentView({ objects, ready, onView, onClear }: EnvironmentProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!objects.length) setConfirming(false);
  }, [objects.length]);

  return (
    <>
      <div className="ide-toolbar">
        <span className="ide-toolbar-label">Global Environment</span>
        <span className="ide-toolbar-spacer" />
        {confirming ? (
          <>
            <button type="button" className="danger" onClick={() => { setConfirming(false); onClear(); }}>
              Remove all objects
            </button>
            <button type="button" onClick={() => setConfirming(false)}>Keep them</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} disabled={!ready || !objects.length} title="Remove every object from the environment">
            Clear
          </button>
        )}
      </div>
      <div className="ide-scroll">
        {objects.length === 0 ? (
          <p className="ide-empty">Environment is empty</p>
        ) : (
          <table className="ide-objects">
            {SECTIONS.map(({ kind, title }) => {
              const rows = objects.filter((o) => o.kind === kind);
              if (!rows.length) return null;
              return (
                <tbody key={kind}>
                  <tr>
                    <th colSpan={2} scope="colgroup">{title}</th>
                  </tr>
                  {rows.map((object) => (
                    <tr key={object.name}>
                      <td className="ide-object-name">
                        {kind === 'data' ? (
                          <button type="button" className="ide-link" onClick={() => onView(object.name)} aria-label={`View ${object.name}`}>
                            {object.name}
                          </button>
                        ) : (
                          object.name
                        )}
                      </td>
                      <td className="ide-object-value">{object.description}</td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        )}
      </div>
    </>
  );
}

type HistoryProps = {
  history: string[];
  onToConsole: (code: string) => void;
  onToSource: (code: string) => void;
};

/** Every command run, oldest first. Pick one, then send it back to the console or into the script. */
export function HistoryView({ history, onToConsole, onToSource }: HistoryProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const list = useRef<HTMLOListElement | null>(null);
  const chosen = selected !== null ? history[selected] : undefined;

  useLayoutEffect(() => {
    const box = list.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [history.length]);

  return (
    <>
      <div className="ide-toolbar">
        <button type="button" disabled={chosen === undefined} onClick={() => chosen !== undefined && onToConsole(chosen)}>
          To Console
        </button>
        <button type="button" disabled={chosen === undefined} onClick={() => chosen !== undefined && onToSource(chosen)}>
          To Source
        </button>
      </div>
      <div className="ide-scroll">
        {history.length === 0 ? (
          <p className="ide-empty">Commands you run appear here.</p>
        ) : (
          <ol ref={list} className="ide-history" aria-label="Command history">
            {history.map((code, index) => (
              <li key={index}>
                <button
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                  onDoubleClick={() => onToConsole(code)}
                >
                  {code}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
