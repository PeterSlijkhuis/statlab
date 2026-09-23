import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import FileUpload from './FileUpload';
import { LessonProvider } from '../content/LessonContext';

const uploadFile = vi.hoisted(() => vi.fn());
const removeUpload = vi.hoisted(() => vi.fn());
// IndexedDB is a browser API; an in-memory stand-in keeps these tests about R.
vi.mock('../state/uploadStore', () => ({
  saveStoredFile: async () => {},
  deleteStoredFile: async () => {},
  loadStoredFiles: async () => [],
}));

vi.mock('../r/uploads', async (original) => {
  const real = await original<typeof import('../r/uploads')>();
  return { ...real, uploadFile, removeUpload };
});

import { UploadError, resetUploads } from '../r/uploads';

function renderUpload(ready = true, compact = false) {
  return render(
    <LessonProvider value={{ lessonId: 'playground', webR: {} as never, env: {} as never, ready }}>
      <FileUpload compact={compact} />
    </LessonProvider>,
  );
}

beforeEach(() => {
  resetUploads();
  uploadFile.mockReset();
  removeUpload.mockReset();
});

describe('FileUpload', () => {
  test('waits for R before offering the upload', () => {
    renderUpload(false);
    expect(screen.getByRole('button', { name: 'Upload a file' })).toHaveProperty('disabled', true);
  });

  test('hands the picked file to R', async () => {
    uploadFile.mockResolvedValue({});
    renderUpload();
    const picked = new File(['a\n1\n'], 'survey.csv');
    await userEvent.upload(screen.getByLabelText('Choose a data file'), picked);
    await waitFor(() => expect(uploadFile).toHaveBeenCalledWith(expect.anything(), picked));
  });

  test("shows a student's mistake in their own words", async () => {
    uploadFile.mockRejectedValue(new UploadError('"workplace.csv" is the name of a course dataset.'));
    renderUpload();
    await userEvent.upload(screen.getByLabelText('Choose a data file'), new File(['x'], 'workplace.csv'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/course dataset/);
  });

  test('hides an internal failure behind a plain retry message', async () => {
    uploadFile.mockRejectedValue(new Error('ErrnoError: 28'));
    renderUpload();
    await userEvent.upload(screen.getByLabelText('Choose a data file'), new File(['x'], 'a.csv'));
    expect((await screen.findByRole('alert')).textContent).toBe('Could not upload "a.csv". Try again.');
  });

  test('lists an upload with the line that reads it, in every panel on the page', async () => {
    // The real store drives the list: an upload from one panel appears in the other.
    const real = await vi.importActual<typeof import('../r/uploads')>('../r/uploads');
    uploadFile.mockImplementation(async (_: unknown, f: File) => {
      const FS = { analyzePath: async () => ({ exists: true }), writeFile: async () => {} };
      Object.defineProperty(f, 'arrayBuffer', { value: async () => new ArrayBuffer(1) });
      return real.uploadFile({ FS } as never, f);
    });
    render(
      <LessonProvider value={{ lessonId: '03-1', webR: {} as never, env: {} as never, ready: true }}>
        <FileUpload />
        <FileUpload compact />
      </LessonProvider>,
    );
    await userEvent.upload(screen.getAllByLabelText('Choose a data file')[0], new File(['a'], 'My data.csv'));
    await waitFor(() => expect(screen.getAllByText('data/My_data.csv')).toHaveLength(2));
    expect(screen.getAllByText('my_data <- read.csv("data/My_data.csv", stringsAsFactors = TRUE)')).toHaveLength(2);
  });
});
