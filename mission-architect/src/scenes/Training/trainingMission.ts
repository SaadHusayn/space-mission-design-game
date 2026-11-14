import { getLaunchVehicle } from '@/game/data/loadData';
import { generateChallenge } from '@/game/challenges/generator';
import { summarizeDesign } from '@/game/sim/design';
import { WINNING_DESIGNS } from '@/game/sim/fixtures/designs';
import { createMission } from '@/game/sim/mission';
import type { Design, Difficulty } from '@/game/types';

/** Training uses the reference exoplanet telescope design on a medium rocket. */
const BASE = WINNING_DESIGNS.find((item) => item.pathway === 'exoplanet' && item.trajectory === 'l2_direct');
if (!BASE) throw new Error('Training design missing from fixtures');

export function trainingDesign(bigArray: boolean): Design {
  const design: Design = structuredClone(BASE!.design);
  if (bigArray) design.slots.power = 'solar_large';
  return design;
}

export function trainingSetup(difficulty: Difficulty, bigArray: boolean) {
  const mission = createMission(BASE!.pathway, BASE!.trajectory, difficulty);
  const vehicle = getLaunchVehicle(BASE!.vehicle);
  const summary = summarizeDesign(trainingDesign(bigArray), mission, vehicle);
  return { mission, vehicle, summary };
}

export function trainingChallenge(difficulty: Difficulty) {
  const { mission, vehicle, summary } = trainingSetup(difficulty, false);
  const challenge = generateChallenge('twr', { mission, vehicle, summary });
  if (!challenge) throw new Error('Training challenge unavailable');
  return challenge;
}
