import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { WebR } from 'webr';

const ensurePackages = vi.hoisted(() => vi.fn());
vi.mock('./session', async (original) => ({
  ...(await original<typeof import('./session')>()),
  ensurePackages,
}));
vi.mock('webr');

// An in-memory stand-in for IndexedDB, which jsdom does not have.
const stored = vi.hoisted(() => new Map<string, { name: string; bytes: Uint8Array; savedAt: number }>());
const storeFails = vi.hoisted(() => ({ save: false, load: false }));
vi.mock('../state/uploadStore', () => ({
  saveStoredFile: vi.fn(async (name: string, bytes: Uint8Array) => {
    if (storeFails.save) throw new Error('QuotaExceededError');
    stored.set(name, { name, bytes, savedAt: stored.size });
  }),
  deleteStoredFile: vi.fn(async (name: string) => void stored.delete(name)),
  loadStoredFiles: vi.fn(async () => {
    if (storeFails.load) throw new Error('SecurityError');
    return [...stored.values()];
  }),
}));

import {
  cleanFileName,
  listUploads,
  objectName,
  readCode,
  removeUpload,
  resetUploads,
  restoreUploads,
  uploadFile,
  UploadError,
  uploadKind,
} from './uploads';
import { getStatus } from './webrClient';

function fakeWebR() {
  const files = new Map<string, Uint8Array>();
  const dirs = new Set<string>();
  const FS = {
    analyzePath: vi.fn(async (path: string) => ({ exists: files.has(path) || dirs.has(path) })),
    mkdir: vi.fn(async (path: string) => void dirs.add(path)),
    writeFile: vi.fn(async (path: string, bytes: Uint8Array) => void files.set(path, bytes)),
    unlink: vi.fn(async (path: string) => void files.delete(path)),
  };
  return { webR: { FS } as unknown as WebR, files, FS };
}

function file(name: string, content = 'a,b\n1,2\n') {
  const f = new File([content], name);
  // jsdom's File has no arrayBuffer(); every browser the site supports does.
  Object.defineProperty(f, 'arrayBuffer', { value: async () => new TextEncoder().encode(content).buffer });
  return f;
}

beforeEach(() => {
  resetUploads();
  ensurePackages.mockReset();
  stored.clear();
  storeFails.save = false;
  storeFails.load = false;
});

describe('naming', () => {
  test('keeps a plain name as it is', () => {
    expect(cleanFileName('survey.csv')).toBe('survey.csv');
  });

  test('replaces spaces and odd characters so the path never needs escaping', () => {
    expect(cleanFileName('My survey (final).csv')).toBe('My_survey_final.csv');
    expect(cleanFileName('C:\\Users\\sam\\data.csv')).toBe('data.csv');
    expect(cleanFileName('.hidden.csv')).toBe('hidden.csv');
  });

  test('recognises the kinds R can read here', () => {
    expect(uploadKind('a.CSV')).toBe('csv');
    expect(uploadKind('a.tsv')).toBe('tsv');
    expect(uploadKind('a.txt')).toBe('text');
    expect(uploadKind('a.xlsx')).toBe('excel');
    expect(uploadKind('a.xls')).toBe('excel');
    expect(uploadKind('a.pdf')).toBeNull();
    expect(uploadKind('noextension')).toBeNull();
  });

  test('derives a syntactic R object name', () => {
    expect(objectName('Survey_2024.csv')).toBe('survey_2024');
    expect(objectName('2024-results.csv')).toBe('my_2024_results');
    expect(objectName('.csv')).toBe('my_data');
  });

  test('reads each kind with base R, and Excel with readxl', () => {
    expect(readCode('survey.csv', 'csv')).toBe('survey <- read.csv("data/survey.csv", stringsAsFactors = TRUE)');
    expect(readCode('s.tsv', 'tsv')).toBe('s <- read.delim("data/s.tsv", stringsAsFactors = TRUE)');
    expect(readCode('notes.txt', 'text')).toBe('notes <- readLines("data/notes.txt")');
    expect(readCode('sheet.xlsx', 'excel')).toBe('sheet <- readxl::read_excel("data/sheet.xlsx")');
  });
});

