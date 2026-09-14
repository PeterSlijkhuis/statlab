import { describe, expect, test } from 'vitest';
import { WEBR_BASE_URL, WEBR_VERSION } from './webrClient';

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
