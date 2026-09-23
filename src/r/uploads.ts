import type { WebR } from 'webr';
import { DATA_DIR, DATASET_FILES, ensurePackages } from './session';
import { setStatus } from './webrClient';
import { deleteStoredFile, loadStoredFiles, saveStoredFile } from '../state/uploadStore';

/**
 * A student's own file, written into webR's in-memory file system next to the
 * course datasets. Nothing leaves the browser: the bytes go from the file
 * picker into the R worker and into this browser's IndexedDB, which puts them
 * back into R after a reload until the student removes them.
 */
export type Upload = {
  /** The name R sees, inside `data/`. May differ from the picked file's name. */
  name: string;
  kind: UploadKind;
  bytes: number;
  /** One line of R that reads the file into an object. */
  code: string;
};

export type UploadKind = 'csv' | 'tsv' | 'text' | 'excel';

const KINDS: Record<string, UploadKind> = {
  csv: 'csv',
  tsv: 'tsv',
  txt: 'text',
  xlsx: 'excel',
  xls: 'excel',
};

export const UPLOAD_ACCEPT = Object.keys(KINDS).map((ext) => `.${ext}`).join(',');

/** webR holds every file in the worker's memory, so a spreadsheet export is fine and a video is not. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * The name the file gets inside R. Kept close to what the student picked so
 * they recognise it, but reduced to characters that never need quoting or
 * escaping in a path: Module 0 teaches paths without spaces for this reason.
 */
export function cleanFileName(picked: string): string {
  const base = picked.split(/[\\/]/).pop() ?? '';
  return base
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[._-]+/, '')
    .replace(/_+(\.[^.]*)?$/, '$1');
}

export function uploadKind(name: string): UploadKind | null {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return null;
  return KINDS[name.slice(dot + 1).toLowerCase()] ?? null;
}

/** A tidy object name from the file name: "Survey 2024.csv" reads into `survey_2024`. */
export function objectName(name: string): string {
  const stem = name.replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!stem) return 'my_data';
  return /^[a-z]/.test(stem) ? stem : `my_${stem}`;
}

export function readCode(name: string, kind: UploadKind): string {
  const target = objectName(name);
  const path = `data/${name}`;
  switch (kind) {
    case 'csv':
      return `${target} <- read.csv("${path}", stringsAsFactors = TRUE)`;
    case 'tsv':
      return `${target} <- read.delim("${path}", stringsAsFactors = TRUE)`;
    case 'text':
      return `${target} <- readLines("${path}")`;
    case 'excel':
      return `${target} <- readxl::read_excel("${path}")`;
  }
}

let uploads: Upload[] = [];
const listeners = new Set<() => void>();

export function listUploads(): Upload[] {
  return uploads;
}

export function subscribeUploads(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function publish(next: Upload[]): void {
  uploads = next;
  for (const fn of listeners) fn();
}

/** Test-only: forget every upload. */
export function resetUploads(): void {
  uploads = [];
  restored = null;
}

function isCourseDataset(name: string): boolean {
  return DATASET_FILES.some((dataset) => dataset.toLowerCase() === name.toLowerCase());
}

async function writeIntoR(webR: WebR, name: string, bytes: Uint8Array): Promise<void> {
  const info = await webR.FS.analyzePath(DATA_DIR);
  if (!info.exists) await webR.FS.mkdir(DATA_DIR);
  await webR.FS.writeFile(`${DATA_DIR}/${name}`, bytes);
}

/**
 * readxl is only on the page for a student who has an Excel file. It is not
 * in the core set, so it installs each visit; the status pill shows it and
 * returns to ready when it is done.
 */
async function installExcelReader(webR: WebR): Promise<void> {
  try {
    await ensurePackages(webR, ['readxl']);
  } finally {
    setStatus({ phase: 'ready' });
  }
}

let restored: Promise<void> | null = null;

/**
 * Puts the files kept from earlier visits back into R's data folder, once per
 * page load. Never rejects: a browser that refuses storage (a private window,
 * for one) simply starts with no uploads, and the course still works.
 */
export function restoreUploads(webR: WebR): Promise<void> {
  if (!restored) {
    restored = (async () => {
      let kept: Upload[] = [];
      try {
        for (const file of await loadStoredFiles()) {
          const kind = uploadKind(file.name);
          if (!kind || isCourseDataset(file.name)) continue;
          await writeIntoR(webR, file.name, file.bytes);
          kept = [...kept, { name: file.name, kind, bytes: file.bytes.length, code: readCode(file.name, kind) }];
        }
      } catch {
        // Whatever was restored before the failure is still usable.
      }
      // Merged, not replaced: a student may upload while the restore is running.
      publish([...kept.filter((k) => !uploads.some((u) => u.name === k.name)), ...uploads]);
      if (kept.some((u) => u.kind === 'excel')) {
        // Not awaited: lessons should not wait on a package only one file needs.
        void installExcelReader(webR).catch(() => {});
      }
    })();
  }
  return restored;
}

/** Anything a student can fix themselves: the message is shown to them as written. */
export class UploadError extends Error {}

export async function uploadFile(webR: WebR, file: File): Promise<Upload> {
  const name = cleanFileName(file.name);
  const kind = uploadKind(name);
  if (!name || !kind) {
    throw new UploadError(`"${file.name}" is not a file R can read here. Upload a CSV, TSV, TXT or Excel file.`);
  }
  // Overwriting a course dataset would quietly change every lesson's numbers,
  // and every exercise check is written against those numbers.
  if (isCourseDataset(name)) {
    throw new UploadError(`"${name}" is the name of a course dataset. Rename your file and upload it again.`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(`"${file.name}" is larger than 25 MB, which is more than R in the browser can hold.`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  await writeIntoR(webR, name, bytes);

  const upload: Upload = { name, kind, bytes: bytes.length, code: readCode(name, kind) };
  // Uploading the same name again replaces the file in R, so it replaces the entry too.
  publish([...uploads.filter((u) => u.name !== name), upload]);

  // The file is usable from here on. What follows can only limit it, so each
  // problem is reported without taking the file away.
  let problem: string | null = null;
  try {
    await saveStoredFile(name, bytes);
  } catch {
    problem = `"${name}" is ready in data/, but this browser would not keep a copy, so it will be gone after a reload.`;
  }

  if (kind === 'excel') {
    try {
      await installExcelReader(webR);
    } catch {
      problem = `"${name}" is in data/, but the package that reads Excel files could not be installed. Check your connection and upload it again, or save the sheet as CSV.`;
    }
  }

  if (problem) throw new UploadError(problem);
  return upload;
}

export async function removeUpload(webR: WebR, name: string): Promise<void> {
  // The kept copy goes first: if that fails, the file stays listed rather
  // than vanishing now and reappearing on the next visit.
  await deleteStoredFile(name);
  const path = `${DATA_DIR}/${name}`;
  if ((await webR.FS.analyzePath(path)).exists) await webR.FS.unlink(path);
  publish(uploads.filter((u) => u.name !== name));
}
