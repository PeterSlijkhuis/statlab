import { expect, test } from '@playwright/test';

test('the app loads, R boots, and code runs', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'StatLab' })).toBeVisible();

  await page.getByRole('link', { name: 'R Workspace' }).click();
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });

  // Real CSS applies here, unlike jsdom: proves the hidden attribute actually
  // hides the plot canvas, which an author `display` rule would silently defeat.
  await expect(page.locator('canvas.ide-plot')).toBeHidden();

  await page.getByRole('region', { name: 'Source' }).getByRole('button', { name: 'Source' }).click();
  await expect(page.getByRole('log', { name: 'Console output' })).toContainText('stress', { timeout: 120_000 });
});

test('the R Workspace works like RStudio: console, environment, plots and help', async ({ page }) => {
  await page.goto('./workspace');
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });
  const log = page.getByRole('log', { name: 'Console output' });
  const input = page.getByLabel('Console input');

  // Enter runs the line, echoed with its prompt, and the object appears in Environment.
  await input.fill('scores <- c(12, 30, 18)');
  await input.press('Enter');
  await expect(log).toContainText('> scores <- c(12, 30, 18)');
  await expect(page.getByRole('region', { name: 'Environment and History' })).toContainText('num [1:3] 12 30 18');

  // An unfinished line waits for the rest, as R's + prompt does.
  await input.fill('sum(scores');
  await input.press('Enter');
  await expect(input).toHaveValue('sum(scores\n');
  await input.press('End');
  await input.pressSequentially(')');
  await input.press('Enter');
  await expect(log).toContainText('[1] 60');

  // A plot goes to the Plots pane, drawn at its size.
  await input.fill('hist(scores)');
  await input.press('Enter');
  await expect(page.getByRole('tab', { name: 'Plots' })).toHaveAttribute('aria-selected', 'true');
  const canvas = page.locator('canvas.ide-plot');
  await expect(canvas).toBeVisible({ timeout: 120_000 });
  expect((await canvas.boundingBox())?.width).toBeGreaterThan(0);

  // ?topic opens the help page, which R in the browser has no pager to show.
  await input.fill('?mean');
  await input.press('Enter');
  await expect(page.getByLabel('Help for mean')).toContainText('Arithmetic Mean', { timeout: 60_000 });

  // Run in the script runs the line under the cursor and moves on to the next.
  const editor = page.getByRole('region', { name: 'Source' }).locator('.cm-content');
  await editor.fill('a <- 2\na * 21');
  await editor.press('ControlOrMeta+Home');
  await editor.press('ControlOrMeta+Enter');
  await expect(log).toContainText('> a <- 2');
  await editor.press('ControlOrMeta+Enter');
  await expect(log).toContainText('[1] 42');
});

test('the R Workspace installs packages from the browser repository, and completes code', async ({ page }) => {
  // The page's old address still works.
  await page.goto('./playground');
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });
  const log = page.getByRole('log', { name: 'Console output' });

  // One click in the Packages pane writes and runs the install.packages() line.
  await page.getByRole('tab', { name: 'Packages' }).click();
  const packages = page.getByRole('tabpanel', { name: 'Packages' });
  await packages.getByRole('button', { name: 'Install writexl' }).click();
  await expect(log).toContainText('> install.packages("writexl")');
  await expect(log).toContainText('writexl is installed');
  await expect(packages.getByRole('button', { name: 'Install writexl' })).toHaveCount(0);

  // Ticking it runs library(), as in RStudio.
  await packages.getByRole('checkbox', { name: 'Load writexl' }).click();
  await expect(log).toContainText('> library(writexl)');
  await expect(packages.getByRole('checkbox', { name: 'Load writexl' })).toBeChecked();

  // A package that cannot work in a browser says so instead of failing obscurely.
  const input = page.getByLabel('Console input');
  await input.fill('library(xlsx)');
  await input.press('Enter');
  await expect(log).toContainText('xlsx cannot run in the browser');

  // Tab completion offers a data frame's columns after $.
  await input.fill('population <- read.csv("data/wellbeing-population.csv")');
  await input.press('Enter');
  const editor = page.getByRole('region', { name: 'Source' }).locator('.cm-content');
  await editor.fill('mean(population$');
  await editor.press('End');
  await editor.pressSequentially('exam');
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('exam_score');
  // CodeMirror ignores an accept in the first 75 ms after the list opens, so a slip of the finger does not pick an option.
  await page.waitForTimeout(300);
  await editor.press('Tab');
  await expect(editor).toContainText('mean(population$exam_score');
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

test('a student uploads their own CSV in the R Workspace and reads it', async ({ page }) => {
  await page.goto('./workspace');
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });

  await page.getByLabel('Choose a data file').setInputFiles({
    name: 'My survey.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('group,score\na,12\nb,30\na,18\n'),
  });
  // The Files pane opens the data folder, where the upload landed.
  const files = page.getByRole('table', { name: 'Files in data' });
  await expect(files).toContainText('My_survey.csv');

  // Import runs the line that reads it in, so the student sees the code too.
  const log = page.getByRole('log', { name: 'Console output' });
  await files.getByRole('button', { name: 'Import My_survey.csv' }).click();
  await expect(log).toContainText('> my_survey <- read.csv("data/My_survey.csv", stringsAsFactors = TRUE)', { timeout: 120_000 });
  await expect(page.getByRole('button', { name: 'View my_survey' })).toBeVisible();

  const editor = page.getByRole('region', { name: 'Source' }).locator('.cm-content');
  await editor.fill('my_survey <- read.csv("data/My_survey.csv", stringsAsFactors = TRUE)\nsum(my_survey$score)');
  const runScript = page.getByRole('region', { name: 'Source' }).getByRole('button', { name: 'Source' });
  await runScript.click();
  await expect(log).toContainText('[1] 60', { timeout: 120_000 });
  await expect(page.locator('.ide-console-error')).toHaveCount(0);

  // Kept in the browser: after a reload the file is back in R, and the saved
  // script that reads it still runs.
  await page.reload();
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });
  await page.getByRole('button', { name: 'data', exact: true }).click();
  await expect(files).toContainText('My_survey.csv');
  await runScript.click();
  await expect(log).toContainText('[1] 60', { timeout: 120_000 });

  // Removed means removed, from R now and from the next visit.
  await files.getByRole('button', { name: 'Remove My_survey.csv' }).click();
  await expect(files).not.toContainText('My_survey.csv');
  await page.reload();
  await expect(page.getByText('R is ready')).toBeVisible({ timeout: 180_000 });
  await page.getByRole('button', { name: 'data', exact: true }).click();
  await expect(files).toContainText('workplace.csv');
  await expect(files).not.toContainText('My_survey.csv');
});
