import { expect, type Page, test } from '@playwright/test';

import { openGraduated, snap, watchErrors } from './helpers';

interface QuickBuildSpec {
  chapterButton: RegExp;
  busName: string;
  slotParts: { slotButton: RegExp; partName: string }[];
  instruments: string[];
  fuelMass?: string;
  supplyDays?: string;
  spinArmLength?: string;
  rocketId: string;
}

async function assembleAndFlyToJourney(page: Page, spec: QuickBuildSpec) {
  await openGraduated(page, {}, '?unlock=all');
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('button', { name: spec.chapterButton }).click();
  await page.getByRole('button', { name: 'BRIEF ME' }).click();
  await page.getByRole('button', { name: 'SKIP' }).click();
  await page.getByRole('button', { name: 'START DESIGN' }).click();

  await page.getByRole('article', { name: spec.busName }).getByRole('button', { name: 'Equip', exact: true }).click();
  for (const item of spec.slotParts) {
    await page.getByRole('button', { name: item.slotButton }).click();
    await page.getByRole('article', { name: item.partName }).getByRole('button', { name: 'Equip', exact: true }).click();
  }
  await page.getByRole('button', { name: /Science Instruments/ }).click();
  for (const inst of spec.instruments) {
    await page.getByRole('article', { name: inst }).getByRole('button', { name: 'Equip', exact: true }).click();
  }
  if (spec.fuelMass) {
    await page.getByLabel('Propellant mass in kg').fill(spec.fuelMass);
  }
  if (spec.supplyDays) {
    await page.getByLabel('Crew supplies in days').fill(spec.supplyDays);
  }
  if (spec.spinArmLength) {
    await page.getByLabel('Spin habitat arm length in metres').fill(spec.spinArmLength);
  }

  await page.getByRole('button', { name: /^SUBMIT TO ERB/ }).click();
  await page.getByRole('button', { name: 'PROCEED TO TRAJECTORY' }).click();
  await page.getByRole('button', { name: 'CHOOSE LAUNCH VEHICLE →' }).click();
  await page.getByTestId(`rocket-card-${spec.rocketId}`).click();
  await page.getByRole('button', { name: 'PROCEED TO GO / NO-GO POLL →' }).click();
  await page.getByRole('button', { name: 'ROLL OUT TO LAUNCH PAD →' }).click();
  await page.getByRole('button', { name: 'SKIP' }).click();

  await page.getByTestId('skip-to-insertion-btn').click();
  const insertionConsole = page.getByRole('region', { name: /Physics challenge:/ });
  await insertionConsole.getByRole('group', { name: 'Answers' }).locator('button').first().click();
  await insertionConsole.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('button', { name: 'PROCEED TO MISSION JOURNEY →' }).click();
}

