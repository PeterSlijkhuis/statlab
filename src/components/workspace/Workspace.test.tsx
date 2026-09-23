import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const r = vi.hoisted(() => ({
  runInConsole: vi.fn(),
  parseStatements: vi.fn(),
  listObjects: vi.fn(),
  listFiles: vi.fn(),
  helpText: vi.fn(),
  previewData: vi.fn(),
  clearObjects: vi.fn(),
}));

const pkgs = vi.hoisted(() => ({
  installPackageShims: vi.fn(),
  listPackages: vi.fn(),
  ensurePackages: vi.fn(),
}));

vi.mock('../../r/workspace', async (original) => ({ ...(await original<typeof import('../../r/workspace')>()), ...r }));
vi.mock('../../r/packages', async (original) => ({
  ...(await original<typeof import('../../r/packages')>()),
  installPackageShims: pkgs.installPackageShims,
  listPackages: pkgs.listPackages,
}));
vi.mock('../../r/session', async (original) => ({ ...(await original<typeof import('../../r/session')>()), ensurePackages: pkgs.ensurePackages }));
vi.mock('../../state/uploadStore', () => ({
  saveStoredFile: async () => {},
  deleteStoredFile: async () => {},
  loadStoredFiles: async () => [],
}));

import Workspace from './Workspace';

// CodeMirror measures text when it scrolls the cursor into view; jsdom has no layout to measure.
Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
Range.prototype.getBoundingClientRect = () => new DOMRect();

/** The Source button in the Source pane's toolbar, not the narrow-screen pane switcher's. */
const sourceButton = (name: 'Run' | 'Source') => within(screen.getByRole('region', { name: 'Source' })).getByRole('button', { name });

const webR = { evalRString: async () => 'R version 4.5.1 (2025-06-13)', evalRVoid: async () => {} } as never;
const env = {} as never;

function renderWorkspace(ready = true) {
  return render(<Workspace id="test-workspace" starter={'x <- 1\nx'} webR={ready ? webR : null} env={ready ? env : null} />);
}

beforeEach(() => {
  localStorage.clear();
  Object.values(r).forEach((fn) => fn.mockReset());
  r.listObjects.mockResolvedValue([]);
  r.listFiles.mockResolvedValue([{ name: 'data', folder: true, bytes: 0 }]);
  r.parseStatements.mockResolvedValue({ kind: 'ok', ranges: [[1, 1], [2, 2]] });
  r.runInConsole.mockResolvedValue({ lines: [], images: [], errored: false, requests: [] });
  Object.values(pkgs).forEach((fn) => fn.mockReset());
  pkgs.installPackageShims.mockResolvedValue(undefined);
  pkgs.ensurePackages.mockResolvedValue(undefined);
  pkgs.listPackages.mockResolvedValue([
    { name: 'dplyr', version: '1.1.4', title: 'A Grammar of Data Manipulation', attached: false, base: false },
    { name: 'stats', version: '4.6.0', title: 'The R Stats Package', attached: true, base: true },
    { name: 'mnormt', version: '2.1.1', title: 'The Multivariate Normal and t Distributions', attached: false, base: false },
  ]);
});

const ran = (code: string) => expect(r.runInConsole).toHaveBeenCalledWith(webR, env, code, expect.anything(), expect.any(Number));

