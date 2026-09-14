import { describe, expect, test, vi, beforeEach } from 'vitest';
import { WEBR_BASE_URL, WEBR_VERSION } from './webrClient';

vi.mock('webr');

describe('webR version pin', () => {
  test('pins an explicit version', () => {
    expect(WEBR_VERSION).toBe('v0.6.0');
  });

  test('base URL targets the pinned version, never latest', () => {
    expect(WEBR_BASE_URL).toBe('https://webr.r-wasm.org/v0.6.0/');
    expect(WEBR_BASE_URL).not.toContain('latest');
  });

  test('base URL ends in a slash so webR resolves assets correctly', () => {
    expect(WEBR_BASE_URL.endsWith('/')).toBe(true);
  });
});

describe('status pub/sub', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('onStatus replays current status immediately', async () => {
    const { onStatus, setStatus } = await import('./webrClient');

    setStatus({ phase: 'ready' });

    const statuses: any[] = [];
    onStatus((s) => statuses.push(s));

    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toEqual({ phase: 'ready' });
  });

  test('setStatus notifies all listeners', async () => {
    const { onStatus, setStatus } = await import('./webrClient');

    const calls1: any[] = [];
    const calls2: any[] = [];

    onStatus((s) => calls1.push(s));
    onStatus((s) => calls2.push(s));

    setStatus({ phase: 'booting' });

    expect(calls1).toHaveLength(2); // initial + setStatus
    expect(calls2).toHaveLength(2);
    expect(calls1[1]).toEqual({ phase: 'booting' });
    expect(calls2[1]).toEqual({ phase: 'booting' });
  });

  test('unsubscribe function stops notifications', async () => {
    const { onStatus, setStatus } = await import('./webrClient');

    const calls: any[] = [];
    const unsubscribe = onStatus((s) => calls.push(s));

    setStatus({ phase: 'installing' });
    expect(calls).toHaveLength(2); // initial + first setStatus

    unsubscribe();
    setStatus({ phase: 'ready' });

    expect(calls).toHaveLength(2); // no new call after unsubscribe
  });
});

describe('singleton and retry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test('concurrent getWebR calls construct WebR exactly once', async () => {
    const { WebR } = await import('webr');
    const MockedWebR = vi.mocked(WebR);
    const mockInit = vi.fn().mockResolvedValue(undefined);
    MockedWebR.mockImplementation(() => ({
      init: mockInit,
    } as any));

    const { getWebR } = await import('./webrClient');

    const [result1, result2] = await Promise.all([
      getWebR(),
      getWebR(),
    ]);

    expect(MockedWebR).toHaveBeenCalledTimes(1);
    expect(result1).toBe(result2);
  });

  test('getWebR passes baseUrl to WebR constructor', async () => {
    const { WebR } = await import('webr');
    const MockedWebR = vi.mocked(WebR);
    const mockInit = vi.fn().mockResolvedValue(undefined);
    MockedWebR.mockImplementation(() => ({
      init: mockInit,
    } as any));

    const { getWebR, WEBR_BASE_URL } = await import('./webrClient');

    await getWebR();

    expect(MockedWebR).toHaveBeenCalledWith({ baseUrl: WEBR_BASE_URL });
  });

  test('failed init sets error status and allows retry', async () => {
    const { WebR } = await import('webr');
    const MockedWebR = vi.mocked(WebR);
    const mockInit = vi.fn()
      .mockRejectedValueOnce(new Error('init failed'))
      .mockResolvedValueOnce(undefined);

    MockedWebR.mockImplementation(() => ({
      init: mockInit,
    } as any));

    const { getWebR, getStatus } = await import('./webrClient');

    // First call: init fails
    await expect(getWebR()).rejects.toThrow('init failed');
    expect(getStatus().phase).toBe('error');

    // Second call: should retry and succeed
    const result = await getWebR();
    expect(result).toBeDefined();
    expect(MockedWebR).toHaveBeenCalledTimes(2); // constructor called twice
  });
});
