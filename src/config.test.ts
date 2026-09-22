// @vitest-environment node
import { describe, expect, test } from 'vitest';
import config from '../vite.config';

describe('vite config', () => {
  test('base path matches the GitHub Pages project path', () => {
    expect(config.base).toBe('/statlab/');
  });

  test('base path is absolute and ends in a slash, as Vite requires', () => {
    expect(config.base?.startsWith('/')).toBe(true);
    expect(config.base?.endsWith('/')).toBe(true);
  });
});
