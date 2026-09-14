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
├── scripts/
│   ├── generate-datasets.mjs         seeded CSV generation, run once
│   └── validate-content.mjs          runs real R: solutions pass, wrong answers fail
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
    │   ├── lessons/*.mdx             lesson prose
    │   └── datasets/*.csv            generated, committed
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
    new Uint8Array(await readFile(new URL(`../content/datasets/${name}`, import.meta.url))),
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
