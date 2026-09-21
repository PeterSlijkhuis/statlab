import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import App from './App';

const mocks = vi.hoisted(() => ({
  getWebR: vi.fn().mockResolvedValue({ marker: 'webR' }),
  prepareSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./r/webrClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./r/webrClient')>()),
  getWebR: mocks.getWebR,
}));

vi.mock('./r/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./r/session')>()),
  prepareSession: mocks.prepareSession,
}));

describe('app boot', () => {
  test('starts and prepares the R session on first load, before any lesson opens', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.getWebR).toHaveBeenCalled());
    await waitFor(() => expect(mocks.prepareSession).toHaveBeenCalled());
    expect(mocks.prepareSession.mock.calls[0][0]).toEqual({ marker: 'webR' });
  });
});
