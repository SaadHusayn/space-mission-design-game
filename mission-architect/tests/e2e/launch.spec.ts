import { expect, type Page, test } from '@playwright/test';

import { openGraduated, snap, watchErrors } from './helpers';

async function buildWinningLeoAndEnterTrajectory(page: Page) {
  await openGraduated(page, {}, '?unlock=all');
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('button', { name: /^Chapter 1: First Light/ }).click();
  await page.getByRole('button', { name: 'BRIEF ME' }).click();
  await page.getByRole('button', { name: 'SKIP' }).click();
  await page.getByRole('button', { name: 'START DESIGN' }).click();

  await page.getByRole('article', { name: 'Crew capsule (2 seats)' }).getByRole('button', { name: 'Equip', exact: true }).click();
  await page.getByRole('button', { name: /Power Source/ }).click();
  await page.getByRole('article', { name: 'Crew-rated solar wings' }).getByRole('button', { name: 'Equip', exact: true }).click();
  await page.getByRole('button', { name: /Battery/ }).click();
  await page.getByRole('article', { name: 'Medium battery' }).getByRole('button', { name: 'Equip', exact: true }).click();
  await page.getByRole('button', { name: /Flight Computer/ }).click();
  await page.getByRole('article', { name: 'Autonomous flight computer' }).getByRole('button', { name: 'Equip', exact: true }).click();
  await page.getByRole('button', { name: /Attitude Control/ }).click();
  await page.getByRole('article', { name: 'Reaction wheels' }).getByRole('button', { name: 'Equip', exact: true }).click();
  await page.getByRole('button', { name: /Communications/ }).click();
  await page.getByRole('article', { name: 'S-band antenna' }).getByRole('button', { name: 'Equip', exact: true }).click();
  await page.getByRole('button', { name: /Propulsion/ }).click();
  await page.getByRole('article', { name: 'Main engine' }).getByRole('button', { name: 'Equip', exact: true }).click();
  await page.getByRole('button', { name: /Thermal Control/ }).click();
  await page.getByRole('article', { name: 'Insulation blankets' }).getByRole('button', { name: 'Equip', exact: true }).click();
  await page.getByRole('button', { name: /Life Support/ }).click();
  await page.getByRole('article', { name: 'Stored supplies only' }).getByRole('button', { name: 'Equip', exact: true }).click();
  await page.getByRole('button', { name: /Heat Shield/ }).click();
  await page.getByRole('article', { name: 'Earth-orbit heat shield' }).getByRole('button', { name: 'Equip', exact: true }).click();
  await page.getByRole('button', { name: /Science Instruments/ }).click();
  await page.getByRole('article', { name: 'Multispectral imager' }).getByRole('button', { name: 'Equip', exact: true }).click();
  await page.getByLabel('Propellant mass in kg').fill('520');
  await page.getByLabel('Crew supplies in days').fill('6');

  await page.getByRole('button', { name: /^SUBMIT TO ERB/ }).click();
  await page.getByRole('button', { name: 'PROCEED TO TRAJECTORY' }).click();
}