describe('uploadFile', () => {
  test('writes the bytes into the data folder and lists the upload', async () => {
    const { webR, files } = fakeWebR();
    const upload = await uploadFile(webR, file('My survey.csv'));
    expect(upload.name).toBe('My_survey.csv');
    expect(new TextDecoder().decode(files.get('/home/web_user/data/My_survey.csv'))).toBe('a,b\n1,2\n');
    expect(listUploads().map((u) => u.name)).toEqual(['My_survey.csv']);
    expect(ensurePackages).not.toHaveBeenCalled();
  });

  test('creates the data folder when it is missing', async () => {
    const { webR, FS } = fakeWebR();
    await uploadFile(webR, file('a.csv'));
    expect(FS.mkdir).toHaveBeenCalledWith('/home/web_user/data');
  });

  test('uploading the same name again replaces the entry rather than adding one', async () => {
    const { webR } = fakeWebR();
    await uploadFile(webR, file('a.csv'));
    await uploadFile(webR, file('b.csv'));
    await uploadFile(webR, file('a.csv', 'x\n1\n'));
    expect(listUploads().map((u) => u.name)).toEqual(['b.csv', 'a.csv']);
  });

  test('never overwrites a course dataset, whatever the case', async () => {
    const { webR, FS } = fakeWebR();
    await expect(uploadFile(webR, file('workplace.csv'))).rejects.toThrow(UploadError);
    await expect(uploadFile(webR, file('Wellbeing-Population.CSV'))).rejects.toThrow(/course dataset/);
    expect(FS.writeFile).not.toHaveBeenCalled();
    expect(listUploads()).toEqual([]);
  });

  test('rejects a file type R cannot read here', async () => {
    const { webR, FS } = fakeWebR();
    await expect(uploadFile(webR, file('photo.png'))).rejects.toThrow(/CSV, TSV, TXT or Excel/);
    expect(FS.writeFile).not.toHaveBeenCalled();
  });

  test('rejects a file too large for R in the browser', async () => {
    const { webR, FS } = fakeWebR();
    const big = file('big.csv');
    Object.defineProperty(big, 'size', { value: 26 * 1024 * 1024 });
    await expect(uploadFile(webR, big)).rejects.toThrow(/25 MB/);
    expect(FS.writeFile).not.toHaveBeenCalled();
  });

  test('an Excel file installs readxl and leaves R ready', async () => {
    const { webR } = fakeWebR();
    ensurePackages.mockResolvedValue(undefined);
    await uploadFile(webR, file('sheet.xlsx'));
    expect(ensurePackages).toHaveBeenCalledWith(webR, ['readxl']);
    expect(getStatus()).toEqual({ phase: 'ready' });
  });

  test('a failed readxl install keeps the file and says what to do', async () => {
    const { webR } = fakeWebR();
    ensurePackages.mockRejectedValue(new Error('offline'));
    await expect(uploadFile(webR, file('sheet.xlsx'))).rejects.toThrow(/save the sheet as CSV/);
    expect(listUploads().map((u) => u.name)).toEqual(['sheet.xlsx']);
    expect(getStatus()).toEqual({ phase: 'ready' });
  });
});

describe('keeping uploads after a reload', () => {
  test('an upload is kept in the browser', async () => {
    const { webR } = fakeWebR();
    await uploadFile(webR, file('a.csv'));
    expect(new TextDecoder().decode(stored.get('a.csv')?.bytes)).toBe('a,b\n1,2\n');
  });

  test('a browser that will not keep it still gets the file for this visit, and is told', async () => {
    const { webR, files } = fakeWebR();
    storeFails.save = true;
    await expect(uploadFile(webR, file('a.csv'))).rejects.toThrow(/gone after a reload/);
    expect(files.has('/home/web_user/data/a.csv')).toBe(true);
    expect(listUploads().map((u) => u.name)).toEqual(['a.csv']);
  });

  test('restoring puts kept files back into R and lists them in upload order', async () => {
    stored.set('first.csv', { name: 'first.csv', bytes: new TextEncoder().encode('x\n1\n'), savedAt: 1 });
    stored.set('second.txt', { name: 'second.txt', bytes: new TextEncoder().encode('hi'), savedAt: 2 });
    const { webR, files } = fakeWebR();
    await restoreUploads(webR);
    expect(new TextDecoder().decode(files.get('/home/web_user/data/first.csv'))).toBe('x\n1\n');
    expect(listUploads().map((u) => u.code)).toEqual([
      'first <- read.csv("data/first.csv", stringsAsFactors = TRUE)',
      'second <- readLines("data/second.txt")',
    ]);
    expect(ensurePackages).not.toHaveBeenCalled();
  });

  test('restoring runs once per page load', async () => {
    stored.set('a.csv', { name: 'a.csv', bytes: new Uint8Array([97]), savedAt: 1 });
    const { webR, FS } = fakeWebR();
    await Promise.all([restoreUploads(webR), restoreUploads(webR)]);
    await restoreUploads(webR);
    expect(FS.writeFile).toHaveBeenCalledTimes(1);
  });

  test('a kept file can never overwrite a course dataset', async () => {
    stored.set('workplace.csv', { name: 'workplace.csv', bytes: new Uint8Array([1]), savedAt: 1 });
    const { webR, FS } = fakeWebR();
    await restoreUploads(webR);
    expect(FS.writeFile).not.toHaveBeenCalled();
    expect(listUploads()).toEqual([]);
  });

  test('a kept Excel file brings readxl back', async () => {
    stored.set('s.xlsx', { name: 's.xlsx', bytes: new Uint8Array([1]), savedAt: 1 });
    ensurePackages.mockResolvedValue(undefined);
    const { webR } = fakeWebR();
    await restoreUploads(webR);
    expect(ensurePackages).toHaveBeenCalledWith(webR, ['readxl']);
  });

  test('a browser that refuses storage starts with no uploads, and nothing breaks', async () => {
    storeFails.load = true;
    const { webR } = fakeWebR();
    await expect(restoreUploads(webR)).resolves.toBeUndefined();
    expect(listUploads()).toEqual([]);
  });
});

describe('removeUpload', () => {
  test('deletes the file, its entry and the kept copy', async () => {
    const { webR, files } = fakeWebR();
    await uploadFile(webR, file('a.csv'));
    await removeUpload(webR, 'a.csv');
    expect(files.has('/home/web_user/data/a.csv')).toBe(false);
    expect(stored.has('a.csv')).toBe(false);
    expect(listUploads()).toEqual([]);
  });
});
