import { describe, expect, it } from 'vitest';

import { getLaunchVehicle } from '../data/loadData';
import {
  ASCENT_DURATION_S,
  atmosphericDensity,
  CLEAN_IGNITION_BONUS_DV,
  completeInsertion,
  createAscent,
  dynamicPressure,
  engageMaxQThrottle,
  insertionChallengeFor,
  SEA_LEVEL_DENSITY,
  skipToInsertion,
  stepAscent,
  targetOrbitalSpeed,
  targetParkingAltitude,
  toLaunchResult,
  triggerIgnition,
} from './ascent';
import { summarizeDesign } from './design';
import { WINNING_DESIGNS } from './fixtures/designs';
import { createMission } from './mission';

function setupLeoA() {
  const fixture = WINNING_DESIGNS.find((item) => item.name.startsWith('LEO A'))!;
  const mission = createMission(fixture.pathway, fixture.trajectory);
  const vehicle = getLaunchVehicle(fixture.vehicle);
  const summary = summarizeDesign(fixture.design, mission, vehicle);
  return { fixture, mission, vehicle, summary };
}

describe('ascent simulation (1D physics)', () => {
  it('models exponential atmospheric density decay and dynamic pressure', () => {
    expect(atmosphericDensity(0)).toBeCloseTo(SEA_LEVEL_DENSITY, 5);
    expect(atmosphericDensity(8_500)).toBeCloseTo(SEA_LEVEL_DENSITY / Math.E, 4);
    expect(atmosphericDensity(200_000)).toBe(0);

    const q0 = dynamicPressure(0, 100);
    expect(q0).toBeCloseTo(0.5 * SEA_LEVEL_DENSITY * 10_000, 2);
    expect(dynamicPressure(12_000, 0)).toBe(0);
  });

  it('computes target parking altitude and circular orbital velocity', () => {
    const leo400 = createMission('leo', 'leo_400');
    const leo550 = createMission('leo', 'leo_550');
    const mars = createMission('mars', 'mars_hohmann');

    expect(targetParkingAltitude(leo400)).toBe(400_000);
    expect(targetParkingAltitude(leo550)).toBe(550_000);
    expect(targetParkingAltitude(mars)).toBe(250_000);

    expect(targetOrbitalSpeed(400_000)).toBeCloseTo(7_672.5, 0);
    expect(targetOrbitalSpeed(550_000)).toBeCloseTo(7_589.0, 0);
  });

  it('awards +25 m/s Δv bonus for clean ignition near T-0 and nominal 0 m/s for early ignition', () => {
    const { mission, vehicle, summary } = setupLeoA();
    const initial = createAscent(mission, summary, vehicle);
    expect(initial.stage).toBe('countdown');
    expect(initial.t).toBe(-4);

    // Early ignition at T-4s: nominal, 0 bonus
    const early = triggerIgnition(initial);
    expect(early.ignitionStatus).toBe('nominal');
    expect(early.ignitionBonusDv).toBe(0);
    expect(early.t).toBe(0);
    expect(early.stage).toBe('stage1');

    // Advance countdown to T-0.3s, then trigger clean ignition
    const nearZero = stepAscent(initial, 3.7);
    expect(nearZero.t).toBeCloseTo(-0.3, 2);
    const clean = triggerIgnition(nearZero);
    expect(clean.ignitionStatus).toBe('clean');
    expect(clean.ignitionBonusDv).toBe(CLEAN_IGNITION_BONUS_DV);
    expect(clean.deltaVMargin).toBe(initial.baseDeltaVMargin + CLEAN_IGNITION_BONUS_DV);
  });

  it('progresses through Stage 1, Max-Q, MECO, Stage 2, Fairing Sep, and Orbit Insertion', () => {
    const { mission, vehicle, summary } = setupLeoA();
    let state = triggerIgnition(stepAscent(createAscent(mission, summary, vehicle), 3.6));
    const stagesSeen = new Set<string>([state.stage]);

    for (let i = 0; i < 120 && state.stage !== 'insertion'; i++) {
      state = stepAscent(state, 0.2);
      stagesSeen.add(state.stage);
      if (state.inMaxQWindow && !state.maxQHandled) {
        state = engageMaxQThrottle(state);
      }
    }

    expect(stagesSeen.has('stage1')).toBe(true);
    expect(stagesSeen.has('maxQ')).toBe(true);
    expect(stagesSeen.has('meco')).toBe(true);
    expect(stagesSeen.has('stage2')).toBe(true);
    expect(stagesSeen.has('fairing_sep')).toBe(true);
    expect(state.stage).toBe('insertion');
    expect(state.t).toBe(ASCENT_DURATION_S);
    expect(state.stage1Separated).toBe(true);
    expect(state.fairingSeparated).toBe(true);
    expect(state.maxQHandled).toBe(true);
    expect(state.structuralWarning).toBe(false);
    expect(state.altitudeM).toBeCloseTo(400_000, 0);
    expect(state.velocityMs).toBeCloseTo(7_672.5, 0);
  });

  it('flags a structural warning if Max-Q is not throttled down when bus G-margin is tight', () => {
    const { mission, vehicle, summary } = setupLeoA();
    // Simulate a tight G-margin where busMaxG is only 0.5g above vehicleMaxG
    let state = {
      ...triggerIgnition(createAscent(mission, summary, vehicle)),
      busMaxG: vehicle.maxG + 0.5,
    };

    for (let i = 0; i < 80 && state.t < 70; i++) {
      state = stepAscent(state, 0.2);
    }

    expect(state.maxQHandled).toBe(false);
    expect(state.structuralWarning).toBe(true);
    expect(state.warningMessage).toContain('Max-Q');
    expect(state.deltaVMargin).toBeLessThan(state.baseDeltaVMargin);
  });

  it('completes orbit insertion with a physics challenge and summarizes LaunchResult', () => {
    const { mission, vehicle, summary } = setupLeoA();
    const challenge = insertionChallengeFor({ mission, vehicle, summary });
    expect(challenge.topic).toBe('orbitSpeed');

    const insertionState = skipToInsertion(createAscent(mission, summary, vehicle));
    expect(insertionState.stage).toBe('insertion');

    const rightOption = challenge.options.find((o) => o.correct)!;
    const challengeResult = challenge.evaluate(rightOption.id);
    const orbitState = completeInsertion(insertionState, challengeResult);

    expect(orbitState.stage).toBe('orbit');
    expect(orbitState.stageLabel).toBe('Orbit');
    expect(orbitState.insertionResult?.correct).toBe(true);

    const launchResult = toLaunchResult(orbitState, vehicle.id);
    expect(launchResult.vehicleId).toBe(vehicle.id);
    expect(launchResult.finalAltitudeKm).toBe(400);
    expect(launchResult.finalVelocityKms).toBeCloseTo(7.67, 2);
  });
});
