import type { RObject, WebR } from 'webr';
import { evaluateR, type RunOutput } from './evaluate';

/**
 * The R side of the playground's RStudio-style workspace: splitting a script
 * into statements, echoing them into the console the way RStudio does, and
 * reading back what the Environment, Files, Help and data viewer panes show.
 */

/** A top-level statement's first and last line, 1-based and inclusive. */
export type LineRange = [start: number, end: number];

export type Parsed =
  | { kind: 'ok'; ranges: LineRange[] }
  /** Unfinished, like `mean(x` or an open string: the console waits for more. */
  | { kind: 'incomplete' }
  | { kind: 'error' };

/** JSON string syntax is valid R string syntax, escapes included. */
export const rString = (text: string) => JSON.stringify(text);

export async function parseStatements(webR: WebR, code: string): Promise<Parsed> {
  const numbers = await webR.evalRRaw(
    `(function(code) {
      p <- tryCatch(parse(text = code, keep.source = TRUE), error = function(e) e)
      if (inherits(p, "error")) {
        return(if (grepl("unexpected end of input|INCOMPLETE_STRING", conditionMessage(p))) -1 else -2)
      }
      refs <- attr(p, "srcref")
      if (is.null(refs)) numeric(0) else unlist(lapply(refs, function(s) c(s[1], s[3])))
    })(${rString(code)})`,
    'number[]',
  );
  if (numbers.length === 1 && numbers[0] === -1) return { kind: 'incomplete' };
  if (numbers.length === 1 && numbers[0] === -2) return { kind: 'error' };
  const ranges: LineRange[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) ranges.push([numbers[i], numbers[i + 1]]);
  return { kind: 'ok', ranges };
}

/** Marks a line the workspace printed itself, so it can be told apart from R's output. */
export const ECHO = '\u0001';

/** What running a statement asks the workspace to show, rather than R to print. */
export type Request = { kind: 'help'; topic: string } | { kind: 'view'; name: string };

/**
 * `?mean`, `help(mean)` and `View(df)` open a pane in RStudio. In the browser
 * R has no pager or viewer to open, so these are caught before R sees them.
 */
export function workspaceRequest(statement: string): Request | null {
  const text = statement.trim();
  const help = /^\?{1,2}\s*["'`]?([\w.:]+)["'`]?$/.exec(text) ?? /^help\(\s*["'`]?([\w.:]+)["'`]?\s*\)$/.exec(text);
  if (help) return { kind: 'help', topic: help[1] };
  const view = /^(?:utils::)?View\(\s*([A-Za-z.][\w.]*)\s*\)$/.exec(text);
  if (view) return { kind: 'view', name: view[1] };
  return null;
}

export type Program = { code: string; requests: Request[] };

/**
 * Rewrites `source` so R prints each statement, with RStudio's `>` and `+`
 * prompts, just before its output. One R call runs the whole thing, so a
 * base-R plot built over several statements still draws on one device, and
 * an error stops the run where it happened, as sourcing a script does.
 */
export function buildProgram(source: string, ranges: LineRange[]): Program {
  const lines = source.split('\n');
  const out: string[] = [];
  const requests: Request[] = [];
  const echo = (text: string) => out.push(`cat(${rString(`${ECHO}${text}\n`)})`);

  // Two statements on one line share it, so ranges are merged into blocks of whole lines.
  const blocks: LineRange[] = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = blocks[blocks.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else blocks.push([start, end]);
  }

  let next = 1;
  const echoComments = (upTo: number) => {
    for (; next <= upTo; next++) {
      const line = lines[next - 1] ?? '';
      if (line.trim()) echo(`> ${line}`);
    }
  };

  for (const [start, end] of blocks) {
    echoComments(start - 1);
    const block = lines.slice(start - 1, end);
    block.forEach((line, index) => echo(`${index === 0 ? '>' : '+'} ${line}`));
    const request = workspaceRequest(block.join('\n'));
    if (request) requests.push(request);
    else out.push(...block);
    next = end + 1;
  }
  echoComments(lines.length);
  return { code: out.join('\n'), requests };
}

export type ConsoleLine = { type: RunOutput['type'] | 'echo'; text: string };

/**
 * Splits R's captured output back into echoed code and real output. Output
 * printed without a final newline shares its line with the next echo, the
 * same way RStudio shows `hi> x` after `cat("hi")`.
 */
export function splitEcho(output: RunOutput[]): ConsoleLine[] {
  const lines: ConsoleLine[] = [];
  for (const item of output) {
    if (item.type !== 'stdout' || !item.data.includes(ECHO)) {
      lines.push({ type: item.type, text: item.data });
      continue;
    }
    const [before, ...echoes] = item.data.split(ECHO);
    if (before) lines.push({ type: 'stdout', text: before });
    for (const text of echoes) lines.push({ type: 'echo', text: text.replace(/\n$/, '') });
  }
  return lines;
}

export type ProgramResult = {
  lines: ConsoleLine[];
  images: ImageBitmap[];
  errored: boolean;
  requests: Request[];
};

/** R's own default for `options(width)`, which lessons print at. */
export const DEFAULT_WIDTH = 80;

/**
 * Runs `source` with RStudio's echo. Code that does not parse is echoed whole
 * and left to R to report. `width` is the console's width in characters: like
 * RStudio, R is told it, so a summary table fits instead of wrapping mid-row.
 */
