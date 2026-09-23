import { useState, type FormEvent } from 'react';
import { NOT_IN_BROWSER, RECOMMENDED, RECOMMENDED_NAMES, type InstalledPackage } from '../../r/packages';

type Props = {
  /** Null until R has listed them. */
  packages: InstalledPackage[] | null;
  ready: boolean;
  running: boolean;
  /** Runs code in the console, so the student sees the line that does the work. */
  onRun: (code: string) => void;
};

type Row = { name: string; what: string; installed?: InstalledPackage };

/** `install.packages(c("a", "b"))` for what the student typed, or null when none of it is a package name. */
export function installCode(typed: string): string | null {
  const names = typed
    .split(/[\s,]+/)
    .map((name) => name.replace(/^["']|["']$/g, ''))
    .filter((name) => /^[A-Za-z][A-Za-z0-9.]*$/.test(name));
  if (!names.length) return null;
  const quoted = [...new Set(names)].map((name) => `"${name}"`);
  return `install.packages(${quoted.length === 1 ? quoted[0] : `c(${quoted.join(', ')})`})`;
}

/**
 * RStudio's Packages pane. The course's recommended packages come first, with
 * a one-click install for any that R does not have yet; below them, every other
 * package R has. Ticking a box runs `library()` in the console, as RStudio does,
 * and unticking it runs `detach()`.
 */
export default function PackagesPane({ packages, ready, running, onRun }: Props) {
  const [filter, setFilter] = useState('');
  const [installing, setInstalling] = useState(false);
  const [typed, setTyped] = useState('');
  const byName = new Map((packages ?? []).map((p) => [p.name, p]));
  const needle = filter.trim().toLowerCase();
  const shown = (row: Row) =>
    !needle || row.name.toLowerCase().includes(needle) || row.what.toLowerCase().includes(needle);
  const disabled = !ready || running;

  const groups = RECOMMENDED.map((group) => ({
    title: group.title,
    rows: group.packages.map((p): Row => ({ ...p, installed: byName.get(p.name) })).filter(shown),
  })).filter((group) => group.rows.length);
  const others = (packages ?? [])
    .filter((p) => !RECOMMENDED_NAMES.includes(p.name))
    .map((p): Row => ({ name: p.name, what: p.title, installed: p }));
  const userLibrary = others.filter((row) => !row.installed?.base).filter(shown);
  const systemLibrary = others.filter((row) => row.installed?.base).filter(shown);

  function submit(event: FormEvent) {
    event.preventDefault();
    const code = installCode(typed);
    if (!code) return;
    onRun(code);
    setTyped('');
    setInstalling(false);
  }

  function row({ name, what, installed }: Row) {
    return (
      <tr key={name}>
        <td className="ide-package-load">
          <input
            type="checkbox"
            checked={Boolean(installed?.attached)}
            // R cannot run without base, so it cannot be detached.
            disabled={disabled || name === 'base'}
            aria-label={`Load ${name}`}
            title={installed?.attached ? `detach("package:${name}")` : `library(${name})`}
            onChange={() => onRun(installed?.attached ? `detach("package:${name}", unload = TRUE)` : `library(${name})`)}
          />
        </td>
        <td className="ide-package-name">{name}</td>
        <td className="ide-package-what">{what}</td>
        <td className="ide-package-version">
          {installed ? (
            installed.version
          ) : (
            <button type="button" disabled={disabled} onClick={() => onRun(`install.packages("${name}")`)} aria-label={`Install ${name}`}>
              Install
            </button>
          )}
        </td>
      </tr>
    );
  }

  function section(title: string, rows: Row[]) {
    if (!rows.length) return null;
    return (
      <tbody key={title}>
        <tr>
          <th colSpan={4} scope="colgroup">{title}</th>
        </tr>
        {rows.map(row)}
      </tbody>
    );
  }

  const nothing = !groups.length && !userLibrary.length && !systemLibrary.length;

  return (
    <>
      <div className="ide-toolbar">
        <button type="button" onClick={() => setInstalling((open) => !open)} disabled={disabled} aria-expanded={installing}>
          Install
        </button>
        <input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Find a package" aria-label="Find a package" />
      </div>
      {installing && (
        <form className="ide-install" onSubmit={submit}>
          <label>
            <span>Packages (separate several with a space or comma)</span>
            <input
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="psych, janitor"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
          </label>
          <div className="ide-install-actions">
            <button type="submit" disabled={disabled || !installCode(typed)}>Install</button>
            <button type="button" onClick={() => setInstalling(false)}>Cancel</button>
          </div>
        </form>
      )}
      <div className="ide-scroll">
        <p className="ide-packages-note">
          Nothing to install on your computer: packages come from webR's repository, which has most of CRAN built for the
          browser. <code>install.packages()</code> and <code>library()</code> fetch them for you. They stay until you reload the page.
        </p>
        {packages === null ? (
          <p className="ide-empty">{ready ? 'Listing packages…' : 'R is starting…'}</p>
        ) : nothing ? (
          <p className="ide-empty">No package matches “{filter}”.</p>
        ) : (
          <table className="ide-objects ide-packages" aria-label="Packages">
            {groups.map((group) => section(`Recommended: ${group.title}`, group.rows))}
            {section('Also installed', userLibrary)}
            {section('System library', systemLibrary)}
          </table>
        )}
        <details className="ide-unavailable">
          <summary>Packages that cannot run in the browser</summary>
          <p>These need something a browser does not have. Use R and RStudio on your own computer for them.</p>
          <dl>
            {Object.entries(NOT_IN_BROWSER).map(([name, reason]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{reason.charAt(0).toUpperCase() + reason.slice(1)}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </>
  );
}
