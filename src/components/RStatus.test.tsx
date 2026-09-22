import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// The status lives in a module-level singleton, so each test needs its own
// module graph or a sibling's `setStatus` leaks in.
beforeEach(() => {
  vi.resetModules();
});

async function renderStatus() {
  const { default: RStatus } = await import('./RStatus');
  return render(<RStatus />);
}

describe('RStatus', () => {
  test('renders nothing while nothing has started', async () => {
    const { container } = await renderStatus();
    expect(container.innerHTML).toBe('');
  });

  test('an install that starts after R is ready is shown again', async () => {
    // An on-demand package install happens long after boot. The pill must come
    // back, and it must name the package: a student waiting on a 20 MB download
    // should not read the generic "Installing packages…".
    const { setStatus } = await import('../r/webrClient');
    setStatus({ phase: 'ready' });

    await renderStatus();
    act(() => setStatus({ phase: 'installing', detail: 'Installing emmeans' }));

    expect(screen.getByText('Installing emmeans')).toBeTruthy();
  });

  test('still shows the busy pill once booting really starts', async () => {
    const { setStatus } = await import('../r/webrClient');
    setStatus({ phase: 'booting' });

    await renderStatus();

    expect(screen.getByText('Starting R…')).toBeTruthy();
  });
});