export async function runInConsole(
  webR: WebR,
  env: RObject,
  source: string,
  graphics: { width: number; height: number } | false,
  width: number = DEFAULT_WIDTH,
): Promise<ProgramResult> {
  await webR.evalRVoid(`options(width = ${Math.round(Math.min(200, Math.max(30, width)))})`);
  const parsed = await parseStatements(webR, source);
  if (parsed.kind !== 'ok') {
    // Echoed here rather than by R: the echo lines would sit in the same unparseable program.
    const echoed = source.split('\n').map((line, i): ConsoleLine => ({ type: 'echo', text: `${i ? '+' : '>'} ${line}` }));
    const result = await evaluateR(webR, source, { env, graphics });
    return { lines: [...echoed, ...splitEcho(result.output)], images: result.images, errored: result.errored, requests: [] };
  }
  const program = buildProgram(source, parsed.ranges);
  const result = await evaluateR(webR, program.code, { env, graphics });
  return { lines: splitEcho(result.output), images: result.images, errored: result.errored, requests: program.requests };
}

export type ObjectSummary = {
  name: string;
  /** RStudio's Environment pane groups objects under these three headings. */
  kind: 'data' | 'value' | 'function';
  description: string;
};

/** Everything the student has stored, described the way RStudio's Environment pane does. */
export async function listObjects(webR: WebR, env: RObject): Promise<ObjectSummary[]> {
  const rows = await webR.evalRRaw(
    `(function(e) {
      vapply(ls(e), function(n) {
        x <- get(n, envir = e)
        if (is.data.frame(x)) {
          kind <- "data"
          d <- sprintf("%d obs. of %d variable%s", nrow(x), ncol(x), if (ncol(x) == 1) "" else "s")
        } else if (is.function(x)) {
          kind <- "function"
          d <- paste0("function (", paste(names(formals(x)), collapse = ", "), ")")
        } else {
          kind <- "value"
          d <- tryCatch(trimws(utils::capture.output(utils::str(x, give.attr = FALSE, vec.len = 3))[1]), error = function(err) class(x)[1])
        }
        paste(n, kind, substr(d, 1, 160), sep = "\\t")
      }, character(1), USE.NAMES = FALSE)
    })(environment())`,
    'string[]',
    { env },
  );
  return rows.map((row) => {
    const [name, kind, ...rest] = row.split('\t');
    return { name, kind: kind as ObjectSummary['kind'], description: rest.join('\t') };
  });
}

export async function clearObjects(webR: WebR, env: RObject): Promise<void> {
  await webR.evalRVoid('rm(list = ls(environment()), envir = environment())', { env });
}

export type FileEntry = { name: string; folder: boolean; bytes: number };

/** A folder's contents, relative to R's working directory. Folders first, as in RStudio. */
export async function listFiles(webR: WebR, path: string): Promise<FileEntry[]> {
  const rows = await webR.evalRRaw(
    `(function(path) {
      f <- list.files(path)
      if (!length(f)) return(character(0))
      info <- file.info(file.path(path, f))
      paste(f, ifelse(info$isdir, "d", "f"), ifelse(is.na(info$size), 0, info$size), sep = "\\t")
    })(${rString(path)})`,
    'string[]',
  );
  return rows
    .map((row) => {
      const [name, type, size] = row.split('\t');
      return { name, folder: type === 'd', bytes: Number(size) || 0 };
    })
    .sort((a, b) => Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name));
}

/**
 * A help page as plain text, or null when R has no page for the topic. Looked
 * up from the student's environment, so packages they attached are searched.
 */
export async function helpText(webR: WebR, env: RObject | null, topic: string): Promise<string | null> {
  const [pkg, name] = topic.includes('::') ? topic.split(/:::?/) : [null, topic];
  const text = await webR.evalRRaw(
    `(function(topic, pkg) {
      h <- if (is.na(pkg)) utils::help(topic) else utils::help(topic, package = (pkg))
      if (!length(h)) return("")
      rd <- utils:::.getHelpFile(as.character(h)[1])
      paste(utils::capture.output(tools::Rd2txt(rd, options = list(underline_titles = FALSE))), collapse = "\\n")
    })(${rString(name)}, ${pkg ? rString(pkg) : 'NA_character_'})`,
    'string',
    env ? { env } : {},
  );
  return text ? text : null;
}

export type DataPreview = { rows: number; columns: string[]; cells: string[][]; shown: number };

/** The first rows of a data frame, formatted by R, for the data viewer. Null when `name` is not tabular. */
export async function previewData(webR: WebR, env: RObject, name: string, limit = 500): Promise<DataPreview | null> {
  const flat = await webR.evalRRaw(
    `(function(e, name, limit) {
      if (!exists(name, envir = e)) return(character(0))
      x <- get(name, envir = e)
      x <- tryCatch(as.data.frame(x), error = function(err) NULL)
      if (is.null(x) || !ncol(x)) return(character(0))
      shown <- utils::head(x, limit)
      cells <- unlist(lapply(shown, function(col) format(col, trim = TRUE)), use.names = FALSE)
      c(nrow(x), nrow(shown), ncol(x), names(x), cells)
    })(environment(), ${rString(name)}, ${limit})`,
    'string[]',
    { env },
  );
  if (flat.length < 3) return null;
  const rows = Number(flat[0]);
  const shown = Number(flat[1]);
  const width = Number(flat[2]);
  const columns = flat.slice(3, 3 + width);
  const values = flat.slice(3 + width);
  const cells = Array.from({ length: shown }, (_, row) => columns.map((_, col) => values[col * shown + row] ?? ''));
  return { rows, columns, cells, shown };
}
