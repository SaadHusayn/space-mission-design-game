import { expect, test } from '@playwright/test';

import { measureFps, openFresh, snap, watchErrors } from './helpers';

test('title screen loads one canvas, keeps it across scene swaps, and saves settings', async ({ page }) => {
  const errors = watchErrors(page);
  await openFresh(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.waitForTimeout(1500);
  await snap(page, 'title');

  // Settings dialog: change quality, close with Escape, survive a reload.
  await page.getByRole('button', { name: 'SETTINGS' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  await dialog.getByText('Best for older laptops').click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: 'SETTINGS' }).click();
  await expect(page.getByRole('radio', { name: /Low/ })).toBeChecked();
  await page.keyboard.press('Escape');

  // Starting the prologue swaps the scene inside the same canvas.
  await page.locator('canvas').evaluate((canvas) => (canvas.dataset.mark = 'same'));
  await page.getByRole('button', { name: 'NEW MISSION' }).click();
  await expect(page.getByText(/Pad 39/)).toBeVisible();
  await expect(page.locator('canvas[data-mark="same"]')).toHaveCount(1);

  const fps = await measureFps(page);
  test.info().annotations.push({ type: 'fps', description: String(fps) });
  expect(errors).toEqual([]);
});

test('title fits a phone screen @phone', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await openFresh(page);
  await page.waitForTimeout(1500);
  const button = page.getByRole('button', { name: 'NEW MISSION' });
  const box = await button.boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport && box.x + box.width <= viewport.width).toBeTruthy();
  await snap(page, 'title', testInfo.project.name);
  expect(errors).toEqual([]);
});

test('landing and credits pages work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'MISSION ARCHITECT' })).toBeVisible();
  await expect(page.getByText('PATHWAYS TO THE STARS')).toBeVisible();
  await expect(page.getByText(/not affiliated with or endorsed by NASA/)).toBeVisible();
  await page.getByRole('link', { name: 'Credits' }).click();
  await expect(page.getByText('Solar System Scope')).toBeVisible();
});
