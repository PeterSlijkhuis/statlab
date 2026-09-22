import { useMemo, useState } from 'react';
import { correlate, fitLine, makeRng, type Point } from './rng';
import './Correlation.css';

const N = 60;
const SIZE = 420;
const PAD = 18;

/**
 * A fixed ladder rather than a random draw, shuffled per session: a student
 * meets the whole range instead of a random walk that might never show them an
 * r of 0.3.
 */
const LADDER = [-0.9, -0.7, -0.5, -0.3, 0, 0.3, 0.5, 0.7, 0.9];

function shuffled(seed: number): number[] {
  const rng = makeRng(seed);
  const values = [...LADDER];
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export default function Correlation() {
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [history, setHistory] = useState<{ actual: number; guess: number }[]>([]);

  const ladder = useMemo(() => shuffled(20260922), []);

  const scene = useMemo(() => {
    const target = ladder[round % ladder.length];
    const points = correlate(target, N, makeRng(9176 + round * 7919));
    // The sample r, not the target: it is what is actually on screen, and the
    // gap between the two is itself worth seeing.
    const fit = fitLine(points);

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const xLo = Math.min(...xs);
    const xHi = Math.max(...xs);
    const yLo = Math.min(...ys);
    const yHi = Math.max(...ys);
    const toX = (x: number) => PAD + ((x - xLo) / (xHi - xLo || 1)) * (SIZE - 2 * PAD);
    const toY = (y: number) => SIZE - PAD - ((y - yLo) / (yHi - yLo || 1)) * (SIZE - 2 * PAD);

    return { target, points, fit, toX, toY, xLo, xHi };
  }, [ladder, round]);

  const error = revealed ? guess - scene.fit.r : 0;
  const meanAbsError = history.length
    ? history.reduce((total, h) => total + Math.abs(h.guess - h.actual), 0) / history.length
    : 0;

  // The standard bias, named only when this student is actually showing it.
  const recentWeak = history.slice(-3).filter((h) => Math.abs(h.actual) < 0.45);
  const overestimating =
    recentWeak.length === 3 && recentWeak.every((h) => Math.abs(h.guess) > Math.abs(h.actual) + 0.1);

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    setHistory((past) => [...past, { actual: scene.fit.r, guess }]);
  }

  return (
    <div className="correlation">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        className="correlation-svg"
        aria-label={
          revealed
            ? `A scatterplot of ${N} points whose correlation is ${scene.fit.r.toFixed(2)}. You guessed ${guess.toFixed(2)}.`
            : `A scatterplot of ${N} points. Its correlation is hidden until you guess.`
        }
      >
        <rect x={0} y={0} width={SIZE} height={SIZE} fill="#f8fafc" />
        {revealed && Number.isFinite(scene.fit.slope) && (
          <line
            x1={scene.toX(scene.xLo)}
            y1={scene.toY(scene.fit.intercept + scene.fit.slope * scene.xLo)}
            x2={scene.toX(scene.xHi)}
            y2={scene.toY(scene.fit.intercept + scene.fit.slope * scene.xHi)}
            stroke="#1d4ed8"
            strokeWidth={2}
          />
        )}
        {scene.points.map((point: Point, index: number) => (
          <circle
            key={index}
            data-testid="point"
            data-x={point.x}
            data-y={point.y}
            cx={scene.toX(point.x)}
            cy={scene.toY(point.y)}
            r={3.2}
            fill="#475569"
            fillOpacity={0.75}
          />
        ))}
      </svg>

      <div className="correlation-controls">
        <label className="correlation-slider">
          Your guess
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={guess}
            onChange={(event) => setGuess(Number(event.target.value))}
            disabled={revealed}
          />
          <span>{guess.toFixed(2)}</span>
        </label>
        <button type="button" onClick={reveal} disabled={revealed}>Reveal</button>
        <button
          type="button"
          onClick={() => {
            setRound((r) => r + 1);
            setRevealed(false);
            setGuess(0);
          }}
        >
          Next scatterplot
        </button>
      </div>

      {revealed && (
        <table className="correlation-readout">
          <tbody>
            <tr>
              <th scope="row">Actual r</th>
              <td data-testid="actual-r">{scene.fit.r.toFixed(2)}</td>
              <th scope="row">Your guess</th>
              <td>{guess.toFixed(2)}</td>
              <th scope="row">Error</th>
              <td data-testid="error">{error > 0 ? `+${error.toFixed(2)}` : error.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      )}

      <p className="correlation-score">
        Rounds completed: <span data-testid="rounds">{history.length}</span>
        {history.length > 0 && <> · mean error so far {meanAbsError.toFixed(2)}</>}
      </p>

      {overestimating && (
        <p className="correlation-verdict">
          You have overestimated the last three weak correlations. A cloud that looks slightly
          tilted is usually an r below .3.
        </p>
      )}
    </div>
  );
}
