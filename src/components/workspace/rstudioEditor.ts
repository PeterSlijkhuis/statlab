import {
  acceptCompletion,
  autocompletion,
  completionStatus,
  startCompletion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { toggleComment } from '@codemirror/commands';
import { EditorSelection, Prec, type EditorState, type Extension } from '@codemirror/state';
import { keymap, type EditorView } from '@codemirror/view';
import type { Completion } from '../../r/workspace';

/**
 * The editing habits students bring from RStudio, or will take to it: Tab
 * completion that knows their objects and columns, Alt+- for `<-`,
 * Ctrl+Shift+M for the pipe and Ctrl+Shift+C to comment lines out.
 */

/** What to ask R to complete at the cursor, or null when there is nothing to complete. */
export type CompletionRequest = { from: number; token: string; call?: string; path?: string };

/** Inserts `text` in place of the selection, without doubling a space already before it. */
function insert(view: EditorView, text: string): boolean {
  view.dispatch(
    view.state.changeByRange((range) => {
      const before = view.state.sliceDoc(Math.max(0, range.from - 1), range.from);
      const piece = /\s/.test(before) || range.from === 0 ? text.trimStart() : text;
      return { changes: { from: range.from, to: range.to, insert: piece }, range: EditorSelection.cursor(range.from + piece.length) };
    }),
    { scrollIntoView: true, userEvent: 'input' },
  );
  return true;
}

/** The function whose parentheses the end of `text` sits inside, if any, skipping strings and comments. */
export function enclosingCall(text: string): string | undefined {
  const opens: number[] = [];
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '#') {
      const end = text.indexOf('\n', i);
      if (end < 0) break;
      i = end;
    } else if (ch === '(') opens.push(i);
    else if (ch === ')') opens.pop();
  }
  const open = opens[opens.length - 1];
  if (open === undefined) return undefined;
  return /([A-Za-z.][\w.]*)\s*$/.exec(text.slice(Math.max(0, open - 80), open))?.[1];
}

/** Where the end of `line` is: in code, in a comment, or in an open string (with its text so far). */
function lineState(line: string): 'code' | 'comment' | { string: string } {
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      start = i + 1;
    } else if (ch === '#') return 'comment';
  }
  return quote ? { string: line.slice(start) } : 'code';
}

/** Works out what the cursor is in the middle of typing. Exported for tests. */
export function completionRequest(state: EditorState, pos: number, explicit: boolean): CompletionRequest | null {
  const line = state.doc.lineAt(pos);
  const before = line.text.slice(0, pos - line.from);

  const where = lineState(before);
  if (where === 'comment') return null;
  if (where !== 'code') {
    const path = where.string;
    // A path in quotes: only on Tab, or once a folder is typed, as in RStudio.
    if (!explicit && !path.includes('/')) return null;
    return { from: pos - (path.length - path.lastIndexOf('/') - 1), token: '', path };
  }

  const token = /[A-Za-z.][\w.]*(?:\$[\w.]*|:::?[\w.]*)*$/.exec(before)?.[0] ?? '';
  if (/^\.?\d/.test(token)) return null;
  const tail = /[\w.]*$/.exec(token)?.[0] ?? '';
  const from = pos - tail.length;
  const scoped = token.includes('$') || token.includes('::');
  const context = state.sliceDoc(Math.max(0, pos - 2000), pos - token.length);
  const call = enclosingCall(context);

  if (!explicit) {
    if (scoped ? tail.length < 1 && !/[$:]$/.test(token) : tail.length < 3) return null;
  } else if (!token && !call) {
    return null;
  }
  return { from, token, call };
}

/**
 * Completion from R. `complete` asks R and resolves null when R is busy
 * running the student's code, since a completion must never wait on that.
 */
export function rstudioEditor(complete: (request: CompletionRequest) => Promise<Completion[] | null>): Extension {
  async function source(context: CompletionContext): Promise<CompletionResult | null> {
    const request = completionRequest(context.state, context.pos, context.explicit);
    if (!request) return null;
    const found = await complete(request);
    if (!found?.length || context.aborted) return null;
    return {
      from: request.from,
      options: found.map((c) => ({
        label: c.label,
        type: c.type === 'folder' || c.type === 'file' ? 'text' : c.type,
        boost: c.label.endsWith(' = ') ? 10 : 0,
      })),
      validFor: request.path !== undefined ? /^[^/"']*$/ : /^[\w.]*$/,
    };
  }

  return [
    autocompletion({ override: [source], activateOnTypingDelay: 250, icons: false }),
    Prec.high(
      keymap.of([
        { key: 'Alt--', run: (view) => insert(view, ' <- '), preventDefault: true },
        { key: 'Mod-Shift-m', run: (view) => insert(view, ' %>% '), preventDefault: true },
        { key: 'Mod-Shift-c', run: toggleComment, preventDefault: true },
        {
          // RStudio's Tab: accept the highlighted completion, or ask for some.
          // With nothing typed before the cursor Tab is left alone, so it still
          // moves focus out of the editor for someone using the keyboard.
          key: 'Tab',
          run: (view) => {
            // Swallowed even when CodeMirror declines to accept (in the first few
            // milliseconds of a list opening), so Tab never jumps out of the editor.
            if (completionStatus(view.state) === 'active') return acceptCompletion(view) || true;
            const { head, empty } = view.state.selection.main;
            if (!empty) return false;
            const before = view.state.sliceDoc(Math.max(0, head - 1), head);
            if (!/[\w.$:/"'(,]/.test(before)) return false;
            if (!completionRequest(view.state, head, true)) return false;
            return startCompletion(view);
          },
        },
      ]),
    ),
  ];
}
