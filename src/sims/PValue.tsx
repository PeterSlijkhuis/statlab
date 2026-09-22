import { useMemo, useState } from 'react';
import { histogram, makeRng, mean, normalPdf, sd } from './rng';
import './PValue.css';

const REPLICATIONS = 4000;
const BINS = 45;
const WIDTH = 640;
const HEIGHT = 220;
const BASELINE = HEIGHT - 26;
const ALPHAS = [0.1, 0.05, 0.01];

/**
 * The scale of the scores both groups are drawn from. It is not cosmetic: the
 * null difference in means has SD = GROUP_SD * sqrt(2/n), and the observed
 * difference slider runs to 5. On a standard-normal scale that would put every
 * setting past 3.8 SD into the tail, so every p on the slider would read 0.000
 * and the simulation would teach nothing. At 8, a wellbeing-like scale, the
 * slider spans p from about 1.0 down to about 0.015.
 */
const GROUP_SD = 8;

/** One draw, so the two groups are genuinely from the same population. */
function normalDraw(rng: () => number): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return GROUP_SD * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export default function PValue() {
  const [n, setN] = useState(30);
  const [observed, setObserved] = useState(1.2);
  const [alpha, setAlpha] = useState(0.05);
  const [tails, setTails] = useState<'two' | 'one'>('two');
  const [seed, setSeed] = useState(1);

  const study = useMemo(() => {
    const rng = makeRng(seed * 104729 + n);
    // Both groups come from ONE population, so the true difference is zero by
    // construction. Four thousand such studies IS the null distribution; p is
    // counted from them, never computed from a formula.
    const differences = Array.from({ length: REPLICATIONS }, () => {
      const a = Array.from({ length: n }, () => normalDraw(rng));
      const b = Array.from({ length: n }, () => normalDraw(rng));
      return mean(a) - mean(b);
    });

    const extremeCount =
      tails === 'two'
        ? differences.filter((d) => Math.abs(d) >= Math.abs(observed)).length
        : differences.filter((d) => d >= observed).length;
    const p = extremeCount / REPLICATIONS;

    // The critical value the decision rule uses, read off the simulated null
    // rather than assumed, so the dashed line and the verdict cannot disagree.
    const sorted = [...differences].sort((x, y) => x - y);
    const upperIndex = Math.min(
      REPLICATIONS - 1,
      Math.floor(REPLICATIONS * (1 - (tails === 'two' ? alpha / 2 : alpha))),
    );
    const critical = sorted[upperIndex];

    const nullSd = sd(differences);
    return { differences, extremeCount, p, critical, nullSd };
  }, [n, observed, alpha, tails, seed]);

  const view = useMemo(() => {
    const { edges, counts } = histogram(study.differences, BINS);
    const lo = edges[0];
    const hi = edges[edges.length - 1];
    const span = hi - lo || 1;
    const peak = Math.max(...counts, 1);
    const toX = (value: number) => ((value - lo) / span) * WIDTH;
    const barWidth = WIDTH / BINS;

    // The smooth overlay is the shape the formula assumes. It is drawn only to
    // show the simulated null already has it; p never comes from it.
    const overlay = Array.from({ length: 121 }, (_, i) => {
      const value = lo + (span * i) / 120;
      const density = normalPdf(value, 0, study.nullSd);
      const scaled = (density * span * study.differences.length) / BINS;
      return `${i === 0 ? 'M' : 'L'}${toX(value).toFixed(2)},${(BASELINE - (scaled / peak) * (BASELINE - 14)).toFixed(2)}`;
    }).join(' ');

    return { edges, counts, lo, hi, peak, toX, barWidth, overlay };
  }, [study]);

  const isExtreme = (centre: number) =>
    tails === 'two' ? Math.abs(centre) >= Math.abs(observed) : centre >= observed;

  const rejected = study.p < alpha;

  return (
    <div className="pvalue">
      <div className="pvalue-controls">
        <label className="pvalue-slider">
          Group size
          <input type="range" min={10} max={100} step={5} value={n} onChange={(e) => setN(Number(e.target.value))} />
          <span>{n}</span>
        </label>
        <label className="pvalue-slider">
          Observed difference
          <input type="range" min={0} max={5} step={0.1} value={observed} onChange={(e) => setObserved(Number(e.target.value))} />
          <span>{observed.toFixed(1)}</span>
        </label>
        <label>
          α
          <select value={alpha} onChange={(e) => setAlpha(Number(e.target.value))}>
            {ALPHAS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={tails === 'one'}
            onChange={(e) => setTails(e.target.checked ? 'one' : 'two')}
          />
          One-tailed
        </label>
        <button type="button" onClick={() => setSeed((s) => s + 1)}>Simulate again</button>
      </div>

      <p className="pvalue-caption">
        Four thousand studies in which both groups of {n} were drawn from <em>one</em> population
        of wellbeing scores, so the true difference is zero. This histogram is what chance alone
        produces.
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        className="pvalue-svg"
        aria-label={
          `The null distribution of ${REPLICATIONS} differences in means, centred on zero. ` +
          `${study.extremeCount} of them are at least as extreme as the observed difference of ${observed.toFixed(1)}, ` +
          `giving a ${tails}-tailed p of ${study.p.toFixed(3)}.`
        }
      >
        {view.counts.map((count, index) => {
          const centre = (view.edges[index] + view.edges[index + 1]) / 2;
          const height = (count / view.peak) * (BASELINE - 14);
          return (
            <rect
              key={index}
              x={index * view.barWidth}
              y={BASELINE - height}
              width={Math.max(view.barWidth - 1, 1)}
              height={height}
              fill={isExtreme(centre) ? '#b91c1c' : '#94a3b8'}
            />
          );
        })}
        <path d={view.overlay} fill="none" stroke="#1d4ed8" strokeWidth={1.5} strokeDasharray="4 3" />
        <line x1={view.toX(observed)} y1={4} x2={view.toX(observed)} y2={BASELINE} stroke="#b91c1c" strokeWidth={2} />
        <line x1={view.toX(study.critical)} y1={4} x2={view.toX(study.critical)} y2={BASELINE} stroke="#0f172a" strokeDasharray="5 4" />
        <line x1={0} y1={BASELINE} x2={WIDTH} y2={BASELINE} stroke="#334155" />
        <text x={2} y={HEIGHT - 8} className="pvalue-axis">{view.lo.toFixed(2)}</text>
        <text x={WIDTH - 4} y={HEIGHT - 8} textAnchor="end" className="pvalue-axis">{view.hi.toFixed(2)}</text>
      </svg>

      <table className="pvalue-readout">
        <tbody>
          <tr>
            <th scope="row">Studies at least this extreme</th>
            <td data-testid="extreme-count">{study.extremeCount}</td>
            <th scope="row">out of</th>
            <td data-testid="replications">{REPLICATIONS}</td>
            <th scope="row">p</th>
            <td data-testid="p-value">{study.p.toFixed(6)}</td>
          </tr>
        </tbody>
      </table>

      <p className="pvalue-verdict" data-testid="verdict">
        {rejected
          ? `p is below α = ${alpha}, so you would reject the null hypothesis.`
          : `p is not below α = ${alpha}, so you would not reject the null hypothesis.`}
      </p>
      <p className="pvalue-caveat" data-testid="caveat">
        p is how often chance alone produces a difference this big when nothing is going on. It is
        not the probability that the null hypothesis is true, and it is not the size of the effect.
      </p>
    </div>
  );
}
