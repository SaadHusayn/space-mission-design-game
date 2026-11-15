import { expect, test } from '@playwright/test';

import { openGraduated, snap, watchErrors } from './helpers';

test('Phase 10 polish: notebook, audio mute, accessibility settings, pause menu, and credits', async ({ page }) => {
  const errors = watchErrors(page);

  await openGraduated(page, {}, '?unlock=all');
  await expect(page.locator('canvas')).toHaveCount(1);

  // Utility bar: mute toggle + Mission Notebook
  const muteBtn = page.getByRole('button', { name: 'Mute audio' });
  await expect(muteBtn).toBeVisible();
  await muteBtn.click();
  await expect(page.getByRole('button', { name: 'Unmute audio' })).toBeVisible();

  await page.getByRole('button', { name: 'Open Mission Notebook' }).click();
  const notebookDialog = page.getByRole('dialog', { name: 'Mission Notebook' });
  await expect(notebookDialog).toBeVisible();
  await expect(notebookDialog.getByText('Tsiolkovsky Rocket Equation (Δv)')).toBeVisible();
  await notebookDialog.getByRole('tab', { name: 'Power & Comms' }).click();
  await expect(notebookDialog.getByText('Inverse-Square Solar Flux')).toBeVisible();
  await snap(page, 'phase10-notebook');
  await page.keyboard.press('Escape');
  await expect(notebookDialog).toBeHidden();

  // Settings dialog: audio sliders & accessibility switches
  await page.getByRole('button', { name: 'SETTINGS' }).click();
  const settingsDialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(settingsDialog).toBeVisible();
  await settingsDialog.getByText('Large text mode').click();
  await settingsDialog.getByText('High-contrast panels').click();
  await snap(page, 'phase10-settings');
  await page.keyboard.press('Escape');
  await expect(settingsDialog).toBeHidden();

  // Verify accessibility attributes applied on root
  await expect(page.locator('[data-large-text="true"]')).toHaveCount(1);
  await expect(page.locator('[data-high-contrast="true"]')).toHaveCount(1);

  // Enter chapter select & open Pause Menu
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await expect(page.getByRole('button', { name: 'Open Pause Menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Pause Menu' }).click();
  const pauseDialog = page.getByRole('dialog', { name: 'Paused' });
  await expect(pauseDialog).toBeVisible();
  await snap(page, 'phase10-pause');
  await pauseDialog.getByRole('button', { name: 'Resume' }).click();
  await expect(pauseDialog).toBeHidden();

  // Credits & Learn More page
  await page.goto('/credits');
  await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Real missions referenced' })).toBeVisible();
  await expect(page.getByText(/Procedural ambient music & mission SFX/)).toBeVisible();

  expect(errors).toEqual([]);
});
