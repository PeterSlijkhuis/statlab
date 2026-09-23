import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Lesson from './Lesson';
import { useLesson } from '../content/LessonContext';
import { lastVisitedLesson } from '../state/progress';

// Trivial stand-ins: Lesson passes these into the real MDX default export,
// but our mocked lesson bodies below never read them. Mocking this keeps the
// render from pulling in CodeBlock/Exercise/REditor and friends.
vi.mock('../content/mdxComponents', () => ({
  mdxComponents: {
    CodeBlock: () => null,
    Exercise: () => null,
    Interpret: () => null,
    Predict: () => null,
    Quiz: () => null,
    Simulation: () => null,
  },
}));

// Lesson 06-1's body resolves immediately and reports `ready` from context,
// so we can see whether a stale (already-destroyed) env is still read as ready.
vi.mock('../content/lessons/06-1-samples-vary.mdx', () => ({
  default: function LessonOneBody() {
    const { ready } = useLesson();
    return <p>lesson-06-1-body ready={String(ready)}</p>;
  },
}));

// Lesson 06-2's body is held back by a gate we release manually, so the test
// can inspect the in-between state where 06-1 is gone but 06-2 has not
// finished loading yet — exactly the window the defect describes.
const lessonTwoGate = vi.hoisted(() => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { gate, release };
});

vi.mock('../content/lessons/06-2-sampling-distribution.mdx', async () => {
  await lessonTwoGate.gate;
  return {
    default: function LessonTwoBody() {
      const { ready } = useLesson();
      return <p>lesson-06-2-body ready={String(ready)}</p>;
    },
  };
});

// findLesson/lessonNeighbours get one extra synthetic entry whose `file`
// matches no real .mdx module, so Fix 2 (touchLesson skipped when the
// lesson's file is missing) can be exercised without touching manifest.ts.
const MISSING_LESSON = { id: '06-missing', title: 'Missing Lesson', file: 'does-not-exist' };
vi.mock('../content/manifest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../content/manifest')>();
  return {
    ...actual,
    findLesson: (id: string) => (id === MISSING_LESSON.id ? MISSING_LESSON : actual.findLesson(id)),
    lessonNeighbours: (id: string) => (id === MISSING_LESSON.id ? {} : actual.lessonNeighbours(id)),
  };
});

const getWebR = vi.hoisted(() => vi.fn());
const setStatus = vi.hoisted(() => vi.fn());
vi.mock('../r/webrClient', () => ({ getWebR, setStatus }));

const prepareSession = vi.hoisted(() => vi.fn());
const fetchDataset = vi.hoisted(() => vi.fn());
vi.mock('../r/session', () => ({ prepareSession, fetchDataset }));

const createLessonEnv = vi.hoisted(() => vi.fn());
const destroyEnv = vi.hoisted(() => vi.fn());
vi.mock('../r/environments', () => ({ createLessonEnv, destroyEnv }));

function NavigateButton() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/lesson/06-2')}>
      Next lesson
    </button>
  );
}

function Harness({ initialPath, withNav }: { initialPath: string; withNav?: boolean }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      {withNav && <NavigateButton />}
      <Routes>
        <Route path="/lesson/:lessonId" element={<Lesson />} />
      </Routes>
    </MemoryRouter>
  );
}

const webrInstance = { id: 'fake-webr' };
const envA = { id: 'env-A' };
const envB = { id: 'env-B' };
let envBGateResolve: (value: typeof envB) => void;

beforeEach(() => {
  localStorage.clear();
  getWebR.mockReset().mockResolvedValue(webrInstance);
  setStatus.mockReset();
  prepareSession.mockReset().mockResolvedValue(undefined);
  fetchDataset.mockReset();
  destroyEnv.mockReset().mockResolvedValue(undefined);

  let calls = 0;
  const envBGate = new Promise<typeof envB>((resolve) => {
    envBGateResolve = resolve;
  });
  createLessonEnv.mockReset().mockImplementation(async () => {
    calls += 1;
    return calls === 1 ? envA : envBGate;
  });
});

describe('Lesson lifecycle across a param-only navigation', () => {
  test('a stale env and content do not survive navigating to another lesson', async () => {
    render(<Harness initialPath="/lesson/06-1" withNav />);

    await waitFor(() => expect(screen.getByText('lesson-06-1-body ready=true')).toBeDefined());

    await userEvent.click(screen.getByRole('button', { name: /next lesson/i }));

    // The route reuses the same mounted Lesson: the title (from useParams)
    // updates immediately, but 06-2's env and content are still gated shut.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'The sampling distribution' })).toBeDefined(),
    );

    // The defect: without a cleanup that clears content/env, lesson 06-1's
    // body (and its now-stale "ready") stays on screen indefinitely under
    // 06-2's title, because nothing ever resets it while 06-2 is still
    // loading.
    await waitFor(() => expect(screen.getByText('Loading lesson…')).toBeDefined());
    expect(screen.queryByText(/lesson-06-1-body/)).toBeNull();

    await waitFor(() => expect(destroyEnv).toHaveBeenCalledTimes(1));
    expect(destroyEnv).toHaveBeenCalledWith(webrInstance, envA);

    lessonTwoGate.release();
    envBGateResolve(envB);

    await waitFor(() => expect(screen.getByText('lesson-06-2-body ready=true')).toBeDefined());
    expect(screen.queryByText(/lesson-06-1-body/)).toBeNull();
  });

  test('the next lesson never reads the previous lesson\'s destroyed env as ready', async () => {
    // 06-2's body is allowed to load at once while its env stays held back, so
    // the body mounts inside the window where only the effect cleanup's
    // setEnv(null)/setWebR(null) stops it seeing 06-1's freed env as ready.
    // (Navigating back to a cached lesson hits the same window in the app.)
    lessonTwoGate.release();
    render(<Harness initialPath="/lesson/06-1" withNav />);
    await waitFor(() => expect(screen.getByText('lesson-06-1-body ready=true')).toBeDefined());

    await userEvent.click(screen.getByRole('button', { name: /next lesson/i }));

    await waitFor(() => expect(screen.getByText(/lesson-06-2-body/)).toBeDefined());
    expect(screen.getByText('lesson-06-2-body ready=false')).toBeDefined();

    envBGateResolve(envB);
    await waitFor(() => expect(screen.getByText('lesson-06-2-body ready=true')).toBeDefined());
  });

  test('a lesson whose MDX file is missing still records a visit', async () => {
    render(<Harness initialPath="/lesson/06-missing" />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Missing Lesson' })).toBeDefined());
    await waitFor(() => expect(lastVisitedLesson()).toBe('06-missing'));
  });
});