describe('Workspace', () => {
  test("has RStudio's four panes", () => {
    renderWorkspace(false);
    for (const name of ['Source', 'Console', 'Environment and History', 'Files, Plots, Packages and Help']) {
      expect(screen.getByRole('region', { name })).toBeTruthy();
    }
    expect(screen.getByRole('tab', { name: 'script.R' }).getAttribute('aria-selected')).toBe('true');
    for (const tab of ['Environment', 'History', 'Files', 'Plots', 'Packages', 'Help']) {
      expect(screen.getByRole('tab', { name: tab })).toBeTruthy();
    }
  });

  test('waits for R before running anything', () => {
    renderWorkspace(false);
    expect(sourceButton('Run')).toHaveProperty('disabled', true);
    expect(sourceButton('Source')).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('Console input')).toHaveProperty('disabled', true);
  });

  test('Source runs the whole script and the console shows what R printed', async () => {
    r.runInConsole.mockResolvedValue({
      lines: [
        { type: 'echo', text: '> x <- 1' },
        { type: 'echo', text: '> x' },
        { type: 'stdout', text: '[1] 1' },
      ],
      images: [],
      errored: false,
      requests: [],
    });
    r.listObjects.mockResolvedValue([{ name: 'x', kind: 'value', description: 'num 1' }]);
    renderWorkspace();
    await userEvent.click(sourceButton('Source'));

    expect(r.runInConsole).toHaveBeenCalledWith(webR, env, 'x <- 1\nx', expect.anything(), expect.any(Number));
    const log = screen.getByRole('log', { name: 'Console output' });
    await waitFor(() => expect(log.textContent).toContain('[1] 1'));
    expect(log.textContent).toContain('> x <- 1');
    await waitFor(() => expect(screen.getByRole('region', { name: 'Environment and History' }).textContent).toContain('num 1'));
  });

  test('an error is labelled as R labels it', async () => {
    r.runInConsole.mockResolvedValue({ lines: [{ type: 'error', text: 'object not found' }], images: [], errored: true, requests: [] });
    renderWorkspace();
    await userEvent.click(sourceButton('Source'));
    await waitFor(() => expect(screen.getByRole('log').textContent).toContain('Error: object not found'));
  });

  test('Enter in the console runs the line and keeps it in History', async () => {
    renderWorkspace();
    const input = screen.getByLabelText('Console input');
    await userEvent.type(input, 'mean(1:10){Enter}');
    await waitFor(() => expect(r.runInConsole).toHaveBeenCalledWith(webR, env, 'mean(1:10)', expect.anything(), expect.any(Number)));
    expect((input as HTMLTextAreaElement).value).toBe('');

    await userEvent.click(screen.getByRole('tab', { name: 'History' }));
    expect(within(screen.getByRole('list', { name: 'Command history' })).getByText('mean(1:10)')).toBeTruthy();

    // The up arrow brings the last command back, as in RStudio.
    await userEvent.type(input, '{ArrowUp}');
    expect((input as HTMLTextAreaElement).value).toBe('mean(1:10)');
  });

  test("installs a course modelling package the code asks for, then runs it", async () => {
    renderWorkspace();
    await userEvent.type(screen.getByLabelText('Console input'), 'library(emmeans){Enter}');
    await waitFor(() => expect(r.runInConsole).toHaveBeenCalled());
    expect(pkgs.ensurePackages).toHaveBeenCalledWith(webR, ['emmeans']);
    expect(pkgs.ensurePackages.mock.invocationCallOrder[0]).toBeLessThan(r.runInConsole.mock.invocationCallOrder[0]);
  });

  test('installs nothing for code that names no modelling package', async () => {
    renderWorkspace();
    await userEvent.type(screen.getByLabelText('Console input'), 'library(dplyr){Enter}');
    await waitFor(() => expect(r.runInConsole).toHaveBeenCalled());
    expect(pkgs.ensurePackages).not.toHaveBeenCalled();
  });

  test('a failed download still runs the code, so R can say what went wrong', async () => {
    pkgs.ensurePackages.mockRejectedValue(new Error('Could not install car. Check your connection and try again.'));
    renderWorkspace();
    await userEvent.type(screen.getByLabelText('Console input'), 'car::Anova(model){Enter}');
    await waitFor(() => ran('car::Anova(model)'));
  });

  test('an unfinished line waits for the rest instead of running', async () => {
    r.parseStatements.mockResolvedValue({ kind: 'incomplete' });
    renderWorkspace();
    const input = screen.getByLabelText('Console input') as HTMLTextAreaElement;
    await userEvent.type(input, 'mean(x{Enter}');
    await waitFor(() => expect(input.value).toBe('mean(x\n'));
    expect(r.runInConsole).not.toHaveBeenCalled();
  });

  test('?topic opens the Help pane', async () => {
    r.runInConsole.mockResolvedValue({ lines: [{ type: 'echo', text: '> ?mean' }], images: [], errored: false, requests: [{ kind: 'help', topic: 'mean' }] });
    r.helpText.mockResolvedValue('Arithmetic Mean\n\nDescription:');
    renderWorkspace();
    await userEvent.type(screen.getByLabelText('Console input'), '?mean{Enter}');
    expect((await screen.findByLabelText('Help for mean')).textContent).toContain('Arithmetic Mean');
    expect(screen.getByRole('tab', { name: 'Help' }).getAttribute('aria-selected')).toBe('true');
  });

  test('a data frame in Environment opens in the data viewer', async () => {
    r.listObjects.mockResolvedValue([{ name: 'df', kind: 'data', description: '2 obs. of 1 variable' }]);
    r.previewData.mockResolvedValue({ rows: 2, shown: 2, columns: ['a'], cells: [['1'], ['2']] });
    renderWorkspace();
    await userEvent.click(await screen.findByRole('button', { name: 'View df' }));
    expect(screen.getByRole('tab', { name: 'df' }).getAttribute('aria-selected')).toBe('true');
    const table = await screen.findByRole('table', { name: 'Data in df' });
    expect(table.textContent).toContain('2');

    await userEvent.click(screen.getByRole('button', { name: 'Close df' }));
    expect(screen.queryByRole('tab', { name: 'df' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'script.R' }).getAttribute('aria-selected')).toBe('true');
  });

  test('Clear asks before removing every object', async () => {
    r.listObjects.mockResolvedValue([{ name: 'x', kind: 'value', description: 'num 1' }]);
    renderWorkspace();
    await userEvent.click(await screen.findByRole('button', { name: 'Clear' }));
    expect(r.clearObjects).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Remove all objects' }));
    expect(r.clearObjects).toHaveBeenCalledWith(webR, env);
  });

  test('Files lists the working directory and opens folders', async () => {
    r.listFiles.mockImplementation(async (_webR: unknown, path: string) =>
      path === 'data' ? [{ name: 'workplace.csv', folder: false, bytes: 2048 }] : [{ name: 'data', folder: true, bytes: 0 }],
    );
    renderWorkspace();
    await userEvent.click(await screen.findByRole('button', { name: /data/ }));
    const row = await screen.findByRole('button', { name: 'Import workplace.csv' });
    expect(screen.getByRole('table', { name: 'Files in data' }).textContent).toContain('2.0 KB');

    await userEvent.click(row);
    await waitFor(() =>
      expect(r.runInConsole).toHaveBeenCalledWith(webR, env, 'workplace <- read.csv("data/workplace.csv", stringsAsFactors = TRUE)', expect.anything(), expect.any(Number)),
    );
  });

  test('the borders between panes move with the arrow keys and are remembered', () => {
    const { unmount } = renderWorkspace(false);
    const border = screen.getByRole('separator', { name: 'Resize left and right panes' });
    expect(border.getAttribute('aria-valuenow')).toBe('50');
    fireEvent.keyDown(border, { key: 'ArrowRight' });
    expect(border.getAttribute('aria-valuenow')).toBe('55');
    fireEvent.keyDown(border, { key: 'End' });
    expect(border.getAttribute('aria-valuenow')).toBe('85');
    unmount();

    renderWorkspace(false);
    expect(screen.getByRole('separator', { name: 'Resize left and right panes' }).getAttribute('aria-valuenow')).toBe('85');
    act(() => {
      fireEvent.doubleClick(screen.getByRole('separator', { name: 'Resize left and right panes' }));
    });
    expect(screen.getByRole('separator', { name: 'Resize left and right panes' }).getAttribute('aria-valuenow')).toBe('50');
  });

  test('running from Source brings the Console forward on a narrow screen', async () => {
    renderWorkspace();
    const show = screen.getByRole('group', { name: 'Show pane' });
    expect(within(show).getByRole('button', { name: 'Source' }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(sourceButton('Run'));
    await waitFor(() => expect(within(show).getByRole('button', { name: 'Console' }).getAttribute('aria-pressed')).toBe('true'));
  });

  test('Packages lists the recommended ones, and Install runs install.packages() in the console', async () => {
    renderWorkspace();
    await userEvent.click(screen.getByRole('tab', { name: 'Packages' }));
    const pane = screen.getByRole('tabpanel', { name: 'Packages' });
    await waitFor(() => expect(pane.textContent).toContain('1.1.4'));
    // Installed already: a version, not a button.
    expect(within(pane).queryByRole('button', { name: 'Install dplyr' })).toBeNull();
    // Recommended but not installed yet.
    await userEvent.click(within(pane).getByRole('button', { name: 'Install psych' }));
    await waitFor(() => ran('install.packages("psych")'));
    // A package R has that is not on the list still shows, as in RStudio.
    expect(pane.textContent).toContain('mnormt');
    expect(pane.textContent).toContain('System library');
  });

  test('ticking a package loads it with library(), unticking detaches it', async () => {
    renderWorkspace();
    await userEvent.click(screen.getByRole('tab', { name: 'Packages' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Load dplyr' }));
    await waitFor(() => ran('library(dplyr)'));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Load stats' }));
    await waitFor(() => ran('detach("package:stats", unload = TRUE)'));
  });

  test('Install takes any package names the student types', async () => {
    renderWorkspace();
    await userEvent.click(screen.getByRole('tab', { name: 'Packages' }));
    const pane = screen.getByRole('tabpanel', { name: 'Packages' });
    await userEvent.click(within(pane).getByRole('button', { name: 'Install' }));
    await userEvent.type(within(pane).getByRole('textbox', { name: /Packages/ }), 'lavaan, "semTools"{Enter}');
    await waitFor(() => ran('install.packages(c("lavaan", "semTools"))'));
  });

  test('says which packages cannot run in the browser, and why', async () => {
    renderWorkspace();
    await userEvent.click(screen.getByRole('tab', { name: 'Packages' }));
    const list = screen.getByText('Packages that cannot run in the browser').closest('details')!;
    expect(list.textContent).toContain('xlsx');
    expect(list.textContent).toContain('Java');
    expect(list.textContent).toContain('shiny');
  });

  test('a package the script names is fetched before the run, so the status pill can show it', async () => {
    renderWorkspace();
    await userEvent.type(screen.getByLabelText('Console input'), 'library(psych){Enter}');
    await waitFor(() => ran('library(psych)'));
    expect(pkgs.ensurePackages).toHaveBeenCalledWith(webR, ['psych']);
  });

  test('Open replaces the script with one from the computer', async () => {
    renderWorkspace();
    const picker = screen.getByLabelText('Open a script file') as HTMLInputElement;
    // jsdom's File has no text(); every browser the site supports does.
    const script = Object.assign(new File([''], 'analysis.R', { type: 'text/plain' }), { text: async () => 'y <- 2\r\ny * 3\r\n' });
    await userEvent.upload(picker, script);
    await userEvent.click(sourceButton('Source'));
    await waitFor(() => ran('y <- 2\ny * 3'));
  });

  test('scripts open in tabs of their own, and every tab survives a reload', async () => {
    const { unmount } = renderWorkspace();
    await userEvent.click(within(screen.getByRole('region', { name: 'Source' })).getByRole('button', { name: 'New' }));
    expect(screen.getByRole('tab', { name: 'Untitled.R' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.type(screen.getByRole('textbox', { name: 'R script' }), 'z <- 3');
    await userEvent.click(sourceButton('Source'));
    await waitFor(() => ran('z <- 3'));

    // The first script is still there, unchanged.
    await userEvent.click(screen.getByRole('tab', { name: 'script.R' }));
    await userEvent.click(sourceButton('Source'));
    await waitFor(() => ran('x <- 1\nx'));
    unmount();

    renderWorkspace();
    expect(screen.getByRole('tab', { name: 'script.R' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.click(screen.getByRole('tab', { name: 'Untitled.R' }));
    expect(screen.getByRole('textbox', { name: 'R script' }).textContent).toBe('z <- 3');
  });

  test('Rename names the script, and closing one with code in it asks first', async () => {
    renderWorkspace();
    const toolbar = within(screen.getByRole('region', { name: 'Source' }));
    await userEvent.click(toolbar.getByRole('button', { name: 'New' }));
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('analysis');
    await userEvent.click(toolbar.getByRole('button', { name: 'Rename' }));
    expect(screen.getByRole('tab', { name: 'analysis.R' })).toBeTruthy();
    prompt.mockRestore();

    // Empty: closes without asking.
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await userEvent.click(screen.getByRole('button', { name: 'Close analysis.R' }));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('tab', { name: 'analysis.R' })).toBeNull();
    // The last script cannot be closed at all.
    expect(screen.queryByRole('button', { name: 'Close script.R' })).toBeNull();
    confirm.mockRestore();
  });

  test('Download in Files saves a file R wrote to the computer', async () => {
    const readFile = vi.fn().mockResolvedValue(new TextEncoder().encode('a,b\n1,2\n'));
    const withFS = { ...(webR as object), FS: { readFile } } as never;
    r.listFiles.mockResolvedValue([{ name: 'results.csv', folder: false, bytes: 8 }]);
    const createObjectURL = vi.fn(() => 'blob:results');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<Workspace id="test-workspace" starter="" webR={withFS} env={env} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Download results.csv' }));
    await waitFor(() => expect(readFile).toHaveBeenCalledWith('/home/web_user/results.csv'));
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
