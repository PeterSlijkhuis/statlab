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

describe('ensurePackages', () => {
  /**
   * A fake that starts with `installed` present and gains whatever it is asked
   * to install, so the "already there" and "installs it" paths differ.
   */
  function trackingWebR(installed: string[] = []) {
    const present = new Set(installed);
    const webR = {
      installPackages: vi.fn(async (names: string[]) => {
        names.forEach((name) => present.add(name));
      }),
      evalRBoolean: vi.fn(async (code: string) =>
        present.has(/package = "(.*)"/.exec(code)?.[1] ?? ''),
      ),
    };
    return webR as unknown as WebR & typeof webR;
  }

  test('installs only what is missing', async () => {
    const { ensurePackages } = await import('./session');
    const webR = trackingWebR(['dplyr']);

    await ensurePackages(webR, ['dplyr', 'broom']);

    expect(webR.installPackages).toHaveBeenCalledWith(['broom']);
  });

  test('installs nothing when everything is present', async () => {
    const { ensurePackages } = await import('./session');
    const webR = trackingWebR(['dplyr', 'broom']);

    await ensurePackages(webR, ['dplyr', 'broom']);

    expect(webR.installPackages).not.toHaveBeenCalled();
  });

  test('a second call for the same package does not reinstall', async () => {
    const { ensurePackages } = await import('./session');
    const webR = trackingWebR();

    await ensurePackages(webR, ['emmeans']);
    await ensurePackages(webR, ['emmeans']);

    expect(webR.installPackages).toHaveBeenCalledTimes(1);
  });

  test('concurrent calls for the same package install it once', async () => {
    // Two code blocks in one lesson can call Run before either install settles.
    const { ensurePackages } = await import('./session');
    const webR = trackingWebR();

    await Promise.all([ensurePackages(webR, ['car']), ensurePackages(webR, ['car'])]);

    expect(webR.installPackages).toHaveBeenCalledTimes(1);
  });

  test('reports the package that could not be installed', async () => {
    const { ensurePackages } = await import('./session');

    await expect(ensurePackages(fakeWebR(() => false), ['lmerTest'])).rejects.toThrow(/lmerTest/);
  });

  test('a failed install is not cached, so pressing Run again retries', async () => {
    // Campus wifi drops mid-download; the second attempt must reach the network
    // rather than replay the first attempt's rejection.
    const { ensurePackages } = await import('./session');
    const present = new Set<string>();
    let attempts = 0;
    const webR = {
      installPackages: vi.fn(async (names: string[]) => {
        attempts += 1;
        if (attempts > 1) names.forEach((name) => present.add(name));
      }),
      evalRBoolean: vi.fn(async (code: string) =>
        present.has(/package = "(.*)"/.exec(code)?.[1] ?? ''),
      ),
    } as unknown as WebR;

    await expect(ensurePackages(webR, ['car'])).rejects.toThrow(/Could not install car/);
    await expect(ensurePackages(webR, ['car'])).resolves.toBeUndefined();
  });

  test('the on-demand set names every package a lesson may declare', async () => {
    const { CORE_PACKAGES, ON_DEMAND_PACKAGES, KNOWN_PACKAGES } = await import('./session');

    expect(KNOWN_PACKAGES).toEqual([...CORE_PACKAGES, ...ON_DEMAND_PACKAGES]);
  });
});
