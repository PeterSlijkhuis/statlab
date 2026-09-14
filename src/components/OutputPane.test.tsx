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
    const line = screen.getByText(/object not found/);
    expect(line.className).toContain('error');
    expect(line.textContent).toBe('Error: object not found');
  });

  test('labels a warning distinctly from an error', () => {
    render(<OutputPane result={result([{ type: 'warning', data: 'NAs introduced' }])} running={false} />);
    const line = screen.getByText(/NAs introduced/);
    expect(line.className).toContain('warning');
    expect(line.textContent).toBe('Warning: NAs introduced');
  });

  test('does not prefix ordinary console output', () => {
    render(<OutputPane result={result([{ type: 'stdout', data: '[1] 42' }])} running={false} />);
    expect(screen.getByText('[1] 42').textContent).toBe('[1] 42');
  });

  test('announces that R is running', () => {
    render(<OutputPane result={null} running />);
    expect(screen.getByText(/running/i)).toBeDefined();
  });
});
