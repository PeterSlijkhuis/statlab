import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Home from './Home';
import { getProgress, markExercise, saveDraft } from '../state/progress';

// jsdom's location.reload throws "Not implemented", and the assertion we want
// is "did the page reload?" anyway.
const reload = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  reload.mockClear();
  // jsdom 26 makes location.reload non-configurable, so swap the whole object.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderHome() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Home />
    </MemoryRouter>,
  );
}

/** Drives the file input the way the browser does, with a real File. */
async function importFile(json: string) {
  renderHome();
  const input = document.querySelector('.home-import input') as HTMLInputElement;
  const file = new File([json], 'statlab-progress.json', { type: 'application/json' });
  // jsdom's Blob has no `text()`; every browser that runs StatLab does.
  Object.defineProperty(file, 'text', { value: async () => json });
  await userEvent.upload(input, file);
}

const IMPORTED = JSON.stringify({
  version: 1,
  lessons: { '06-3': { exercises: {}, quizzes: {}, drafts: { b1: 'from the file' } } },
});

describe('importing progress over existing work', () => {
  test('asks first, and keeps the existing progress when the student declines', async () => {
    saveDraft('06-1', 'b1', 'work done in this browser');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    await importFile(IMPORTED);

    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(getProgress().lessons['06-1'].drafts.b1).toBe('work done in this browser');
    expect(getProgress().lessons['06-3']).toBeUndefined();
    expect(reload).not.toHaveBeenCalled();
  });

  test('imports when the student confirms', async () => {
    markExercise('06-1', 'm6-e1', 'passed');
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await importFile(IMPORTED);

    await waitFor(() => expect(getProgress().lessons['06-3']?.drafts.b1).toBe('from the file'));
    expect(getProgress().lessons['06-1']).toBeUndefined();
    expect(reload).toHaveBeenCalled();
  });

  test('does not ask when there is nothing to lose', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await importFile(IMPORTED);

    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(confirm).not.toHaveBeenCalled();
  });
});

describe('a browser that cannot save', () => {
  test('says so instead of claiming the progress is saved', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('private browsing');
    });
    markExercise('06-1', 'm6-e1', 'passed');

    renderHome();

    expect(screen.getByRole('alert').textContent).toContain('not saving your progress');
    expect(screen.queryByText(/Progress is saved only in this browser/)).toBeNull();
  });

  test('warns on the very first render, before anything has been written', () => {
    // The landing page is read before any lesson is opened, so nothing has
    // tried to save yet. Without a probe the student is told their progress
    // is saved, works through a module, and loses it on closing the tab.
    // The successful write first clears any failure an earlier test recorded,
    // so this can only pass by probing.
    markExercise('06-1', 'm6-e1', 'passed');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('private browsing');
    });

    renderHome();

    expect(screen.getByRole('alert').textContent).toContain('not saving your progress');
    expect(screen.queryByText(/Progress is saved only in this browser/)).toBeNull();
  });

  test('keeps the normal reassurance while writes succeed', () => {
    markExercise('06-1', 'm6-e1', 'passed');

    renderHome();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/Progress is saved only in this browser/)).toBeTruthy();
  });
});
