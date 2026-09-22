import { useMemo, useState } from 'react';
import { drawSample, makeRng, mean, POPULATIONS, sd, tQuantile, type PopulationName } from './rng';
import './CI.css';

const REPLICATIONS = 100;
const WIDTH = 640;
const HEIGHT = 320;
const ROW = HEIGHT / REPLICATIONS;
const LEVELS = [50, 80, 90, 95, 99];

export default function CI() {
  const [populationName, setPopulationName] = useState<PopulationName>('normal');
  const [n, setN] = useState(25);
  const [level, setLevel] = useState(95);
  const [seed, setSeed] = useState(1);
  const [highlight, setHighlight] = useState<number | null>(null);

  // One memo returning one object: the picture, the capture count and the mean
  // width all come from the same draw, so the readout can never describe a
  // different hundred intervals from the ones on screen.
  const draw = useMemo(() => {
    const population = POPULATIONS[populationName];
    const rng = makeRng(seed * 7919 + n * 31 + level);
    const critical = tQuantile(1 - (1 - level / 100) / 2, n - 1);

    const intervals = Array.from({ length: REPLICATIONS }, () => {
      const sample = drawSample(population, n, rng);
      const centre = mean(sample);
      const margin = (critical * sd(sample)) / Math.sqrt(n);
      return {
        low: centre - margin,
        high: centre + margin,
        centre,
        captured: centre - margin <= population.mean && population.mean <= centre + margin,
      };
    });

    const captured = intervals.filter((interval) => interval.captured).length;
    const meanWidth = mean(intervals.map((interval) => interval.high - interval.low));

    const lo = Math.min(...intervals.map((i) => i.low));
    const hi = Math.max(...intervals.map((i) => i.high));
    const span = hi - lo || 1;
    const toX = (value: number) => ((value - lo) / span) * WIDTH;

    return { population, intervals, captured, meanWidth, critical, toX };
  }, [populationName, n, level, seed]);

  return (
    <div className="ci">
      <div className="ci-controls">
        <label>
          Population
          <select value={populationName} onChange={(e) => setPopulationName(e.target.value as PopulationName)}>
            {Object.entries(POPULATIONS).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </label>
        <label className="ci-slider">
          Sample size
          <input type="range" min={5} max={100} step={5} value={n} onChange={(e) => setN(Number(e.target.value))} />
          <span>{n}</span>
        </label>
        <label>
          Confidence
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            {LEVELS.map((value) => (
              <option key={value} value={value}>{value} %</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => { setSeed((s) => s + 1); setHighlight(null); }}>
          Draw again
        </button>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        className="ci-svg"
        aria-label={
          `One hundred ${level} per cent confidence intervals from samples of ${n}. ` +
          `${draw.captured} of them contain the population mean of ${draw.population.mean.toFixed(1)}; ` +
          `${REPLICATIONS - draw.captured} miss it.`
        }
      >
        {draw.intervals.map((interval, index) => {
          const y = index * ROW + ROW / 2;
          const miss = !interval.captured;
          return (
            <g key={index} onClick={() => setHighlight(index)}>
              <line
                data-testid={interval.captured ? 'interval-hit' : 'interval-miss'}
                x1={draw.toX(interval.low)}
                x2={draw.toX(interval.high)}
                y1={y}
                y2={y}
                stroke={miss ? '#b91c1c' : '#475569'}
                strokeWidth={highlight === index ? 4 : 2}
              />
              {/* Colour alone is not a signal: a miss also gets a marker. */}
              {miss && <circle cx={draw.toX(interval.centre)} cy={y} r={2.2} fill="#b91c1c" />}
            </g>
          );
        })}
        <line x1={draw.toX(draw.population.mean)} y1={0} x2={draw.toX(draw.population.mean)} y2={HEIGHT} stroke="#1d4ed8" strokeWidth={2} />
      </svg>

      <table className="ci-readout">
        <tbody>
          <tr>
            <th scope="row">Intervals containing the true mean</th>
            <td data-testid="captured">{draw.captured}</td>
            <th scope="row">out of</th>
            <td>{REPLICATIONS}</td>
            <th scope="row">Mean width</th>
            <td data-testid="mean-width">{draw.meanWidth.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {highlight !== null && (
        <p className="ci-single" data-testid="single-interval">
          This interval either contains the population mean or it does not. {level} per cent is how
          often the <strong>procedure</strong> works across many samples, not a probability about
          this line.
        </p>
      )}
      <p className="ci-note">Click any interval to see what it does, and does not, say.</p>
    </div>
  );
}