test('Phase 07 LEO full journey: live dashboard, 3D view switcher, in-flight physics challenge, checkpoints, re-entry & report', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await assembleAndFlyToJourney(page, {
    chapterButton: /^Chapter 1: First Light/,
    busName: 'Crew capsule (2 seats)',
    slotParts: [
      { slotButton: /Power Source/, partName: 'Crew-rated solar wings' },
      { slotButton: /Battery/, partName: 'Medium battery' },
      { slotButton: /Flight Computer/, partName: 'Autonomous flight computer' },
      { slotButton: /Attitude Control/, partName: 'Reaction wheels' },
      { slotButton: /Communications/, partName: 'S-band antenna' },
      { slotButton: /Propulsion/, partName: 'Main engine' },
      { slotButton: /Thermal Control/, partName: 'Insulation blankets' },
      { slotButton: /Life Support/, partName: 'Stored supplies only' },
      { slotButton: /Heat Shield/, partName: 'Earth-orbit heat shield' },
    ],
    instruments: ['Multispectral imager'],
    fuelMass: '520',
    supplyDays: '6',
    rocketId: 'lv_medium',
  });

  // Verify Journey HUD and Live Telemetry Dashboard
  await expect(page.getByRole('heading', { name: /Mission Flight & Operations — Low Earth orbit/ })).toBeVisible();
  const dashboard = page.getByRole('complementary', { name: 'Live Mission Dashboard' });
  await expect(dashboard).toBeVisible();
  await expect(dashboard).toContainText('One-Way Light Delay');
  await expect(dashboard).toContainText('Crew Health');
  await snap(page, 'p07-01-leo-destination-view');

  // Switch 3D camera views (Destination -> Spacecraft Close-Up -> System Map -> Destination)
  const viewGroup = page.getByRole('group', { name: '3D Camera View' });
  await viewGroup.getByRole('button', { name: 'Spacecraft Close-Up' }).click();
  await expect(viewGroup.getByRole('button', { name: 'Spacecraft Close-Up' })).toHaveAttribute('aria-pressed', 'true');
  await snap(page, 'p07-02-spacecraft-closeup');

  await viewGroup.getByRole('button', { name: 'System Map' }).click();
  await expect(viewGroup.getByRole('button', { name: 'System Map' })).toHaveAttribute('aria-pressed', 'true');
  await snap(page, 'p07-03-system-map');

  await viewGroup.getByRole('button', { name: 'Destination View' }).click();

  // Step through milestones, answering any in-flight physics challenge or anomaly event
  for (let step = 0; step < 10; step++) {
    const endedRegion = page.getByRole('region', { name: 'Flight Outcome Summary' });
    if (await endedRegion.isVisible()) break;

    const challengeRegion = page.getByRole('region', { name: /Physics challenge:/ });
    if (await challengeRegion.isVisible()) {
      await snap(page, 'p07-04-inflight-physics-challenge');
      await challengeRegion.getByRole('button', { name: /gravity, acting as the centripetal force/ }).click();
      await expect(challengeRegion.getByText('Correct', { exact: true })).toBeVisible();
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

  // Verify Mission Complete summary and Re-entry checkpoint
  const outcomeRegion = page.getByRole('region', { name: 'Flight Outcome Summary' });
  await expect(outcomeRegion).toBeVisible();
  await expect(outcomeRegion).toContainText('Low Earth orbit Mission Accomplished');
  await expect(page.getByRole('region', { name: 'Mission Checkpoints' })).toContainText('Re-entry');
  await snap(page, 'p07-05-leo-complete');

  await page.getByRole('button', { name: 'PROCEED TO MISSION REPORT →' }).click();
  await expect(page.getByRole('heading', { name: /Flight Complete — Mission Evaluation & Debrief/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Phase 07 Exoplanet Transit Light-Curve & Artist Impression + Jupiter flyby trade-off scenario', async ({
  page,
}) => {
  const errors = watchErrors(page);

  // 1. Fly Chapter 5b (Exoplanet Observatory at Sun–Earth L2)
  await assembleAndFlyToJourney(page, {
    chapterButton: /^Chapter 5: Beyond: Other Worlds/,
    busName: 'Medium spacecraft bus',
    slotParts: [
      { slotButton: /Power Source/, partName: 'Medium solar array' },
      { slotButton: /Battery/, partName: 'Medium battery' },
      { slotButton: /Flight Computer/, partName: 'Autonomous flight computer' },
      { slotButton: /Attitude Control/, partName: 'Precision pointing system' },
      { slotButton: /Communications/, partName: 'X-band high-gain dish' },
      { slotButton: /Propulsion/, partName: 'Small thruster pack' },
      { slotButton: /Thermal Control/, partName: 'Insulation blankets' },
    ],
    instruments: ['Space telescope (0.6 m)', 'Transit photometer'],
    fuelMass: '90',
    rocketId: 'lv_medium',
  });

  await expect(page.getByRole('heading', { name: /Mission Flight & Operations — Sun–Earth L2/ })).toBeVisible();
  const lightCurve = page.getByRole('region', { name: 'Exoplanet Transit Light-Curve Analyzer' });
  await expect(lightCurve).toBeVisible();
  await expect(lightCurve).toContainText("Artist's impression from measured size and orbit");

  // Switch between target star systems in the light curve analyzer
  await lightCurve.getByRole('button', { name: /Earth Analogue around Sun-like Star/ }).click();
  await expect(lightCurve).toContainText('0.0084%');
  await lightCurve.getByRole('button', { name: /TRAPPIST-1e/ }).click();

  // Switch to the 3D Exoplanet System Artist's Impression view
  await lightCurve.getByRole('button', { name: 'VIEW 3D EXOPLANET SYSTEM' }).click();
  await expect(page.getByText(/Artist's impression from measured size and orbit \(TRAPPIST-1/)).toBeVisible();
  await snap(page, 'p07-06-exoplanet-trappist1-artist-impression');

  // 2. Fly Chapter 4 (Jupiter) to verify the 3D radiation belts and the Jupiter flyby trade-off challenge (C-ASSIST)
  await assembleAndFlyToJourney(page, {
    chapterButton: /^Chapter 4: The Giant/,
    busName: 'Medium spacecraft bus',
    slotParts: [
      { slotButton: /Power Source/, partName: 'Giant solar wings' },
      { slotButton: /Battery/, partName: 'Small battery' },
      { slotButton: /Flight Computer/, partName: 'Autonomous flight computer' },
      { slotButton: /Attitude Control/, partName: 'Reaction wheels' },
      { slotButton: /Communications/, partName: 'Ka-band large dish' },
      { slotButton: /Propulsion/, partName: 'Main engine' },
      { slotButton: /Radiation Shield/, partName: 'Titanium radiation vault' },
      { slotButton: /Thermal Control/, partName: 'Heaters and insulation' },
    ],
    instruments: ['Magnetometer', 'Microwave radiometer'],
    fuelMass: '560',
    rocketId: 'lv_heavy',
  });

  await expect(page.getByRole('heading', { name: /Mission Flight & Operations — Jupiter orbit/ })).toBeVisible();
  await snap(page, 'p07-07-jupiter-radiation-belts');

  // Advance through Jupiter journey and choose the close 2 R_J flyby on C-ASSIST
  let sawFlybyChallenge = false;
  for (let step = 0; step < 12; step++) {
    const endedRegion = page.getByRole('region', { name: 'Flight Outcome Summary' });
    if (await endedRegion.isVisible()) break;

    const challengeRegion = page.getByRole('region', { name: /Physics challenge:/ });
    if (await challengeRegion.isVisible()) {
      const title = await challengeRegion.locator('h3').textContent();
      if (title?.includes('Jupiter flyby')) {
        sawFlybyChallenge = true;
        await challengeRegion.getByRole('button', { name: /2 Jupiter radii/ }).click();
        await expect(challengeRegion.getByText('Decision made')).toBeVisible();
        await snap(page, 'p07-08-jupiter-flyby-tradeoff');
      } else {
        await challengeRegion.getByRole('group', { name: 'Answers' }).locator('button').first().click();
      }
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

  expect(sawFlybyChallenge).toBe(true);
  await expect(page.getByRole('region', { name: 'Mission Checkpoints' })).toContainText('Jupiter Perijove: 2 R_J');
  await expect(page.getByRole('region', { name: 'Flight Outcome Summary' })).toContainText(
    'Jupiter orbit Mission Accomplished',
  );
  await snap(page, 'p07-09-jupiter-mission-complete');

  expect(errors).toEqual([]);
});
