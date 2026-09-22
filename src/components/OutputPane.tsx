import { useEffect, useRef } from 'react';
import type { RunResult } from '../r/evaluate';
import './OutputPane.css';

type Props = {
  result: RunResult | null;
  running: boolean;
};

/**
 * R's captured conditions carry only their message text, so a bare error would
 * read as an unexplained sentence. Labelling matches what students see in
 * RStudio and tells them which kind of thing just happened.
 */
const PREFIX: Record<RunResult['output'][number]['type'], string> = {
  stdout: '',
  stderr: '',
  message: '',
  warning: 'Warning: ',
  error: 'Error: ',
};

export default function OutputPane({ result, running }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const images = result?.images ?? [];
    // Nothing to draw: the canvas is hidden in that case, and assigning a new
    // width below clears it before the next plot, so there is no stale frame
    // to erase. Touching the 2D context here would be pointless work — and
    // under jsdom it logs a "not implemented" error on every render.
    if (!canvas || images.length === 0) return;

    const context = canvas.getContext('2d');
    if (!context) return;

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
              {PREFIX[line.type]}
              {line.data}
            </span>
          ))}
        </pre>
      )}

      <canvas ref={canvasRef} className="output-plot" hidden={!hasPlot} />
    </div>
  );
}
