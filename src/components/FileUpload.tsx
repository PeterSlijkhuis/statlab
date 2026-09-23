import { useEffect, useRef, useState } from 'react';
import { useLesson } from '../content/LessonContext';
import {
  listUploads,
  removeUpload,
  subscribeUploads,
  UPLOAD_ACCEPT,
  uploadFile,
  UploadError,
} from '../r/uploads';
import './FileUpload.css';

/**
 * Lets a student put their own data file where R can read it. The playground
 * shows the full panel; an exercise shows the compact one, so the button sits
 * under the answer without crowding it. Both list every upload, because a file
 * uploaded anywhere is in the same `data/` folder everywhere.
 */
export default function FileUpload({ compact = false }: { compact?: boolean }) {
  const { webR, ready } = useLesson();
  const input = useRef<HTMLInputElement | null>(null);
  const [uploads, setUploads] = useState(listUploads);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => subscribeUploads(() => setUploads(listUploads())), []);

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file || !webR) return;
    setBusy(true);
    setError(null);
    try {
      await uploadFile(webR, file);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : `Could not upload "${file.name}". Try again.`);
    } finally {
      setBusy(false);
      // Cleared so picking the same file again, after editing it, still fires a change.
      if (input.current) input.current.value = '';
    }
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      // No clipboard permission: the line is on screen to copy by hand.
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

  return (
    <div className={`file-upload${compact ? ' file-upload-compact' : ''}`}>
      <div className="file-upload-bar">
        <input
          ref={input}
          type="file"
          accept={UPLOAD_ACCEPT}
          aria-label="Choose a data file"
          hidden
          onChange={(event) => void pick(event.target.files)}
        />
        <button
          type="button"
          className="file-upload-button"
          onClick={() => input.current?.click()}
          disabled={!ready || busy}
        >
          {busy ? 'Uploading…' : 'Upload a file'}
        </button>
        <span className="file-upload-note">
          {compact
            ? 'Use your own CSV, TSV, TXT or Excel file.'
            : 'CSV, TSV, TXT or Excel, up to 25 MB. It goes into the data folder and stays in this browser, even after a reload, until you remove it. It is never sent anywhere.'}
        </span>
      </div>

      {error && <p className="file-upload-error" role="alert">{error}</p>}

      {uploads.length > 0 && (
        <ul className="file-upload-list" aria-label="Your uploaded files">
          {uploads.map((upload) => (
            <li key={upload.name}>
              <span className="file-upload-name">data/{upload.name}</span>
              <code className="file-upload-code">{upload.code}</code>
              <span className="file-upload-actions">
                <button type="button" className="secondary" onClick={() => void copy(upload.code)}>
                  {copied === upload.code ? 'Copied' : 'Copy code'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void remove(upload.name)}
                  disabled={!webR}
                  aria-label={`Remove ${upload.name}`}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
