import { useEffect, useRef, useState } from 'react';
import type { WebR } from 'webr';
import {
  listUploads,
  readCode,
  removeUpload,
  subscribeUploads,
  UPLOAD_ACCEPT,
  uploadFile,
  UploadError,
  uploadKind,
} from '../../r/uploads';
import { HOME } from '../../r/session';
import { listFiles, type FileEntry } from '../../r/workspace';

type Props = {
  webR: WebR | null;
  /** Changes after every run, since code can write files too. */
  version: number;
  onImport: (code: string) => void;
};

/** Left in R's home folder by webR itself, not by anything the student did. */
const WEBR_LEFTOVERS = new Set(['default.profraw', 'Rplots.pdf']);

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * RStudio's Files pane over R's working directory. The course datasets and
 * the student's uploads both live in `data/`, which is where uploading goes
 * and where Import writes the line of code that reads a file in.
 */
export default function FilesPane({ webR, version, onImport }: Props) {
  const [path, setPath] = useState<string[]>([]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [uploads, setUploads] = useState(listUploads);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const folder = path.length ? path.join('/') : '.';

  useEffect(() => subscribeUploads(() => setUploads(listUploads())), []);

  useEffect(() => {
    if (!webR) return;
    let live = true;
    listFiles(webR, folder)
      .then((next) => live && setEntries(folder === '.' ? next.filter((e) => !WEBR_LEFTOVERS.has(e.name)) : next))
      .catch(() => live && setEntries([]));
    return () => {
      live = false;
    };
  }, [webR, folder, version, uploads]);

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file || !webR) return;
    setBusy(true);
    setError(null);
    // Uploads land in data/, so that is where the student should be looking.
    setPath(['data']);
    try {
      await uploadFile(webR, file);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : `Could not upload "${file.name}". Try again.`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function remove(name: string) {
    if (!webR) return;
    try {
      await removeUpload(webR, name);
    } catch {
      setError(`Could not remove "${name}". Try again.`);
    }
  }

  /** Copies a file out of R to the student's computer: the only way to keep what R writes past a reload. */
  async function download(name: string) {
    if (!webR) return;
    try {
      const bytes = await webR.FS.readFile(`${HOME}/${path.length ? `${path.join('/')}/` : ''}${name}`);
      const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>]));
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(`Could not download "${name}". Try again.`);
    }
  }

  const inData = folder === 'data';

  return (
    <>
      <div className="ide-toolbar">
        <input
          ref={input}
          type="file"
          accept={UPLOAD_ACCEPT}
          aria-label="Choose a data file"
          hidden
          onChange={(event) => void pick(event.target.files)}
        />
        <button type="button" onClick={() => input.current?.click()} disabled={!webR || busy}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
        <span className="ide-toolbar-note">CSV, TSV, TXT or Excel, up to 25 MB. Kept in this browser, never sent anywhere. Download what R writes before you reload.</span>
      </div>
      <nav className="ide-breadcrumbs" aria-label="Folder">
        <button type="button" className="ide-link" onClick={() => setPath([])} aria-current={path.length ? undefined : 'location'}>
          Home
        </button>
        {path.map((part, index) => (
          <span key={index}>
            <span aria-hidden="true"> › </span>
            <button
              type="button"
              className="ide-link"
              onClick={() => setPath(path.slice(0, index + 1))}
              aria-current={index === path.length - 1 ? 'location' : undefined}
            >
              {part}
            </button>
          </span>
        ))}
      </nav>
      {error && <p className="ide-error" role="alert">{error}</p>}
      <div className="ide-scroll">
        {entries.length === 0 ? (
          <p className="ide-empty">This folder is empty.</p>
        ) : (
          <table className="ide-files" aria-label={`Files in ${path.length ? path.join('/') : 'Home'}`}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Size</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const kind = entry.folder ? null : uploadKind(entry.name);
                const upload = inData ? uploads.find((u) => u.name === entry.name) : undefined;
                const code = upload?.code ?? (inData && kind ? readCode(entry.name, kind) : null);
                return (
                  <tr key={entry.name}>
                    <td className="ide-file-name">
                      {entry.folder ? (
                        <button type="button" className="ide-link" onClick={() => setPath([...path, entry.name])}>
                          <span aria-hidden="true">📁 </span>
                          {entry.name}
                        </button>
                      ) : (
                        <>
                          <span aria-hidden="true">📄 </span>
                          {entry.name}
                        </>
                      )}
                    </td>
                    <td className="ide-file-size">{entry.folder ? '' : formatBytes(entry.bytes)}</td>
                    <td className="ide-file-actions">
                      {code && (
                        <button type="button" onClick={() => onImport(code)} title={code} aria-label={`Import ${entry.name}`}>
                          Import
                        </button>
                      )}
                      {!entry.folder && (
                        <button type="button" onClick={() => void download(entry.name)} aria-label={`Download ${entry.name}`} title="Save this file to your computer">
                          Download
                        </button>
                      )}
                      {upload && (
                        <button type="button" onClick={() => void remove(upload.name)} aria-label={`Remove ${upload.name}`}>
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
