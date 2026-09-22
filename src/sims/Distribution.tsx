import { useMemo, useState } from 'react';
import { normalCdf, normalPdf } from './rng';
import './Distribution.css';

const WIDTH = 640;
const HEIGHT = 240;
const BASELINE = HEIGHT - 28;
const SAMPLES = 240;

const SD_MIN = 3;
const SD_MAX = 20;
const MEAN_MIN = 50;
const MEAN_MAX = 90;

/**
 * The tallest curve the controls can produce, which is the narrowest one. The
 * y axis is scaled to this and never to the current curve: rescaling per frame
 * would make an SD of 3 and an SD of 20 look identical, which is the opposite
 * of what this simulation is for.
 */
const PEAK_DENSITY = normalPdf(0, 0, SD_MIN);

function curvePoints(mu: number, sigma: number): { x: number; value: number }[] {
  const lo = mu - 4 * sigma;
  const hi = mu + 4 * sigma;
  return Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const value = lo + ((hi - lo) * i) / SAMPLES;
    return { x: value, value };
  });
}

export default function Distribution() {
  const [mu, setMu] = useState(70);
  const [sigma, setSigma] = useState(10);
  const [cut, setCut] = useState(70);
  const [axis, setAxis] = useState<'raw' | 'z'>('raw');

  // One memo, so the curve, the shading and every number below it are read off
  // the same three values. CLT shipped a defect where two readouts disagreed
  // for one frame because they read different sources.
  const view = useMemo(() => {
    const lo = mu - 4 * sigma;
    const hi = mu + 4 * sigma;
    const span = hi - lo;
    const toX = (value: number) => ((value - lo) / span) * WIDTH;
    const toY = (density: number) => BASELINE - (density / PEAK_DENSITY) * (BASELINE - 12);

    const samples = curvePoints(mu, sigma).map(({ value }) => ({
      value,
      x: toX(value),
      y: toY(normalPdf(value, mu, sigma)),
    }));

    const curve = samples.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    const shadedSamples = samples.filter((p) => p.value <= cut);
    const shaded = shadedSamples.length
      ? `M${toX(lo).toFixed(2)},${BASELINE} ` +
        shadedSamples.map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') +
        ` L${toX(Math.min(cut, hi)).toFixed(2)},${BASELINE} Z`
      : '';

    const left = normalCdf(cut, mu, sigma);
    const z = (cut - mu) / sigma;
    return {
      lo, hi, toX, curve, shaded,
      cutX: toX(cut),
      left,
      right: 1 - left,
      z,
      rules: [-2, -1, 0, 1, 2].map((k) => ({ k, value: mu + k * sigma, x: toX(mu + k * sigma) })),
    };
  }, [mu, sigma, cut]);

  const label = axis === 'z' ? (k: number) => k.toFixed(0) : (value: number) => value.toFixed(0);

  return (
    <div className="distribution">
      <div className="distribution-controls">
        <label className="distribution-slider">
          Mean
          <input
            type="range"
            min={MEAN_MIN}
            max={MEAN_MAX}
            step={1}
            value={mu}
            onChange={(event) => setMu(Number(event.target.value))}
          />
          <span>{mu}</span>
        </label>
        <label className="distribution-slider">
          Standard deviation
          <input
            type="range"
            min={SD_MIN}
            max={SD_MAX}
            step={1}
            value={sigma}
            onChange={(event) => setSigma(Number(event.target.value))}
          />
          <span>{sigma}</span>
        </label>
        <label className="distribution-slider">
          Cut-off
          <input
            type="range"
            min={mu - 4 * sigma}
            max={mu + 4 * sigma}
            step={0.5}
            value={cut}
            onChange={(event) => setCut(Number(event.target.value))}
          />
          <span>{cut.toFixed(1)}</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={axis === 'z'}
            onChange={(event) => setAxis(event.target.checked ? 'z' : 'raw')}
          />
          Label the axis in z-scores
        </label>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        className="distribution-svg"
        aria-label={
          `Normal curve with mean ${mu} and standard deviation ${sigma}. ` +
          `The shaded area to the left of ${cut.toFixed(1)} is ${view.left.toFixed(3)}, ` +
          `leaving ${view.right.toFixed(3)} to the right. That cut-off is ${view.z.toFixed(2)} standard deviations from the mean.`
        }
      >
        {view.shaded && <path d={view.shaded} fill="#2563eb" fillOpacity={0.35} />}
        <path d={view.curve} fill="none" stroke="#1d4ed8" strokeWidth={2} />
        {view.rules.map(({ k, value, x }) => (
          <g key={k}>
            <line x1={x} y1={12} x2={x} y2={BASELINE} stroke="#cbd5e1" strokeDasharray={k === 0 ? undefined : '3 3'} />
            <text x={x} y={HEIGHT - 12} textAnchor="middle" className="distribution-axis">
              {axis === 'z' ? label(k) : label(value)}
            </text>
          </g>
        ))}
        <line x1={view.cutX} y1={4} x2={view.cutX} y2={BASELINE} stroke="#b91c1c" strokeWidth={2} />
        <line x1={0} y1={BASELINE} x2={WIDTH} y2={BASELINE} stroke="#334155" />
      </svg>

      <table className="distribution-readout">
        <tbody>
          <tr>
            <th scope="row">Area to the left of the cut</th>
            <td data-testid="tail-probability">{view.left.toFixed(3)}</td>
            <th scope="row">Area to the right</th>
            <td data-testid="right-probability">{view.right.toFixed(3)}</td>
            <th scope="row">z-score of the cut</th>
            <td data-testid="z-score">{view.z.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <p className="distribution-note">
        The height of the curve is not a probability. Move the standard deviation and watch the curve
        change shape while the area to the left of the mean stays at 0.500. Only area is probability.
      </p>
    </div>
  );
}
