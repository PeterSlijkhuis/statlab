import { expect, test, type Page } from '@playwright/test';

// None of this needs R: it checks layout, so it runs whether or not webR boots.
const PAGES = ['./', './lesson/00-1', './lesson/00-4', './lesson/02-1', './lesson/07-2', './lesson/09-2', './playground', './which-model'];

async function expectNoSidewaysScroll(page: Page) {
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    view: document.documentElement.clientWidth,
  }));
  expect(widths.scroll, 'the page scrolls sideways').toBeLessThanOrEqual(widths.view);
}

for (const [name, viewport] of [
  ['phone', { width: 375, height: 667 }],
  ['small phone', { width: 320, height: 568 }],
  ['tablet', { width: 768, height: 1024 }],
] as const) {
  test.describe(`on a ${name}`, () => {
    test.use({ viewport, hasTouch: true });

    test('no page scrolls sideways', async ({ page }) => {
      for (const path of PAGES) {
        await page.goto(path);
        await expect(page.locator('main h1').first()).toBeVisible();
        await expectNoSidewaysScroll(page);
      }
    });

    test('the lesson list is a drawer behind the Lessons button', async ({ page }) => {
      await page.goto('./lesson/06-2');
      await expect(page.getByRole('heading', { name: 'The sampling distribution' })).toBeInViewport();

      const nav = page.getByRole('navigation', { name: 'Course navigation' });
      await expect(nav).toBeHidden();

      await page.getByRole('button', { name: 'Lessons' }).click();
      await expect(nav).toBeVisible();
      await nav.getByRole('link', { name: 'The Central Limit Theorem' }).click();

      await expect(page.getByRole('heading', { level: 1, name: 'The Central Limit Theorem' })).toBeInViewport();
      await expect(nav).toBeHidden();
    });

    test('the playground shows one RStudio pane at a time', async ({ page }) => {
      // A tablet has room for all four, as the desktop test checks.
      test.skip(viewport.width > 640, 'wide enough for four panes');
      await page.goto('./playground');
      const show = page.getByRole('group', { name: 'Show pane' });
      await expect(show).toBeVisible();
      await expect(page.getByRole('region', { name: 'Source' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Console' })).toBeHidden();
      await show.getByRole('button', { name: 'Environment' }).click();
      await expect(page.getByRole('region', { name: 'Environment and History' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Source' })).toBeHidden();
      // Visible is not enough: a pane squeezed to its border still counts as
      // visible, which is how Console and Files once shrank to nothing here.
      for (const [button, region] of [
        ['Source', 'Source'],
        ['Console', 'Console'],
        ['Environment', 'Environment and History'],
        ['Files', 'Files, Plots and Help'],
      ]) {
        await show.getByRole('button', { name: button }).click();
        const box = await page.getByRole('region', { name: region }).boundingBox();
        expect(box?.height ?? 0, `${region} pane height`).toBeGreaterThan(300);
      }
      await expectNoSidewaysScroll(page);
    });

    test('Escape closes the drawer', async ({ page }) => {
      await page.goto('./');
      await page.getByRole('button', { name: 'Lessons' }).click();
      const nav = page.getByRole('navigation', { name: 'Course navigation' });
      await expect(nav).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(nav).toBeHidden();
      await expect(page.getByRole('button', { name: 'Lessons' })).toBeFocused();
    });
  });
}

test.describe('on a desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the lesson list is always on screen and nothing scrolls sideways', async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator('main h1').first()).toBeVisible();
      await expectNoSidewaysScroll(page);
    }
    await expect(page.getByRole('navigation', { name: 'Course navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lessons' })).toBeHidden();
  });

  test("the playground shows RStudio's four panes side by side", async ({ page }) => {
    await page.goto('./playground');
    const source = await page.getByRole('region', { name: 'Source' }).boundingBox();
    const console = await page.getByRole('region', { name: 'Console' }).boundingBox();
    const environment = await page.getByRole('region', { name: 'Environment and History' }).boundingBox();
    const files = await page.getByRole('region', { name: 'Files, Plots and Help' }).boundingBox();
    // Source top left, Console under it, Environment top right, Files under that.
    expect(console!.y).toBeGreaterThan(source!.y);
    expect(environment!.x).toBeGreaterThan(source!.x);
    expect(files!.y).toBeGreaterThan(environment!.y);
    expect(files!.x).toBeGreaterThan(console!.x);
    await expect(page.getByRole('group', { name: 'Show pane' })).toBeHidden();

    // Dragging the border between the columns resizes them.
    const border = page.getByRole('separator', { name: 'Resize left and right panes' });
    const box = (await border.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 150, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    const narrower = await page.getByRole('region', { name: 'Source' }).boundingBox();
    expect(narrower!.width).toBeLessThan(source!.width - 100);
  });
});
