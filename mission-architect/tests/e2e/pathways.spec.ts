import { expect, test } from '@playwright/test';

import { openGraduated, snap, watchErrors } from './helpers';

test('pathway map: locked chapters, briefing, objective and assembly hand-off', async ({ page }) => {
  const errors = watchErrors(page);
  await openGraduated(page);
  await page.getByRole('button', { name: 'CONTINUE' }).click();

  await expect(page.getByText('Choose your pathway')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Chapter 1: First Light/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Chapter 2: Return to the Moon.*locked$/ })).toBeVisible();
  await page.waitForTimeout(1500);
  await snap(page, 'p04-01-map-overview');

  // A locked chapter explains how to open it.
  await page.getByRole('button', { name: /^Chapter 2: Return to the Moon/ }).click();
  await expect(page.getByText(/Earn at least one star on/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'BRIEF ME' })).toHaveCount(0);

  // Chapter 1: details, then the briefing.
  await page.getByRole('button', { name: /^Chapter 1: First Light/ }).click();
  const details = page.getByRole('region', { name: 'First Light details' });
  await expect(details.getByText('About 400 km above the ground')).toBeVisible();
  await expect(details.getByText('$900M')).toBeVisible();
  await expect(details.getByText('Thrust-to-weight')).toBeVisible();
  await page.waitForTimeout(1200);
  await snap(page, 'p04-02-map-leo');
  await page.getByRole('button', { name: 'BRIEF ME' }).click();

  await expect(page.getByText('CHAPTER 1 · FIRST LIGHT')).toBeVisible();
  await expect(page.getByText(/Your first mission/)).toBeVisible();
  await page.waitForTimeout(1500);
  await snap(page, 'p04-03-briefing');
  await page.getByRole('button', { name: 'NEXT ▸' }).click();
  await expect(page.getByText(/7.7 kilometres per second/)).toBeVisible();
  await page.getByRole('button', { name: 'NEXT ▸' }).click();
  await expect(page.getByText(/Your budget is \$900M/)).toBeVisible();
  await page.getByRole('button', { name: 'SKIP' }).click();

  // The objective screen: the mission contract.
  await expect(page.getByRole('heading', { name: 'First Light' })).toBeVisible();
  await expect(page.getByText('Carry a camera or multispectral imager')).toBeVisible();
  await expect(page.getByText('Stay within $900M')).toBeVisible();
  await expect(page.getByText('Bring all 2 astronauts home safe and healthy')).toBeVisible();
  await expect(page.getByText('Survive re-entry at 7.8 km/s')).toBeVisible();
  await expect(page.getByText('★ Mass')).toBeVisible();
  await page.waitForTimeout(1000);
  await snap(page, 'p04-04-objective');

  await page.getByRole('button', { name: 'START DESIGN' }).click();
  await expect(page.getByRole('heading', { name: 'Assembly bay' })).toBeVisible();
  await page.getByRole('button', { name: 'BACK TO OBJECTIVE' }).click();
  await page.getByRole('button', { name: 'BACK TO MAP' }).click();
  await expect(page.getByText('Choose your pathway')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a star on chapter 1 unlocks the Moon', async ({ page }) => {
  await openGraduated(page, { leo: { stars: 1, bestScore: 62 } });
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  const moon = page.getByRole('button', { name: /^Chapter 2: Return to the Moon/ });
  await expect(moon).not.toHaveAccessibleName(/locked/);
  await moon.click();
  await expect(page.getByRole('button', { name: 'BRIEF ME' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Chapter 1: First Light/ })).toContainText('★');
});

test('every briefing works with ?unlock=all (robotic Jupiter mission)', async ({ page }) => {
  const errors = watchErrors(page);
  await openGraduated(page, {}, '?unlock=all');
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('button', { name: /^Chapter 4: The Giant/ }).click();
  await page.waitForTimeout(1200);
  await snap(page, 'p04-05-map-jupiter');
  await page.getByRole('button', { name: 'BRIEF ME' }).click();
  await expect(page.getByText('CHAPTER 4 · THE GIANT')).toBeVisible();
  await page.waitForTimeout(1500);
  await snap(page, 'p04-06-briefing-jupiter');
  await page.getByRole('button', { name: 'SKIP' }).click();
  await expect(page.getByText(/Robotic, flown from mission control/)).toBeVisible();
  await expect(page.getByText('Carry a magnetometer or plasma wave sensor')).toBeVisible();
  await expect(page.getByText(/radiation belts destroy unprotected electronics/)).toBeVisible();
  await expect(page.getByText(/Survive re-entry/)).toHaveCount(0);
  await snap(page, 'p04-07-objective-jupiter');

  const others = ['Chapter 5: Beyond: The Edge', 'Chapter 5: Beyond: Other Worlds', 'Chapter 3: The Long Road'];
  for (const chapter of others) {
    await page.getByRole('button', { name: 'BACK TO MAP' }).click();
    await page.getByRole('button', { name: new RegExp(`^${chapter}`) }).click();
    await page.getByRole('button', { name: 'BRIEF ME' }).click();
    await expect(page.getByText(/^CHAPTER \d · /)).toBeVisible();
    await page.getByRole('button', { name: 'SKIP' }).click();
    await expect(page.getByRole('button', { name: 'START DESIGN' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('pathway map fits a phone screen @phone', async ({ page }, testInfo) => {
  await openGraduated(page);
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.waitForTimeout(1500);
  await snap(page, 'p04-map-overview', testInfo.project.name);
  // On a phone the chapter list is the easy way in.
  await page.getByRole('button', { name: 'Select First Light' }).click();
  await expect(page.getByRole('button', { name: 'BRIEF ME' })).toBeInViewport();
  await page.waitForTimeout(1000);
  await snap(page, 'p04-map-leo', testInfo.project.name);
});
