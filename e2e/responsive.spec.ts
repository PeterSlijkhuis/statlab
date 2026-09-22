import { expect, test, type Page } from '@playwright/test';

// None of this needs R: it checks layout, so it runs whether or not webR boots.
const PAGES = ['./', './lesson/02-1', './lesson/07-2', './lesson/09-2', './playground', './which-model'];

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
});
