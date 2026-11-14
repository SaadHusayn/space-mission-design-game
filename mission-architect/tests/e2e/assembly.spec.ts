import { expect, test } from '@playwright/test';

import { openGraduated, snap, watchErrors } from './helpers';

test('spacecraft assembly & ERB: build LEO crewed design, test calculator/undo, fix ERB failures and pass', async ({ page }) => {
  const errors = watchErrors(page);
  await openGraduated(page);
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('button', { name: /^Chapter 1: First Light/ }).click();
  await page.getByRole('button', { name: 'BRIEF ME' }).click();
  await page.getByRole('button', { name: 'SKIP' }).click();
  await page.getByRole('button', { name: 'START DESIGN' }).click();

  await expect(page.getByRole('heading', { name: 'First Light: Assembly Bay' })).toBeVisible();
  await page.waitForTimeout(800);
  await snap(page, 'p05-01-assembly-empty');

  // Submit an empty design to ERB -> verify NO-GO gating and Fix button jump
  await page.getByRole('button', { name: /^SUBMIT TO ERB/ }).click();
  await expect(page.getByRole('heading', { name: 'Engineering Review Board (ERB)' })).toBeVisible();
  await expect(page.getByText('✗ NO-GO · FIX REQUIRED')).toBeVisible();
  await expect(page.getByRole('button', { name: 'PROCEED TO TRAJECTORY' })).toBeDisabled();
  await snap(page, 'p05-02-erb-failing');

  // Click Fix button to jump back to Assembly on the Bus slot
  await page.getByRole('button', { name: /Fix Spacecraft Bus/ }).first().click();
  await expect(page.getByRole('heading', { name: 'First Light: Assembly Bay' })).toBeVisible();

  // Equip Crew capsule (2 seats)
  const busCard = page.getByRole('article', { name: 'Crew capsule (2 seats)' });
  await busCard.getByRole('button', { name: 'Equip', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Latest engineering trade-off' })).toContainText('Crew capsule (2 seats)');

  // Test Undo and Redo
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(busCard.getByRole('button', { name: 'Equip', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(busCard.getByRole('button', { name: '✓ Selected Bus' })).toBeVisible();

  // Equip Power: Crew-rated solar wings
  await page.getByRole('button', { name: /Power Source/ }).click();
  await page.getByRole('article', { name: 'Crew-rated solar wings' }).getByRole('button', { name: 'Equip', exact: true }).click();

  // Equip Battery: Medium battery
  await page.getByRole('button', { name: /Battery/ }).click();
  await page.getByRole('article', { name: 'Medium battery' }).getByRole('button', { name: 'Equip', exact: true }).click();

  // Equip Flight Computer: Autonomous flight computer
  await page.getByRole('button', { name: /Flight Computer/ }).click();
  await page.getByRole('article', { name: 'Autonomous flight computer' }).getByRole('button', { name: 'Equip', exact: true }).click();

  // Equip Attitude Control: Reaction wheels
  await page.getByRole('button', { name: /Attitude Control/ }).click();
  await page.getByRole('article', { name: 'Reaction wheels' }).getByRole('button', { name: 'Equip', exact: true }).click();

  // Equip Communications: S-band antenna
  await page.getByRole('button', { name: /Communications/ }).click();
  await page.getByRole('article', { name: 'S-band antenna' }).getByRole('button', { name: 'Equip', exact: true }).click();

  // Equip Propulsion: Main engine
  await page.getByRole('button', { name: /Propulsion/ }).click();
  await page.getByRole('article', { name: 'Main engine' }).getByRole('button', { name: 'Equip', exact: true }).click();

  // Equip Thermal Control: Insulation blankets
  await page.getByRole('button', { name: /Thermal Control/ }).click();
  await page.getByRole('article', { name: 'Insulation blankets' }).getByRole('button', { name: 'Equip', exact: true }).click();

  // Equip Life Support: Stored supplies only
  await page.getByRole('button', { name: /Life Support/ }).click();
  await page.getByRole('article', { name: 'Stored supplies only' }).getByRole('button', { name: 'Equip', exact: true }).click();

  // Equip Heat Shield: Earth-orbit heat shield
  await page.getByRole('button', { name: /Heat Shield/ }).click();
  await page.getByRole('article', { name: 'Earth-orbit heat shield' }).getByRole('button', { name: 'Equip', exact: true }).click();

  // Equip Science Instrument: Multispectral imager
  await page.getByRole('button', { name: /Science Instruments/ }).click();
  await page.getByRole('article', { name: 'Multispectral imager' }).getByRole('button', { name: 'Equip', exact: true }).click();
  // Second instrument should be disabled because Crew capsule has room for 1 instrument
  await expect(page.getByText(/has room for 1 instrument and they are full/).first()).toBeVisible();

  // Set propellant and crew supplies
  await page.getByLabel('Propellant mass in kg').fill('520');
  await page.getByLabel('Crew supplies in days').fill('6');

  // Open Design Calculator and verify it displays rocket equation
  await page.getByRole('button', { name: 'Calculator' }).click();
  await expect(page.getByRole('heading', { name: 'Engineering Calculator' })).toBeVisible();
  await expect(page.getByText(/Δv = Isp · g₀ · ln/)).toBeVisible();
  await snap(page, 'p05-03-calculator');
  await page.getByRole('button', { name: 'CLOSE' }).click();

  // Toggle Exploded View
  await page.getByRole('button', { name: 'Exploded View' }).click();
  await page.waitForTimeout(500);
  await snap(page, 'p05-04-assembly-complete');

  // Submit to ERB -> all mandatory checks pass!
  await page.getByRole('button', { name: /^SUBMIT TO ERB/ }).click();
  await expect(page.getByText('✓ GO FOR TRAJECTORY')).toBeVisible();
  const proceedBtn = page.getByRole('button', { name: 'PROCEED TO TRAJECTORY' });
  await expect(proceedBtn).toBeEnabled();
  await snap(page, 'p05-05-erb-go');

  await proceedBtn.click();
  await expect(page.getByRole('heading', { name: 'Trajectory & Launch Vehicle' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('robotic Jupiter mission hides crew-only slots and disables magnetorquers with a reason', async ({ page }) => {
  const errors = watchErrors(page);
  await openGraduated(page, {}, '?unlock=all');
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('button', { name: /^Chapter 4: The Giant/ }).click();
  await page.getByRole('button', { name: 'BRIEF ME' }).click();
  await page.getByRole('button', { name: 'SKIP' }).click();
  await page.getByRole('button', { name: 'START DESIGN' }).click();

  await expect(page.getByRole('heading', { name: 'The Giant: Assembly Bay' })).toBeVisible();
  // Crew-only slots are hidden on robotic Jupiter mission
  await expect(page.getByRole('button', { name: /Life Support/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Crew Habitat/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Heat Shield/ })).toHaveCount(0);

  // Attitude control shows magnetorquers disabled with magnetic field explanation
  await page.getByRole('button', { name: /Attitude Control/ }).click();
  await expect(page.getByText(/Pushes against Earth’s magnetic field, which is far too weak out here/)).toBeVisible();
  expect(errors).toEqual([]);
});
