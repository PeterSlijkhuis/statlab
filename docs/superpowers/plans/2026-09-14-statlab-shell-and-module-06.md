# StatLab Shell + Module 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the StatLab application shell and one complete module (Module 6, Sampling) so the whole architecture is proven end to end.

**Architecture:** A static Vite + React + TypeScript single-page app deployed to GitHub Pages. R runs client-side in a web worker via webR (WebAssembly), so there is no backend. Lessons are MDX files that interleave prose with interactive components; exercises are auto-checked by R snippets that inspect the student's actual result values.

**Tech Stack:** Vite, React 18, TypeScript, MDX (`@mdx-js/rollup`), webR v0.6.0, CodeMirror 6, React Router, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-14-statlab-r-statistics-webapp-design.md`

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec.

- **webR version is pinned to `v0.6.0`.** Browser base URL is `https://webr.r-wasm.org/v0.6.0/`. The string `latest` must never appear in a webR URL.
- **npm `webr` dependency must be exactly `0.6.0`**, matching the CDN pin.
- **Vite `base` is `/statlab/`** and the router basename must match. Mismatching them produces a blank page on deploy.
- **webR uses the PostMessage channel** (GitHub Pages cannot set COOP/COEP headers). Running R code cannot be interrupted; recovery is worker restart.
- **Forbidden R functions in all content:** `readline`, `scan`, `menu`, `browser`. They hang rather than error on the PostMessage channel.
- **Evaluation options, exact values:** `withAutoprint: true` (the webR default is `false`, and leaving it would make bare expressions and ggplot objects render nothing), `throwJsException: false`, `captureStreams: true`, `captureConditions: true`.
- **Graphics capture defaults to `false`.** `webr::canvas()` requires `OffscreenCanvas`, which Node does not have, so the CI validator and Node tests must never enable it. Browser callers pass explicit dimensions.
- **Every `captureR` call is wrapped in a webR `Shelter` and purged in a `finally` block.** Leaked shelters exhaust WebAssembly memory over a long lesson.
- **Numeric comparison uses `isTRUE(all.equal(actual, expected, tolerance = 1e-6))`.** Never `==` on doubles.
- **Checks inspect values, never source text.** Any correct route to the right answer must pass.
- **A student error is not a wrong answer**, and **a broken check is not a wrong answer**. Both are reported as their own outcome.
- **Every exercise carries at least one `wrongAnswers` entry**, and each must fail because the check returned `pass = FALSE`, not because the code threw.
- **Progress is student-local** under localStorage key `statlab.progress.v1`. No backend, no accounts, no instructor dashboard.
- **Node ≥ 17** is required to run webR under Node (CI uses Node 22).

---

## File Structure

```
statlab/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                    base '/statlab/', MDX + React plugins
├── vitest.config.ts
├── playwright.config.ts
├── .github/workflows/deploy.yml      validate → test → build → Pages
├── public/data/*.csv                 generated datasets, served at /statlab/data/
├── scripts/
│   └── generate-datasets.mjs         seeded CSV generation, run once
├── e2e/smoke.spec.ts
└── src/
    ├── main.tsx                      router mount
    ├── App.tsx                       layout + routes
    ├── r/
    │   ├── webrClient.ts             version pin, singleton, boot status, restart
    │   ├── evaluate.ts               captureR wrapper → RunResult
    │   ├── environments.ts           lesson and exercise environments
    │   ├── session.ts                package install + dataset mounting
    │   └── checker.ts                exercise check contract
    ├── state/progress.ts             versioned localStorage store
    ├── components/
    │   ├── OutputPane.tsx            console output + plot canvas
    │   ├── CodeBlock.tsx             CodeMirror editor + run
    │   ├── ChoiceBlock.tsx           shared multiple-choice primitive
    │   ├── Predict.tsx               commit-before-reveal gate
    │   ├── Quiz.tsx                  conceptual check
    │   ├── Interpret.tsx             interpretation + APA reporting
    │   ├── Exercise.tsx              checked task with hints
    │   ├── Simulation.tsx            registry lookup by name
    │   ├── Sidebar.tsx               module/lesson navigation + progress
    │   └── RStatus.tsx               boot progress, errors, Restart R
    ├── sims/
    │   ├── rng.ts                    seeded PRNG + population generators
    │   ├── CLT.tsx                   the flagship sampling simulation
    │   └── registry.ts               name → component
    ├── content/
    │   ├── manifest.ts               modules → lessons
    │   ├── LessonContext.tsx         per-lesson R environment + id
    │   ├── mdxComponents.tsx         component map passed to MDX
    │   ├── exercises/module-06.ts    exercise definitions
    │   ├── content.test.ts           static content validation
    │   └── lessons/*.mdx             lesson prose
    └── pages/
        ├── Home.tsx                  progress overview + continue
        ├── Lesson.tsx                MDX loader + lesson chrome
        ├── Playground.tsx            free R sandbox
        └── TestChooser.tsx           "Which test should I use?" decision tree
```

---

### Task 1: Project scaffold and base path

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`
- Test: `src/config.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: a Vite project whose `base` is `/statlab/`; `vitest` runs; `App` renders.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "statlab",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "validate": "node scripts/validate-content.mjs",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@codemirror/commands": "^6.8.1",
    "@codemirror/language": "^6.11.0",
    "@codemirror/legacy-modes": "^6.5.1",
    "@codemirror/state": "^6.5.2",
    "@codemirror/view": "^6.36.8",
    "codemirror": "^6.0.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.0",
    "webr": "0.6.0"
  },
  "devDependencies": {
    "@mdx-js/rollup": "^3.1.0",
    "@playwright/test": "^1.52.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/mdx": "^2.0.13",
    "@types/react": "^18.3.20",
    "@types/react-dom": "^18.3.6",
    "@vitejs/plugin-react": "^4.4.1",
    "jsdom": "^26.1.0",
    "typescript": "^5.8.3",
    "vite": "^6.3.5",
    "vitest": "^3.1.3"
  }
}
```

Note: `webr` is pinned exactly, with no `^`. This is deliberate (see Global Constraints).

- [ ] **Step 2: Write the failing test**

Create `src/config.test.ts`. This guards the single most common GitHub Pages deployment failure.

```ts
import { describe, expect, test } from 'vitest';
import config from '../vite.config';

