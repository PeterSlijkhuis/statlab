import { describe, expect, test } from 'vitest';
import { buildProgram, ECHO, splitEcho, workspaceRequest } from './workspace';

describe('workspaceRequest', () => {
  test.each([
    ['?mean', { kind: 'help', topic: 'mean' }],
    ['? read.csv', { kind: 'help', topic: 'read.csv' }],
    ['??regression', { kind: 'help', topic: 'regression' }],
    ['help(lm)', { kind: 'help', topic: 'lm' }],
    ['help("t.test")', { kind: 'help', topic: 't.test' }],
    ['?stats::sd', { kind: 'help', topic: 'stats::sd' }],
    ['View(population)', { kind: 'view', name: 'population' }],
    ['utils::View(df)', { kind: 'view', name: 'df' }],
  ])('%s opens a pane', (statement, request) => {
    expect(workspaceRequest(statement)).toEqual(request);
  });

  test.each(['mean(x)', 'x <- help', 'View(head(df))', 'print(?mean)'])('%s goes to R', (statement) => {
    expect(workspaceRequest(statement)).toBeNull();
  });
});

describe('buildProgram', () => {
  const echoOf = (text: string) => `cat(${JSON.stringify(`${ECHO}${text}\n`)})`;

  test('prints each statement just before it runs', () => {
    const { code } = buildProgram('x <- 1\n\n# note\ny <- c(1,\n  2)', [[1, 1], [4, 5]]);
    expect(code.split('\n')).toEqual([
      echoOf('> x <- 1'),
      'x <- 1',
      echoOf('> # note'),
      echoOf('> y <- c(1,'),
      echoOf('+   2)'),
      'y <- c(1,',
      '  2)',
    ]);
  });

  test('runs two statements sharing a line once', () => {
    const { code } = buildProgram('a <- 1; b <- 2', [[1, 1], [1, 1]]);
    expect(code.split('\n')).toEqual([echoOf('> a <- 1; b <- 2'), 'a <- 1; b <- 2']);
  });

  test('echoes help and View but leaves them out of the R code', () => {
    const { code, requests } = buildProgram('?mean\nx <- 1', [[1, 1], [2, 2]]);
    expect(code.split('\n')).toEqual([echoOf('> ?mean'), echoOf('> x <- 1'), 'x <- 1']);
    expect(requests).toEqual([{ kind: 'help', topic: 'mean' }]);
  });

  test('keeps comments after the last statement', () => {
    const { code } = buildProgram('x <- 1\n# done', [[1, 1]]);
    expect(code.split('\n').at(-1)).toBe(echoOf('> # done'));
  });
});

describe('splitEcho', () => {
  test('tells echoed code from output', () => {
    expect(
      splitEcho([
        { type: 'stdout', data: `${ECHO}> x` },
        { type: 'stdout', data: '[1] 1' },
        { type: 'error', data: 'boom' },
      ]),
    ).toEqual([
      { type: 'echo', text: '> x' },
      { type: 'stdout', text: '[1] 1' },
      { type: 'error', text: 'boom' },
    ]);
  });

  test('splits output printed without a newline from the next echo', () => {
    expect(splitEcho([{ type: 'stdout', data: `hi${ECHO}> x` }])).toEqual([
      { type: 'stdout', text: 'hi' },
      { type: 'echo', text: '> x' },
    ]);
  });
});
