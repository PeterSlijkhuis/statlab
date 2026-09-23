import { expect, test } from '@playwright/test';

test('the app loads, R boots, and code runs', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'StatLab' })).toBeVisible();

  await page.getByRole('link', { name: 'R playground' }).click();
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });

  // Real CSS applies here, unlike jsdom: proves the hidden attribute actually
  // hides the plot canvas, which an author `display` rule would silently defeat.
  await expect(page.locator('canvas.output-plot')).toBeHidden();

  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.locator('.output-console')).toContainText('stress', { timeout: 120_000 });
});

test('a lesson renders its simulation and responds to the slider', async ({ page }) => {
  // A direct load of a deep link: proves base-path routing under the built site.
  await page.goto('./lesson/06-2');
  await expect(page.getByRole('heading', { name: 'The sampling distribution' })).toBeVisible();

  const slider = page.getByRole('slider');
  await expect(slider).toBeVisible();
  await slider.fill('60');
  await expect(page.getByText('Sample size (n) =')).toContainText('60');
});

test('an exercise shows its verdict and a readable solution', async ({ page }) => {
  await page.goto('./lesson/08-1');
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });

  // The unedited starter code is an honest wrong answer: it never finishes the replicate body.
  const exercise = page.locator('section.exercise').first();
  await exercise.getByRole('button', { name: 'Check my answer' }).click();
  await expect(exercise.locator('.exercise-outcome')).toBeVisible({ timeout: 120_000 });

  await exercise.getByRole('button', { name: 'Show solution' }).click();
  const code = exercise.locator('.exercise-solution code');
  await expect(code).toContainText('null_diffs <- replicate(2000');
  // Real CSS applies here, unlike jsdom: the lesson's inline-code chip once
  // painted every solution line as a pale box on the dark panel.
  await expect(code).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(code).toHaveCSS('padding-left', '0px');
});

test('a ggplot2 plot renders to the canvas', async ({ page }) => {
  await page.goto('./lesson/06-3');
  await expect(page.getByRole('heading', { level: 1, name: 'The Central Limit Theorem' })).toBeVisible();
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });

  // The lesson's first block is the `skew` histogram: it reads the data and draws with ggplot2.
  const block = page.locator('.code-block').first();
  await block.getByRole('button', { name: 'Run' }).click();

  const canvas = block.locator('canvas.output-plot');
  await expect(canvas).toBeVisible({ timeout: 120_000 });
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(0);
  expect(box?.height).toBeGreaterThan(0);
  // A ggplot draw may print nothing, so check for error lines rather than console text.
  await expect(block.locator('.output-error')).toHaveCount(0);
});

test('a student uploads their own CSV in the playground and reads it', async ({ page }) => {
  await page.goto('./playground');
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });

  await page.getByLabel('Choose a data file').setInputFiles({
    name: 'My survey.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('group,score\na,12\nb,30\na,18\n'),
  });
  const line = 'my_survey <- read.csv("data/My_survey.csv", stringsAsFactors = TRUE)';
  // Scoped to the list: once pasted, the same line is in the editor too.
  const listed = page.getByRole('list', { name: 'Your uploaded files' }).getByText(line);
  await expect(listed).toBeVisible();

  const block = page.locator('.code-block').first();
  await block.locator('.cm-content').fill(`${line}\nsum(my_survey$score)`);
  await block.getByRole('button', { name: 'Run' }).click();
  await expect(block.locator('.output-console')).toContainText('60', { timeout: 120_000 });
  await expect(block.locator('.output-error')).toHaveCount(0);

  // Kept in the browser: after a reload the file is back in R, and the draft
  // code that reads it still runs.
  await page.reload();
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });
  await expect(listed).toBeVisible();
  await block.getByRole('button', { name: 'Run' }).click();
  await expect(block.locator('.output-console')).toContainText('60', { timeout: 120_000 });

  // Removed means removed, from R now and from the next visit.
  await page.getByRole('button', { name: 'Remove My_survey.csv' }).click();
  await expect(listed).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });
  await expect(listed).toHaveCount(0);
});
