import { expect, test } from '@playwright/test';

import { openGraduated, snap, watchErrors } from './helpers';

test('Phase 08 hot-seat team play: role proposals, pass-the-device handoff, Commander tie-break, in-flight negotiation dilemma, advisor bubbles & decision log', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await openGraduated(page, {}, '?unlock=all');
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('button', { name: /^Chapter 1: First Light/ }).click();
  await page.getByRole('button', { name: 'BRIEF ME' }).click();
  await page.getByRole('button', { name: 'SKIP' }).click();
  await page.getByRole('button', { name: 'START DESIGN' }).click();

  // 1. Verify Hot-Seat Crew Turn Bar in Assembly (Nova: CDR/SCI, Comet: ENG/COM)
  const turnBar = page.getByRole('region', { name: 'Hot-seat crew turn bar' });
  await expect(turnBar).toBeVisible();
  await expect(turnBar).toContainText('Nova (CDR/SCI)');
  await expect(turnBar).toContainText('Comet (ENG/COM)');

  // Turn on Role Proposals enforcement
  await turnBar.getByRole('button', { name: /Role Proposals: OFF/ }).click();
  await expect(turnBar.getByRole('button', { name: /Role Proposals: ON/ })).toHaveAttribute('aria-pressed', 'true');

  // Nova (CDR/SCI) attempts to equip the Spacecraft Bus (owned by Flight Engineer Comet) -> triggers Team Vote!
  await page
    .getByRole('article', { name: 'Crew capsule (2 seats)' })
    .getByRole('button', { name: 'Equip', exact: true })
    .click();

  const voteRegion = page.getByRole('region', { name: /Team Vote: Select Bus: Crew capsule/ });
  await expect(voteRegion).toBeVisible();
  await expect(voteRegion).toContainText('Lead Desk: Flight Engineer');
  await snap(page, 'p08-01-hotseat-assembly-proposal');

  // Enable Pass-the-Device Handoff Curtain and verify handoff banner
  await voteRegion.getByRole('button', { name: /Shared Screen Mode/ }).click();
  const handoff = page.getByRole('region', { name: /Pass device to Nova/ });
  await expect(handoff).toBeVisible();
  await handoff.getByRole('button', { name: 'I HAVE THE DEVICE — VOTE NOW' }).click();

  // Nova picks a reaction chip and votes Approve
  await voteRegion.getByRole('button', { name: 'Safe margins!' }).click();
  await voteRegion.getByRole('group', { name: 'Vote Options' }).getByRole('button', { name: /Approve Change/ }).click();

  // Next voter is Comet — reveal ballot and vote Object to trigger a 1-1 tie!
  const cometHandoff = page.getByRole('region', { name: /Pass device to Comet/ });
  await expect(cometHandoff).toBeVisible();
  await cometHandoff.getByRole('button', { name: 'I HAVE THE DEVICE — VOTE NOW' }).click();
  await voteRegion.getByRole('group', { name: 'Vote Options' }).getByRole('button', { name: /Object & Keep Current/ }).click();

  // 1-1 Tie! Mission Commander Tie-Break panel appears
  const tieBreak = page.getByRole('region', { name: 'Mission Commander Tie-Break' });
  await expect(tieBreak).toBeVisible();
  await snap(page, 'p08-02-commander-tiebreak');
  await tieBreak.getByRole('button', { name: /CDR Tie-Break: 👍 Approve Change/ }).click();

  // Turn off Role Proposals for rapid assembly of the remaining LEO parts
  await turnBar.getByRole('button', { name: /Role Proposals: ON/ }).click();

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
    await page.getByRole('article', { name: item.partName }).getByRole('button', { name: 'Equip', exact: true }).click();
  }
  await page.getByRole('button', { name: /Science Instruments/ }).click();
  await page.getByRole('article', { name: 'Multispectral imager' }).getByRole('button', { name: 'Equip', exact: true }).click();
  await page.getByLabel('Propellant mass in kg').fill('520');
  await page.getByLabel('Crew supplies in days').fill('6');

  // Launch into JOURNEY
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

  // 2. Trigger a Timed Team Negotiation Dilemma (N6) during flight
  const dilemmaBtn = page.getByRole('button', { name: /Team Dilemma/ });
  if (await dilemmaBtn.isVisible()) {
    await dilemmaBtn.click();
  }

  const eventModal = page.getByRole('region', { name: /In-flight event:/ });
  await expect(eventModal).toBeVisible();
  // Verify spacecraft design mitigation status and NPC advisor bubbles are visible
  await expect(eventModal.getByLabel('Spacecraft Design Mitigation Status')).toBeVisible();
  await expect(eventModal.getByLabel('Mission Control Advisor Recommendations')).toBeVisible();
  await snap(page, 'p08-03-inflight-negotiation-dilemma');

  // Cast team votes in the activeVote panel inside EventModal
  const inFlightVote = eventModal.getByRole('group', { name: 'Vote Options' });
  if (await inFlightVote.isVisible()) {
    // Both Nova and Comet vote for the first option (unanimous consensus)
    await inFlightVote.locator('button').first().click();
    await inFlightVote.locator('button').first().click();
  } else {
    await eventModal.getByRole('group', { name: 'Event Choices' }).locator('button').first().click();
  }

  // Verify the Post-Event Outcome & "Why" Explanation Card appears
  const outcomeCard = page.getByRole('region', { name: /Event outcome:/ });
  await expect(outcomeCard).toBeVisible();
  await expect(outcomeCard).toContainText('Why it happened:');
  await outcomeCard.getByRole('button', { name: /CONTINUE FLIGHT/ }).click();

  // 3. Open the Decision Log & Collaboration Metrics panel
  await page.getByRole('button', { name: /📋 Log/ }).click();
  const logRegion = page.getByRole('region', { name: 'Mission Decision Log and Collaboration Metrics' });
  await expect(logRegion).toBeVisible();
  await expect(logRegion).toContainText('Consensus Rate');
  await expect(logRegion).toContainText('Crew Participation');
  await snap(page, 'p08-04-decision-log-collaboration');

  expect(errors).toEqual([]);
});
