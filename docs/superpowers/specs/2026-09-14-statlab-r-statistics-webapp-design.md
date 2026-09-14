# StatLab — Design Specification

**Date:** 2026-09-14
**Status:** Approved design, ready for implementation planning

## 1. Purpose

StatLab is a browser-based learning environment that teaches introductory
statistics and R to university psychology and business students.

Three commitments shape every decision below:

1. **Immediate feedback.** Students change something and see the consequence at
   once — edit R code and get output and plots, drag a slider and watch a
   distribution reshape.
2. **Theory, not recipes.** Each lesson teaches why a procedure works, not only
   which function to call.
3. **Explicit thought process.** Students commit to a prediction before seeing a
   result, and practise the full reasoning chain from research question to
   reported conclusion.

The application is a static site. It has no backend, no user accounts, and no
running costs. Students need a URL and a modern browser.

## 2. Architecture

### 2.1 Stack

- **Vite + React + TypeScript** — single-page application.
- **MDX** (`@mdx-js/rollup`) — lesson prose with embedded interactive
  components. Adding a lesson means adding a file.
- **webR v0.6.0** — R 4.6.0 compiled to WebAssembly, running in a web worker.
- **CodeMirror 6** — code editor with R syntax highlighting.
- **GitHub Pages** — hosting, deployed by GitHub Actions.

No state management library, no CSS framework, no component library. The
application is small enough that React state, CSS modules, and hand-written
components are less code than the configuration those dependencies require.

### 2.2 Layers

    src/
      r/            webR runtime: client, evaluation, environments, packages, datasets
      content/      MDX lessons, exercise definitions, course manifest, datasets
      components/   CodeBlock, Exercise, Quiz, Predict, Interpret, OutputPane
      sims/         Six simulation components and their registry
      state/        Progress store
      pages/        Home, Lesson, Playground, TestChooser
    scripts/
      validate-content.mjs    CI content validation under Node

Each layer depends only on those above it in the list. Components call into
`src/r/`; content never does.

### 2.3 Deployment and base path

The repository is `PeterSlijkhuis/statlab`, so the site is served from the
GitHub project page at:

    https://peterslijkhuis.github.io/statlab/

Vite must therefore be configured with `base: '/statlab/'` and the router given
a matching basename of `/statlab`. Omitting either produces a blank page on
first deploy — the most common failure mode for this hosting setup, and the
reason it is stated here.

The repository starts **private**. GitHub Pages serves from a private repository
only on a paid plan, so publishing to students means making the repository
public — a deliberate, separate step once the course material is ready.

The application is named **StatLab**. University of Twente affiliation appears
in the site header and README rather than in the name, so the material stays
reusable if other programmes adopt it.

A GitHub Actions workflow runs on push to `main`: validate content, run tests,
build, deploy to Pages. A failing content validation blocks deployment.

## 3. The R runtime

### 3.1 Version pinning

webR is loaded from the official CDN at an **explicitly pinned version**:

    https://webr.r-wasm.org/v0.6.0/

`latest` is never used. A cohort works through this material over a semester,
and an upstream release must not change behaviour mid-course. Upgrading is a
deliberate, tested commit.

The base URL is a single exported constant. Self-hosting the release assets
instead — should CDN availability ever become a concern — is then a one-line
change plus a vendored directory.

### 3.2 Communication channel and its limits

GitHub Pages cannot set the `Cross-Origin-Opener-Policy` and
`Cross-Origin-Embedder-Policy` headers that webR's `SharedArrayBuffer` channel
requires. webR therefore falls back to its **PostMessage** channel. This is
fully supported, with documented limitations:

- **Running R code cannot be interrupted.** Mitigated by a *Restart R* control
  that terminates and respawns the worker (§3.5).
- **Functions requiring console input do not work:** `readline()`, `scan()`,
  `menu()`, and `browser()` hang rather than error.

No lesson content may use those four functions. CI enforces this by scanning all
R source in content (§8.2).

### 3.3 Evaluation

All evaluation goes through one wrapper around webR's `captureR`, with these
options — verified against the webR v0.6.0 API:

| Option | Value | Why |
|---|---|---|
| `withAutoprint` | `true` | **Defaults to `false`.** Without it a bare `x` prints nothing and a ggplot object never renders. |
| `throwJsException` | `false` | R errors are returned as captured output, not thrown as JS exceptions, so they can be shown in the output pane as R errors. |
| `captureStreams` | `true` | stdout and stderr. |
| `captureConditions` | `true` | Warnings and messages, shown distinctly from errors. |
| `captureGraphics` | `{ width, height }` | Sized to the output pane, accounting for device pixel ratio. |
| `env` | the lesson environment | Per-lesson isolation (§3.4). |

`captureR` returns `{ result, output, images }`. `output` is an array of
`{ type, data }` where type is one of `stdout`, `stderr`, `message`, `warning`,
`error`. `images` is an array of `ImageBitmap`, drawn to a canvas with
`drawImage()`.

