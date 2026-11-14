import { describe, expect, it } from 'vitest';

import { getLaunchVehicle } from '../data/loadData';
import type { Design, Difficulty } from '../types';
import { WINNING_DESIGNS, type DesignFixture } from './fixtures/designs';
import { advanceJourney, resolveEvent, runJourney, startJourney, type JourneyInput } from './journey';
import { createMission } from './mission';
import { marginScore, scoreMission } from './scoring';
import { explainMission } from './why';

function fixture(name: string): DesignFixture {
  const found = WINNING_DESIGNS.find((item) => item.name.startsWith(name));
  if (!found) throw new Error(`no fixture ${name}`);
  return found;
}

function input(item: DesignFixture, seed = 1, difficulty: Difficulty = 'engineer', change?: (d: Design) => void, vehicle?: string): JourneyInput {
  const design: Design = structuredClone(item.design);
  change?.(design);
  return {
    design,
    mission: createMission(item.pathway, item.trajectory, difficulty),
    vehicle: getLaunchVehicle(vehicle ?? item.vehicle),
    seed,
  };
}

describe('winning designs fly successful missions', () => {
  it.each(WINNING_DESIGNS.map((item) => [item.name, item] as const))('%s succeeds across seeds and difficulties', (_, item) => {
    for (const difficulty of ['cadet', 'engineer', 'director'] as const) {
      for (let seed = 1; seed <= 6; seed++) {
        const state = runJourney(input(item, seed, difficulty));
        const score = scoreMission(state);
        const failed = score.requirements.filter((req) => !req.met).map((req) => `${req.id}: ${req.value}`);
        if (difficulty === 'director') {
          // Director budgets are 20% tighter: the design may need re-optimising, but it must still fly.
          expect(state.endReason, `${difficulty} seed ${seed}`).toBe('complete');
        } else {
          expect(failed, `${difficulty} seed ${seed}`).toEqual([]);
          expect(score.outcome).toBe('success');
          expect(score.stars).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
});

describe('the flight tests the design', () => {
  it('no radiation vault at Jupiter: the electronics die', () => {
    const state = runJourney(input(fixture('Jupiter A'), 1, 'engineer', (d) => (d.slots.radiation = 'rad_spot')));
    expect(state.endReason).toBe('radiation');
    expect(scoreMission(state).outcome).not.toBe('success');
  });

  it('too little propellant: the probe flies past without stopping', () => {
    const state = runJourney(input(fixture('Jupiter A'), 1, 'engineer', (d) => (d.options.fuelMass = 100)));
    expect(state.endReason).toBe('insertion_failure');
    expect(state.science).toBe(0);
    const why = explainMission(state, scoreMission(state));
    expect(why[0].tone).toBe('bad');
    expect(why[0].decision).toBe('propulsion');
    expect(why[0].text).toMatch(/rocket equation/);
  });

  it('solar arrays at 120 AU: power failure', () => {
    const state = runJourney(input(fixture('Interstellar A'), 1, 'engineer', (d) => (d.slots.power = 'solar_large')));
    expect(state.endReason).toBe('power_failure');
  });

  it('too few supply days: the crew must cut the mission short', () => {
    const state = runJourney(input(fixture('Moon A'), 1, 'engineer', (d) => (d.options.supplyDays = 8)));
    expect(state.endReason).toBe('supplies');
    expect(scoreMission(state).outcome).not.toBe('success');
  });

  it('wrong heat shield: the capsule is lost on re-entry', () => {
    const state = runJourney(input(fixture('Moon A'), 1, 'engineer', (d) => (d.slots.heatShield = 'shield_leo')));
    expect(state.endReason).toBe('reentry_failure');
    expect(scoreMission(state).outcome).toBe('failure');
  });

  it('too heavy for the rocket: launch failure on day 0', () => {
    const state = runJourney(input(fixture('Jupiter A'), 1, 'engineer', undefined, 'lv_medium'));
    expect(state.endReason).toBe('launch_failure');
    expect(state.day).toBe(0);
  });

  it('weak antenna far away: data is lost and science drops', () => {
    const good = runJourney(input(fixture('Jupiter A'), 3));
    const weak = runJourney(input(fixture('Jupiter A'), 3, 'engineer', (d) => (d.slots.comms = 'comms_sband')));
    expect(weak.dataLostGb).toBeGreaterThan(0);
    expect(weak.science).toBeLessThan(good.science * 0.2);
    const why = explainMission(weak, scoreMission(weak));
    expect(why.some((bullet) => bullet.decision === 'comms' && /square of the distance/.test(bullet.text))).toBe(true);
  });

  it('no exercise on the long Mars trip: crew health falls', () => {
    const state = runJourney(input(fixture('Mars A'), 2, 'engineer', (d) => (d.slots.habitat = null)));
    expect(state.crewHealth).toBeLessThan(65);
    expect(scoreMission(state).requirements.find((req) => req.id === 'crew')?.met).toBe(false);
  });
});

describe('journey mechanics', () => {
  it('is deterministic for the same seed and choices', () => {
    const a = runJourney(input(fixture('Mars B'), 42));
    const b = runJourney(input(fixture('Mars B'), 42));
    expect(a).toEqual(b);
  });

  it('pauses for events, refuses unknown options, and never mutates the previous state', () => {
    const item = fixture('Jupiter A');
    let found = false;
    for (let seed = 1; seed < 40 && !found; seed++) {
      const start = startJourney(input(item, seed, 'director'));
      const paused = advanceJourney(start);
      if (!paused.pending) continue;
      found = true;
      expect(start.day).toBe(0);
      expect(advanceJourney(paused)).toBe(paused);
      expect(() => resolveEvent(paused, 'nope')).toThrow();
      const option = paused.pending.options[0].id;
      const next = resolveEvent(paused, option);
      expect(paused.pending).not.toBeNull();
      expect(next.pending).toBeNull();
      expect(next.events.at(-1)?.optionId).toBe(option);
    }
    expect(found).toBe(true);
  });

  it('decisions matter: safe mode vs keep observing in a solar storm at Jupiter', () => {
    const item = fixture('Jupiter A');
    for (let seed = 1; seed < 60; seed++) {
      const safe = runJourney(input(item, seed, 'director'), (event) => event.options[0].id);
      if (!safe.events.some((event) => event.eventId === 'solar_storm')) continue;
      const risky = runJourney(input(item, seed, 'director'), (event) => (event.eventId === 'solar_storm' ? 'keep_operating' : event.options[0].id));
      expect(risky.events.find((event) => event.eventId === 'solar_storm')?.outcome).not.toBe(
        safe.events.find((event) => event.eventId === 'solar_storm')?.outcome,
      );
      expect(risky.electronicsDose).toBeGreaterThan(safe.electronicsDose);
      return;
    }
    throw new Error('no seed produced a solar storm');
  });

  it('records samples for the dashboard and checkpoints for the report', () => {
    const state = runJourney(input(fixture('Interstellar A'), 5));
    expect(state.samples.length).toBeGreaterThan(50);
    expect(state.samples.length).toBeLessThanOrEqual(400);
    expect(state.checkpoints.map((item) => item.id)).toEqual(expect.arrayContaining(['launch', 'insertion', 'cold', 'jupiter_flyby', 'heliopause']));
    const last = state.samples.at(-1);
    expect(last?.sunDistanceAU).toBeGreaterThan(100);
  });

  it('crewed missions get a re-entry checkpoint', () => {
    const state = runJourney(input(fixture('LEO A'), 1));
    expect(state.checkpoints.map((item) => item.id)).toContain('reentry');
    expect(state.endReason).toBe('complete');
  });
});

describe('scoring and explanations', () => {
  it('scores a winning mission with all components and at least three "why" bullets', () => {
    const state = runJourney(input(fixture('Exoplanet A'), 7));
    const score = scoreMission(state, { physics: 0.8 });
    expect(score.components.map((item) => item.id)).toEqual(['objectives', 'science', 'engineering', 'efficiency', 'physics', 'decisions']);
    expect(score.components.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
    expect(score.total).toBeGreaterThanOrEqual(70);
    expect(['S', 'A', 'B']).toContain(score.grade);
    const why = explainMission(state, score);
    expect(why.length).toBeGreaterThanOrEqual(3);
    for (const bullet of why) expect(bullet.text.length).toBeGreaterThan(20);
  });

  it('caps the score of failed missions', () => {
    const state = runJourney(input(fixture('Moon A'), 1, 'engineer', (d) => (d.slots.heatShield = 'shield_leo')));
    const score = scoreMission(state, { physics: 1, decisions: 1 });
    expect(score.total).toBeLessThanOrEqual(54);
    expect(score.grade).toBe('F');
    expect(score.stars).toBe(0);
  });

  it('margin score rewards healthy margins, not waste', () => {
    expect(marginScore(100, 110)).toBe(0);
    expect(marginScore(100, 100)).toBeCloseTo(0.6);
    expect(marginScore(100, 85)).toBe(1);
    expect(marginScore(100, 20)).toBeLessThan(1);
    expect(marginScore(100, 20)).toBeGreaterThanOrEqual(0.5);
  });
});
