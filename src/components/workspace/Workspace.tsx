import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import type { RObject, WebR } from 'webr';
import { getDraft, saveDraft } from '../../state/progress';
import {
  clearObjects,
  DEFAULT_WIDTH,
  helpText,
  listObjects,
  parseStatements,
  previewData,
  runInConsole,
  type ConsoleLine,
  type DataPreview,
  type LineRange,
  type ObjectSummary,
  type Request,
} from '../../r/workspace';
import { R_STOPPED_MESSAGE } from '../CodeBlock';
import REditor from '../REditor';
import ConsolePane from './ConsolePane';
import DataViewer from './DataViewer';
import { EnvironmentView, HistoryView } from './EnvironmentPane';
import FilesPane from './FilesPane';
import HelpPane, { type HelpPage } from './HelpPane';
import PaneTabs, { panelId, tabId } from './PaneTabs';
import PlotsPane from './PlotsPane';
import Splitter from './Splitter';
import './Workspace.css';

type Props = {
  /** Scopes the saved script, so each page that hosts a workspace keeps its own. */
  id: string;
  starter: string;
  webR: WebR | null;
  env: RObject | null;
};

/** RStudio's four panes. On a narrow screen one shows at a time, picked by these. */
type Pane = 'source' | 'console' | 'environment' | 'files';
const PANES: { id: Pane; label: string }[] = [
  { id: 'source', label: 'Source' },
  { id: 'console', label: 'Console' },
  { id: 'environment', label: 'Environment' },
  { id: 'files', label: 'Files' },
];

type Layout = { columns: number; left: number; right: number };
const DEFAULT_LAYOUT: Layout = { columns: 50, left: 55, right: 45 };
const LAYOUT_KEY = 'statlab-workspace-layout';
const HISTORY_KEY = 'statlab-workspace-history';
const MAX_HISTORY = 200;
const MAX_LINES = 2000;
const MAX_PLOTS = 20;
const FALLBACK_PLOT = { width: 640, height: 400 };

