import { render, screen } from '@testing-library/react';
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

  test('still shows the busy pill once booting really starts', async () => {
    const { setStatus } = await import('../r/webrClient');
    setStatus({ phase: 'booting' });

    await renderStatus();

    expect(screen.getByText('Starting R…')).toBeTruthy();
  });
});
