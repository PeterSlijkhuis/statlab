import { useDeferredValue, useMemo, useState } from 'react';
import {
  describeShape,
  histogram,
  makeRng,
  mean,
  POPULATIONS,
  sampleMeans,
  sd,
  skewness,
  type PopulationName,
} from './rng';
import './CLT.css';

const REPLICATIONS = 2000;
const BINS = 34;
const WIDTH = 640;
const HEIGHT = 180;

function Histogram({ values, colour, label }: { values: number[]; colour: string; label: string }) {
  const { edges, counts } = useMemo(() => histogram(values, BINS), [values]);
  const skew = useMemo(() => skewness(values), [values]);
  const peak = Math.max(...counts, 1);
  const lo = edges[0];
  const hi = edges[edges.length - 1];
  const span = hi - lo || 1;
  const barWidth = WIDTH / BINS;

  return (
    <figure className="clt-figure">
      <figcaption>{label}</figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${label}. ${describeShape(skew)} (skewness ${skew.toFixed(2)}).`} className="clt-svg">
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
  // At n = 100 a tick costs ~40 ms of simulation, over two frames. The slider
  // and its label use the live values; the simulation and everything read off
  // it use the deferred ones, so the readout never mixes two different n's.
  const deferredN = useDeferredValue(n);
  const deferredPopulationName = useDeferredValue(populationName);
  const deferredPopulation = POPULATIONS[deferredPopulationName];

  const populationDraws = useMemo(() => {
    const rng = makeRng(seed * 7919);
    return Array.from({ length: 4000 }, () => deferredPopulation.draw(rng));
  }, [deferredPopulation, seed]);

  const means = useMemo(
    () => sampleMeans(deferredPopulation, deferredN, REPLICATIONS, makeRng(seed * 104729)),
    [deferredPopulation, deferredN, seed],
  );

  const observedSe = sd(means);
  const predictedSe = deferredPopulation.sd / Math.sqrt(deferredN);

  return (
    <div className="clt">
      <div className="clt-controls">
        <label>
          Population
          <select value={populationName} onChange={(event) => setPopulationName(event.target.value as PopulationName)}>
            {(Object.keys(POPULATIONS) as PopulationName[]).map((key) => (
              <option key={key} value={key}>{POPULATIONS[key].label}</option>
            ))}
          </select>
        </label>

        <label className="clt-slider">
          Sample size (n) = <strong>{n}</strong>
          <input type="range" min={1} max={100} value={n} onChange={(event) => setN(Number(event.target.value))} />
        </label>

        <button type="button" onClick={() => setSeed((value) => value + 1)}>Draw again</button>
      </div>

      <p className="clt-description">{deferredPopulation.description}</p>
      <Histogram values={populationDraws} colour="#94a3b8" label="The population (individual people)" />
      <Histogram values={means} colour="#1d4ed8" label={`Sampling distribution: ${REPLICATIONS} sample means, each from n = ${deferredN}`} />

      <table className="clt-readout">
        <tbody>
          <tr><th scope="row">Population mean (μ)</th><td>{deferredPopulation.mean.toFixed(2)}</td><th scope="row">Mean of the sample means</th><td>{mean(means).toFixed(2)}</td></tr>
          <tr><th scope="row">Population SD (σ)</th><td>{deferredPopulation.sd.toFixed(2)}</td><th scope="row">SD of the sample means</th><td>{observedSe.toFixed(2)}</td></tr>
          <tr><th scope="row">σ / √n predicts</th><td>{predictedSe.toFixed(2)}</td><th scope="row">Observed matches prediction</th><td>{Math.abs(observedSe - predictedSe) < predictedSe * 0.1 ? 'yes' : 'close'}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