/** Browser storage can be missing or refuse writes; the workspace works without it. */
function load<T>(key: string, fallback: T, valid: (value: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return valid(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not kept: the student loses only this convenience.
  }
}

const isLayout = (v: unknown) =>
  typeof v === 'object' && v !== null && ['columns', 'left', 'right'].every((k) => typeof (v as Record<string, unknown>)[k] === 'number');
const isHistory = (v: unknown) => Array.isArray(v) && v.every((item) => typeof item === 'string');

export default function Workspace({ id, starter, webR, env }: Props) {
  const ready = Boolean(webR && env);
  const [layout, setLayout] = useState<Layout>(() => load(LAYOUT_KEY, DEFAULT_LAYOUT, isLayout));
  const [focus, setFocus] = useState<Pane>('source');
  const [source, setSource] = useState(() => getDraft(id, id) ?? starter);
  const [sourceTab, setSourceTab] = useState<'script' | 'view'>('script');
  const [topRight, setTopRight] = useState<'environment' | 'history'>('environment');
  const [bottomRight, setBottomRight] = useState<'files' | 'plots' | 'help'>('files');

  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>(() => load(HISTORY_KEY, [], isHistory));
  const [pending, setPending] = useState<{ code: string; at: number } | null>(null);
  const [objects, setObjects] = useState<ObjectSummary[]>([]);
  const [filesVersion, setFilesVersion] = useState(0);
  const [plots, setPlots] = useState<ImageBitmap[]>([]);
  const [plotIndex, setPlotIndex] = useState(0);
  const [help, setHelp] = useState<HelpPage>(null);
  const [helpLoading, setHelpLoading] = useState(false);
  const [viewing, setViewing] = useState<{ name: string; data?: DataPreview | null } | null>(null);

  const editor = useRef<EditorView | null>(null);
  const plotArea = useRef<HTMLElement | null>(null);
  const consoleArea = useRef<HTMLElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const busy = useRef(false);

  useEffect(() => store(LAYOUT_KEY, layout), [layout]);
  useEffect(() => store(HISTORY_KEY, history), [history]);

  // R's own banner, as RStudio opens its console with one.
  useEffect(() => {
    if (!webR || !env) return;
    let live = true;
    void webR
      .evalRString('R.version.string')
      .then((version) => {
        if (live) setLines((old) => (old.length ? old : [{ type: 'message', text: `${version}, running in your browser with webR.` }]));
      })
      .catch(() => {});
    void refreshObjects();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webR, env]);

  // The console's width is R's printing width only while the workspace is open.
  useEffect(() => {
    if (!webR) return;
    return () => void webR.evalRVoid(`options(width = ${DEFAULT_WIDTH})`).catch(() => {});
  }, [webR]);

  // Plots hold GPU memory; free them when the workspace goes.
  const plotsRef = useRef(plots);
  plotsRef.current = plots;
  useEffect(() => () => plotsRef.current.forEach((plot) => plot.close?.()), []);

  async function refreshObjects() {
    if (!webR || !env) return;
    try {
      setObjects(await listObjects(webR, env));
    } catch {
      // Leaves the last listing up; the next run tries again.
    }
  }

  const openHelp = useCallback(
    async (topic: string) => {
      if (!webR) return;
      setBottomRight('help');
      setFocus('files');
      setHelpLoading(true);
      try {
        setHelp({ topic, text: await helpText(webR, env, topic) });
      } catch {
        setHelp({ topic, text: null });
      } finally {
        setHelpLoading(false);
      }
    },
    [webR, env],
  );

  const openView = useCallback(
    async (name: string) => {
      if (!webR || !env) return;
      setViewing({ name });
      setSourceTab('view');
      setFocus('source');
      let data: DataPreview | null = null;
      try {
        data = await previewData(webR, env, name);
      } catch {
        // Shown as "not a data frame".
      }
      setViewing((current) => (current?.name === name ? { name, data } : current));
    },
    [webR, env],
  );

  function addPlot(plot: ImageBitmap) {
    const next = [...plotsRef.current, plot];
    while (next.length > MAX_PLOTS) next.shift()?.close?.();
    plotsRef.current = next;
    setPlots(next);
    setPlotIndex(next.length - 1);
  }

  function clearPlots() {
    plotsRef.current.forEach((plot) => plot.close?.());
    plotsRef.current = [];
    setPlots([]);
    setPlotIndex(0);
  }

  function plotSize() {
    // Drawn at the size of the Plots pane, as RStudio does, when it is on screen.
    // The pane's tab strip and toolbar take about 5rem of its height.
    const box = plotArea.current;
    const width = box?.clientWidth ?? 0;
    const height = (box?.clientHeight ?? 0) - 80;
    if (width < 200 || height < 150) return FALLBACK_PLOT;
    return { width: Math.min(1400, Math.round(width - 16)), height: Math.min(1000, Math.round(height - 16)) };
  }

  /** Characters that fit across the console. A narrow screen hides it until the run, so the whole workspace is measured then. */
  function consoleWidth() {
    const width = consoleArea.current?.clientWidth || root.current?.clientWidth || 0;
    return width ? Math.floor((width - 28) / 8.1) : DEFAULT_WIDTH;
  }

  function remember(code: string) {
    setHistory((old) => (old[old.length - 1] === code ? old : [...old, code].slice(-MAX_HISTORY)));
  }

  function handle(request: Request) {
    if (request.kind === 'help') void openHelp(request.topic);
    else void openView(request.name);
  }

  /** Runs code in the console with RStudio's echo, then updates every pane it can change. */
  async function execute(code: string): Promise<void> {
    const text = code.replace(/\s+$/, '');
    if (!webR || !env || busy.current || !text.trim()) return;
    busy.current = true;
    setRunning(true);
    remember(text);
    setFocus('console');
    try {
      const result = await runInConsole(webR, env, text, plotSize(), consoleWidth());
      setLines((old) => [...old, ...result.lines].slice(-MAX_LINES));
      const last = result.images[result.images.length - 1];
      if (last) {
        addPlot(last);
        setBottomRight('plots');
        setFocus('files');
      }
      result.requests.forEach(handle);
    } catch {
      setLines((old) => [...old, { type: 'error' as const, text: R_STOPPED_MESSAGE }]);
    } finally {
      busy.current = false;
      setRunning(false);
      setFilesVersion((v) => v + 1);
      await refreshObjects();
    }
  }

  /** Enter in the console: false tells it the statement is unfinished and needs another line. */
  async function runFromConsole(code: string): Promise<boolean> {
    if (!webR) return false;
    if (!code.trim()) {
      setLines((old) => [...old, { type: 'echo', text: '>' }]);
      return true;
    }
    try {
      if ((await parseStatements(webR, code)).kind === 'incomplete') return false;
    } catch {
      // Let R report it.
    }
    await execute(code);
    return true;
  }

  /** RStudio's Run: the selection, or else the statement the cursor is in, then the cursor moves on. */
  async function runCurrent() {
    const view = editor.current;
    if (!view || !webR || busy.current) return;
    const { state } = view;
    const selection = state.selection.main;
    if (!selection.empty) {
      await execute(state.sliceDoc(selection.from, selection.to));
      return;
    }
    const doc = state.doc;
    const line = doc.lineAt(selection.head).number;
    let range: LineRange | undefined;
    try {
      const parsed = await parseStatements(webR, doc.toString());
      if (parsed.kind === 'ok') {
        range = parsed.ranges.find(([start, end]) => start <= line && line <= end) ?? parsed.ranges.find(([start]) => start > line);
      }
    } catch {
      // Falls back to the current line below.
    }
    if (!range) {
      if (!doc.line(line).text.trim()) return;
      range = [line, line];
    }
    const [start, end] = range;
    const code = doc.sliceString(doc.line(start).from, doc.line(end).to);
    const after = end < doc.lines ? doc.line(end + 1).from : doc.length;
    view.dispatch({ selection: { anchor: after }, scrollIntoView: true });
    await execute(code);
  }

  async function runAll() {
    await execute(editor.current?.state.doc.toString() ?? source);
  }

  // The editor reads its extensions once, so the shortcuts call through refs to today's handlers.
  const handlers = useRef({ runCurrent, runAll });
  handlers.current = { runCurrent, runAll };
  const shortcuts = useMemo(
    () => [
      Prec.highest(
        keymap.of([
          { key: 'Mod-Enter', run: () => (void handlers.current.runCurrent(), true) },
          { key: 'Mod-Shift-Enter', run: () => (void handlers.current.runAll(), true) },
          { key: 'Mod-Shift-s', run: () => (void handlers.current.runAll(), true), preventDefault: true },
        ]),
      ),
    ],
    [],
  );

  function edit(next: string) {
    setSource(next);
    saveDraft(id, id, next);
  }

  function toSource(code: string) {
    const view = editor.current;
    setSourceTab('script');
    setFocus('source');
    if (!view) return;
    const at = view.state.selection.main.head;
    const line = view.state.doc.lineAt(at);
    // Inserted as its own line below the cursor, never into the middle of one.
    const insert = `${line.text ? '\n' : ''}${code}`;
    view.dispatch({ changes: { from: line.to, insert }, selection: { anchor: line.to + insert.length }, scrollIntoView: true });
    view.focus();
  }

  function toConsole(code: string) {
    setPending({ code, at: Date.now() });
    setFocus('console');
  }

  function download() {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'script.R';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function clearEnvironment() {
    if (!webR || !env) return;
    await clearObjects(webR, env);
    setViewing(null);
    setSourceTab('script');
    await refreshObjects();
  }

  const pane = (id: Pane, extra = '') => `ide-pane ide-pane-${id}${focus === id ? ' focused' : ''}${extra}`;

  return (
    <div ref={root} className={`ide${running ? ' ide-running' : ''}`}>
      <div className="ide-switcher" role="group" aria-label="Show pane">
        {PANES.map((p) => (
          <button key={p.id} type="button" aria-pressed={focus === p.id} onClick={() => setFocus(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="ide-columns">
        <div className="ide-column" style={{ flexBasis: `${layout.columns}%` }}>
          <section className={pane('source')} style={{ flexBasis: `${layout.left}%` }} aria-label="Source">
            <PaneTabs
              pane="Source"
              active={sourceTab}
              onSelect={setSourceTab}
              tabs={[
                { id: 'script', label: 'script.R' },
                ...(viewing
                  ? [{ id: 'view' as const, label: viewing.name, onClose: () => { setViewing(null); setSourceTab('script'); } }]
                  : []),
              ]}
            />
            <div role="tabpanel" id={panelId('Source', 'script')} aria-labelledby={tabId('Source', 'script')} hidden={sourceTab !== 'script'} className="ide-panel">
              <div className="ide-toolbar">
                <button type="button" onClick={() => void runCurrent()} disabled={!ready || running} title="Run the current line or selection (Ctrl+Enter)">
                  Run
                </button>
                <button type="button" onClick={() => void runAll()} disabled={!ready || running} title="Run the whole script (Ctrl+Shift+Enter)">
                  Source
                </button>
                <span className="ide-toolbar-spacer" />
                <button type="button" onClick={download} title="Save the script to your computer as script.R">Download</button>
                <button type="button" onClick={() => edit(starter)} title="Put the starting script back">Reset</button>
              </div>
              <div className="ide-editor">
                <REditor value={source} onChange={edit} extensions={shortcuts} viewRef={editor} label="R script" />
              </div>
            </div>
            {viewing && (
              <div role="tabpanel" id={panelId('Source', 'view')} aria-labelledby={tabId('Source', 'view')} hidden={sourceTab !== 'view'} className="ide-panel">
                <DataViewer name={viewing.name} data={viewing.data} />
              </div>
            )}
          </section>

          <Splitter
            orientation="horizontal"
            label="Resize Source and Console"
            value={layout.left}
            onChange={(left) => setLayout((l) => ({ ...l, left }))}
            onReset={() => setLayout((l) => ({ ...l, left: DEFAULT_LAYOUT.left }))}
          />

          <section className={pane('console')} aria-label="Console" ref={consoleArea}>
            <div className="ide-tabs">
              <span className="ide-tab-title">Console</span>
              <span className="ide-tabs-aside">
                {running && <span className="ide-busy">R is running…</span>}
                <button type="button" className="ide-tab-action" onClick={() => setLines([])} title="Clear the console (Ctrl+L)">
                  Clear console
                </button>
              </span>
            </div>
            <ConsolePane
              lines={lines}
              history={history}
              ready={ready}
              running={running}
              onRun={runFromConsole}
              onClear={() => setLines([])}
              pending={pending}
            />
          </section>
        </div>

        <Splitter
          orientation="vertical"
          label="Resize left and right panes"
          value={layout.columns}
          onChange={(columns) => setLayout((l) => ({ ...l, columns }))}
          onReset={() => setLayout((l) => ({ ...l, columns: DEFAULT_LAYOUT.columns }))}
        />

        <div className="ide-column">
          <section className={pane('environment')} style={{ flexBasis: `${layout.right}%` }} aria-label="Environment and History">
            <PaneTabs
              pane="Environment"
              active={topRight}
              onSelect={setTopRight}
              tabs={[
                { id: 'environment', label: 'Environment' },
                { id: 'history', label: 'History' },
              ]}
            />
            <div role="tabpanel" id={panelId('Environment', 'environment')} aria-labelledby={tabId('Environment', 'environment')} hidden={topRight !== 'environment'} className="ide-panel">
              <EnvironmentView objects={objects} ready={ready} onView={(name) => void openView(name)} onClear={() => void clearEnvironment()} />
            </div>
            <div role="tabpanel" id={panelId('Environment', 'history')} aria-labelledby={tabId('Environment', 'history')} hidden={topRight !== 'history'} className="ide-panel">
              <HistoryView history={history} onToConsole={toConsole} onToSource={toSource} />
            </div>
          </section>

          <Splitter
            orientation="horizontal"
            label="Resize Environment and Files"
            value={layout.right}
            onChange={(right) => setLayout((l) => ({ ...l, right }))}
            onReset={() => setLayout((l) => ({ ...l, right: DEFAULT_LAYOUT.right }))}
          />

          <section className={pane('files')} aria-label="Files, Plots and Help" ref={plotArea}>
            <PaneTabs
              pane="Files"
              active={bottomRight}
              onSelect={setBottomRight}
              tabs={[
                { id: 'files', label: 'Files' },
                { id: 'plots', label: 'Plots' },
                { id: 'help', label: 'Help' },
              ]}
            />
            <div role="tabpanel" id={panelId('Files', 'files')} aria-labelledby={tabId('Files', 'files')} hidden={bottomRight !== 'files'} className="ide-panel">
              <FilesPane webR={ready ? webR : null} version={filesVersion} onImport={(code) => void execute(code)} />
            </div>
            <div role="tabpanel" id={panelId('Files', 'plots')} aria-labelledby={tabId('Files', 'plots')} hidden={bottomRight !== 'plots'} className="ide-panel">
              <PlotsPane plots={plots} index={plotIndex} onIndex={setPlotIndex} onClear={clearPlots} />
            </div>
            <div role="tabpanel" id={panelId('Files', 'help')} aria-labelledby={tabId('Files', 'help')} hidden={bottomRight !== 'help'} className="ide-panel">
              <HelpPane page={help} loading={helpLoading} ready={ready} onLookUp={(topic) => void openHelp(topic)} onHome={() => setHelp(null)} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