describe('vite config', () => {
  test('base path matches the GitHub Pages project path', () => {
    expect(config.base).toBe('/statlab/');
  });

  test('no webR URL uses the floating latest tag', () => {
    expect(JSON.stringify(config)).not.toContain('webr.r-wasm.org/latest');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm install && npx vitest run src/config.test.ts`
Expected: FAIL — cannot resolve `../vite.config`.

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';

export default defineConfig({
  base: '/statlab/',
  plugins: [
    { enforce: 'pre', ...mdx() },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
  ],
});
```

The MDX plugin must run before the React plugin, and React's `include` must cover `.mdx`, or MDX files compile without JSX transform.

- [ ] **Step 5: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "types": ["vite/client", "mdx"]
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 6: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.{test,itest}.{ts,tsx}'],
    testTimeout: 10_000,
  },
});
```

Integration tests that boot real R use a `// @vitest-environment node` docblock and set their own timeout.

- [ ] **Step 7: Create `index.html`, `src/main.tsx`, `src/App.tsx`**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>StatLab — Statistics with R</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

`import.meta.env.BASE_URL` is `/statlab/` in both dev and build, so the basename can never drift from the Vite base.

`src/App.tsx`:

```tsx
export default function App() {
  return <h1>StatLab</h1>;
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/config.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 9: Verify the dev server renders**

Run: `npm run dev`
Expected: `http://localhost:5173/statlab/` shows the heading. Note the path includes `/statlab/`; the bare root will 404, which is correct.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts index.html src/
git commit -m "feat: scaffold Vite + React + MDX project with pinned base path"
```

---

### Task 2: webR client with pinned version

**Files:**
- Create: `src/r/webrClient.ts`
- Test: `src/r/webrClient.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `WEBR_VERSION: 'v0.6.0'`, `WEBR_BASE_URL: string`
  - `getWebR(): Promise<WebR>` — browser singleton, initialises once
  - `restartWebR(): Promise<WebR>` — closes and respawns the worker
  - `onStatus(fn: (s: RStatus) => void): () => void`
  - `type RStatus = { phase: 'idle'|'booting'|'installing'|'ready'|'error'; detail?: string }`

- [ ] **Step 1: Write the failing test**

Create `src/r/webrClient.test.ts`. These are pure unit tests — they never boot R.

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/r/webrClient.test.ts`
Expected: FAIL — cannot resolve `./webrClient`.

- [ ] **Step 3: Implement `src/r/webrClient.ts`**

```ts
import { WebR } from 'webr';

export const WEBR_VERSION = 'v0.6.0';
export const WEBR_BASE_URL = `https://webr.r-wasm.org/${WEBR_VERSION}/`;

export type RStatus = {
  phase: 'idle' | 'booting' | 'installing' | 'ready' | 'error';
  detail?: string;
};

let instance: WebR | null = null;
let booting: Promise<WebR> | null = null;
let status: RStatus = { phase: 'idle' };
const listeners = new Set<(s: RStatus) => void>();

export function getStatus(): RStatus {
  return status;
}

export function setStatus(next: RStatus): void {
  status = next;
  for (const fn of listeners) fn(status);
}

export function onStatus(fn: (s: RStatus) => void): () => void {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

export function getWebR(): Promise<WebR> {
  if (instance) return Promise.resolve(instance);
  if (booting) return booting;

  setStatus({ phase: 'booting' });
  booting = (async () => {
    const webR = new WebR({ baseUrl: WEBR_BASE_URL });
    try {
      await webR.init();
    } catch (err) {
      booting = null;
      setStatus({ phase: 'error', detail: String(err) });
      throw err;
    }
    instance = webR;
    return webR;
  })();

  return booting;
}

export async function restartWebR(): Promise<WebR> {
  const previous = instance;
  instance = null;
  booting = null;
  setStatus({ phase: 'booting', detail: 'Restarting R' });
  if (previous) {
    try {
      await previous.close();
    } catch {
      // A wedged worker may refuse to close; respawning is still correct.
    }
  }
  return getWebR();
}
```

`restartWebR` exists because the PostMessage channel cannot interrupt running R code (see Global Constraints). It is the only recovery path for a runaway loop.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/r/webrClient.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/r/webrClient.ts src/r/webrClient.test.ts
git commit -m "feat: webR client with pinned v0.6.0 and restart support"
```

---

### Task 3: R evaluation wrapper

**Files:**
- Create: `src/r/evaluate.ts`
- Test: `src/r/evaluate.itest.ts`

**Interfaces:**
- Consumes: `webr`'s `WebR` type
- Produces:
  - `type RunOutput = { type: 'stdout'|'stderr'|'message'|'warning'|'error'; data: string }`
  - `type RunResult = { output: RunOutput[]; images: ImageBitmap[]; errored: boolean }`
  - `type EvaluateOptions = { env?: RObject; graphics?: { width: number; height: number } | false }`
  - `evaluateR(webR: WebR, code: string, opts?: EvaluateOptions): Promise<RunResult>`

This takes the `WebR` instance as a parameter rather than importing the singleton, so Node tests and the CI validator can pass their own instance. That is the seam that makes the whole R layer testable.

- [ ] **Step 1: Write the failing test**

Create `src/r/evaluate.itest.ts`. This boots real R under Node.

```ts
// @vitest-environment node
import { WebR } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { evaluateR } from './evaluate';

let webR: WebR;

beforeAll(async () => {
  // No baseUrl: under Node, webR loads binaries from the installed package.
  webR = new WebR();
  await webR.init();
}, 300_000);

afterAll(async () => {
  await webR.close();
});

const text = (r: { output: { data: string }[] }) => r.output.map((o) => o.data).join('\n');

describe('evaluateR', () => {
  test('autoprints a bare expression', async () => {
    const result = await evaluateR(webR, '1 + 1');
    expect(text(result)).toContain('2');
    expect(result.errored).toBe(false);
  });

  test('captures an R error instead of throwing', async () => {
    const result = await evaluateR(webR, 'stop("boom")');
    expect(result.errored).toBe(true);
    expect(result.output.some((o) => o.type === 'error' && o.data.includes('boom'))).toBe(true);
  });

  test('captures warnings separately from errors', async () => {
    const result = await evaluateR(webR, 'warning("careful")');
    expect(result.errored).toBe(false);
    expect(result.output.some((o) => o.type === 'warning')).toBe(true);
  });

  test('captures stdout from explicit printing', async () => {
    const result = await evaluateR(webR, 'cat("hello\\n")');
    expect(text(result)).toContain('hello');
  });

  test('returns no images when graphics are disabled', async () => {
    const result = await evaluateR(webR, 'x <- 1');
    expect(result.images).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/r/evaluate.itest.ts`
Expected: FAIL — cannot resolve `./evaluate`. First run downloads the R WebAssembly binaries, so allow several minutes.

- [ ] **Step 3: Implement `src/r/evaluate.ts`**

```ts
import type { RObject, WebR } from 'webr';

export type RunOutput = {
  type: 'stdout' | 'stderr' | 'message' | 'warning' | 'error';
  data: string;
};

export type RunResult = {
  output: RunOutput[];
  images: ImageBitmap[];
  errored: boolean;
};

export type EvaluateOptions = {
  /** Environment to evaluate in. Defaults to the R global environment. */
  env?: RObject;
  /**
   * Plot capture. Defaults to false: webr::canvas() requires OffscreenCanvas,
   * which Node does not provide, so the CI validator must never enable it.
   */
  graphics?: { width: number; height: number } | false;
};

export async function evaluateR(
  webR: WebR,
  code: string,
  opts: EvaluateOptions = {},
): Promise<RunResult> {
  const { env, graphics = false } = opts;
  const shelter = await new webR.Shelter();

  try {
    const captured = await shelter.captureR(code, {
      withAutoprint: true,
      throwJsException: false,
      captureStreams: true,
      captureConditions: true,
      captureGraphics: graphics === false ? false : { width: graphics.width, height: graphics.height },
      ...(env ? { env } : {}),
    });

    const output: RunOutput[] = captured.output.map((item) => ({
      type: item.type as RunOutput['type'],
      data: typeof item.data === 'string' ? item.data : String(item.data),
    }));

    return {
      output,
      images: captured.images ?? [],
      errored: output.some((o) => o.type === 'error'),
    };
  } finally {
    shelter.purge();
  }
}
```

`withAutoprint: true` is the line that makes `x` and ggplot objects render at all — webR defaults it to `false`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/r/evaluate.itest.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/r/evaluate.ts src/r/evaluate.itest.ts
git commit -m "feat: R evaluation wrapper with captured output and safe graphics default"
```

---

### Task 4: Lesson and exercise environments

**Files:**
- Create: `src/r/environments.ts`
- Test: `src/r/environments.itest.ts`

**Interfaces:**
- Consumes: `evaluateR` from Task 3
- Produces:
  - `createLessonEnv(webR: WebR): Promise<RObject>` — `new.env(parent = globalenv())`
  - `createChildEnv(webR: WebR, parent: RObject): Promise<RObject>`
  - `destroyEnv(env: RObject): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `src/r/environments.itest.ts`.

```ts
// @vitest-environment node
import { WebR } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createChildEnv, createLessonEnv, destroyEnv } from './environments';
import { evaluateR } from './evaluate';

let webR: WebR;

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
}, 300_000);

afterAll(async () => {
  await webR.close();
});

const text = (r: { output: { data: string }[] }) => r.output.map((o) => o.data).join('\n');

describe('lesson environments', () => {
  test('objects persist across evaluations in the same lesson', async () => {
    const env = await createLessonEnv(webR);
    await evaluateR(webR, 'x <- 42', { env });
    const result = await evaluateR(webR, 'x', { env });
    expect(text(result)).toContain('42');
    await destroyEnv(env);
  });

  test('lessons cannot see each other objects', async () => {
    const a = await createLessonEnv(webR);
    const b = await createLessonEnv(webR);
    await evaluateR(webR, 'secret <- 99', { env: a });
    const result = await evaluateR(webR, 'secret', { env: b });
    expect(result.errored).toBe(true);
    await destroyEnv(a);
    await destroyEnv(b);
  });

  test('base R remains reachable from a lesson environment', async () => {
    const env = await createLessonEnv(webR);
    const result = await evaluateR(webR, 'mean(c(1, 2, 3))', { env });
    expect(text(result)).toContain('2');
    await destroyEnv(env);
  });

  test('a child environment sees its parent objects but not the reverse', async () => {
    const parent = await createLessonEnv(webR);
    await evaluateR(webR, 'shared <- 7', { env: parent });
    const child = await createChildEnv(webR, parent);

    const visible = await evaluateR(webR, 'shared', { env: child });
    expect(text(visible)).toContain('7');

    await evaluateR(webR, 'attempt <- 1', { env: child });
    const leaked = await evaluateR(webR, 'attempt', { env: parent });
    expect(leaked.errored).toBe(true);

    await destroyEnv(child);
    await destroyEnv(parent);
  });
});
```

The fourth test is the one that matters pedagogically: it proves a previous exercise attempt cannot leave an object behind that makes a later wrong answer pass.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/r/environments.itest.ts`
Expected: FAIL — cannot resolve `./environments`.

- [ ] **Step 3: Implement `src/r/environments.ts`**

```ts
import type { RObject, WebR } from 'webr';

/**
 * One environment per lesson. Parented to globalenv() so base R and any
 * attached packages resolve normally, while lesson objects stay isolated.
 */
export async function createLessonEnv(webR: WebR): Promise<RObject> {
  return webR.evalR('new.env(parent = globalenv())');
}

/**
 * A fresh child of `parent`, discarded after use. Exercise runs use this so
 * objects from a previous attempt cannot influence the check.
 */
export async function createChildEnv(webR: WebR, parent: RObject): Promise<RObject> {
  return webR.evalR('new.env(parent = environment())', { env: parent });
}

export async function destroyEnv(env: RObject): Promise<void> {
  await env.destroy();
}
```

`new.env(parent = environment())` evaluated *with* `env: parent` yields an environment whose parent is `parent` — webR sets `environment()` to the evaluation environment.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/r/environments.itest.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/r/environments.ts src/r/environments.itest.ts
git commit -m "feat: per-lesson R environments with fresh child scopes for exercises"
```

---

### Task 5: Package installation and dataset mounting

**Files:**
- Create: `src/r/session.ts`
- Test: `src/r/session.itest.ts`

**Interfaces:**
- Consumes: `webrClient`'s `setStatus`
- Produces:
  - `COURSE_PACKAGES: readonly string[]` — `['dplyr', 'ggplot2']`
  - `DATASET_FILES: readonly string[]` — CSV filenames mounted at `data/`
  - `installCoursePackages(webR: WebR): Promise<void>`
  - `mountDatasets(webR: WebR, load: (name: string) => Promise<Uint8Array>): Promise<void>`

`mountDatasets` takes a loader function rather than calling `fetch` itself, so Node tests and the validator can read from disk while the browser fetches over HTTP.

- [ ] **Step 1: Write the failing test**

Create `src/r/session.itest.ts`.

```ts
// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { WebR } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { evaluateR } from './evaluate';
import { DATASET_FILES, mountDatasets } from './session';

let webR: WebR;

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
  await mountDatasets(webR, async (name) =>
    new Uint8Array(await readFile(new URL(`../../public/data/${name}`, import.meta.url))),
  );
}, 300_000);

afterAll(async () => {
  await webR.close();
});

const text = (r: { output: { data: string }[] }) => r.output.map((o) => o.data).join('\n');

describe('dataset mounting', () => {
  test('declares at least one dataset', () => {
    expect(DATASET_FILES.length).toBeGreaterThan(0);
  });

  test('read.csv finds the mounted file at the documented relative path', async () => {
    const result = await evaluateR(webR, 'nrow(read.csv("data/wellbeing-population.csv"))');
    expect(result.errored).toBe(false);
    expect(text(result)).toContain('5000');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/r/session.itest.ts`
Expected: FAIL — cannot resolve `./session`. (It will also fail on the missing CSV until Task 15; that is expected and this test is re-run there.)

- [ ] **Step 3: Implement `src/r/session.ts`**

```ts
import type { WebR } from 'webr';
import { setStatus } from './webrClient';

export const COURSE_PACKAGES = ['dplyr', 'ggplot2'] as const;

export const DATASET_FILES = ['wellbeing-population.csv'] as const;

/** webR's working directory; `read.csv("data/x.csv")` resolves under it. */
const HOME = '/home/web_user';

export async function installCoursePackages(webR: WebR): Promise<void> {
  setStatus({ phase: 'installing', detail: 'Installing dplyr and ggplot2' });
  await webR.installPackages([...COURSE_PACKAGES]);
  setStatus({ phase: 'ready' });
}

export async function mountDatasets(
  webR: WebR,
  load: (name: string) => Promise<Uint8Array>,
): Promise<void> {
  try {
    await webR.FS.mkdir(`${HOME}/data`);
  } catch {
    // Already exists after a restart; writing the files again is still correct.
  }

  for (const name of DATASET_FILES) {
    const bytes = await load(name);
    await webR.FS.writeFile(`${HOME}/data/${name}`, bytes);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/r/session.itest.ts`
Expected: the `DATASET_FILES` test PASSES. The `read.csv` test fails until the CSV exists (Task 15) — note this and move on.

- [ ] **Step 5: Commit**

```bash
git add src/r/session.ts src/r/session.itest.ts
git commit -m "feat: course package installation and dataset mounting into webR VFS"
```

---

### Task 6: Progress store

**Files:**
- Create: `src/state/progress.ts`
- Test: `src/state/progress.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type ExerciseStatus = 'attempted' | 'passed'`
  - `type Progress = { version: 1; lessons: Record<string, LessonProgress> }`
  - `type LessonProgress = { exercises: Record<string, ExerciseStatus>; quizzes: Record<string, boolean>; drafts: Record<string, string>; visitedAt?: string }`
  - `getProgress(): Progress`
  - `markExercise(lessonId: string, exerciseId: string, status: ExerciseStatus): void`
  - `markQuiz(lessonId: string, quizId: string, correct: boolean): void`
  - `saveDraft(lessonId: string, blockId: string, code: string): void`
  - `getDraft(lessonId: string, blockId: string): string | undefined`
  - `touchLesson(lessonId: string): void`
  - `lastVisitedLesson(): string | undefined`
  - `exportProgress(): string`
  - `importProgress(json: string): boolean`
  - `subscribeProgress(fn: () => void): () => void`

- [ ] **Step 1: Write the failing test**

Create `src/state/progress.test.ts`.

```ts
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  exportProgress,
  getDraft,
  getProgress,
  importProgress,
  lastVisitedLesson,
  markExercise,
  markQuiz,
  saveDraft,
  touchLesson,
} from './progress';

beforeEach(() => {
  localStorage.clear();
});

describe('progress store', () => {
  test('starts empty with a version stamp', () => {
    expect(getProgress()).toEqual({ version: 1, lessons: {} });
  });

  test('records exercise results', () => {
    markExercise('06-1', 'm6-e1', 'passed');
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('passed');
  });

  test('a pass is never downgraded by a later attempt', () => {
    markExercise('06-1', 'm6-e1', 'passed');
    markExercise('06-1', 'm6-e1', 'attempted');
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('passed');
  });

  test('records quiz answers', () => {
    markQuiz('06-1', 'q1', true);
    expect(getProgress().lessons['06-1'].quizzes.q1).toBe(true);
  });

  test('round-trips code drafts', () => {
    saveDraft('06-1', 'block-2', 'mean(x)');
    expect(getDraft('06-1', 'block-2')).toBe('mean(x)');
  });

  test('tracks the most recently visited lesson', () => {
    touchLesson('06-1');
    touchLesson('06-2');
    expect(lastVisitedLesson()).toBe('06-2');
  });

  test('exports and re-imports progress', () => {
    markExercise('06-1', 'm6-e1', 'passed');
    const json = exportProgress();
    localStorage.clear();
    expect(importProgress(json)).toBe(true);
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('passed');
  });

  test('rejects malformed or wrong-version imports without corrupting state', () => {
    markExercise('06-1', 'm6-e1', 'passed');
    expect(importProgress('not json')).toBe(false);
    expect(importProgress(JSON.stringify({ version: 99, lessons: {} }))).toBe(false);
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('passed');
  });

  test('survives corrupt stored data by starting fresh', () => {
    localStorage.setItem('statlab.progress.v1', '{{{');
    expect(getProgress()).toEqual({ version: 1, lessons: {} });
  });

  test('works when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => markExercise('06-1', 'm6-e1', 'passed')).not.toThrow();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/state/progress.test.ts`
Expected: FAIL — cannot resolve `./progress`.

- [ ] **Step 3: Implement `src/state/progress.ts`**

```ts
export const STORAGE_KEY = 'statlab.progress.v1';

export type ExerciseStatus = 'attempted' | 'passed';

export type LessonProgress = {
  exercises: Record<string, ExerciseStatus>;
  quizzes: Record<string, boolean>;
  drafts: Record<string, string>;
  visitedAt?: string;
};

export type Progress = {
  version: 1;
  lessons: Record<string, LessonProgress>;
};

const empty = (): Progress => ({ version: 1, lessons: {} });

const emptyLesson = (): LessonProgress => ({ exercises: {}, quizzes: {}, drafts: {} });

const listeners = new Set<() => void>();

export function subscribeProgress(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function isProgress(value: unknown): value is Progress {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Progress>;
  return candidate.version === 1 && typeof candidate.lessons === 'object' && candidate.lessons !== null;
}

export function getProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed: unknown = JSON.parse(raw);
    return isProgress(parsed) ? parsed : empty();
  } catch {
    // Unavailable, blocked, or corrupt storage: the app still works, unsaved.
    return empty();
  }
}

function write(next: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Progress simply is not saved; never break the lesson over it.
  }
  for (const fn of listeners) fn();
}

function update(lessonId: string, fn: (lesson: LessonProgress) => void): void {
  const progress = getProgress();
  const lesson = progress.lessons[lessonId] ?? emptyLesson();
  fn(lesson);
  progress.lessons[lessonId] = lesson;
  write(progress);
}

export function markExercise(lessonId: string, exerciseId: string, status: ExerciseStatus): void {
  update(lessonId, (lesson) => {
    // A pass is permanent: re-opening a solved exercise must not undo it.
    if (lesson.exercises[exerciseId] === 'passed') return;
    lesson.exercises[exerciseId] = status;
  });
}

export function markQuiz(lessonId: string, quizId: string, correct: boolean): void {
  update(lessonId, (lesson) => {
    lesson.quizzes[quizId] = correct;
  });
}

export function saveDraft(lessonId: string, blockId: string, code: string): void {
  update(lessonId, (lesson) => {
    lesson.drafts[blockId] = code;
  });
}

export function getDraft(lessonId: string, blockId: string): string | undefined {
  return getProgress().lessons[lessonId]?.drafts[blockId];
}

export function touchLesson(lessonId: string): void {
  update(lessonId, (lesson) => {
    lesson.visitedAt = new Date().toISOString();
  });
}

export function lastVisitedLesson(): string | undefined {
  const entries = Object.entries(getProgress().lessons)
    .filter(([, lesson]) => lesson.visitedAt)
    .sort(([, a], [, b]) => (a.visitedAt! < b.visitedAt! ? 1 : -1));
  return entries[0]?.[0];
}

export function exportProgress(): string {
  return JSON.stringify(getProgress(), null, 2);
}

export function importProgress(json: string): boolean {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isProgress(parsed)) return false;
    write(parsed);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/state/progress.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/state/progress.ts src/state/progress.test.ts
git commit -m "feat: versioned local progress store with export and import"
```

---

### Task 7: Exercise checker

**Files:**
- Create: `src/r/checker.ts`
- Test: `src/r/checker.itest.ts`

**Interfaces:**
- Consumes: `evaluateR` (Task 3), `createChildEnv` (Task 4)
- Produces:
  - `type ExerciseDef = { id: string; prompt: string; starterCode: string; setupCode?: string; solution: string; wrongAnswers: string[]; check: string; hints: string[] }`
  - `type CheckOutcome = { status: 'pass'|'fail'|'student-error'|'broken-check'; message: string; run: RunResult }`
  - `runExercise(webR: WebR, exercise: ExerciseDef, studentCode: string, parentEnv: RObject, graphics?): Promise<CheckOutcome>`

This is the highest-stakes module in the project: it decides whether a student is told they are right. The four outcomes are distinct by design (see Global Constraints).

- [ ] **Step 1: Write the failing test**

Create `src/r/checker.itest.ts`.

```ts
// @vitest-environment node
import { WebR } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { runExercise, type ExerciseDef } from './checker';
import { createLessonEnv, destroyEnv } from './environments';

let webR: WebR;

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
}, 300_000);

afterAll(async () => {
  await webR.close();
});

const exercise: ExerciseDef = {
  id: 'test-1',
  prompt: 'Assign the mean of x to m.',
  starterCode: 'm <- ',
  setupCode: 'x <- c(2, 4, 6, 8)',
  solution: 'm <- mean(x)',
  wrongAnswers: ['m <- median(x) + 1', 'm <- sum(x)'],
  check: `
    if (!exists("m", inherits = TRUE)) {
      list(pass = FALSE, message = "I could not find an object called m.")
    } else if (isTRUE(all.equal(m, 5, tolerance = 1e-6))) {
      list(pass = TRUE, message = "Correct.")
    } else {
      list(pass = FALSE, message = paste("m is", m, "but should be 5."))
    }
  `,
  hints: ['Use mean().'],
};

async function run(code: string) {
  const env = await createLessonEnv(webR);
  const outcome = await runExercise(webR, exercise, code, env);
  await destroyEnv(env);
  return outcome;
}

describe('runExercise', () => {
  test('the reference solution passes', async () => {
    expect((await run(exercise.solution)).status).toBe('pass');
  });

  test('an alternative but correct route also passes', async () => {
    // Checks inspect values, never source text.
    expect((await run('m <- sum(x) / length(x)')).status).toBe('pass');
  });

  test('a float that differs below tolerance still passes', async () => {
    expect((await run('m <- 5 + 1e-12')).status).toBe('pass');
  });

  test('each declared wrong answer fails via the check, not an error', async () => {
    for (const wrong of exercise.wrongAnswers) {
      const outcome = await run(wrong);
      expect(outcome.status).toBe('fail');
    }
  });

  test('code that throws is reported as a student error, not a wrong answer', async () => {
    const outcome = await run('m <- undefined_function(x)');
    expect(outcome.status).toBe('student-error');
    expect(outcome.run.errored).toBe(true);
  });

  test('a broken check is reported as infrastructure, never as wrong', async () => {
    const broken = { ...exercise, check: 'stop("check is broken")' };
    const env = await createLessonEnv(webR);
    const outcome = await runExercise(webR, broken, exercise.solution, env);
    await destroyEnv(env);
    expect(outcome.status).toBe('broken-check');
  });

  test('a check returning a malformed value is reported as broken', async () => {
    const broken = { ...exercise, check: '"not a list"' };
    const env = await createLessonEnv(webR);
    const outcome = await runExercise(webR, broken, exercise.solution, env);
    await destroyEnv(env);
    expect(outcome.status).toBe('broken-check');
  });

  test('a previous attempt cannot make a later wrong answer pass', async () => {
    const env = await createLessonEnv(webR);
    await runExercise(webR, exercise, exercise.solution, env);
    const outcome = await runExercise(webR, exercise, 'y <- 1', env);
    await destroyEnv(env);
    expect(outcome.status).toBe('fail');
  });
});
```

The last test is the reason exercise runs use a fresh child environment. Without it, a student who solved the exercise then deleted their code would still pass.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/r/checker.itest.ts`
Expected: FAIL — cannot resolve `./checker`.

- [ ] **Step 3: Implement `src/r/checker.ts`**

```ts
import type { RCharacter, RObject, WebR } from 'webr';
import { createChildEnv, destroyEnv } from './environments';
import { evaluateR, type EvaluateOptions, type RunResult } from './evaluate';

export type ExerciseDef = {
  id: string;
  prompt: string;
  starterCode: string;
  /** Runs before the student's code: seeds, data, fixtures. */
  setupCode?: string;
  solution: string;
  /** Plausible wrong answers. Each MUST fail via pass = FALSE, not by erroring. */
  wrongAnswers: string[];
  /** R snippet returning list(pass = <logical>, message = <character>). */
  check: string;
  hints: string[];
};

export type CheckStatus = 'pass' | 'fail' | 'student-error' | 'broken-check';

export type CheckOutcome = {
  status: CheckStatus;
  message: string;
  run: RunResult;
};

/**
 * Wraps the check so it returns a two-element character vector rather than an
 * R list. Reading a character vector back is dependency-free and cannot be
 * misread as a partial result.
 */
function wrapCheck(check: string): string {
  return `local({
  .statlab_result <- local({
${check}
  })
  if (!is.list(.statlab_result) ||
      is.null(.statlab_result$pass) ||
      !is.logical(.statlab_result$pass) ||
      length(.statlab_result$pass) != 1L ||
      is.na(.statlab_result$pass)) {
    stop("statlab: check did not return list(pass = <logical>, message = <character>)")
  }
  .statlab_message <- .statlab_result$message
  if (is.null(.statlab_message)) .statlab_message <- ""
  c(if (isTRUE(.statlab_result$pass)) "TRUE" else "FALSE", as.character(.statlab_message)[1])
})`;
}

export async function runExercise(
  webR: WebR,
  exercise: ExerciseDef,
  studentCode: string,
  parentEnv: RObject,
  graphics: EvaluateOptions['graphics'] = false,
): Promise<CheckOutcome> {
  // Fresh scope per run: nothing from a previous attempt survives.
  const env = await createChildEnv(webR, parentEnv);

  try {
    if (exercise.setupCode) {
      const setup = await evaluateR(webR, exercise.setupCode, { env });
      if (setup.errored) {
        return { status: 'broken-check', message: 'This exercise failed to set up.', run: setup };
      }
    }

    const run = await evaluateR(webR, studentCode, { env, graphics });
    if (run.errored) {
      return { status: 'student-error', message: 'Your code did not run.', run };
    }

    let raw: string[];
    try {
      const checkEnv = await createChildEnv(webR, env);
      try {
        const result = (await webR.evalR(wrapCheck(exercise.check), { env: checkEnv })) as RCharacter;
        raw = ((await result.toArray()) as (string | null)[]).map((v) => v ?? '');
        await result.destroy();
      } finally {
        await destroyEnv(checkEnv);
      }
    } catch (err) {
      return { status: 'broken-check', message: String(err), run };
    }

    if (raw.length < 2 || (raw[0] !== 'TRUE' && raw[0] !== 'FALSE')) {
      return { status: 'broken-check', message: 'Check returned an unreadable value.', run };
    }

    return raw[0] === 'TRUE'
      ? { status: 'pass', message: raw[1] || 'Correct.', run }
      : { status: 'fail', message: raw[1] || 'Not quite.', run };
  } finally {
    await destroyEnv(env);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/r/checker.itest.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/r/checker.ts src/r/checker.itest.ts
git commit -m "feat: exercise checker with four distinct outcomes and value-based checks"
```

---

### Task 8: Output pane

**Files:**
- Create: `src/components/OutputPane.tsx`, `src/components/OutputPane.css`
- Test: `src/components/OutputPane.test.tsx`

**Interfaces:**
- Consumes: `RunResult` (Task 3)
- Produces: `<OutputPane result={RunResult | null} running={boolean} />`

- [ ] **Step 1: Write the failing test**

Create `src/components/OutputPane.test.tsx`.

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import OutputPane from './OutputPane';
import type { RunResult } from '../r/evaluate';

const result = (output: RunResult['output']): RunResult => ({ output, images: [], errored: output.some((o) => o.type === 'error') });

describe('OutputPane', () => {
  test('shows a prompt before anything has run', () => {
    render(<OutputPane result={null} running={false} />);
    expect(screen.getByText(/run the code/i)).toBeDefined();
  });

  test('renders console output', () => {
    render(<OutputPane result={result([{ type: 'stdout', data: '[1] 2' }])} running={false} />);
    expect(screen.getByText('[1] 2')).toBeDefined();
  });

  test('labels an error distinctly from ordinary output', () => {
    render(<OutputPane result={result([{ type: 'error', data: 'object not found' }])} running={false} />);
    const line = screen.getByText('object not found');
    expect(line.className).toContain('error');
  });

  test('labels a warning distinctly from an error', () => {
    render(<OutputPane result={result([{ type: 'warning', data: 'NAs introduced' }])} running={false} />);
    expect(screen.getByText('NAs introduced').className).toContain('warning');
  });

  test('announces that R is running', () => {
    render(<OutputPane result={null} running />);
    expect(screen.getByText(/running/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/OutputPane.test.tsx`
Expected: FAIL — cannot resolve `./OutputPane`.

- [ ] **Step 3: Implement `src/components/OutputPane.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import type { RunResult } from '../r/evaluate';
import './OutputPane.css';

type Props = {
  result: RunResult | null;
  running: boolean;
};

export default function OutputPane({ result, running }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const images = result?.images ?? [];
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    if (images.length === 0) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Show the final plot: intermediate frames of a multi-step plot are noise.
    const image = images[images.length - 1];
    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);
  }, [result]);

  const hasPlot = (result?.images.length ?? 0) > 0;

  return (
    <div className="output-pane" aria-live="polite">
      {running && <p className="output-status">Running R…</p>}
      {!running && !result && <p className="output-status">Run the code to see the output.</p>}

      {result && result.output.length > 0 && (
        <pre className="output-console">
          {result.output.map((line, index) => (
            <span key={index} className={`output-line output-${line.type}`}>
              {line.data}
            </span>
          ))}
        </pre>
      )}

      <canvas ref={canvasRef} className="output-plot" hidden={!hasPlot} />
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/OutputPane.css`**

```css
.output-pane { background: #0f172a; color: #e2e8f0; border-radius: 6px; padding: 0.75rem; min-height: 3rem; }
.output-status { margin: 0; color: #94a3b8; font-style: italic; }
.output-console { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.875rem; }
.output-line { display: block; }
.output-error { color: #fca5a5; }
.output-warning { color: #fcd34d; }
.output-message { color: #93c5fd; }
.output-stderr { color: #fcd34d; }
.output-plot { display: block; max-width: 100%; height: auto; margin-top: 0.75rem; background: #fff; border-radius: 4px; }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/OutputPane.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/OutputPane.tsx src/components/OutputPane.css src/components/OutputPane.test.tsx
git commit -m "feat: output pane rendering console streams and plots"
```

---

### Task 9: Lesson context and runnable code block

**Files:**
- Create: `src/content/LessonContext.tsx`, `src/components/REditor.tsx`, `src/components/CodeBlock.tsx`, `src/components/CodeBlock.css`
- Test: `src/components/CodeBlock.test.tsx`

**Interfaces:**
- Consumes: `evaluateR` (Task 3), `saveDraft`/`getDraft` (Task 6), `OutputPane` (Task 8)
- Produces:
  - `type LessonContextValue = { lessonId: string; webR: WebR | null; env: RObject | null; ready: boolean }`
  - `<LessonProvider value={LessonContextValue}>`, `useLesson(): LessonContextValue`
  - `<REditor value={string} onChange={(v: string) => void} />`
  - `<CodeBlock id={string} code={string} />`

`REditor` is a thin CodeMirror configuration shim with no logic of its own; `CodeBlock` holds the behaviour and is tested with `REditor` mocked. This keeps CodeMirror's DOM requirements out of jsdom.

- [ ] **Step 1: Create `src/content/LessonContext.tsx`**

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import type { RObject, WebR } from 'webr';

export type LessonContextValue = {
  lessonId: string;
  webR: WebR | null;
  env: RObject | null;
  ready: boolean;
};

const LessonContext = createContext<LessonContextValue>({
  lessonId: 'unknown',
  webR: null,
  env: null,
  ready: false,
});

export function LessonProvider({ value, children }: { value: LessonContextValue; children: ReactNode }) {
  return <LessonContext.Provider value={value}>{children}</LessonContext.Provider>;
}

export function useLesson(): LessonContextValue {
  return useContext(LessonContext);
}
```

- [ ] **Step 2: Write the failing test**

Create `src/components/CodeBlock.test.tsx`.

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import CodeBlock from './CodeBlock';
import { LessonProvider } from '../content/LessonContext';
import { getDraft } from '../state/progress';

vi.mock('./REditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="R code" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const evaluateR = vi.hoisted(() => vi.fn());
vi.mock('../r/evaluate', () => ({ evaluateR }));

function renderBlock(ready = true) {
  return render(
    <LessonProvider value={{ lessonId: '06-1', webR: {} as never, env: {} as never, ready }}>
      <CodeBlock id="b1" code="1 + 1" />
    </LessonProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  evaluateR.mockReset();
  evaluateR.mockResolvedValue({ output: [{ type: 'stdout', data: '[1] 2' }], images: [], errored: false });
});

describe('CodeBlock', () => {
  test('shows the starter code', () => {
    renderBlock();
    expect(screen.getByLabelText('R code')).toHaveProperty('value', '1 + 1');
  });

  test('runs the code and shows the output', async () => {
    renderBlock();
    await userEvent.click(screen.getByRole('button', { name: /run/i }));
    await waitFor(() => expect(screen.getByText('[1] 2')).toBeDefined());
    expect(evaluateR).toHaveBeenCalledOnce();
  });

  test('disables running until R is ready', () => {
    renderBlock(false);
    expect(screen.getByRole('button', { name: /run/i })).toHaveProperty('disabled', true);
  });

  test('persists edits as a draft', async () => {
    renderBlock();
    await userEvent.clear(screen.getByLabelText('R code'));
    await userEvent.type(screen.getByLabelText('R code'), 'mean(x)');
    await waitFor(() => expect(getDraft('06-1', 'b1')).toBe('mean(x)'));
  });

  test('restores a saved draft over the starter code', async () => {
    render(
      <LessonProvider value={{ lessonId: '06-1', webR: {} as never, env: {} as never, ready: true }}>
        <CodeBlock id="b1" code="1 + 1" />
      </LessonProvider>,
    );
    await userEvent.clear(screen.getByLabelText('R code'));
    await userEvent.type(screen.getByLabelText('R code'), 'sd(x)');
    await waitFor(() => expect(getDraft('06-1', 'b1')).toBe('sd(x)'));

    screen.getByRole('button', { name: /reset/i });
    renderBlock();
    expect(screen.getAllByLabelText('R code')[1]).toHaveProperty('value', 'sd(x)');
  });

  test('reset restores the starter code', async () => {
    renderBlock();
    await userEvent.clear(screen.getByLabelText('R code'));
    await userEvent.type(screen.getByLabelText('R code'), 'nonsense');
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByLabelText('R code')).toHaveProperty('value', '1 + 1');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/CodeBlock.test.tsx`
Expected: FAIL — cannot resolve `./CodeBlock`.

- [ ] **Step 4: Implement `src/components/REditor.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';
import { r } from '@codemirror/legacy-modes/mode/r';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function REditor({ value, onChange }: Props) {
  const host = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!host.current) return;

    const editor = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          StreamLanguage.define(r),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
      parent: host.current,
    });
    view.current = editor;

    return () => {
      editor.destroy();
      view.current = null;
    };
    // Mount once: doc updates are pushed in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const current = editor.state.doc.toString();
    if (current === value) return;
    editor.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  return <div ref={host} className="r-editor" />;
}
```

- [ ] **Step 5: Implement `src/components/CodeBlock.tsx`**

```tsx
import { useState } from 'react';
import { useLesson } from '../content/LessonContext';
import { evaluateR, type RunResult } from '../r/evaluate';
import { getDraft, saveDraft } from '../state/progress';
import OutputPane from './OutputPane';
import REditor from './REditor';
import './CodeBlock.css';

type Props = {
  id: string;
  code: string;
};

export const PLOT_SIZE = { width: 640, height: 400 };

export default function CodeBlock({ id, code }: Props) {
  const { lessonId, webR, env, ready } = useLesson();
  const [source, setSource] = useState(() => getDraft(lessonId, id) ?? code);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);

  function edit(next: string) {
    setSource(next);
    saveDraft(lessonId, id, next);
  }

  function reset() {
    setSource(code);
    saveDraft(lessonId, id, code);
  }

  async function run() {
    if (!webR || !ready) return;
    setRunning(true);
    try {
      setResult(await evaluateR(webR, source, { env: env ?? undefined, graphics: PLOT_SIZE }));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="code-block">
      <REditor value={source} onChange={edit} />
      <div className="code-block-actions">
        <button type="button" onClick={run} disabled={!ready || running}>
          {running ? 'Running…' : 'Run'}
        </button>
        <button type="button" onClick={reset} className="secondary">
          Reset
        </button>
        {!ready && <span className="code-block-hint">R is still starting…</span>}
      </div>
      <OutputPane result={result} running={running} />
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/CodeBlock.css`**

```css
.code-block { border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.75rem; margin: 1.25rem 0; background: #f8fafc; }
.r-editor { border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #fff; }
.r-editor .cm-editor { max-height: 24rem; }
.code-block-actions { display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0; }
.code-block-actions button { padding: 0.35rem 0.9rem; border-radius: 6px; border: 1px solid #1d4ed8; background: #1d4ed8; color: #fff; cursor: pointer; font-size: 0.9rem; }
.code-block-actions button:disabled { opacity: 0.55; cursor: not-allowed; }
.code-block-actions button.secondary { background: #fff; color: #1d4ed8; }
.code-block-hint { color: #64748b; font-size: 0.85rem; }
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/components/CodeBlock.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 8: Commit**

```bash
git add src/content/LessonContext.tsx src/components/REditor.tsx src/components/CodeBlock.tsx src/components/CodeBlock.css src/components/CodeBlock.test.tsx
git commit -m "feat: runnable code block with persisted drafts and lesson context"
```

---

### Task 10: Choice components — Predict, Quiz, Interpret

**Files:**
- Create: `src/components/ChoiceBlock.tsx`, `src/components/ChoiceBlock.css`, `src/components/Predict.tsx`, `src/components/Quiz.tsx`, `src/components/Interpret.tsx`
- Test: `src/components/ChoiceBlock.test.tsx`

**Interfaces:**
- Consumes: `useLesson` (Task 9), `markQuiz` (Task 6)
- Produces:
  - `type Choice = { text: string; correct?: boolean; response: string }`
  - `<ChoiceBlock id kind={'predict'|'quiz'|'interpret'} question choices={Choice[]} />`
  - `<Predict id question choices />`, `<Quiz id question choices />`, `<Interpret id question choices />`

All three share one primitive: ask, require a commitment, then reveal a per-choice response. They differ only in framing and in whether the result is recorded. `Predict` never records a score — its purpose is commitment, not assessment, and grading it would discourage honest guessing.

- [ ] **Step 1: Write the failing test**

Create `src/components/ChoiceBlock.test.tsx`.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import ChoiceBlock, { type Choice } from './ChoiceBlock';
import Predict from './Predict';
import { LessonProvider } from '../content/LessonContext';
import { getProgress } from '../state/progress';

const choices: Choice[] = [
  { text: 'It gets wider', response: 'No — more data means less variability.' },
  { text: 'It gets narrower', correct: true, response: 'Right: the standard error shrinks as n grows.' },
];

function wrap(ui: React.ReactNode) {
  return render(
    <LessonProvider value={{ lessonId: '06-2', webR: null, env: null, ready: true }}>{ui}</LessonProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('ChoiceBlock', () => {
  test('hides every response until the student commits', () => {
    wrap(<ChoiceBlock id="p1" kind="predict" question="What happens?" choices={choices} />);
    expect(screen.queryByText(/standard error shrinks/i)).toBeNull();
    expect(screen.queryByText(/more data means/i)).toBeNull();
  });

  test('reveals only the chosen response after committing', async () => {
    wrap(<ChoiceBlock id="p1" kind="predict" question="What happens?" choices={choices} />);
    await userEvent.click(screen.getByRole('button', { name: /it gets wider/i }));
    expect(screen.getByText(/more data means/i)).toBeDefined();
    expect(screen.queryByText(/standard error shrinks/i)).toBeNull();
  });

  test('marks the correct choice once answered', async () => {
    wrap(<ChoiceBlock id="q1" kind="quiz" question="What happens?" choices={choices} />);
    await userEvent.click(screen.getByRole('button', { name: /it gets narrower/i }));
    expect(screen.getByText(/correct/i)).toBeDefined();
  });

  test('records a quiz result but not a prediction', async () => {
    wrap(<ChoiceBlock id="q1" kind="quiz" question="Q" choices={choices} />);
    await userEvent.click(screen.getByRole('button', { name: /it gets narrower/i }));
    expect(getProgress().lessons['06-2'].quizzes.q1).toBe(true);

    wrap(<Predict id="p9" question="Q" choices={choices} />);
    await userEvent.click(screen.getAllByRole('button', { name: /it gets narrower/i })[1]);
    expect(getProgress().lessons['06-2'].quizzes.p9).toBeUndefined();
  });

  test('cannot be answered twice', async () => {
    wrap(<ChoiceBlock id="q2" kind="quiz" question="Q" choices={choices} />);
    await userEvent.click(screen.getByRole('button', { name: /it gets wider/i }));
    expect(screen.getByRole('button', { name: /it gets narrower/i })).toHaveProperty('disabled', true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ChoiceBlock.test.tsx`
Expected: FAIL — cannot resolve `./ChoiceBlock`.

- [ ] **Step 3: Implement `src/components/ChoiceBlock.tsx`**

```tsx
import { useState } from 'react';
import { useLesson } from '../content/LessonContext';
import { markQuiz } from '../state/progress';
import './ChoiceBlock.css';

export type Choice = {
  text: string;
  correct?: boolean;
  response: string;
};

export type ChoiceKind = 'predict' | 'quiz' | 'interpret';

type Props = {
  id: string;
  kind: ChoiceKind;
  question: string;
  choices: Choice[];
};

const LABELS: Record<ChoiceKind, string> = {
  predict: 'Predict first',
  quiz: 'Check your understanding',
  interpret: 'Interpret and report',
};

export default function ChoiceBlock({ id, kind, question, choices }: Props) {
  const { lessonId } = useLesson();
  const [chosen, setChosen] = useState<number | null>(null);

  function choose(index: number) {
    if (chosen !== null) return;
    setChosen(index);
    // Predictions are deliberately not scored: commitment, not assessment.
    if (kind !== 'predict') markQuiz(lessonId, id, choices[index].correct === true);
  }

  const selection = chosen === null ? null : choices[chosen];

  return (
    <section className={`choice-block choice-${kind}`}>
      <p className="choice-label">{LABELS[kind]}</p>
      <p className="choice-question">{question}</p>
      <ul className="choice-options">
        {choices.map((choice, index) => (
          <li key={choice.text}>
            <button
              type="button"
              onClick={() => choose(index)}
              disabled={chosen !== null}
              className={chosen === index ? 'chosen' : undefined}
            >
              {choice.text}
            </button>
          </li>
        ))}
      </ul>
      {selection && (
        <div className={`choice-response ${selection.correct ? 'right' : 'wrong'}`}>
          {kind !== 'predict' && <strong>{selection.correct ? 'Correct. ' : 'Not quite. '}</strong>}
          {selection.response}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Implement the three wrappers**

`src/components/Predict.tsx`:

```tsx
import ChoiceBlock, { type Choice } from './ChoiceBlock';

export default function Predict(props: { id: string; question: string; choices: Choice[] }) {
  return <ChoiceBlock {...props} kind="predict" />;
}
```

`src/components/Quiz.tsx`:

```tsx
import ChoiceBlock, { type Choice } from './ChoiceBlock';

export default function Quiz(props: { id: string; question: string; choices: Choice[] }) {
  return <ChoiceBlock {...props} kind="quiz" />;
}
```

`src/components/Interpret.tsx`:

```tsx
import ChoiceBlock, { type Choice } from './ChoiceBlock';

export default function Interpret(props: { id: string; question: string; choices: Choice[] }) {
  return <ChoiceBlock {...props} kind="interpret" />;
}
```

- [ ] **Step 5: Create `src/components/ChoiceBlock.css`**

```css
.choice-block { border-left: 4px solid #6366f1; background: #eef2ff; padding: 0.9rem 1.1rem; margin: 1.5rem 0; border-radius: 0 8px 8px 0; }
.choice-predict { border-left-color: #f59e0b; background: #fffbeb; }
.choice-interpret { border-left-color: #0d9488; background: #f0fdfa; }
.choice-label { margin: 0 0 0.35rem; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; }
.choice-question { margin: 0 0 0.75rem; font-weight: 600; }
.choice-options { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.choice-options button { width: 100%; text-align: left; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; font-size: 0.95rem; }
.choice-options button:disabled { cursor: default; }
.choice-options button.chosen { border-color: #4338ca; box-shadow: 0 0 0 2px #c7d2fe; }
.choice-response { margin-top: 0.75rem; padding: 0.6rem 0.75rem; border-radius: 6px; background: #fff; border: 1px solid #cbd5e1; }
.choice-response.right { border-color: #16a34a; }
.choice-response.wrong { border-color: #dc2626; }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/components/ChoiceBlock.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/ChoiceBlock.tsx src/components/ChoiceBlock.css src/components/Predict.tsx src/components/Quiz.tsx src/components/Interpret.tsx src/components/ChoiceBlock.test.tsx
git commit -m "feat: predict, quiz, and interpret blocks on a shared choice primitive"
```

---

### Task 11: Exercise component

**Files:**
- Create: `src/components/Exercise.tsx`, `src/components/Exercise.css`
- Test: `src/components/Exercise.test.tsx`

**Interfaces:**
- Consumes: `runExercise` + `ExerciseDef` (Task 7), `useLesson` (Task 9), `markExercise`/drafts (Task 6), `REditor`, `OutputPane`
- Produces: `<Exercise id={string} />`, resolving the definition from `src/content/exercises/`

- [ ] **Step 1: Write the failing test**

Create `src/components/Exercise.test.tsx`.

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Exercise from './Exercise';
import { LessonProvider } from '../content/LessonContext';
import { getProgress } from '../state/progress';
import type { ExerciseDef } from '../r/checker';

vi.mock('./REditor', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="R code" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const definition: ExerciseDef = {
  id: 'm6-e1',
  prompt: 'Assign the mean of x to m.',
  starterCode: 'm <- ',
  solution: 'm <- mean(x)',
  wrongAnswers: ['m <- 0'],
  check: 'list(pass = TRUE, message = "ok")',
  hints: ['Use mean().', 'Write m <- mean(x).'],
};

vi.mock('../content/exercises', () => ({
  getExercise: (id: string) => (id === 'm6-e1' ? definition : undefined),
}));

const runExercise = vi.hoisted(() => vi.fn());
vi.mock('../r/checker', async (original) => ({
  ...(await original<typeof import('../r/checker')>()),
  runExercise,
}));

const emptyRun = { output: [], images: [], errored: false };

function renderExercise() {
  return render(
    <LessonProvider value={{ lessonId: '06-1', webR: {} as never, env: {} as never, ready: true }}>
      <Exercise id="m6-e1" />
    </LessonProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  runExercise.mockReset();
});

describe('Exercise', () => {
  test('shows the prompt and starter code', () => {
    renderExercise();
    expect(screen.getByText(/assign the mean/i)).toBeDefined();
    expect(screen.getByLabelText('R code')).toHaveProperty('value', 'm <- ');
  });

  test('a pass is recorded and announced', async () => {
    runExercise.mockResolvedValue({ status: 'pass', message: 'Correct.', run: emptyRun });
    renderExercise();
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    await waitFor(() => expect(screen.getByText('Correct.')).toBeDefined());
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('passed');
  });

  test('a failed check records an attempt, not a pass', async () => {
    runExercise.mockResolvedValue({ status: 'fail', message: 'm is 0 but should be 5.', run: emptyRun });
    renderExercise();
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    await waitFor(() => expect(screen.getByText(/should be 5/)).toBeDefined());
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBe('attempted');
  });

  test('a student error is shown as an R error, not as a wrong answer', async () => {
    runExercise.mockResolvedValue({
      status: 'student-error',
      message: 'Your code did not run.',
      run: { output: [{ type: 'error', data: 'could not find function' }], images: [], errored: true },
    });
    renderExercise();
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    await waitFor(() => expect(screen.getByText(/could not find function/)).toBeDefined());
    expect(screen.queryByText(/not quite/i)).toBeNull();
  });

  test('a broken check blames the exercise, never the student', async () => {
    runExercise.mockResolvedValue({ status: 'broken-check', message: 'check exploded', run: emptyRun });
    renderExercise();
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    await waitFor(() => expect(screen.getByText(/problem with this exercise/i)).toBeDefined());
    expect(getProgress().lessons['06-1'].exercises['m6-e1']).toBeUndefined();
  });

  test('hints reveal one at a time', async () => {
    renderExercise();
    expect(screen.queryByText('Use mean().')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /hint/i }));
    expect(screen.getByText('Use mean().')).toBeDefined();
    expect(screen.queryByText('Write m <- mean(x).')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /hint/i }));
    expect(screen.getByText('Write m <- mean(x).')).toBeDefined();
  });

  test('the solution is locked until at least one attempt', async () => {
    runExercise.mockResolvedValue({ status: 'fail', message: 'Not quite.', run: emptyRun });
    renderExercise();
    expect(screen.getByRole('button', { name: /solution/i })).toHaveProperty('disabled', true);
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /solution/i })).toHaveProperty('disabled', false),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/Exercise.test.tsx`
Expected: FAIL — cannot resolve `./Exercise`.

- [ ] **Step 3: Implement `src/components/Exercise.tsx`**

```tsx
import { useState } from 'react';
import { getExercise } from '../content/exercises';
import { useLesson } from '../content/LessonContext';
import { runExercise, type CheckOutcome } from '../r/checker';
import { getDraft, markExercise, saveDraft } from '../state/progress';
import { PLOT_SIZE } from './CodeBlock';
import OutputPane from './OutputPane';
import REditor from './REditor';
import './Exercise.css';

export default function Exercise({ id }: { id: string }) {
  const { lessonId, webR, env, ready } = useLesson();
  const definition = getExercise(id);
  const [source, setSource] = useState(() => getDraft(lessonId, id) ?? definition?.starterCode ?? '');
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [checking, setChecking] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  if (!definition) {
    return <p className="exercise-missing">Exercise “{id}” is not defined.</p>;
  }

  function edit(next: string) {
    setSource(next);
    saveDraft(lessonId, id, next);
  }

  async function check() {
    if (!webR || !env || !ready) return;
    setChecking(true);
    try {
      const result = await runExercise(webR, definition!, source, env, PLOT_SIZE);
      setOutcome(result);
      setAttempted(true);
      // A broken check is an infrastructure fault: it records nothing.
      if (result.status === 'pass') markExercise(lessonId, id, 'passed');
      else if (result.status === 'fail' || result.status === 'student-error') {
        markExercise(lessonId, id, 'attempted');
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="exercise">
      <p className="exercise-label">Exercise</p>
      <p className="exercise-prompt">{definition.prompt}</p>

      <REditor value={source} onChange={edit} />

      <div className="exercise-actions">
        <button type="button" onClick={check} disabled={!ready || checking}>
          {checking ? 'Checking…' : 'Check my answer'}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => setHintsShown((n) => Math.min(n + 1, definition.hints.length))}
          disabled={hintsShown >= definition.hints.length}
        >
          Show a hint
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => setShowSolution(true)}
          disabled={!attempted || showSolution}
          title={attempted ? undefined : 'Try the exercise first'}
        >
          Show solution
        </button>
      </div>

      {hintsShown > 0 && (
        <ul className="exercise-hints">
          {definition.hints.slice(0, hintsShown).map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      )}

      {outcome && (
        <div className={`exercise-outcome outcome-${outcome.status}`}>
          {outcome.status === 'pass' && <p>{outcome.message}</p>}
          {outcome.status === 'fail' && <p>{outcome.message}</p>}
          {outcome.status === 'student-error' && (
            <p>Your code did not run. R reported the error shown below.</p>
          )}
          {outcome.status === 'broken-check' && (
            <p>
              There is a problem with this exercise itself, not with your answer. Please report it.
            </p>
          )}
        </div>
      )}

      {outcome && <OutputPane result={outcome.run} running={false} />}

      {showSolution && (
        <pre className="exercise-solution">
          <code>{definition.solution}</code>
        </pre>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Create `src/components/Exercise.css`**

```css
.exercise { border: 2px solid #0d9488; border-radius: 8px; padding: 1rem; margin: 1.75rem 0; background: #fff; }
.exercise-label { margin: 0 0 0.35rem; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: #0f766e; }
.exercise-prompt { margin: 0 0 0.75rem; font-weight: 600; }
.exercise-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.6rem 0; }
.exercise-actions button { padding: 0.35rem 0.9rem; border-radius: 6px; border: 1px solid #0d9488; background: #0d9488; color: #fff; cursor: pointer; font-size: 0.9rem; }
.exercise-actions button.secondary { background: #fff; color: #0f766e; }
.exercise-actions button:disabled { opacity: 0.55; cursor: not-allowed; }
.exercise-hints { margin: 0.5rem 0; padding-left: 1.25rem; color: #334155; }
.exercise-outcome { padding: 0.6rem 0.8rem; border-radius: 6px; margin: 0.6rem 0; }
.exercise-outcome p { margin: 0; }
.outcome-pass { background: #dcfce7; border: 1px solid #16a34a; }
.outcome-fail { background: #fef3c7; border: 1px solid #d97706; }
.outcome-student-error { background: #fee2e2; border: 1px solid #dc2626; }
.outcome-broken-check { background: #ede9fe; border: 1px solid #7c3aed; }
.exercise-solution { background: #0f172a; color: #e2e8f0; padding: 0.75rem; border-radius: 6px; overflow-x: auto; }
.exercise-missing { color: #b91c1c; font-weight: 600; }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/Exercise.test.tsx`
Expected: PASS, 7 tests. (`getExercise` is mocked here; it is implemented in Task 15.)

- [ ] **Step 6: Commit**

```bash
git add src/components/Exercise.tsx src/components/Exercise.css src/components/Exercise.test.tsx
git commit -m "feat: exercise component with staged hints and distinct check outcomes"
```

---

### Task 12: Sampling engine and the CLT simulation

**Files:**
- Create: `src/sims/rng.ts`, `src/sims/CLT.tsx`, `src/sims/CLT.css`, `src/sims/registry.ts`, `src/components/Simulation.tsx`
- Test: `src/sims/rng.test.ts`, `src/components/Simulation.test.tsx`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `makeRng(seed: number): () => number`
  - `type PopulationName = 'normal' | 'skewed' | 'uniform' | 'bimodal'`
  - `POPULATIONS: Record<PopulationName, { label: string; mean: number; sd: number; draw: (rng) => number }>`
  - `sampleMeans(population, n, replications, rng): number[]`
  - `histogram(values: number[], bins: number): { edges: number[]; counts: number[] }`
  - `mean(values)`, `sd(values)`
  - `SIMULATIONS: Record<string, ComponentType>` with key `'clt'`
  - `<Simulation name={string} />`

The statistics run in TypeScript, not R. A slider must respond within a frame, and a round trip to the R worker cannot promise that.

- [ ] **Step 1: Write the failing test**

Create `src/sims/rng.test.ts`.

```ts
import { describe, expect, test } from 'vitest';
import { histogram, makeRng, mean, POPULATIONS, sampleMeans, sd } from './rng';

describe('seeded rng', () => {
  test('is deterministic for a given seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  test('differs between seeds', () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });

  test('stays within [0, 1)', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 500; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('populations', () => {
  test('each declares a mean close to what it actually generates', () => {
    for (const key of Object.keys(POPULATIONS) as (keyof typeof POPULATIONS)[]) {
      const population = POPULATIONS[key];
      const rng = makeRng(99);
      const draws = Array.from({ length: 20_000 }, () => population.draw(rng));
      expect(Math.abs(mean(draws) - population.mean)).toBeLessThan(population.sd * 0.1);
    }
  });

  test('each declares an sd close to what it actually generates', () => {
    for (const key of Object.keys(POPULATIONS) as (keyof typeof POPULATIONS)[]) {
      const population = POPULATIONS[key];
      const rng = makeRng(123);
      const draws = Array.from({ length: 20_000 }, () => population.draw(rng));
      expect(Math.abs(sd(draws) - population.sd)).toBeLessThan(population.sd * 0.15);
    }
  });
});

describe('sampleMeans', () => {
  test('returns one mean per replication', () => {
    expect(sampleMeans(POPULATIONS.normal, 10, 250, makeRng(3))).toHaveLength(250);
  });

  test('spread shrinks roughly as the square root of n — the point of the lesson', () => {
    const small = sd(sampleMeans(POPULATIONS.skewed, 4, 4000, makeRng(5)));
    const large = sd(sampleMeans(POPULATIONS.skewed, 64, 4000, makeRng(5)));
    // Quadrupling n four times over should roughly quarter the spread.
    expect(large).toBeLessThan(small / 2);
  });

  test('centres on the population mean regardless of n', () => {
    const means = sampleMeans(POPULATIONS.skewed, 25, 4000, makeRng(11));
    expect(Math.abs(mean(means) - POPULATIONS.skewed.mean)).toBeLessThan(POPULATIONS.skewed.sd * 0.05);
  });
});

describe('histogram', () => {
  test('counts every value exactly once', () => {
    const { counts } = histogram([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(10);
  });

  test('produces one more edge than bin', () => {
    const { edges, counts } = histogram([1, 2, 3], 4);
    expect(edges).toHaveLength(counts.length + 1);
  });

  test('handles identical values without producing NaN', () => {
    const { counts } = histogram([5, 5, 5], 4);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
    expect(counts.every((c) => Number.isFinite(c))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sims/rng.test.ts`
Expected: FAIL — cannot resolve `./rng`.

- [ ] **Step 3: Implement `src/sims/rng.ts`**

```ts
/** mulberry32: small, fast, and seedable so simulations are reproducible. */
export function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rng: () => number, mu: number, sigma: number): number {
  // Box-Muller; guard against log(0).
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type Population = {
  label: string;
  description: string;
  mean: number;
  sd: number;
  draw: (rng: () => number) => number;
};

export type PopulationName = 'normal' | 'skewed' | 'uniform' | 'bimodal';

export const POPULATIONS: Record<PopulationName, Population> = {
  normal: {
    label: 'Normal',
    description: 'A symmetric, bell-shaped population.',
    mean: 20,
    sd: 5,
    draw: (rng) => normal(rng, 20, 5),
  },
  skewed: {
    label: 'Strongly skewed',
    description: 'Most people score low, a few score very high — like stress or reaction times.',
    mean: 20,
    // Exponential with rate 1/20: mean = sd = 20.
    sd: 20,
    draw: (rng) => -20 * Math.log(Math.max(rng(), Number.EPSILON)),
  },
  uniform: {
    label: 'Flat',
    description: 'Every value between 0 and 40 is equally likely.',
    mean: 20,
    sd: 40 / Math.sqrt(12),
    draw: (rng) => rng() * 40,
  },
  bimodal: {
    label: 'Two peaks',
    description: 'Two distinct groups, with almost nobody in the middle.',
    mean: 20,
    // Equal mixture of N(8, 3) and N(32, 3): sd = sqrt(3^2 + 12^2).
    sd: Math.sqrt(9 + 144),
    draw: (rng) => (rng() < 0.5 ? normal(rng, 8, 3) : normal(rng, 32, 3)),
  },
};

export function mean(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function sd(values: number[]): number {
  if (values.length < 2) return Number.NaN;
  const m = mean(values);
  const variance = values.reduce((total, value) => total + (value - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function drawSample(population: Population, n: number, rng: () => number): number[] {
  return Array.from({ length: n }, () => population.draw(rng));
}

export function sampleMeans(
  population: Population,
  n: number,
  replications: number,
  rng: () => number,
): number[] {
  return Array.from({ length: replications }, () => mean(drawSample(population, n, rng)));
}

export function histogram(values: number[], bins: number): { edges: number[]; counts: number[] } {
  const counts = new Array<number>(bins).fill(0);
  if (values.length === 0) return { edges: new Array(bins + 1).fill(0), counts };

  const min = Math.min(...values);
  const max = Math.max(...values);
  // A degenerate range would divide by zero; widen it symmetrically instead.
  const lo = min === max ? min - 0.5 : min;
  const hi = min === max ? max + 0.5 : max;
  const width = (hi - lo) / bins;

  const edges = Array.from({ length: bins + 1 }, (_, i) => lo + i * width);
  for (const value of values) {
    const index = Math.min(Math.floor((value - lo) / width), bins - 1);
    counts[index] += 1;
  }
  return { edges, counts };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sims/rng.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Implement `src/sims/CLT.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { histogram, makeRng, mean, POPULATIONS, sampleMeans, sd, type PopulationName } from './rng';
import './CLT.css';

const REPLICATIONS = 2000;
const BINS = 34;
const WIDTH = 640;
const HEIGHT = 180;

function Histogram({ values, colour, label }: { values: number[]; colour: string; label: string }) {
  const { edges, counts } = useMemo(() => histogram(values, BINS), [values]);
  const peak = Math.max(...counts, 1);
  const lo = edges[0];
  const hi = edges[edges.length - 1];
  const span = hi - lo || 1;
  const barWidth = WIDTH / BINS;

  return (
    <figure className="clt-figure">
      <figcaption>{label}</figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className="clt-svg">
        {counts.map((count, index) => {
          const height = (count / peak) * (HEIGHT - 24);
          return (
            <rect
              key={index}
              x={index * barWidth}
              y={HEIGHT - 20 - height}
              width={Math.max(barWidth - 1, 1)}
              height={height}
              fill={colour}
            />
          );
        })}
        <line x1={0} y1={HEIGHT - 20} x2={WIDTH} y2={HEIGHT - 20} stroke="#334155" />
        <text x={2} y={HEIGHT - 6} className="clt-axis">{lo.toFixed(1)}</text>
        <text x={WIDTH - 4} y={HEIGHT - 6} textAnchor="end" className="clt-axis">{hi.toFixed(1)}</text>
        <text x={WIDTH / 2} y={HEIGHT - 6} textAnchor="middle" className="clt-axis">
          {(lo + span / 2).toFixed(1)}
        </text>
      </svg>
    </figure>
  );
}

export default function CLT() {
  const [populationName, setPopulationName] = useState<PopulationName>('skewed');
  const [n, setN] = useState(2);
  const [seed, setSeed] = useState(1);

  const population = POPULATIONS[populationName];

  const populationDraws = useMemo(() => {
    const rng = makeRng(seed * 7919);
    return Array.from({ length: 4000 }, () => population.draw(rng));
  }, [population, seed]);

  const means = useMemo(
    () => sampleMeans(population, n, REPLICATIONS, makeRng(seed * 104729)),
    [population, n, seed],
  );

  const observedSe = sd(means);
  const predictedSe = population.sd / Math.sqrt(n);

  return (
    <div className="clt">
      <div className="clt-controls">
        <label>
          Population
          <select
            value={populationName}
            onChange={(event) => setPopulationName(event.target.value as PopulationName)}
          >
            {(Object.keys(POPULATIONS) as PopulationName[]).map((key) => (
              <option key={key} value={key}>
                {POPULATIONS[key].label}
              </option>
            ))}
          </select>
        </label>

        <label className="clt-slider">
          Sample size (n) = <strong>{n}</strong>
          <input
            type="range"
            min={1}
            max={100}
            value={n}
            onChange={(event) => setN(Number(event.target.value))}
          />
        </label>

        <button type="button" onClick={() => setSeed((s) => s + 1)}>
          Draw again
        </button>
      </div>

      <p className="clt-description">{population.description}</p>

      <Histogram values={populationDraws} colour="#94a3b8" label="The population (individual people)" />
      <Histogram
        values={means}
        colour="#1d4ed8"
        label={`Sampling distribution: ${REPLICATIONS} sample means, each from n = ${n}`}
      />

      <table className="clt-readout">
        <tbody>
          <tr>
            <th scope="row">Population mean (μ)</th>
            <td>{population.mean.toFixed(2)}</td>
            <th scope="row">Mean of the sample means</th>
            <td>{mean(means).toFixed(2)}</td>
          </tr>
          <tr>
            <th scope="row">Population SD (σ)</th>
            <td>{population.sd.toFixed(2)}</td>
            <th scope="row">SD of the sample means</th>
            <td>{observedSe.toFixed(2)}</td>
          </tr>
          <tr>
            <th scope="row">σ / √n predicts</th>
            <td>{predictedSe.toFixed(2)}</td>
            <th scope="row">Observed matches prediction</th>
            <td>{Math.abs(observedSe - predictedSe) < predictedSe * 0.1 ? 'yes' : 'close'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/sims/CLT.css`**

```css
.clt { border: 1px solid #cbd5e1; border-radius: 8px; padding: 1rem; margin: 1.75rem 0; background: #fff; }
.clt-controls { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; margin-bottom: 0.5rem; }
.clt-controls label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; }
.clt-slider input { width: 12rem; }
.clt-controls button { padding: 0.3rem 0.8rem; border-radius: 6px; border: 1px solid #1d4ed8; background: #fff; color: #1d4ed8; cursor: pointer; }
.clt-description { margin: 0 0 0.75rem; color: #475569; font-size: 0.9rem; }
.clt-figure { margin: 0 0 0.75rem; }
.clt-figure figcaption { font-size: 0.85rem; color: #334155; margin-bottom: 0.2rem; }
.clt-svg { width: 100%; height: auto; background: #f8fafc; border-radius: 4px; }
.clt-axis { font-size: 11px; fill: #475569; }
.clt-readout { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.clt-readout th { text-align: left; font-weight: 500; color: #475569; padding: 0.2rem 0.5rem 0.2rem 0; }
.clt-readout td { padding: 0.2rem 1.25rem 0.2rem 0; font-variant-numeric: tabular-nums; font-weight: 600; }
```

- [ ] **Step 7: Implement the registry and `Simulation` component**

`src/sims/registry.ts`:

```ts
import type { ComponentType } from 'react';
import CLT from './CLT';

export const SIMULATIONS: Record<string, ComponentType> = {
  clt: CLT,
};

export const SIMULATION_NAMES = Object.keys(SIMULATIONS);
```

`src/components/Simulation.tsx`:

```tsx
import { SIMULATIONS } from '../sims/registry';

export default function Simulation({ name }: { name: string }) {
  const Component = SIMULATIONS[name];
  if (!Component) {
    return <p className="exercise-missing">Simulation “{name}” is not registered.</p>;
  }
  return <Component />;
}
```

- [ ] **Step 8: Write and run the Simulation test**

Create `src/components/Simulation.test.tsx`.

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Simulation from './Simulation';

describe('Simulation', () => {
  test('renders a registered simulation', () => {
    render(<Simulation name="clt" />);
    expect(screen.getByText(/sample size/i)).toBeDefined();
  });

  test('reports an unregistered name instead of rendering nothing', () => {
    render(<Simulation name="nope" />);
    expect(screen.getByText(/not registered/i)).toBeDefined();
  });
});
```

Run: `npx vitest run src/components/Simulation.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 9: Commit**

```bash
git add src/sims/ src/components/Simulation.tsx src/components/Simulation.test.tsx
git commit -m "feat: seeded sampling engine and the central limit theorem simulation"
```

---

### Task 13: Application shell

**Files:**
- Create: `src/components/RStatus.tsx`, `src/components/Sidebar.tsx`, `src/pages/Home.tsx`, `src/App.css`
- Modify: `src/App.tsx`
- Test: `src/components/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `manifest` (Task 14 — create a minimal version here and extend it there), `onStatus`/`restartWebR` (Task 2), progress (Task 6)
- Produces: routed layout at `/`, `/lesson/:lessonId`, `/playground`, `/which-test`; `<Sidebar />`; `<RStatus />`

> **Note for the implementer:** create `src/content/manifest.ts` in this task with the Module 6 entries below. Task 14 builds the loader that consumes it; Task 15 fills in the lesson files themselves.

- [ ] **Step 1: Create `src/content/manifest.ts`**

```ts
export type LessonMeta = {
  id: string;
  title: string;
  /** Matches the filename in src/content/lessons, without the extension. */
  file: string;
};

export type ModuleMeta = {
  id: string;
  number: number;
  title: string;
  lessons: LessonMeta[];
};

export const MODULES: ModuleMeta[] = [
  {
    id: 'module-06',
    number: 6,
    title: 'Sampling',
    lessons: [
      { id: '06-1', title: 'Why two samples never agree', file: '06-1-samples-vary' },
      { id: '06-2', title: 'The sampling distribution', file: '06-2-sampling-distribution' },
      { id: '06-3', title: 'The Central Limit Theorem', file: '06-3-central-limit-theorem' },
    ],
  },
];

export const ALL_LESSONS: LessonMeta[] = MODULES.flatMap((module) => module.lessons);

export function findLesson(id: string): LessonMeta | undefined {
  return ALL_LESSONS.find((lesson) => lesson.id === id);
}

export function lessonNeighbours(id: string): { previous?: LessonMeta; next?: LessonMeta } {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === id);
  if (index === -1) return {};
  return { previous: ALL_LESSONS[index - 1], next: ALL_LESSONS[index + 1] };
}
```

- [ ] **Step 2: Write the failing test**

Create `src/components/Sidebar.test.tsx`.

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';
import Sidebar from './Sidebar';
import { markExercise } from '../state/progress';

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('Sidebar', () => {
  test('lists modules and their lessons', () => {
    renderSidebar();
    expect(screen.getByText(/sampling/i)).toBeDefined();
    expect(screen.getByText('The Central Limit Theorem')).toBeDefined();
  });

  test('links each lesson to its route', () => {
    renderSidebar();
    const link = screen.getByRole('link', { name: 'The sampling distribution' });
    expect(link.getAttribute('href')).toBe('/lesson/06-2');
  });

  test('marks a lesson as started once any exercise is attempted', () => {
    markExercise('06-1', 'm6-e1', 'attempted');
    renderSidebar();
    const link = screen.getByRole('link', { name: /why two samples never agree/i });
    expect(link.className).toContain('started');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/Sidebar.test.tsx`
Expected: FAIL — cannot resolve `./Sidebar`.

- [ ] **Step 4: Implement `src/components/Sidebar.tsx`**

```tsx
import { NavLink } from 'react-router-dom';
import { MODULES } from '../content/manifest';
import { getProgress } from '../state/progress';

export default function Sidebar() {
  const progress = getProgress();

  function statusClass(lessonId: string): string {
    const lesson = progress.lessons[lessonId];
    if (!lesson) return '';
    const results = Object.values(lesson.exercises);
    if (results.length > 0 && results.every((status) => status === 'passed')) return 'complete';
    if (results.length > 0 || lesson.visitedAt) return 'started';
    return '';
  }

  return (
    <nav className="sidebar" aria-label="Course navigation">
      <NavLink to="/" className="sidebar-home">
        StatLab
      </NavLink>

      {MODULES.map((module) => (
        <section key={module.id}>
          <h2>
            {module.number}. {module.title}
          </h2>
          <ul>
            {module.lessons.map((lesson) => (
              <li key={lesson.id}>
                <NavLink
                  to={`/lesson/${lesson.id}`}
                  className={({ isActive }) =>
                    ['sidebar-lesson', statusClass(lesson.id), isActive ? 'active' : '']
                      .filter(Boolean)
                      .join(' ')
                  }
                >
                  {lesson.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section>
        <h2>Reference</h2>
        <ul>
          <li>
            <NavLink to="/which-test" className="sidebar-lesson">
              Which test should I use?
            </NavLink>
          </li>
          <li>
            <NavLink to="/playground" className="sidebar-lesson">
              R playground
            </NavLink>
          </li>
        </ul>
      </section>
    </nav>
  );
}
```

- [ ] **Step 5: Implement `src/components/RStatus.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { onStatus, type RStatus as Status } from '../r/webrClient';

/**
 * Restarting reloads the page rather than respawning the worker in place.
 * A wedged worker leaves behind a dead lesson environment, a memoised session
 * promise, and stale component state; a reload clears all three at once, and
 * nothing is lost because code drafts live in localStorage.
 */
function restart() {
  window.location.reload();
}

export default function RStatus() {
  const [status, setStatus] = useState<Status>({ phase: 'idle' });

  useEffect(() => onStatus(setStatus), []);

  if (status.phase === 'ready') {
    return (
      <div className="r-status ready">
        <span>R is ready</span>
        <button type="button" onClick={restart} title="Use this if R stops responding">
          Restart R
        </button>
      </div>
    );
  }

  if (status.phase === 'error') {
    return (
      <div className="r-status error">
        <p>
          R could not start. StatLab needs a recent browser and an internet connection the first time
          it loads. You can still read the lessons and answer the questions.
        </p>
        <p className="r-status-detail">{status.detail}</p>
        <button type="button" onClick={restart}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="r-status busy">
      <span>{status.detail ?? (status.phase === 'installing' ? 'Installing packages…' : 'Starting R…')}</span>
    </div>
  );
}
```

Restart exists because the PostMessage channel cannot interrupt a running loop —
a student's infinite loop has no other escape. `restartWebR()` from Task 2 stays
available for the day the app needs in-place recovery that preserves scroll
position and output; re-running the lesson's earlier code blocks automatically
(spec §3.5) is deferred with it.

- [ ] **Step 6: Implement `src/pages/Home.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { ALL_LESSONS, findLesson, MODULES } from '../content/manifest';
import { exportProgress, getProgress, importProgress, lastVisitedLesson } from '../state/progress';

function download(contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'statlab-progress.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const progress = getProgress();
  const resumeId = lastVisitedLesson();
  const resume = resumeId ? findLesson(resumeId) : undefined;

  const started = ALL_LESSONS.filter((lesson) => progress.lessons[lesson.id]).length;

  async function onImport(file: File) {
    const ok = importProgress(await file.text());
    if (ok) window.location.reload();
    else window.alert('That file could not be read as StatLab progress.');
  }

  return (
    <div className="home">
      <h1>StatLab</h1>
      <p className="home-tagline">
        Statistics and R for psychology and business students — University of Twente.
      </p>

      <p>
        Everything here runs in your browser. Nothing is installed, nothing is uploaded, and your
        progress stays on this computer.
      </p>

      {resume && (
        <p className="home-resume">
          <Link to={`/lesson/${resume.id}`}>Continue: {resume.title}</Link>
        </p>
      )}

      <p>
        {started} of {ALL_LESSONS.length} lessons started.
      </p>

      {MODULES.map((module) => (
        <section key={module.id}>
          <h2>
            {module.number}. {module.title}
          </h2>
          <ol>
            {module.lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link to={`/lesson/${lesson.id}`}>{lesson.title}</Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section>
        <h2>Your progress</h2>
        <p>
          Progress is saved only in this browser. Export it to move to another computer, or to hand
          in as evidence of completion.
        </p>
        <button type="button" onClick={() => download(exportProgress())}>
          Export progress
        </button>
        <label className="home-import">
          Import progress
          <input
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImport(file);
            }}
          />
        </label>
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Rewrite `src/App.tsx`**

```tsx
import { Route, Routes } from 'react-router-dom';
import RStatus from './components/RStatus';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Lesson from './pages/Lesson';
import Playground from './pages/Playground';
import TestChooser from './pages/TestChooser';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <main className="app-main">
        <RStatus />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lesson/:lessonId" element={<Lesson />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/which-test" element={<TestChooser />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}
```

`Lesson`, `Playground`, and `TestChooser` arrive in Tasks 14 and 16. Until then, create each as a one-line placeholder component so the build passes, and replace it in its own task.

- [ ] **Step 8: Create `src/App.css`**

```css
:root { color-scheme: light; }
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a; background: #fff; line-height: 1.6; }
.app { display: grid; grid-template-columns: 16rem 1fr; min-height: 100vh; }
.sidebar { border-right: 1px solid #e2e8f0; padding: 1rem; background: #f8fafc; }
.sidebar-home { display: block; font-weight: 700; font-size: 1.1rem; margin-bottom: 1rem; color: #1d4ed8; text-decoration: none; }
.sidebar h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin: 1rem 0 0.4rem; }
.sidebar ul { list-style: none; margin: 0; padding: 0; }
.sidebar-lesson { display: block; padding: 0.3rem 0.5rem; border-radius: 5px; color: #0f172a; text-decoration: none; font-size: 0.92rem; }
.sidebar-lesson:hover { background: #e2e8f0; }
.sidebar-lesson.active { background: #dbeafe; font-weight: 600; }
.sidebar-lesson.started::after { content: " ·"; color: #d97706; }
.sidebar-lesson.complete::after { content: " ✓"; color: #16a34a; }
.app-main { padding: 1.5rem 2rem 4rem; max-width: 52rem; }
.r-status { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; padding: 0.4rem 0.7rem; border-radius: 6px; margin-bottom: 1rem; }
.r-status.ready { background: #f0fdf4; color: #166534; }
.r-status.busy { background: #fffbeb; color: #92400e; }
.r-status.error { background: #fef2f2; color: #991b1b; display: block; }
.r-status-detail { font-family: ui-monospace, monospace; font-size: 0.75rem; word-break: break-all; }
.r-status button { margin-left: auto; padding: 0.2rem 0.6rem; border-radius: 5px; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; }
.home-tagline { color: #475569; font-size: 1.05rem; }
.home-resume a { font-weight: 600; }
.home-import { display: inline-flex; gap: 0.4rem; align-items: center; margin-left: 1rem; font-size: 0.9rem; }
@media (max-width: 720px) {
  .app { grid-template-columns: 1fr; }
  .sidebar { border-right: none; border-bottom: 1px solid #e2e8f0; }
  .app-main { padding: 1rem; }
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run src/components/Sidebar.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 10: Commit**

```bash
git add src/App.tsx src/App.css src/components/Sidebar.tsx src/components/RStatus.tsx src/pages/ src/content/manifest.ts src/components/Sidebar.test.tsx
git commit -m "feat: application shell with navigation, R status, and progress export"
```

---

### Task 14: Content pipeline and lesson page

**Files:**
- Create: `src/content/exercises/index.ts`, `src/content/mdxComponents.tsx`, `src/pages/Lesson.tsx`
- Modify: `src/r/session.ts` (add `prepareSession`)
- Test: `src/content/exercises/index.test.ts`

**Interfaces:**
- Consumes: manifest (Task 13), all block components (Tasks 9–12)
- Produces:
  - `getExercise(id: string): ExerciseDef | undefined`, `ALL_EXERCISES: ExerciseDef[]`
  - `mdxComponents` — the component map handed to every MDX lesson
  - `prepareSession(webR: WebR, load): Promise<void>` — memoised package install + dataset mount
  - `<Lesson />` routed at `/lesson/:lessonId`

- [ ] **Step 1: Add `prepareSession` to `src/r/session.ts`**

```ts
let prepared: Promise<void> | null = null;

/** Install packages and mount datasets exactly once per webR instance. */
export function prepareSession(
  webR: WebR,
  load: (name: string) => Promise<Uint8Array>,
): Promise<void> {
  if (!prepared) {
    prepared = (async () => {
      await mountDatasets(webR, load);
      await installCoursePackages(webR);
    })().catch((err) => {
      prepared = null; // Allow a retry after a transient network failure.
      throw err;
    });
  }
  return prepared;
}

export async function fetchDataset(name: string): Promise<Uint8Array> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${name}`);
  if (!response.ok) throw new Error(`Could not load dataset ${name}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
```

- [ ] **Step 2: Write the failing test**

Create `src/content/exercises/index.test.ts`. This enforces the exercise contract at the data level, so a malformed definition fails fast rather than during a lesson.

```ts
import { describe, expect, test } from 'vitest';
import { ALL_EXERCISES, getExercise } from './index';

describe('exercise definitions', () => {
  test('at least one exercise is defined', () => {
    expect(ALL_EXERCISES.length).toBeGreaterThan(0);
  });

  test('ids are unique', () => {
    const ids = ALL_EXERCISES.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every exercise carries at least one wrong answer', () => {
    for (const exercise of ALL_EXERCISES) {
      expect(exercise.wrongAnswers.length, `${exercise.id} has no wrong answers`).toBeGreaterThan(0);
    }
  });

  test('every exercise carries at least one hint and a solution', () => {
    for (const exercise of ALL_EXERCISES) {
      expect(exercise.hints.length, `${exercise.id} has no hints`).toBeGreaterThan(0);
      expect(exercise.solution.trim().length, `${exercise.id} has no solution`).toBeGreaterThan(0);
    }
  });

  test('no exercise uses a function that hangs on the PostMessage channel', () => {
    const forbidden = /\b(readline|scan|menu|browser)\s*\(/;
    for (const exercise of ALL_EXERCISES) {
      const sources = [exercise.starterCode, exercise.setupCode ?? '', exercise.solution, exercise.check];
      for (const source of sources) {
        expect(forbidden.test(source), `${exercise.id} uses a blocking function`).toBe(false);
      }
    }
  });

  test('lookup by id works and unknown ids return undefined', () => {
    expect(getExercise(ALL_EXERCISES[0].id)).toBeDefined();
    expect(getExercise('no-such-exercise')).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/content/exercises/index.test.ts`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 4: Implement `src/content/exercises/index.ts`**

```ts
import type { ExerciseDef } from '../../r/checker';
import { module06 } from './module-06';

export const ALL_EXERCISES: ExerciseDef[] = [...module06];

const byId = new Map(ALL_EXERCISES.map((exercise) => [exercise.id, exercise]));

export function getExercise(id: string): ExerciseDef | undefined {
  return byId.get(id);
}
```

Create `src/content/exercises/module-06.ts` as an empty export for now; Task 15 fills it.

```ts
import type { ExerciseDef } from '../../r/checker';

export const module06: ExerciseDef[] = [];
```

- [ ] **Step 5: Implement `src/content/mdxComponents.tsx`**

```tsx
import CodeBlock from '../components/CodeBlock';
import Exercise from '../components/Exercise';
import Interpret from '../components/Interpret';
import Predict from '../components/Predict';
import Quiz from '../components/Quiz';
import Simulation from '../components/Simulation';

export const mdxComponents = {
  CodeBlock,
  Exercise,
  Interpret,
  Predict,
  Quiz,
  Simulation,
};
```

- [ ] **Step 6: Implement `src/pages/Lesson.tsx`**

```tsx
import { useEffect, useState, type ComponentType } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { RObject, WebR } from 'webr';
import { LessonProvider } from '../content/LessonContext';
import { findLesson, lessonNeighbours } from '../content/manifest';
import { mdxComponents } from '../content/mdxComponents';
import { createLessonEnv, destroyEnv } from '../r/environments';
import { fetchDataset, prepareSession } from '../r/session';
import { getWebR, setStatus } from '../r/webrClient';
import { touchLesson } from '../state/progress';

const lessonModules = import.meta.glob<{ default: ComponentType<{ components?: unknown }> }>(
  '../content/lessons/*.mdx',
);

export default function Lesson() {
  const { lessonId = '' } = useParams();
  const meta = findLesson(lessonId);

  const [Content, setContent] = useState<ComponentType<{ components?: unknown }> | null>(null);
  const [webR, setWebR] = useState<WebR | null>(null);
  const [env, setEnv] = useState<RObject | null>(null);

  useEffect(() => {
    if (!meta) return;
    const loader = lessonModules[`../content/lessons/${meta.file}.mdx`];
    if (!loader) return;
    let live = true;
    void loader().then((module) => {
      if (live) setContent(() => module.default);
    });
    touchLesson(meta.id);
    return () => {
      live = false;
    };
  }, [meta]);

  useEffect(() => {
    if (!meta) return;
    let live = true;
    let created: RObject | null = null;

    void (async () => {
      try {
        const instance = await getWebR();
        await prepareSession(instance, fetchDataset);
        const lessonEnv = await createLessonEnv(instance);
        if (!live) {
          await destroyEnv(lessonEnv);
          return;
        }
        created = lessonEnv;
        setWebR(instance);
        setEnv(lessonEnv);
        setStatus({ phase: 'ready' });
      } catch (err) {
        setStatus({ phase: 'error', detail: String(err) });
      }
    })();

    return () => {
      live = false;
      if (created) void destroyEnv(created);
    };
  }, [meta]);

  if (!meta) {
    return (
      <div>
        <h1>Lesson not found</h1>
        <p>
          <Link to="/">Back to the course overview</Link>
        </p>
      </div>
    );
  }

  const { previous, next } = lessonNeighbours(meta.id);

  return (
    <LessonProvider value={{ lessonId: meta.id, webR, env, ready: Boolean(webR && env) }}>
      <article className="lesson">
        <h1>{meta.title}</h1>
        {Content ? <Content components={mdxComponents} /> : <p>Loading lesson…</p>}
      </article>

      <nav className="lesson-nav">
        {previous && <Link to={`/lesson/${previous.id}`}>← {previous.title}</Link>}
        {next && (
          <Link to={`/lesson/${next.id}`} className="lesson-next">
            {next.title} →
          </Link>
        )}
      </nav>
    </LessonProvider>
  );
}
```

- [ ] **Step 7: Add lesson styles to `src/App.css`**

```css
.lesson h1 { margin-top: 0; }
.lesson h2 { margin-top: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
.lesson p { max-width: 42rem; }
.lesson blockquote { margin: 1.25rem 0; padding: 0.5rem 1rem; border-left: 4px solid #cbd5e1; color: #475569; background: #f8fafc; }
.lesson code { background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.9em; }
.lesson-nav { display: flex; justify-content: space-between; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; }
.lesson-nav .lesson-next { margin-left: auto; }
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/content/exercises/index.test.ts`
Expected: the uniqueness, forbidden-function, and lookup tests PASS; "at least one exercise is defined" FAILS until Task 15. Note it and move on.

- [ ] **Step 9: Commit**

```bash
git add src/content/exercises/ src/content/mdxComponents.tsx src/pages/Lesson.tsx src/r/session.ts src/App.css
git commit -m "feat: MDX lesson pipeline with per-lesson R session setup"
```

---

### Task 15: Datasets and Module 6 content

**Files:**
- Create: `scripts/generate-datasets.mjs`, `public/data/wellbeing-population.csv` (generated), `src/content/lessons/06-1-samples-vary.mdx`, `src/content/lessons/06-2-sampling-distribution.mdx`, `src/content/lessons/06-3-central-limit-theorem.mdx`
- Modify: `src/content/exercises/module-06.ts`
- Test: re-run `src/r/session.itest.ts` and `src/content/exercises/index.test.ts`

**Interfaces:**
- Consumes: `ExerciseDef` (Task 7), block components (Tasks 9–12)
- Produces: `module06: ExerciseDef[]` with ids `m6-1-a`, `m6-2-a`, `m6-3-a`; three lesson MDX files matching the `file` fields in the manifest

> **Dataset location:** CSVs live in `public/data/`, so Vite serves them at
> `/statlab/data/<name>.csv` and Node reads them from `public/data/<name>.csv`.
> This single location serves the browser, the tests, and the CI validator.

- [ ] **Step 1: Create `scripts/generate-datasets.mjs`**

```js
// Generates the course population dataset deterministically.
// Run once: `node scripts/generate-datasets.mjs`. The CSV is committed.
import { mkdir, writeFile } from 'node:fs/promises';

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20260914);

function normal(mu, sigma) {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const N = 5000;
const rows = ['id,programme,stress,sleep_hours,exam_score'];

for (let i = 1; i <= N; i += 1) {
  const programme = rng() < 0.5 ? 'Psychology' : 'Business';
  // Stress is skewed: most students low, a long tail of very stressed ones.
  const stress = Math.min(40, -12 * Math.log(Math.max(rng(), Number.EPSILON)));
  const sleep = Math.min(11, Math.max(3, normal(7.2 - stress * 0.03, 1.1)));
  const exam = Math.min(100, Math.max(0, normal(62 + sleep * 2.4 - stress * 0.45, 11)));
  rows.push(
    [i, programme, stress.toFixed(2), sleep.toFixed(2), exam.toFixed(1)].join(','),
  );
}

await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/wellbeing-population.csv', import.meta.url), `${rows.join('\n')}\n`);
console.log(`Wrote ${N} rows.`);
```

- [ ] **Step 2: Generate and inspect the dataset**

Run: `node scripts/generate-datasets.mjs`
Expected: `Wrote 5000 rows.` Confirm the header and a few rows look sane before committing.

- [ ] **Step 3: Fill in `src/content/exercises/module-06.ts`**

```ts
import type { ExerciseDef } from '../../r/checker';

export const module06: ExerciseDef[] = [
  {
    id: 'm6-1-a',
    prompt:
      'Draw a random sample of 25 students from the population and store their mean stress score in `sample_mean`.',
    starterCode:
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(1)\n\n# Take 25 stress scores at random and store their mean.\nsample_mean <- ',
    setupCode: 'set.seed(1)',
    solution:
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(1)\nsample_mean <- mean(sample(population$stress, 25))',
    wrongAnswers: [
      'population <- read.csv("data/wellbeing-population.csv")\nsample_mean <- mean(population$stress)',
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(1)\nsample_mean <- mean(sample(population$stress, 250))',
    ],
    check: `
      if (!exists("sample_mean", inherits = TRUE)) {
        list(pass = FALSE, message = "I could not find an object called sample_mean.")
      } else if (!is.numeric(sample_mean) || length(sample_mean) != 1L) {
        list(pass = FALSE, message = "sample_mean should be a single number.")
      } else {
        population <- read.csv("data/wellbeing-population.csv")
        mu <- mean(population$stress)
        se <- sd(population$stress) / sqrt(25)
        if (isTRUE(all.equal(sample_mean, mu, tolerance = 1e-6))) {
          list(pass = FALSE, message = "That is the mean of the whole population, not of a sample of 25.")
        } else if (abs(sample_mean - mu) > 4 * se) {
          list(pass = FALSE, message = "That is too far from the population mean to be a sample of 25. Check your sample size.")
        } else {
          list(pass = TRUE, message = paste0("Your sample mean is ", round(sample_mean, 2), ". The population mean is ", round(mu, 2), " - close, but not identical. That gap is sampling error."))
        }
      }
    `,
    hints: [
      'sample(x, 25) draws 25 values at random from the vector x.',
      'The stress column is population$stress.',
      'Combine them: mean(sample(population$stress, 25)).',
    ],
  },
  {
    id: 'm6-2-a',
    prompt:
      'Build a sampling distribution: take 1000 samples of size 10 from `population$stress`, and store the 1000 sample means in `means`.',
    starterCode:
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(42)\n\nmeans <- replicate(1000, )\n',
    setupCode: 'set.seed(42)',
    solution:
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(42)\nmeans <- replicate(1000, mean(sample(population$stress, 10)))',
    wrongAnswers: [
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(42)\nmeans <- replicate(1000, mean(sample(population$stress, 100)))',
      'population <- read.csv("data/wellbeing-population.csv")\nset.seed(42)\nmeans <- sample(population$stress, 1000)',
    ],
    check: `
      if (!exists("means", inherits = TRUE)) {
        list(pass = FALSE, message = "I could not find an object called means.")
      } else if (length(means) != 1000L) {
        list(pass = FALSE, message = paste0("means has ", length(means), " values, but you need 1000 sample means."))
      } else {
        population <- read.csv("data/wellbeing-population.csv")
        sigma <- sd(population$stress)
        expected_se <- sigma / sqrt(10)
        observed_se <- sd(means)
        if (abs(observed_se - sigma) < abs(observed_se - expected_se)) {
          list(pass = FALSE, message = "Your values vary as much as individual students do. Did you take means of samples, or just individual scores?")
        } else if (abs(observed_se - expected_se) > expected_se * 0.25) {
          list(pass = FALSE, message = paste0("The spread of your means is ", round(observed_se, 2), ", but for n = 10 it should be near ", round(expected_se, 2), ". Check your sample size."))
        } else {
          list(pass = TRUE, message = paste0("The standard deviation of your 1000 sample means is ", round(observed_se, 2), " - close to sigma/sqrt(n) = ", round(expected_se, 2), "."))
        }
      }
    `,
    hints: [
      'replicate(1000, expr) runs expr 1000 times and collects the results.',
      'The expression you want to repeat is one sample mean: mean(sample(population$stress, 10)).',
      'Put them together: replicate(1000, mean(sample(population$stress, 10))).',
    ],
  },
  {
    id: 'm6-3-a',
    prompt:
      'The population of stress scores is strongly skewed. Show that the sampling distribution is not: compute the standard error for samples of size 40 and store it in `se_40`, using the formula rather than simulation.',
    starterCode:
      'population <- read.csv("data/wellbeing-population.csv")\n\n# Standard error = population SD divided by the square root of n.\nse_40 <- ',
    solution:
      'population <- read.csv("data/wellbeing-population.csv")\nse_40 <- sd(population$stress) / sqrt(40)',
    wrongAnswers: [
      'population <- read.csv("data/wellbeing-population.csv")\nse_40 <- sd(population$stress)',
      'population <- read.csv("data/wellbeing-population.csv")\nse_40 <- sd(population$stress) / 40',
    ],
    check: `
      if (!exists("se_40", inherits = TRUE)) {
        list(pass = FALSE, message = "I could not find an object called se_40.")
      } else if (!is.numeric(se_40) || length(se_40) != 1L) {
        list(pass = FALSE, message = "se_40 should be a single number.")
      } else {
        population <- read.csv("data/wellbeing-population.csv")
        sigma <- sd(population$stress)
        expected <- sigma / sqrt(40)
        if (isTRUE(all.equal(se_40, expected, tolerance = 1e-6))) {
          list(pass = TRUE, message = paste0("Correct: ", round(expected, 3), ". Individual students vary by about ", round(sigma, 2), ", but sample means of 40 vary by only ", round(expected, 3), "."))
        } else if (isTRUE(all.equal(se_40, sigma, tolerance = 1e-6))) {
          list(pass = FALSE, message = "That is the standard deviation of individual scores. Divide it by the square root of n.")
        } else if (isTRUE(all.equal(se_40, sigma / 40, tolerance = 1e-6))) {
          list(pass = FALSE, message = "You divided by n. The standard error divides by the square root of n.")
        } else {
          list(pass = FALSE, message = paste0("se_40 is ", round(se_40, 3), " but should be ", round(expected, 3), "."))
        }
      }
    `,
    hints: [
      'The standard error of the mean is sigma / sqrt(n).',
      'sd(population$stress) gives sigma; sqrt(40) gives the denominator.',
    ],
  },
];
```

Each wrong answer is a real student mistake — using the whole population, using the wrong n, confusing the SD with the SE, dividing by n instead of √n — and each fails through the check rather than by erroring.

- [ ] **Step 4: Write `src/content/lessons/06-1-samples-vary.mdx`**

````mdx
Every study you will ever read is based on a sample. The researchers did not
measure everyone — they measured some people, and then said something about
everyone. This module is about why that works at all, and what it costs.

We have an unusual luxury here: a complete population of 5000 students, with
their stress scores, sleep, and exam results. In real research you never see
this. Because we can see it, we can watch exactly what happens when you take a
sample from it.

<CodeBlock id="load" code={`population <- read.csv("data/wellbeing-population.csv")

nrow(population)
head(population)`} />

## The population parameter

Because we have everyone, we can compute the true mean stress score. In real
research this number exists but is unknowable. Here it is:

<CodeBlock id="mu" code={`mean(population$stress)`} />

Statisticians call this a **parameter**: a number describing the population. We
write it μ ("mu"). Keep it in mind — everything that follows is about how close
we can get to it without measuring all 5000 people.

<Predict
  id="p-sample"
  question="If you take 25 students at random and compute their mean stress score, what do you expect?"
  choices={[
    { text: 'Exactly the population mean', response: 'Almost never. With only 25 of 5000 students, landing exactly on μ would be a coincidence.' },
    { text: 'Close to the population mean, but not exactly', correct: true, response: 'Yes. A random sample is representative on average, but any single sample is a little off.' },
    { text: 'Something unrelated to the population mean', response: 'Not unrelated — a random sample carries real information about the population. It is just imprecise.' },
  ]}
/>

## Taking a sample

`sample()` draws at random. `set.seed()` makes that randomness reproducible, so
you and your neighbour get the same "random" sample — essential when you want to
check your work.

<CodeBlock id="one-sample" code={`set.seed(1)
my_sample <- sample(population$stress, 25)

mean(my_sample)`} />

The difference between your sample mean and the population mean is called
**sampling error**. It is not a mistake. Nobody did anything wrong. It is the
unavoidable consequence of looking at some people instead of all of them.

> **Change the seed.** Edit `set.seed(1)` to `set.seed(2)`, then `set.seed(3)`,
> and run it again each time. Watch the mean move.

<Predict
  id="p-second"
  question="You just saw the sample mean change when you changed the seed. What does that tell you?"
  choices={[
    { text: 'One of the samples is wrong', response: 'Neither is wrong. Both are honest random samples; they simply contain different people.' },
    { text: 'The sample mean is itself a random quantity', correct: true, response: 'Exactly. This is the key idea of the whole module: the sample mean has a distribution of its own.' },
    { text: 'The population mean changed', response: 'The population never changed — we did not touch it. Only the 25 people we happened to pick changed.' },
  ]}
/>

## Your turn

<Exercise id="m6-1-a" />

<Quiz
  id="q-6-1"
  question="A researcher samples 30 people and finds a mean wellbeing score of 4.2. The true population mean is 4.0. What best describes the 0.2 difference?"
  choices={[
    { text: 'Bias in the sampling method', response: 'Bias means a systematic tendency to land on one side. A single random sample being off by a little is not evidence of bias.' },
    { text: 'Sampling error', correct: true, response: 'Right. Random samples differ from the population by chance alone, and that gap has a name: sampling error.' },
    { text: 'A measurement mistake', response: 'Nothing was measured incorrectly. The 30 people were measured perfectly — they were simply 30 particular people.' },
    { text: 'Proof the sample is too small', response: 'A gap of 0.2 does not by itself show the sample was too small. Every sample, of any size, shows some gap.' },
  ]}
/>
````

- [ ] **Step 5: Write `src/content/lessons/06-2-sampling-distribution.mdx`**

````mdx
In the last lesson you saw one sample mean, then another, then another. Each was
a little different. That raises an obvious question, and it is the question that
makes inferential statistics possible:

> If the sample mean is random, **what is it random according to**?

The answer is that sample means have their own distribution, called the
**sampling distribution of the mean**. It is not the distribution of people. It
is the distribution of a summary of people.

## Building one by brute force

We can build it directly: take a sample, record its mean, and repeat a thousand
times. `replicate()` does the repeating.

<CodeBlock id="build" code={`population <- read.csv("data/wellbeing-population.csv")
set.seed(42)

means <- replicate(1000, mean(sample(population$stress, 10)))

length(means)
head(round(means, 2))`} />

Now compare the two distributions — individual students, and means of ten
students.

<CodeBlock id="compare" code={`par(mfrow = c(2, 1))

hist(population$stress, breaks = 40,
     main = "Individual students", xlab = "Stress score")

hist(means, breaks = 40,
     main = "Means of 10 students", xlab = "Sample mean stress")`} />

<Predict
  id="p-spread"
  question="Before you look closely: which histogram is more spread out?"
  choices={[
    { text: 'The individual students', correct: true, response: 'Correct. Averaging cancels out extremes: to get an extreme mean, you need a whole sample of extreme people, which is rare.' },
    { text: 'The sample means', response: 'Look again at the horizontal axes. Means cluster far more tightly than individuals do.' },
    { text: 'They are equally spread', response: 'Check the axis ranges. The means occupy a much narrower interval.' },
  ]}
/>

## Quantifying the shrinkage

The standard deviation of the sampling distribution has its own name: the
**standard error**. It measures how much sample means bounce around, and it is
what every confidence interval and every *t*-test is built from.

<CodeBlock id="se" code={`sd(population$stress)   # how much individual students vary
sd(means)               # how much means of 10 vary

sd(population$stress) / sqrt(10)   # the formula`} />

The third line should land very close to the second. That is not a coincidence:

**Standard error = σ / √n**

<Exercise id="m6-2-a" />

## See it move

Drag the sample size and watch the lower histogram tighten. Switch populations
to see that the shrinkage happens whatever shape you start from.

<Simulation name="clt" />

<Quiz
  id="q-6-2"
  question="You quadruple your sample size from 25 to 100. What happens to the standard error?"
  choices={[
    { text: 'It is quartered', response: 'That would be true if we divided by n. We divide by √n, so quadrupling n halves the standard error.' },
    { text: 'It is halved', correct: true, response: 'Right: √100 / √25 = 2, so the standard error is halved. Precision is expensive — four times the data buys twice the precision.' },
    { text: 'It is unchanged', response: 'Sample size is in the formula: σ/√n. Changing n must change the standard error.' },
    { text: 'It doubles', response: 'More data makes estimates more precise, not less. The standard error goes down.' },
  ]}
/>
````

- [ ] **Step 6: Write `src/content/lessons/06-3-central-limit-theorem.mdx`**

````mdx
Look again at the stress scores. That population is severely skewed — most
students report low stress, and a long tail report a great deal of it. Nothing
about it is bell-shaped.

<CodeBlock id="skew" code={`population <- read.csv("data/wellbeing-population.csv")

hist(population$stress, breaks = 40,
     main = "Stress in the population", xlab = "Stress score")`} />

<Predict
  id="p-clt"
  question="If the population is skewed like this, what shape will the sampling distribution of the mean have for n = 40?"
  choices={[
    { text: 'Skewed, like the population', response: 'This is the intuition almost everyone has, and it is wrong. Run the next block and see.' },
    { text: 'Approximately normal', correct: true, response: 'Yes — and this is the single most useful fact in introductory statistics. The next block shows it.' },
    { text: 'Impossible to say without knowing the population shape', response: 'Remarkably, you can say. That is exactly what the Central Limit Theorem guarantees.' },
  ]}
/>

<CodeBlock id="clt" code={`set.seed(7)
means_40 <- replicate(2000, mean(sample(population$stress, 40)))

hist(means_40, breaks = 40,
     main = "Means of 40 students", xlab = "Sample mean stress")`} />

## The Central Limit Theorem

> As the sample size grows, the sampling distribution of the mean approaches a
> normal distribution — **whatever the shape of the population**.

Three things are worth stating precisely, because students routinely mix them up:

1. It is the **sampling distribution** that becomes normal, not the population
   and not your sample. Your data can stay as skewed as it likes.
2. It centres on **μ**, the population mean.
3. Its spread is **σ/√n**, the standard error.

For roughly symmetric populations, n around 15 is plenty. For strongly skewed
ones like this, n of 40 or so is a common rule of thumb.

Use the simulation to test that claim yourself: choose **Two peaks**, set n to 2,
and then raise it. The population never becomes normal. The sampling
distribution does.

<Simulation name="clt" />

<Exercise id="m6-3-a" />

## Why this matters

Everything from here on depends on it. A *t*-test, a confidence interval, a
regression coefficient's *p*-value — each assumes you know how a sample estimate
behaves across repeated samples. The Central Limit Theorem is what lets you
claim that, from a single sample, without ever repeating the study.

<Interpret
  id="i-6-3"
  question="A colleague writes: 'Our reaction-time data are heavily skewed, so we cannot use a t-test.' With n = 120 per group, how should you respond?"
  choices={[
    { text: 'They are right — skewed data rule out a t-test.', response: 'The t-test assumes the sampling distribution of the mean is approximately normal, not that the raw data are. Those are different claims.' },
    { text: 'The t-test assumes the sampling distribution of the mean is approximately normal. With n = 120 per group, the Central Limit Theorem makes that reasonable despite the skew.', correct: true, response: 'Exactly right, and precisely stated. Skew in the raw data matters most at small n; at 120 per group it is rarely disqualifying.' },
    { text: 'They should transform the data first, because normality of the raw scores is required.', response: 'A transformation is sometimes useful for other reasons, but normality of raw scores is not what the test requires.' },
    { text: 'It does not matter, because t-tests make no assumptions.', response: 'They certainly make assumptions — about the sampling distribution, about independence, and about variances. The point is which assumption applies here.' },
  ]}
/>

<Quiz
  id="q-6-3"
  question="Which statement about the Central Limit Theorem is correct?"
  choices={[
    { text: 'It says large samples are normally distributed.', response: 'It says nothing about your sample. A large sample from a skewed population is still skewed.' },
    { text: 'It says the sampling distribution of the mean becomes approximately normal as n grows.', correct: true, response: 'Correct — the claim is about the distribution of the mean across repeated samples.' },
    { text: 'It says the population becomes normal with enough data.', response: 'Collecting data does not change the population. The population is whatever it is.' },
    { text: 'It only applies when the population is already normal.', response: 'The opposite: its power is precisely that it holds regardless of the population shape.' },
  ]}
/>
````

- [ ] **Step 7: Run the content tests to verify they now pass**

Run: `npx vitest run src/content/exercises/index.test.ts src/r/session.itest.ts`
Expected: PASS. The `read.csv` test from Task 5 now finds the CSV and reports 5000 rows.

- [ ] **Step 8: Verify the lessons render in the browser**

Run: `npm run dev`, then open `http://localhost:5173/statlab/lesson/06-1`.
Expected: prose renders, R boots, the code blocks run and plot, the CLT simulation responds to the slider.

- [ ] **Step 9: Commit**

```bash
git add scripts/generate-datasets.mjs public/data/ src/content/lessons/ src/content/exercises/module-06.ts
git commit -m "feat: Module 6 lessons, exercises, and the course population dataset"
```

---

### Task 16: Playground and the test chooser

**Files:**
- Create (replacing the Task 13 placeholders): `src/pages/Playground.tsx`, `src/pages/TestChooser.tsx`
- Test: `src/pages/TestChooser.test.tsx`

**Interfaces:**
- Consumes: `LessonProvider` (Task 9), `CodeBlock` (Task 9), `getWebR`/`prepareSession` (Tasks 2, 14), manifest (Task 13)
- Produces: `<Playground />` at `/playground`, `<TestChooser />` at `/which-test`

- [ ] **Step 1: Implement `src/pages/Playground.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { RObject, WebR } from 'webr';
import CodeBlock from '../components/CodeBlock';
import { LessonProvider } from '../content/LessonContext';
import { createLessonEnv, destroyEnv } from '../r/environments';
import { fetchDataset, prepareSession } from '../r/session';
import { getWebR, setStatus } from '../r/webrClient';

export default function Playground() {
  const [webR, setWebR] = useState<WebR | null>(null);
  const [env, setEnv] = useState<RObject | null>(null);

  useEffect(() => {
    let live = true;
    let created: RObject | null = null;

    void (async () => {
      try {
        const instance = await getWebR();
        await prepareSession(instance, fetchDataset);
        const playgroundEnv = await createLessonEnv(instance);
        if (!live) {
          await destroyEnv(playgroundEnv);
          return;
        }
        created = playgroundEnv;
        setWebR(instance);
        setEnv(playgroundEnv);
        setStatus({ phase: 'ready' });
      } catch (err) {
        setStatus({ phase: 'error', detail: String(err) });
      }
    })();

    return () => {
      live = false;
      if (created) void destroyEnv(created);
    };
  }, []);

  return (
    <LessonProvider value={{ lessonId: 'playground', webR, env, ready: Boolean(webR && env) }}>
      <h1>R playground</h1>
      <p>
        A scratch space with the course datasets already loaded. Nothing here is marked or saved
        beyond this browser.
      </p>
      <CodeBlock
        id="playground"
        code={`population <- read.csv("data/wellbeing-population.csv")

summary(population)`}
      />
    </LessonProvider>
  );
}
```

- [ ] **Step 2: Write the failing test**

Create `src/pages/TestChooser.test.tsx`.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import TestChooser from './TestChooser';

function renderChooser() {
  return render(
    <MemoryRouter>
      <TestChooser />
    </MemoryRouter>,
  );
}

describe('TestChooser', () => {
  test('starts by asking about the outcome variable', () => {
    renderChooser();
    expect(screen.getByText(/what kind of outcome/i)).toBeDefined();
  });

  test('walking the numeric branch reaches a named test', async () => {
    renderChooser();
    await userEvent.click(screen.getByRole('button', { name: /a number/i }));
    await userEvent.click(screen.getByRole('button', { name: /two groups/i }));
    await userEvent.click(screen.getByRole('button', { name: /different people/i }));
    expect(screen.getByText(/independent-samples t-test/i)).toBeDefined();
  });

  test('the categorical branch reaches the chi-square test', async () => {
    renderChooser();
    await userEvent.click(screen.getByRole('button', { name: /a category/i }));
    await userEvent.click(screen.getByRole('button', { name: /two variables/i }));
    expect(screen.getByText(/chi-square test of independence/i)).toBeDefined();
  });

  test('can be restarted', async () => {
    renderChooser();
    await userEvent.click(screen.getByRole('button', { name: /a category/i }));
    await userEvent.click(screen.getByRole('button', { name: /start over/i }));
    expect(screen.getByText(/what kind of outcome/i)).toBeDefined();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/pages/TestChooser.test.tsx`
Expected: FAIL — the placeholder has none of this.

- [ ] **Step 4: Implement `src/pages/TestChooser.tsx`**

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';

type Node =
  | { kind: 'question'; text: string; options: { label: string; next: Node }[] }
  | { kind: 'answer'; test: string; rFunction: string; note: string; lessonId?: string };

const TREE: Node = {
  kind: 'question',
  text: 'What kind of outcome are you analysing?',
  options: [
    {
      label: 'A number (score, time, rating)',
      next: {
        kind: 'question',
        text: 'How many groups or measurements are you comparing?',
        options: [
          {
            label: 'One group against a known value',
            next: {
              kind: 'answer',
              test: 'One-sample t-test',
              rFunction: 't.test(x, mu = 0)',
              note: 'Compares your sample mean against a value you specify.',
            },
          },
          {
            label: 'Two groups',
            next: {
              kind: 'question',
              text: 'Are the two sets of scores from the same people or different people?',
              options: [
                {
                  label: 'Different people',
                  next: {
                    kind: 'answer',
                    test: 'Independent-samples t-test',
                    rFunction: 't.test(outcome ~ group, data = d)',
                    note: 'Each person contributes one score to one group.',
                  },
                },
                {
                  label: 'The same people, twice',
                  next: {
                    kind: 'answer',
                    test: 'Paired-samples t-test',
                    rFunction: 't.test(before, after, paired = TRUE)',
                    note: 'Each person contributes two scores, so the scores are linked.',
                  },
                },
              ],
            },
          },
          {
            label: 'Three or more groups',
            next: {
              kind: 'answer',
              test: 'One-way ANOVA',
              rFunction: 'aov(outcome ~ group, data = d)',
              note: 'Follow a significant result with a post-hoc test such as TukeyHSD().',
            },
          },
          {
            label: 'No groups — two numbers per person',
            next: {
              kind: 'answer',
              test: 'Correlation or simple regression',
              rFunction: 'cor.test(x, y)  /  lm(y ~ x, data = d)',
              note: 'Use correlation to describe strength, regression to predict one from the other.',
            },
          },
        ],
      },
    },
    {
      label: 'A category (yes/no, choice, group membership)',
      next: {
        kind: 'question',
        text: 'How many categorical variables are involved?',
        options: [
          {
            label: 'One variable',
            next: {
              kind: 'answer',
              test: 'Chi-square goodness-of-fit test',
              rFunction: 'chisq.test(table(x))',
              note: 'Compares observed frequencies against expected proportions.',
            },
          },
          {
            label: 'Two variables',
            next: {
              kind: 'answer',
              test: 'Chi-square test of independence',
              rFunction: 'chisq.test(table(x, y))',
              note: 'Asks whether the two categorical variables are related.',
            },
          },
        ],
      },
    },
  ],
};

export default function TestChooser() {
  const [node, setNode] = useState<Node>(TREE);
  const [trail, setTrail] = useState<string[]>([]);

  function choose(label: string, next: Node) {
    setTrail((current) => [...current, label]);
    setNode(next);
  }

  function restart() {
    setTrail([]);
    setNode(TREE);
  }

  return (
    <div className="test-chooser">
      <h1>Which test should I use?</h1>
      <p>
        Work down from your research question. This is the same chain every lesson uses: question →
        assumptions → choice of test → computation → interpretation → report.
      </p>

      {trail.length > 0 && (
        <p className="test-chooser-trail">
          {trail.join(' → ')}{' '}
          <button type="button" onClick={restart} className="link-button">
            Start over
          </button>
        </p>
      )}

      {node.kind === 'question' ? (
        <>
          <h2>{node.text}</h2>
          <ul className="test-chooser-options">
            {node.options.map((option) => (
              <li key={option.label}>
                <button type="button" onClick={() => choose(option.label, option.next)}>
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="test-chooser-answer">
          <h2>{node.test}</h2>
          <pre>
            <code>{node.rFunction}</code>
          </pre>
          <p>{node.note}</p>
          {node.lessonId && <Link to={`/lesson/${node.lessonId}`}>Go to the lesson</Link>}
          <p>
            <button type="button" onClick={restart} className="link-button">
              Start over
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
```

As later modules land, set `lessonId` on the answers they teach so each leaf links to its lesson.

- [ ] **Step 5: Add styles to `src/App.css`**

```css
.test-chooser-options { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; max-width: 34rem; }
.test-chooser-options button { width: 100%; text-align: left; padding: 0.6rem 0.9rem; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; font-size: 0.98rem; }
.test-chooser-options button:hover { border-color: #1d4ed8; background: #eff6ff; }
.test-chooser-trail { color: #475569; font-size: 0.9rem; }
.test-chooser-answer { border: 2px solid #0d9488; border-radius: 8px; padding: 1rem; max-width: 34rem; }
.test-chooser-answer pre { background: #0f172a; color: #e2e8f0; padding: 0.6rem 0.8rem; border-radius: 6px; overflow-x: auto; }
.link-button { border: none; background: none; color: #1d4ed8; text-decoration: underline; cursor: pointer; padding: 0; font-size: inherit; }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/pages/TestChooser.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Playground.tsx src/pages/TestChooser.tsx src/pages/TestChooser.test.tsx src/App.css
git commit -m "feat: R playground and the which-test decision tree"
```

---

### Task 17: Content validation

**Files:**
- Create: `src/content/content.test.ts`, `src/content/exercises/validate.itest.ts`
- Modify: `package.json` (add the `validate` script)

**Interfaces:**
- Consumes: `ALL_EXERCISES` (Task 14), `SIMULATION_NAMES` (Task 12), `runExercise` (Task 7), manifest (Task 13)
- Produces: two test suites that block deployment when content is broken

> **Deviation from the spec, and why.** The spec named a standalone
> `scripts/validate-content.mjs`. Running it would need a separate TypeScript
> loader, because the exercise definitions are `.ts`. Writing the validator as
> two Vitest files instead reuses the existing toolchain, the Vite config, and
> the test reporter for free — and it is the same checks against the same data.
> The `npm run validate` script still exists as the single CI entry point.

- [ ] **Step 1: Write the static content test**

Create `src/content/content.test.ts`.

```ts
import { describe, expect, test } from 'vitest';
import { ALL_LESSONS } from './manifest';
import { getExercise } from './exercises';
import { SIMULATION_NAMES } from '../sims/registry';

const compiled = import.meta.glob('./lessons/*.mdx', { eager: true });
const sources = import.meta.glob('./lessons/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('lesson content', () => {
  test('every lesson in the manifest has a file', () => {
    for (const lesson of ALL_LESSONS) {
      expect(sources[`./lessons/${lesson.file}.mdx`], `missing file for ${lesson.id}`).toBeDefined();
    }
  });

  test('every lesson file compiles to a component', () => {
    for (const [path, module] of Object.entries(compiled)) {
      expect(typeof (module as { default: unknown }).default, `${path} did not compile`).toBe('function');
    }
  });

  test('every referenced simulation is registered', () => {
    for (const [path, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/<Simulation\s+name="([^"]+)"/g)) {
        expect(SIMULATION_NAMES, `${path} references simulation "${match[1]}"`).toContain(match[1]);
      }
    }
  });

  test('every referenced exercise is defined', () => {
    for (const [path, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/<Exercise\s+id="([^"]+)"/g)) {
        expect(getExercise(match[1]), `${path} references exercise "${match[1]}"`).toBeDefined();
      }
    }
  });

  test('no lesson uses a function that hangs on the PostMessage channel', () => {
    const forbidden = /\b(readline|scan|menu|browser)\s*\(/;
    for (const [path, source] of Object.entries(sources)) {
      expect(forbidden.test(source), `${path} uses a blocking function`).toBe(false);
    }
  });

  test('every dataset referenced in a lesson exists in the mount list', async () => {
    const { DATASET_FILES } = await import('../r/session');
    for (const [path, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/data\/([\w-]+\.csv)/g)) {
        expect(DATASET_FILES as readonly string[], `${path} reads ${match[1]}`).toContain(match[1]);
      }
    }
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/content/content.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 3: Write the R validation suite**

Create `src/content/exercises/validate.itest.ts`. This is the check the whole grading system rests on.

```ts
// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { WebR } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ALL_EXERCISES } from './index';
import { runExercise } from '../../r/checker';
import { createLessonEnv, destroyEnv } from '../../r/environments';
import { mountDatasets } from '../../r/session';

let webR: WebR;

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
  await mountDatasets(webR, async (name) =>
    new Uint8Array(await readFile(new URL(`../../../public/data/${name}`, import.meta.url))),
  );
}, 300_000);

afterAll(async () => {
  await webR.close();
});

async function attempt(exerciseId: string, code: string) {
  const exercise = ALL_EXERCISES.find((candidate) => candidate.id === exerciseId)!;
  const env = await createLessonEnv(webR);
  try {
    // Graphics stay off: webr::canvas() needs OffscreenCanvas, absent in Node.
    return await runExercise(webR, exercise, code, env, false);
  } finally {
    await destroyEnv(env);
  }
}

describe.each(ALL_EXERCISES.map((exercise) => [exercise.id, exercise] as const))(
  'exercise %s',
  (id, exercise) => {
    test('the reference solution passes its own check', async () => {
      const outcome = await attempt(id, exercise.solution);
      expect(outcome.status, `${id}: ${outcome.message}`).toBe('pass');
    }, 120_000);

    test.each(exercise.wrongAnswers.map((code, index) => [index, code] as const))(
      'wrong answer %i is rejected by the check, not by an error',
      async (_index, code) => {
        const outcome = await attempt(id, code);
        // 'student-error' would mean the code merely failed to run, which
        // proves nothing about whether the check can discriminate.
        expect(outcome.status, `${id}: expected a check rejection, got ${outcome.status}`).toBe('fail');
      },
      120_000,
    );
  },
);
```

- [ ] **Step 4: Run it**

Run: `npx vitest run src/content/exercises/validate.itest.ts`
Expected: PASS. Every solution passes and every wrong answer is rejected with status `fail`.

- [ ] **Step 5: Prove the validator actually catches a broken check**

This step verifies the safety net itself. Temporarily edit the `check` of `m6-1-a` to `list(pass = TRUE, message = "ok")` and re-run.

Run: `npx vitest run src/content/exercises/validate.itest.ts`
Expected: FAIL on both of `m6-1-a`'s wrong answers. **Revert the edit** and confirm the suite passes again. Do not commit the temporary edit.

- [ ] **Step 6: Add the `validate` script to `package.json`**

```json
"validate": "vitest run src/content/content.test.ts src/content/exercises/validate.itest.ts"
```

- [ ] **Step 7: Commit**

```bash
git add src/content/content.test.ts src/content/exercises/validate.itest.ts package.json
git commit -m "test: validate lesson content and exercise checks against real R"
```

---

### Task 18: Continuous integration and deployment

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `.github/workflows/deploy.yml`
- Test: the smoke test itself

**Interfaces:**
- Consumes: the built site
- Produces: a green pipeline that deploys to GitHub Pages

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // webR downloads R the first time, so allow a generous budget.
  timeout: 180_000,
  expect: { timeout: 120_000 },
  use: { baseURL: 'http://localhost:4173/statlab/' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173/statlab/',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
```

- [ ] **Step 2: Write the smoke test**

Create `e2e/smoke.spec.ts`. This is the only test that exercises the real browser path — base path, worker loading, and webR boot — which no unit test can reach.

```ts
import { expect, test } from '@playwright/test';

test('the app loads, R boots, and code runs', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'StatLab' })).toBeVisible();

  await page.getByRole('link', { name: 'R playground' }).click();
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });

  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.locator('.output-console')).toContainText('stress', { timeout: 120_000 });
});

test('a lesson renders its simulation and responds to the slider', async ({ page }) => {
  await page.goto('./lesson/06-2');
  await expect(page.getByRole('heading', { name: 'The sampling distribution' })).toBeVisible();

  const slider = page.getByRole('slider');
  await expect(slider).toBeVisible();
  await slider.fill('60');
  await expect(page.getByText('Sample size (n) =')).toContainText('60');
});
```

- [ ] **Step 3: Run the smoke test**

Run: `npx playwright install --with-deps chromium && npx playwright test`
Expected: PASS, 2 tests. The first run is slow because it builds the site and downloads R.

- [ ] **Step 4: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Type check
        run: npx tsc --noEmit
      - name: Unit tests
        run: npx vitest run
      - name: Validate content against real R
        run: npm run validate

  build:
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Add SPA fallback for client-side routes
        # GitHub Pages serves 404.html for unknown paths. Making it a copy of
        # index.html keeps the URL intact so React Router can handle the route.
        run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`npx vitest run` in the verify job runs the integration suites too, which is intended: they are the only tests that exercise real R.

- [ ] **Step 5: Enable Pages and push**

In the repository settings, set Pages → Build and deployment → Source to **GitHub Actions**. Note that Pages serves from a private repository only on a paid plan; making the repository public is a separate, deliberate step.

```bash
git add playwright.config.ts e2e/ .github/workflows/deploy.yml
git commit -m "ci: verify content and deploy to GitHub Pages"
git push
```

- [ ] **Step 6: Verify the deployed site**

Open `https://peterslijkhuis.github.io/statlab/` (once the repository is public and the workflow is green). Confirm a lesson URL such as `/statlab/lesson/06-3` loads directly on refresh — this proves the 404.html fallback works.

---

## Self-Review

Run against the spec after completing the plan.

**Spec coverage**

| Spec section | Covered by |
|---|---|
| §2.1 Stack | Task 1 |
| §2.2 Layers | File Structure; Tasks 2–16 |
| §2.3 Deployment and base path | Tasks 1, 18 |
| §3.1 Version pinning | Task 2 |
| §3.2 Channel limits, forbidden functions | Global Constraints; Tasks 14, 17 |
| §3.3 Evaluation options | Task 3 |
| §3.4 Environments | Task 4 |
| §3.5 Lifecycle, failure, recovery | Tasks 2, 5, 13, 14 |
| §4.1 Block types | Tasks 9, 10, 11, 12 |
| §4.2 Pedagogical spine, test chooser | Tasks 15, 16 |
| §5 Exercise checking | Tasks 7, 11 |
| §6 Simulations (`clt`) | Task 12 |
| §7 Curriculum (Module 6) | Tasks 13, 15 |
| §8.1 Content validation | Task 17 |
| §8.2 Static content checks | Task 17 |
| §8.3 Unit and smoke tests | Tasks 6, 7, 8, 9, 10, 11, 12, 16, 18 |
| §9 Progress and state | Tasks 6, 13 |
| §10 Scope | Whole plan |

**Deviations from the spec, both deliberate**

1. **Validator implemented as Vitest files rather than `scripts/validate-content.mjs`** (Task 17). Reuses the existing TypeScript toolchain instead of adding a loader; identical checks, and `npm run validate` remains the CI entry point.
2. **Datasets live in `public/data/` rather than `src/content/datasets/`.** Vite serves `public/` directly, so one location works for the browser, the Node tests, and the validator. The File Structure section reflects this.
3. **"Restart R" reloads the page** instead of respawning the worker in place (Task 13). Respawning alone would leave a dead lesson environment and a memoised session promise behind, so packages would never reinstall into the new worker. Spec §3.5's offer to re-run the lesson's earlier code blocks is deferred with it; drafts survive in localStorage, so nothing a student wrote is lost.

**Remaining scope note**

The five simulations other than `clt` (§6) and Modules 1–5 and 7–12 (§7) are out of scope here by the spec's own §10, and become content work against the interfaces this plan freezes.

