import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { WebR } from 'webr';
import type { RStatus } from './webrClient';

/**
 * webR 0.6.0's `installPackages` warns and resolves when a download fails, so
 * a fake that resolves while a package is absent is the realistic case, not a
 * contrived one.
 */
function fakeWebR(present: (pkg: string) => boolean) {
  const installPackages = vi.fn().mockResolvedValue(undefined);
  const webR = {
    installPackages,
    evalRBoolean: vi.fn(async (code: string) => {
      const pkg = /package = "(.*)"/.exec(code)?.[1] ?? '';
      return present(pkg);
    }),
    FS: {
      analyzePath: vi.fn().mockResolvedValue({ exists: true }),
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  };
  return webR as unknown as WebR & typeof webR;
}

const loadNothing = async () => new Uint8Array();

beforeEach(() => {
  vi.resetModules(); // `prepared` and the status are module-level singletons.
});

describe('course package verification', () => {
  test('a package that is missing after install is named in the error', async () => {
    const { installCoursePackages } = await import('./session');
    const webR = fakeWebR((pkg) => pkg !== 'dplyr');

    await expect(installCoursePackages(webR)).rejects.toThrow(/Could not install dplyr/);
    expect(webR.installPackages).toHaveBeenCalledOnce();
  });

  test('every installed package passes without an error', async () => {
    const { installCoursePackages } = await import('./session');
    await expect(installCoursePackages(fakeWebR(() => true))).resolves.toBeUndefined();
  });

  test('a failed install never announces "ready", and reports the error instead', async () => {
    const { prepareSession } = await import('./session');
    const { onStatus } = await import('./webrClient');

    const seen: RStatus[] = [];
    onStatus((s) => seen.push(s));

    await expect(prepareSession(fakeWebR(() => false), loadNothing)).rejects.toThrow(
      /Could not install/,
    );

    expect(seen.map((s) => s.phase)).not.toContain('ready');
    expect(seen.at(-1)?.phase).toBe('error');
  });

  test('a complete install still reaches "ready"', async () => {
    const { prepareSession } = await import('./session');
    const { getStatus } = await import('./webrClient');

    await prepareSession(fakeWebR(() => true), loadNothing);

    expect(getStatus().phase).toBe('ready');
  });
});
