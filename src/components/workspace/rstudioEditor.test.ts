import { EditorState } from '@codemirror/state';
import { describe, expect, test } from 'vitest';
import { completionRequest, enclosingCall } from './rstudioEditor';
import { installCode } from './PackagesPane';

/** The request at the `|` in `text`. */
function at(text: string, explicit = false) {
  const pos = text.indexOf('|');
  const doc = text.replace('|', '');
  return completionRequest(EditorState.create({ doc }), pos, explicit);
}

describe('completionRequest', () => {
  test('completes a name once three characters are typed, or at once on Tab', () => {
    expect(at('me|')).toBeNull();
    expect(at('me|', true)).toEqual({ from: 0, token: 'me', call: undefined });
    expect(at('x <- summ|')).toEqual({ from: 5, token: 'summ', call: undefined });
  });

  test("offers a data frame's columns after $ and a package's functions after ::", () => {
    expect(at('mean(df$ag|)')).toEqual({ from: 8, token: 'df$ag', call: 'mean' });
    expect(at('df$|')).toEqual({ from: 3, token: 'df$', call: undefined });
    expect(at('dplyr::fil|')).toEqual({ from: 7, token: 'dplyr::fil', call: undefined });
  });

  test("offers a function's arguments inside its parentheses on Tab", () => {
    expect(at('t.test(score ~ group, |', true)).toEqual({ from: 22, token: '', call: 't.test' });
    expect(at('x <- 1|', true)).toBeNull();
  });

  test('offers file paths inside quotes', () => {
    expect(at('read.csv("data/wo|')).toEqual({ from: 15, token: '', path: 'data/wo' });
    expect(at('read.csv("|', true)).toEqual({ from: 10, token: '', path: '' });
    expect(at('read.csv("wo|')).toBeNull();
  });

  test('does not complete numbers or comments', () => {
    expect(at('x <- 3.14|', true)).toBeNull();
    expect(at('# a note|')).toBeNull();
  });
});

describe('enclosingCall', () => {
  test('finds the innermost open call, skipping strings and closed calls', () => {
    expect(enclosingCall('lm(y ~ x, data = subset(df, a > 1), ')).toBe('lm');
    expect(enclosingCall('paste("(", ')).toBe('paste');
    expect(enclosingCall('mean(x)')).toBeUndefined();
  });
});

describe('installCode', () => {
  test("writes the install.packages() line for what the student typed", () => {
    expect(installCode('psych')).toBe('install.packages("psych")');
    expect(installCode(' psych, "janitor" psych ')).toBe('install.packages(c("psych", "janitor"))');
    expect(installCode(', ;')).toBeNull();
  });
});
