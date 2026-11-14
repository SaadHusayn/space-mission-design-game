import { describe, expect, it } from 'vitest';

import { gameData, getLaunchVehicle } from '../data/loadData';
import { emptyDesign, type Design, type PathwayId } from '../types';
import { summarizeDesign } from './design';
import { WINNING_DESIGNS, type DesignFixture } from './fixtures/designs';
import { createMission } from './mission';
import { reviewDesign } from './review';

function fixture(name: string): DesignFixture {
  const found = WINNING_DESIGNS.find((item) => item.name.startsWith(name));
  if (!found) throw new Error(`no fixture ${name}`);
  return found;
}

function variant(base: DesignFixture, change: (design: Design) => void): Design {
  const design: Design = structuredClone(base.design);
  change(design);
  return design;
}

function run(base: DesignFixture, design: Design = base.design, vehicle = base.vehicle, trajectory = base.trajectory) {
  return reviewDesign(design, createMission(base.pathway, trajectory), getLaunchVehicle(vehicle));
}

function statusOf(result: ReturnType<typeof run>, id: string) {
  const found = result.checks.find((item) => item.id === id);
  if (!found) throw new Error(`check ${id} missing`);
  return found;
}

describe('balance: no single perfect solution', () => {
  it.each(WINNING_DESIGNS.map((item) => [item.name, item] as const))('%s gets GO and meets the science goal', (_, item) => {
    const result = run(item);
    const failures = result.checks.filter((entry) => entry.status === 'fail' || entry.status === 'pending');
    expect(failures.map((entry) => `${entry.id}: ${entry.explanation}`)).toEqual([]);
    expect(result.go).toBe(true);
    expect(result.summary.science).toBeGreaterThanOrEqual(createMission(item.pathway).pathway.scienceTarget);
  });

  it('has at least two different winning designs for every pathway', () => {
    for (const pathway of gameData.pathways) {
      const designs = WINNING_DESIGNS.filter((item) => item.pathway === pathway.id);
      expect(designs.length, pathway.id).toBeGreaterThanOrEqual(2);
      const fingerprints = new Set(designs.map((item) => JSON.stringify([item.design, item.trajectory, item.vehicle])));
      expect(fingerprints.size, pathway.id).toBe(designs.length);
    }
  });

  it('every pathway offers at least two trajectories, and both are used by a winning design somewhere', () => {
    for (const pathway of gameData.pathways) {
      expect(pathway.trajectories.length).toBeGreaterThanOrEqual(2);
      const used = new Set(WINNING_DESIGNS.filter((item) => item.pathway === pathway.id).map((item) => item.trajectory));
      expect(used.size, pathway.id).toBe(2);
    }
  });
});

describe('engineering review catches bad designs for the right reason', () => {
  it('an empty design lists every missing system', () => {
    const result = reviewDesign(emptyDesign(), createMission('jupiter'));
    const required = statusOf(result, 'ERB-0');
    expect(required.status).toBe('fail');
    expect(required.explanation).toMatch(/spacecraft bus/);
    expect(required.fixHint).toMatch(/power source/);
    expect(result.go).toBe(false);
  });

  it('marks rocket-dependent checks pending until a rocket is chosen', () => {
    const item = fixture('Jupiter A');
    const result = reviewDesign(item.design, createMission('jupiter', item.trajectory));
    for (const id of ['ERB-1L', 'ERB-3', 'ERB-9']) expect(statusOf(result, id).status).toBe('pending');
    expect(result.passable).toBe(true);
    expect(result.go).toBe(false);
    expect(statusOf(result, 'ERB-13').title).toMatch(/before the rocket/);
  });

  const cases: [string, string, string, (d: Design) => void, string?, string?][] = [
    ['Jupiter A', 'ERB-8', 'no radiation vault at Jupiter', (d) => (d.slots.radiation = 'rad_spot')],
    ['Jupiter A', 'ERB-12P', 'magnetorquers far from Earth', (d) => (d.slots.adcs = 'adcs_magnetorquer')],
    ['Jupiter A', 'ERB-7', 'no heaters at 5.2 AU', (d) => (d.slots.thermal = 'thermal_basic')],
    ['Jupiter A', 'ERB-1L', 'medium lifter on a direct trajectory', () => {}, 'lv_medium'],
    ['Jupiter A', 'ERB-13', 'super-heavy lifter blows the budget', () => {}, 'lv_superheavy'],
    ['Interstellar A', 'ERB-4', 'solar wings at 120 AU', (d) => (d.slots.power = 'solar_large')],
    ['LEO A', 'ERB-12S', 'a camera alone is too weak for the science goal', (d) => (d.instrumentIds = ['inst_camera'])],
    ['LEO A', 'ERB-5', 'battery too small for eclipses', (d) => (d.slots.battery = 'battery_small')],
    ['Moon A', 'ERB-10H', 'Earth-orbit heat shield on a lunar return', (d) => (d.slots.heatShield = 'shield_leo')],
    ['Moon A', 'ERB-10S', 'not enough supplies', (d) => (d.options.supplyDays = 10)],
    ['Moon A', 'ERB-2', 'not enough propellant', (d) => (d.options.fuelMass = 5000)],
    ['Mars A', 'ERB-11', 'no exercise or spin on a 589-day mission', (d) => (d.slots.habitat = null)],
    ['Mars A', 'ERB-8C', 'no crew shielding on the long transfer', (d) => (d.slots.radiation = null)],
    ['Mars A', 'ERB-6A', 'a computer that needs ground control at Mars', (d) => (d.slots.computer = 'computer_basic')],
    ['Mars A', 'ERB-10', 'a two-seat capsule for four astronauts', (d) => (d.busId = 'capsule_crew')],
    ['Exoplanet A', 'ERB-12', 'two instruments on a one-slot bus', (d) => (d.busId = 'bus_small')],
    ['Exoplanet A', 'ERB-12P', 'reaction wheels are not steady enough for a telescope', (d) => (d.slots.adcs = 'adcs_wheels')],
  ];

  it.each(cases)('%s: %s fails for %s', (name, id, _why, change, vehicle, trajectory) => {
    const base = fixture(name);
    const result = run(base, variant(base, change), vehicle ?? base.vehicle, trajectory ?? base.trajectory);
    const item = statusOf(result, id);
    expect(['fail', 'warn']).toContain(item.status);
    expect(item.explanation.length).toBeGreaterThan(20);
    expect(item.fixHint.length).toBeGreaterThan(10);
    expect(result.grade).not.toBe('A');
  });

  it('only flags real failures as fail (warns allow launch)', () => {
    const base = fixture('Mars A');
    const result = run(base);
    expect(statusOf(result, 'ERB-8C').status).toBe('warn');
    expect(result.go).toBe(true);
  });
});

