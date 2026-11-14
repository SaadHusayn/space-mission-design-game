import { expect, test, type Page } from '@playwright/test';

import { measureFps, openFresh, snap, watchErrors } from './helpers';

async function next(page: Page) {
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
}

test('the whole prologue: cutscenes, crew setup, training and graduation', async ({ page }) => {
  const errors = watchErrors(page);
  await openFresh(page);

  // Intro cutscene: subtitles, NEXT button and SKIP button.
  await page.getByRole('button', { name: 'NEW MISSION' }).click();
  await expect(page.getByText(/Pad 39, systems quiet/)).toBeVisible();
  await page.waitForTimeout(1500);
  await snap(page, '01-intro-launchpad');
  await page.getByRole('button', { name: 'NEXT ▸' }).click();
  await expect(page.getByText(/Every mission starts with a question/)).toBeVisible();
  await page.waitForTimeout(1200);
  await snap(page, '02-intro-orbit');
  await page.getByRole('button', { name: 'SKIP' }).click();

  // Nomination: skip by holding Escape.
  await expect(page.getByText(/nominated to the OEA astronaut class/)).toBeVisible();
  await page.waitForTimeout(1200);
  await snap(page, '03-nomination');
  await page.keyboard.down('Escape');
  await page.waitForTimeout(1000);
  await page.keyboard.up('Escape');

  // Crew setup: two players, duplicate names blocked, Cadet difficulty.
  await expect(page.getByRole('heading', { name: 'Who is in your astronaut class?' })).toBeVisible();
  await page.getByRole('button', { name: '2 players' }).click();
  await page.getByLabel('Player 1 call-sign').fill('Nova');
  await page.getByLabel('Player 2 call-sign').fill('nova');
  // Both players are told their call-signs clash.
  await expect(page.getByText('Another crew member already has this call-sign.')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'BEGIN SELECTION' })).toBeDisabled();
  await page.getByLabel('Player 2 call-sign').fill('Comet');
  await page.getByText('Cadet', { exact: false }).first().click();
  await expect(page.getByText('Flight Engineer')).toBeVisible();
  await snap(page, '04-crew-setup');
  await page.getByRole('button', { name: 'BEGIN SELECTION' }).click();

  // Selection montage: advance with the keyboard and the NEXT button.
  await expect(page.getByText(/The centrifuge/)).toBeVisible();
  await page.waitForTimeout(1500);
  await snap(page, '05-centrifuge');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/The simulator/)).toBeVisible();
  await page.waitForTimeout(1500);
  await snap(page, '06-simulator');
  await page.getByRole('button', { name: 'NEXT ▸' }).click();
  await expect(page.getByText(/The pool/)).toBeVisible();
  await page.waitForTimeout(1500);
  await snap(page, '07-pool');
  await page.getByRole('button', { name: 'SKIP' }).click();

  // Training step 1: look around (drag).
  await expect(page.getByText('Astronaut training')).toBeVisible();
  await page.waitForTimeout(1500);
  await snap(page, '08-training-start');
  await expect(page.getByRole('button', { name: 'NEXT', exact: true })).toBeDisabled();
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.mouse.move(450, 440, { steps: 15 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'NEXT', exact: true })).toBeEnabled();
  await next(page);

  // Step 2: zoom (move the mouse back over the 3D view first: NEXT left it over the dialogue).
  await page.mouse.move(800, 400);
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(50);
  }
  await expect(page.getByRole('button', { name: 'NEXT', exact: true })).toBeEnabled();
  await next(page);

  // Step 3: click a part.
  await page.mouse.click(800, 470);
  await expect(page.getByText(/Spacecraft bus|Telescope|Solar array|High-gain antenna|Main thruster|Flight computer/).first()).toBeVisible();
  await snap(page, '09-training-part');
  await next(page);

  // Step 4: the solar array trade-off updates the resource panel.
  await page.getByRole('button', { name: 'FIT BIGGER SOLAR ARRAY' }).click();
  await expect(page.getByText('+270 kg')).toBeVisible();
  await page.waitForTimeout(600);
  await snap(page, '10-training-tradeoff');
  await next(page);
  await next(page);

  // Step 6: physics question (Cadet shows a worked hint).
  await expect(page.getByRole('heading', { name: 'Will it lift off?' })).toBeVisible();
  await expect(page.getByText(/^Hint:/)).toBeVisible();
  await page.getByRole('group', { name: 'Answers' }).getByRole('button', { name: '1.55', exact: true }).click();
  await expect(page.getByText(/^Correct!/)).toBeVisible();
  await snap(page, '11-physics');
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await next(page);
  await page.getByRole('button', { name: 'GRADUATE' }).click();

  // Graduation: design the patch.
  await expect(page.getByRole('heading', { name: 'Welcome to the astronaut class' })).toBeVisible();
  await page.getByRole('button', { name: 'Symbol planet' }).click();
  await expect(page.getByRole('img', { name: /planet on a circle/ })).toBeVisible();
  await snap(page, '12-graduation');
  await page.getByRole('button', { name: 'GO TO MISSION CONTROL' }).click();

  // Mission Control opens the pathway map; the save survives a reload.
  await expect(page.getByText('Choose your pathway')).toBeVisible();
  await expect(page.getByRole('img', { name: /planet/ })).toBeVisible();
  await snap(page, '13-mission-control');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('trajectory:settings') ?? '{}'));
  expect(saved.state.profile.prologueDone).toBe(true);
  expect(saved.state.profile.difficulty).toBe('cadet');
  expect(saved.state.profile.patch.symbol).toBe('planet');
  await page.reload();
  await expect(page.getByRole('button', { name: 'CONTINUE' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'TRAINING' })).toBeVisible();

  test.info().annotations.push({ type: 'fps', description: String(await measureFps(page)) });
  expect(errors).toEqual([]);
});
