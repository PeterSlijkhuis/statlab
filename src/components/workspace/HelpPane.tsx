import { useState, type FormEvent } from 'react';

export type HelpPage = { topic: string; text: string | null } | null;

type Props = {
  page: HelpPage;
  loading: boolean;
  ready: boolean;
  onLookUp: (topic: string) => void;
  onHome: () => void;
};

/** Topics a student in this course reaches for first. */
const STARTERS = ['mean', 'sd', 'summary', 'read.csv', 'lm', 't.test', 'cor', 'table'];

/** RStudio's Help pane. `?mean` in the console or the script opens a page here too. */
export default function HelpPane({ page, loading, ready, onLookUp, onHome }: Props) {
  const [query, setQuery] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const topic = query.trim();
    if (topic) onLookUp(topic);
  }

  return (
    <>
      <form className="ide-toolbar" role="search" onSubmit={submit}>
        <button type="button" onClick={onHome} aria-label="Help home" title="Help home">⌂</button>
        <input
          type="search"
          aria-label="Search help"
          placeholder="Search help, e.g. mean"
          value={query}
          spellCheck={false}
          autoCapitalize="off"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" disabled={!ready || !query.trim()}>Find</button>
      </form>
      <div className="ide-scroll">
        {loading ? (
          <p className="ide-empty">Looking it up…</p>
        ) : page ? (
          page.text ? (
            <pre className="ide-help-text" aria-label={`Help for ${page.topic}`}>{page.text}</pre>
          ) : (
            <p className="ide-empty">No documentation for ‘{page.topic}’. Check the spelling, or load the package that has it first.</p>
          )
        ) : (
          <div className="ide-help-home">
            <p>
              Type <code>?</code> and a function's name in the Console, like <code>?mean</code>, or search above. Every help page has
              the same parts: Description, Usage, Arguments, and Examples at the bottom.
            </p>
            <p>Good first pages:</p>
            <ul>
              {STARTERS.map((topic) => (
                <li key={topic}>
                  <button type="button" className="ide-link" disabled={!ready} onClick={() => onLookUp(topic)}>
                    {topic}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