test('Phase 06 full flow: trajectory room, rocket compatibility, GO/NO-GO gating, rollout, 3D launch & orbit insertion challenge', async ({ page }) => {
  const errors = watchErrors(page);
  await buildWinningLeoAndEnterTrajectory(page);

  // 1. Trajectory Design Room
  await expect(page.getByRole('heading', { name: /First Light: Flight Path & Transfer Selection/ })).toBeVisible();
  const card400 = page.getByTestId('trajectory-card-leo_400');
  const card550 = page.getByTestId('trajectory-card-leo_550');
  await expect(card400).toHaveAttribute('aria-pressed', 'true');
  await card550.click();
  await expect(card550).toHaveAttribute('aria-pressed', 'true');
  await card400.click();
  await expect(card400).toHaveAttribute('aria-pressed', 'true');
  await snap(page, 'p06-01-trajectory-room');

  await page.getByRole('button', { name: 'CHOOSE LAUNCH VEHICLE →' }).click();

  // 2. Launch Vehicle Selection
  await expect(page.getByRole('heading', { name: /Select Launch Vehicle for First Light/ })).toBeVisible();
  await expect(page.getByTestId('rocket-status-lv_light')).toContainText('NO-GO Incompatible');
  await expect(page.getByTestId('rocket-status-lv_medium')).toContainText('GO Compatible');

  // First select the incompatible Small launcher (lv_light) to verify GO/NO-GO gating
  await page.getByTestId('rocket-card-lv_light').click();
  await page.getByRole('button', { name: 'PROCEED TO GO / NO-GO POLL →' }).click();

  // 3. GO / NO-GO Review (NO-GO Hold with lv_light)
  await expect(page.getByTestId('go-no-go-verdict')).toContainText('HOLD — NO-GO');
  await expect(page.getByTestId('gonogo-check-ERB-1L')).toContainText('NO-GO');
  const rolloutBtn = page.getByRole('button', { name: 'ROLL OUT TO LAUNCH PAD →' });
  await expect(rolloutBtn).toBeDisabled();
  await snap(page, 'p06-02-gonogo-hold');

  // Return to Launch Vehicle selection and pick the compatible Medium two-stage launcher (lv_medium)
  await page.getByRole('button', { name: '← CHANGE LAUNCH VEHICLE' }).click();
  await page.getByTestId('rocket-card-lv_medium').click();
  await snap(page, 'p06-03-rocket-select');
  await page.getByRole('button', { name: 'PROCEED TO GO / NO-GO POLL →' }).click();

  // Verify GO / NO-GO Review passes all checks (ERB-1L, ERB-3, ERB-9, ERB-13)
  await expect(page.getByTestId('go-no-go-verdict')).toContainText('ALL STATIONS GO FOR LAUNCH');
  await expect(page.getByTestId('gonogo-check-ERB-1L')).toContainText('GO');
  await expect(page.getByTestId('gonogo-check-ERB-3')).toContainText('GO');
  await expect(page.getByTestId('gonogo-check-ERB-9')).toContainText('GO');
  await expect(page.getByTestId('gonogo-check-ERB-13')).toContainText('GO');
  await expect(rolloutBtn).toBeEnabled();
  await snap(page, 'p06-04-gonogo-go');
  await rolloutBtn.click();

  // 4. CS-04 Rollout Cutscene
  await expect(page.getByText(/LAUNCH COMPLEX · MEDIUM LIFTER/)).toBeVisible();
  await page.waitForTimeout(400);
  await snap(page, 'p06-05-rollout-cutscene');
  await page.getByRole('button', { name: 'SKIP' }).click();

  // 5. 3D Interactive Launch Sequence
  await expect(page.getByTestId('launch-stage-label')).toBeVisible();
  await page.getByRole('button', { name: 'IGNITE MAIN ENGINE (T-0)' }).click();
  await expect(page.getByTestId('launch-stage-label')).toContainText('Stage: Stage 1');
  await page.waitForTimeout(600);
  await snap(page, 'p06-06-launch-ascent');

  // Advance to Orbit Insertion challenge
  await page.getByTestId('skip-to-insertion-btn').click();
  await expect(page.getByTestId('launch-stage-label')).toContainText('Stage: Orbit Insertion');

  // 6. Orbit Insertion Physics Challenge
  const consoleRegion = page.getByRole('region', { name: /Physics challenge: How fast to stay in orbit\?/ });
  await expect(consoleRegion).toBeVisible();
  await consoleRegion.getByRole('button', { name: '7.67 km/s' }).click();
  await expect(consoleRegion.getByText('Correct', { exact: true })).toBeVisible();
  await snap(page, 'p06-07-orbit-insertion-challenge');
  await consoleRegion.getByRole('button', { name: 'CONTINUE' }).click();

  // 7. Orbit Achieved Summary -> Proceed to Journey
  await expect(page.getByTestId('orbit-achieved-panel')).toBeVisible();
  await expect(page.getByTestId('launch-stage-label')).toContainText('Stage: Orbit');
  await snap(page, 'p06-08-orbit-achieved');

  await page.getByRole('button', { name: 'PROCEED TO MISSION JOURNEY →' }).click();
  await expect(page.getByRole('heading', { name: /Orbit Insertion Complete — Deep-Space Journey/ })).toBeVisible();
  expect(errors).toEqual([]);
});
