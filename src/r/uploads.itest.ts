// @vitest-environment node
import { readFileSync } from 'node:fs';
import { WebR } from 'webr';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { evaluateR } from './evaluate';
import { mountDatasets } from './session';
import { uploadFile } from './uploads';

let webR: WebR;

beforeAll(async () => {
  webR = new WebR();
  await webR.init();
  await mountDatasets(webR, async () => new TextEncoder().encode('id\n1\n'));
}, 300_000);

afterAll(async () => {
  await webR.close();
});

const text = (r: { output: { data: string }[] }) => r.output.map((o) => o.data).join('\n');

/** Node's File has arrayBuffer(), so this is the same object a browser's picker hands over. */
function picked(name: string, bytes: Uint8Array<ArrayBuffer> | string): File {
  return new File([bytes], name);
}

describe('an uploaded file, read by the line the page offers', () => {
  test('CSV', async () => {
    const upload = await uploadFile(webR, picked('My survey.csv', 'group,score\na,12\nb,30\na,18\n'));
    const result = await evaluateR(webR, `${upload.code}\nsum(my_survey$score)\nlevels(my_survey$group)`);
    expect(result.errored).toBe(false);
    expect(text(result)).toContain('60');
    expect(text(result)).toContain('"a" "b"');
  });

  test('TSV', async () => {
    const upload = await uploadFile(webR, picked('scores.tsv', 'group\tscore\na\t12\nb\t30\n'));
    const result = await evaluateR(webR, `${upload.code}\nsum(scores$score)`);
    expect(result.errored).toBe(false);
    expect(text(result)).toContain('42');
  });

  test('TXT', async () => {
    const upload = await uploadFile(webR, picked('notes.txt', 'first line\nsecond line\n'));
    const result = await evaluateR(webR, `${upload.code}\nlength(notes)`);
    expect(result.errored).toBe(false);
    expect(text(result)).toContain('2');
  });

  test('sits beside the course datasets without touching them', async () => {
    const result = await evaluateR(webR, 'sort(list.files("data"))');
    expect(text(result)).toContain('workplace.csv');
    expect(text(result)).toContain('My_survey.csv');
  });

  test('Excel, through readxl installed on demand', async () => {
    const bytes = new Uint8Array(readFileSync(new URL('./fixtures/scores.xlsx', import.meta.url)));
    const upload = await uploadFile(webR, picked('scores.xlsx', bytes));
    const result = await evaluateR(webR, `${upload.code}\nsum(scores$score)\nnrow(scores)`);
    expect(result.errored).toBe(false);
    expect(text(result)).toContain('60');
    expect(text(result)).toContain('3');
  }, 300_000);
});