Every call is wrapped in a webR `Shelter` and released in a `finally` block.
Leaking shelters exhausts WebAssembly memory over a long lesson.

### 3.4 Environments

Each lesson gets one R environment, created on mount as
`new.env(parent = globalenv())`. Consequences, both intended:

- Objects created in one code block are visible to later blocks in the same
  lesson — the notebook behaviour students expect.
- Lessons cannot contaminate each other. Loaded packages, which attach to the
  search path rather than an environment, remain shared, which is correct.

Exercises are different: **every run creates a fresh environment whose parent is
the lesson environment**, discarded afterwards. Data and objects from the
lesson's code blocks therefore remain visible, but nothing a student defined in
a previous *attempt* survives — so a stale object from an earlier try cannot make
a wrong answer appear to pass. Exercises involving randomness call `set.seed()`
in their setup code.

### 3.5 Lifecycle, failure, and recovery

- **Boot.** webR initialises on first app load, in the background, with a
  progress indicator. Theory prose, predictions, and quizzes are readable and
  usable before R is ready; only code blocks and exercises wait.
- **Packages.** `dplyr` and `ggplot2` are installed from the webR binary
  repository immediately after boot, in the background. Code blocks needing them
  wait on that promise. The browser caches the downloads.
- **Datasets.** Course CSVs are fetched and written into webR's virtual file
  system at boot, so `read.csv("data/stress.csv")` works as in any R session.
- **Boot failure** (unsupported browser, offline, CDN unreachable) shows a clear
  message stating requirements, with a retry control. The rest of the lesson
  remains usable.
- **Runaway code.** Because the PostMessage channel cannot interrupt, a *Restart
  R* control terminates the worker, respawns it, reinstalls packages and
  datasets, and offers to re-run the lesson's earlier code blocks in order.

## 4. Lesson experience

### 4.1 Block types

A lesson is an MDX file: prose interleaved with these components.

**`<Predict>`** — A multiple-choice question placed *before* the code or
simulation that answers it. The student must commit before the result is
revealed, and then sees why their answer was right or wrong. This is the
primary vehicle for teaching thought process: it converts passive reading into a
hypothesis the student has staked something on.

**`<CodeBlock>`** — An editable editor with starter code, a Run control, and an
output pane showing console output, warnings, errors, and plots. Edits are saved
to localStorage per block, with a Reset control. Prose around each block invites
a specific modification ("change `n = 10` to `n = 1000` and run it again").

**`<Exercise>`** — A task with starter code, automatically checked (§5).

**`<Quiz>`** — Conceptual multiple choice with an explanation after answering.

**`<Simulation name="..." />`** — One of the six interactive simulations (§6).

**`<Interpret>`** — Closes every inferential lesson. Given output, the student
selects the correct interpretation and the correct APA-style reported sentence
from plausible alternatives, with distractors drawn from the standard
misinterpretations. Free-text grading is out of scope.

### 4.2 Pedagogical spine

Every inferential lesson follows the same six-step chain, named explicitly so
students internalise the sequence rather than memorising commands:

**Question → Assumptions → Choice of test → Computation → Interpretation → Report**

A standalone **"Which test should I use?"** page presents this as a navigable
decision tree (outcome type, number of groups, independence, distribution) and
links each leaf to the lesson that teaches it. It is reachable from anywhere and
is the reference students will actually use during their own thesis work.

## 5. Exercise checking

### 5.1 Contract

An exercise is defined in a TypeScript file beside the lesson, not inside MDX:

```ts
{
  id: 'm6-e2',
  prompt: string,
  starterCode: string,
  setupCode?: string,      // runs before student code (seeds, data)
  solution: string,        // a correct answer
  wrongAnswers: string[],  // plausible incorrect answers that MUST fail
  check: string,           // R snippet returning list(pass=, message=)
  hints: string[],
}
```

Keeping these in TypeScript rather than MDX props means the CI validator simply
imports them, with no MDX parsing.

The `check` snippet runs in a child of the environment the student's code ran in,
so it can inspect their objects. It returns `list(pass = <logical>, message = <character>)`.

### 5.2 Rules

These exist because auto-graders lose student trust in exactly these ways:

- **Check values, never code text.** Any correct route to the right answer
  passes. Checks never match on strings of source code.
- **Compare numerically with tolerance**, via
  `isTRUE(all.equal(actual, expected, tolerance = 1e-6))`. Never `==` on doubles.
- **A student error is not a wrong answer.** If the student's code throws, show
  the R error message and do not run the check.
- **A broken check is not a wrong answer.** If the check snippet errors or
  returns a malformed value, report an infrastructure problem — never mark the
  student incorrect.
- **Hints reveal one at a time.** The solution unlocks only after at least one
  genuine attempt.
- Passing marks the exercise complete in progress state.

## 6. Simulations

Six React components, plain SVG, animating in the browser without an R round
trip. Each targets a specific, well-documented misconception.

