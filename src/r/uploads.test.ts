import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { WebR } from 'webr';

const ensurePackages = vi.hoisted(() => vi.fn());
vi.mock('./session', async (original) => ({
  ...(await original<typeof import('./session')>()),
  ensurePackages,
}));
vi.mock('webr');

import {
  cleanFileName,
  listUploads,
  objectName,
  readCode,
  removeUpload,
  resetUploads,
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

describe('removeUpload', () => {
  test('deletes the file and its entry', async () => {
    const { webR, files } = fakeWebR();
    await uploadFile(webR, file('a.csv'));
    await removeUpload(webR, 'a.csv');
    expect(files.has('/home/web_user/data/a.csv')).toBe(false);
    expect(listUploads()).toEqual([]);
  });
});
