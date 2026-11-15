import { expect, test } from '@playwright/test';

import { openGraduated, snap, watchErrors } from './helpers';

test('Phase 09 evaluation, mission report, CS-08 cutscene, Why analysis, ERB vs Reality, save/export, leaderboard, compare runs & redesign/re-fly', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await openGraduated(page, {}, '?unlock=all');
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('button', { name: /^Chapter 1: First Light/ }).click();
  await page.getByRole('button', { name: 'BRIEF ME' }).click();
  await page.getByRole('button', { name: 'SKIP' }).click();
  await page.getByRole('button', { name: 'START DESIGN' }).click();

  // Assemble LEO winning build
  await page
    .getByRole('article', { name: 'Crew capsule (2 seats)' })
    .getByRole('button', { name: 'Equip', exact: true })
    .click();
  const slotParts = [
    { slotButton: /Power Source/, partName: 'Crew-rated solar wings' },
    { slotButton: /Battery/, partName: 'Medium battery' },
    { slotButton: /Flight Computer/, partName: 'Autonomous flight computer' },
    { slotButton: /Attitude Control/, partName: 'Reaction wheels' },
    { slotButton: /Communications/, partName: 'S-band antenna' },
    { slotButton: /Propulsion/, partName: 'Main engine' },
    { slotButton: /Thermal Control/, partName: 'Insulation blankets' },
    { slotButton: /Life Support/, partName: 'Stored supplies only' },
    { slotButton: /Heat Shield/, partName: 'Earth-orbit heat shield' },
  ];
  for (const item of slotParts) {
    await page.getByRole('button', { name: item.slotButton }).click();
    await page
      .getByRole('article', { name: item.partName })
      .getByRole('button', { name: 'Equip', exact: true })
      .click();
  }
  await page.getByRole('button', { name: /Science Instruments/ }).click();
  await page
    .getByRole('article', { name: 'Multispectral imager' })
    .getByRole('button', { name: 'Equip', exact: true })
    .click();
  await page.getByLabel('Propellant mass in kg').fill('520');
  await page.getByLabel('Crew supplies in days').fill('6');

  // Pass ERB, select rocket, launch, and fly to completion
  await page.getByRole('button', { name: /^SUBMIT TO ERB/ }).click();
  await page.getByRole('button', { name: 'PROCEED TO TRAJECTORY' }).click();
  await page.getByRole('button', { name: 'CHOOSE LAUNCH VEHICLE →' }).click();
  await page.getByTestId('rocket-card-lv_medium').click();
  await page.getByRole('button', { name: 'PROCEED TO GO / NO-GO POLL →' }).click();
  await page.getByRole('button', { name: 'ROLL OUT TO LAUNCH PAD →' }).click();
  await page.getByRole('button', { name: 'SKIP' }).click();
  await page.getByTestId('skip-to-insertion-btn').click();
  const insertionConsole = page.getByRole('region', { name: /Physics challenge:/ });
  await insertionConsole.getByRole('group', { name: 'Answers' }).locator('button').first().click();
  await insertionConsole.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('button', { name: 'PROCEED TO MISSION JOURNEY →' }).click();

  for (let step = 0; step < 10; step++) {
    const endedRegion = page.getByRole('region', { name: 'Flight Outcome Summary' });
    if (await endedRegion.isVisible()) break;

    const challengeRegion = page.getByRole('region', { name: /Physics challenge:/ });
    if (await challengeRegion.isVisible()) {
      await challengeRegion.getByRole('button', { name: /gravity, acting as the centripetal force/ }).click();
      await challengeRegion.getByRole('button', { name: 'CONTINUE' }).click();
      continue;
    }

    const eventRegion = page.getByRole('region', { name: /In-flight event:/ });
    if (await eventRegion.isVisible()) {
      await eventRegion.getByRole('group', { name: 'Event Choices' }).locator('button').first().click();
      continue;
    }

    const nextBtn = page.getByRole('button', { name: 'NEXT CHECKPOINT ⏭' });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }
  }

  await page.getByRole('button', { name: 'PROCEED TO MISSION REPORT →' }).click();

  // 1. Verify full Mission Report & Debrief screen
  await expect(
    page.getByRole('heading', { name: /Flight Complete — Mission Evaluation & Debrief/ }),
  ).toBeVisible();
  await expect(page.getByText('MISSION SUCCESS', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Score Breakdown' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Mission Contract Requirements' })).toContainText(
    '5 / 5 Met',
  );

  // Verify ≥ 3 "Why" bullets and interactive 3D highlighting
  const whyRegion = page.getByRole('region', { name: 'Why It Worked or Failed Analysis' });
  await expect(whyRegion).toBeVisible();
  const whyItems = whyRegion.locator('ul > li');
  expect(await whyItems.count()).toBeGreaterThanOrEqual(3);
  await whyItems.first().locator('button').click();
  await expect(page.getByRole('region', { name: 'Another Way to Win Hint' })).toBeVisible();

  // Verify ERB vs Reality, Physics Recap, Crew Awards, and Real Missions cards
  await expect(page.getByRole('region', { name: 'ERB Predictions vs Flight Reality' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Physics Mastery Recap' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Crew Commendations and Awards' })).toContainText(
    'Best Call',
  );
  await expect(page.getByRole('region', { name: 'Real Missions Like Yours' })).toContainText(
    'International Space Station',
  );
  await snap(page, 'p09-01-mission-report-overview');

  // 2. Watch CS-08 Outcome Cutscene and skip back to report
  await page.getByRole('button', { name: /Watch Outcome Cutscene/ }).click();
  await expect(page.getByText(/TELEMETRY DOWNLINK ACTIVE/)).toBeVisible();
  await page.getByRole('button', { name: 'SKIP' }).click();
  await expect(
    page.getByRole('heading', { name: /Flight Complete — Mission Evaluation & Debrief/ }),
  ).toBeVisible();

  // 3. Save / Export Design modal
  await page.getByRole('button', { name: /Save \/ Share Design/ }).click();
  const saveModal = page.getByRole('dialog', {
    name: 'Save, Share and Import Spacecraft Design',
  });
  await expect(saveModal).toBeVisible();
  await saveModal.getByRole('button', { name: /Save Design Locally/ }).click();
  await expect(saveModal.getByText(/Saved Designs in Browser \(1\)/)).toBeVisible();
  await snap(page, 'p09-02-save-export-modal');
  await saveModal.getByRole('button', { name: '✕ Close' }).click();

  // 4. Chapter Leaderboard modal
  await page.getByRole('button', { name: /Chapter Leaderboard/ }).click();
  const lbModal = page.getByRole('dialog', { name: 'Chapter Mission Leaderboard' });
  await expect(lbModal).toBeVisible();
  await expect(lbModal).toContainText('#1');
  await expect(lbModal).toContainText('Nova');
  await snap(page, 'p09-03-chapter-leaderboard');
  await lbModal.getByRole('button', { name: '✕ Close' }).click();

  // 5. Compare Runs modal
  await page.getByRole('button', { name: /Compare Runs/ }).click();
  const compareModal = page.getByRole('dialog', { name: 'Compare Mission Runs' });
  await expect(compareModal).toBeVisible();
  await expect(compareModal).toContainText('Performance & Resource Metrics');
  await expect(compareModal).toContainText('Spacecraft Hardware & Trajectory Differences');
  await snap(page, 'p09-04-compare-runs');
  await compareModal.getByRole('button', { name: '✕ Close' }).click();

  // 6. Redesign & Re-fly returns to Assembly with the previous design loaded
  await page.getByRole('button', { name: /REDESIGN & RE-FLY/ }).click();
  await expect(page.getByLabel('Propellant mass in kg')).toHaveValue('520');
  await page.getByLabel('Propellant mass in kg').fill('480');
  await expect(page.getByLabel('Propellant mass in kg')).toHaveValue('480');

  expect(errors).toEqual([]);
});
