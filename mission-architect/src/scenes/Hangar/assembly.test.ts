import { describe, expect, it } from 'vitest';

import { createMission, emptyDesign, getPart, reviewDesign, summarizeDesign } from '@/game';
import { assemblyStore } from '@/scenes/Hangar/assemblyStore';
import { getSocketLayouts } from '@/three/Spacecraft';
import { selectBark } from '@/ui/EngineerBark';
import { targetSlotForCheck } from '@/ui/ReviewBoard';

describe('assemblyStore & 3D socket layouts (P05)', () => {
  it('manages selection, hover, exploded view, calculator, and requirements drawer', () => {
    const store = assemblyStore;
    store.getState().reset();
    expect(store.getState().selectedTarget).toBe('bus');
    expect(store.getState().exploded).toBe(false);

    store.getState().selectTarget('power');
    expect(store.getState().selectedTarget).toBe('power');

    store.getState().hoverTarget('comms');
    expect(store.getState().hoveredTarget).toBe('comms');

    store.getState().toggleExploded();
    expect(store.getState().exploded).toBe(true);

    store.getState().setCalculatorOpen(true);
    expect(store.getState().calculatorOpen).toBe(true);

    store.getState().setRequirementsOpen(true);
    expect(store.getState().requirementsOpen).toBe(true);

    store.getState().reset();
    expect(store.getState().selectedTarget).toBe('bus');
    expect(store.getState().exploded).toBe(false);
  });

  it('computes socket_* positions and offsets them in exploded view', () => {
    const bus = getPart('bus_medium');
    if (bus.category !== 'bus') throw new Error('expected bus');
    const normal = getSocketLayouts(bus, false);
    const exploded = getSocketLayouts(bus, true);

    expect(normal.power.name).toBe('socket_power');
    expect(normal.comms.name).toBe('socket_comms');
    expect(normal.instruments.name).toBe('socket_instrument_1');
    expect(exploded.comms.position[1]).toBeGreaterThan(normal.comms.position[1]);
    expect(exploded.propulsion.position[1]).toBeLessThan(normal.propulsion.position[1]);
  });

  it('maps failing ERB checks to the relevant assembly slots for quick fixing', () => {
    const mission = createMission('leo', 'leo_400');
    const design = emptyDesign();
    const review = reviewDesign(design, mission);
    const erb0 = review.checks.find((c) => c.id === 'ERB-0')!;
    expect(targetSlotForCheck(erb0, design, mission)).toBe('bus');

    design.busId = 'capsule_crew';
    expect(targetSlotForCheck(erb0, design, mission)).toBe('power');

    design.slots.power = 'solar_small';
    const powerReview = reviewDesign(design, mission);
    const erb4 = powerReview.checks.find((c) => c.id === 'ERB-4')!;
    expect(erb4.status).toBe('fail');
    expect(targetSlotForCheck(erb4, design, mission)).toBe('power');
  });

  it('selects context-sensitive engineer barks reacting to HUD warnings/deficits', () => {
    const jupiter = createMission('jupiter', 'jupiter_direct');
    const empty = emptyDesign();
    expect(selectBark(summarizeDesign(empty, jupiter), jupiter).speaker).toBe('kenji');

    // Overweight bus triggers Dr. Okafor's structural warning
    const heavy = { ...emptyDesign(), busId: 'bus_small', slots: { ...emptyDesign().slots, propulsion: 'prop_nuclear' } };
    const bark = selectBark(summarizeDesign(heavy, jupiter), jupiter);
    expect(bark.speaker).toBe('okafor');
    expect(bark.text).toMatch(/heavier than/i);
  });
});