describe('design physics', () => {
  it('85 m spin arm gives Mars-like gravity at a comfortable 2 rpm', () => {
    const base = fixture('Mars B');
    const summary = summarizeDesign(base.design, createMission('mars', base.trajectory));
    expect(summary.spinRpm).toBeCloseTo(2.0, 1);
    expect(summary.spinComfort).toBe('comfortable');
    expect(summary.spinArmMass).toBe(85 * 20);
    expect(summary.crewHealth).toBe(100);
  });

  it('a short arm must spin fast, which hurts crew comfort and health', () => {
    const base = fixture('Mars B');
    const design = variant(base, (d) => (d.options.spinArmLength = 20));
    const summary = summarizeDesign(design, createMission('mars', base.trajectory));
    expect(summary.spinRpm).toBeGreaterThan(4);
    expect(summary.spinComfort).toBe('uncomfortable');
    expect(summary.crewHealth).toBeLessThan(100);
  });

  it('adding mass costs Δv (the rocket equation)', () => {
    const base = fixture('Jupiter A');
    const mission = createMission('jupiter');
    const before = summarizeDesign(base.design, mission).deltaV;
    const heavier = variant(base, (d) => (d.slots.radiation = 'rad_hull'));
    expect(summarizeDesign(heavier, mission).deltaV).toBeLessThan(before);
  });

  it('fuel is limited by the tank size', () => {
    const base = fixture('Jupiter A');
    const design = variant(base, (d) => (d.options.fuelMass = 99_999));
    expect(summarizeDesign(design, createMission('jupiter')).fuelMass).toBe(3000);
  });

  it('solar power falls with the square of the distance; RTG power fades with time', () => {
    const jupiter = summarizeDesign(fixture('Jupiter A').design, createMission('jupiter'));
    expect(jupiter.powerAvailable).toBeCloseTo(14_000 / 5.2 ** 2, 0);
    const probe = summarizeDesign(fixture('Interstellar A').design, createMission('interstellar', 'interstellar_jga'));
    expect(probe.powerAvailable).toBeLessThan(470);
    expect(probe.powerAvailable).toBeGreaterThan(400);
  });

  it('difficulty changes the budget', () => {
    const ids: PathwayId[] = ['leo', 'mars'];
    for (const id of ids) {
      const engineer = createMission(id, undefined, 'engineer').budget;
      expect(createMission(id, undefined, 'cadet').budget).toBe(Math.round(engineer * 1.3));
      expect(createMission(id, undefined, 'director').budget).toBe(Math.round(engineer * 0.8));
    }
    expect(() => createMission('leo', 'nope')).toThrow();
  });

  it('ignores unknown or wrong-category part ids instead of crashing', () => {
    const design = emptyDesign();
    design.busId = 'solar_small';
    design.slots.power = 'does_not_exist';
    const summary = summarizeDesign(design, createMission('leo'));
    expect(summary.resolved.bus).toBeNull();
    expect(summary.resolved.power).toBeNull();
  });
});