| Name | Teaches | Interaction |
|---|---|---|
| `distribution` | Normal distribution, z-scores | Drag mean and SD; shaded tail probabilities update |
| `clt` | Sampling distributions, CLT | Choose a skewed population, drag *n*, watch the sampling distribution become normal |
| `ci` | What 95% confidence means | Draw 100 intervals; ~95 capture the true mean. Kills "95% chance the mean is in *this* interval" |
| `pvalue` | NHST logic | Simulate the null distribution, place the observed statistic, shade the tail, slide α |
| `correlation` | Correlation strength | Guess *r* from a scatterplot before it is revealed |
| `leastsquares` | Regression fitting | Drag points and a candidate line, watch squared residuals; reveal the OLS line |

Simulations are looked up through a registry keyed by name. CI fails if content
references a name that is not registered.

## 7. Curriculum

Twelve modules. Datasets are psychology- and business-flavoured throughout:
stress and exam performance, a personality survey, customer satisfaction, and an
A/B marketing test.

| # | Module | Content | Simulation |
|---|---|---|---|
| 1 | First steps in R | Console, variables, vectors, functions, help | |
| 2 | Working with data | Data frames, measurement levels, loading data | |
| 3 | Describing data | Central tendency, spread, mean vs median | |
| 4 | Visualising data | ggplot2: histograms, boxplots, scatter, bar | |
| 5 | The normal distribution | Density, z-scores, probabilities | `distribution` |
| 6 | Sampling | Sampling error, sampling distributions, CLT | `clt` |
| 7 | Estimation | Standard error, confidence intervals | `ci` |
| 8 | Hypothesis testing | NHST logic, p-values, Type I/II errors, power | `pvalue` |
| 9 | Comparing two means | One-sample, independent, paired *t*-tests; Cohen's *d* | |
| 10 | Categorical data | Frequencies, chi-square goodness of fit and independence | |
| 11 | Relationships | Correlation, simple linear regression | `correlation`, `leastsquares` |
| 12 | Comparing several means | One-way ANOVA, post-hoc tests | |

## 8. Testing

### 8.1 Content validation (the load-bearing one)

webR runs under Node.js (Node ≥ 17), so CI executes the actual R for every
exercise before deployment:

- Each exercise's **solution must pass** its own check.
- Each exercise's **`wrongAnswers` must every one fail** its check — and fail
  *for the right reason*. The validator distinguishes "the student's code threw
  an R error" from "the check returned `pass = FALSE`", exactly as the live path
  does (§5.2), and only the latter counts as a satisfied negative fixture. A
  wrong answer that merely fails to run proves nothing about whether the check
  can tell a correct answer from an incorrect one.

The second half is not optional. A check that returns `pass = TRUE`
unconditionally passes the first half for every exercise in the course and marks
every student correct forever. Requiring at least one plausible wrong answer per
exercise to fail closes that hole.

### 8.2 Static content checks

- Every MDX file compiles.
- Every `<Simulation name>` exists in the registry.
- Every `<Exercise id>` resolves to a definition.
- No content uses `readline`, `scan`, `menu`, or `browser` (§3.2).
- Every dataset referenced by content exists.

### 8.3 Unit and smoke tests

- **Vitest** for the checker contract (tolerance comparison, student-error path,
  broken-check path) and the progress store (including unavailable localStorage).
- **One Playwright smoke test**: the app loads, webR boots, `1 + 1` runs, and the
  output pane shows `2`. This catches base-path and worker-loading breakage,
  which unit tests cannot.

## 9. Progress and state

Progress is **student-local**: lesson completion, exercise results, quiz answers,
and saved code drafts in localStorage under a versioned key
(`statlab.progress.v1`). The home page shows overall progress and a "continue
where you left off" entry point.

Students can **export** progress to a JSON file and **import** it on another
machine. If an instructor wants evidence of completion, the student submits that
file.

**There is no instructor dashboard and no server-side record.** This is a
deliberate boundary, stated so that it is not quietly crossed later: adding
either requires a backend, accounts, and student-data handling under GDPR, which
would change this from a free static site into a system someone must operate.

If localStorage is unavailable or corrupt, the application runs normally and
progress simply is not saved.

## 10. Scope for the first implementation plan

This specification describes all twelve modules. The **implementation plan
builds the application shell plus Module 6 (Sampling) complete**, including the
`clt` simulation, its code blocks, exercises with negative fixtures, quiz, and
`<Interpret>` block.

Module 6 is chosen deliberately: it exercises every component type and carries
the course's flagship simulation, so finishing it proves the whole architecture
end to end.

Once that vertical slice runs and the content schema is frozen, the remaining
eleven modules are content work against a stable interface — parallelisable,
low-risk, and requiring no further architectural decisions.

## 11. Non-goals

- No instructor dashboard, accounts, or server-side data (§9).
- No free-text answer grading.
- No intermediate statistics (multiple regression, mediation, factorial or
  repeated-measures ANOVA). A natural second phase.
- No mobile-first design. The layout is responsive and readable on a tablet, but
  writing code needs a keyboard and the design assumes a laptop.
- No offline/PWA support.
