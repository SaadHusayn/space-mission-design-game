import { describe, expect, it } from 'vitest';

import { getPart } from '../data/loadData';
import { createMission } from './mission';
import { incompatibilityReason, slotApplicable } from './compat';
import { emptyDesign } from '../types';

describe('part compatibility', () => {
  it('allows magnetorquers in low Earth orbit', () => {
    const mission = createMission('leo', 'leo_400');
    expect(incompatibilityReason(getPart('adcs_magnetorquer'), mission, emptyDesign())).toBeNull();
  });

  it('rejects magnetorquers far from Earth, with a reason', () => {
    const mission = createMission('jupiter', 'jupiter_direct');
    const reason = incompatibilityReason(getPart('adcs_magnetorquer'), mission, emptyDesign());
    expect(reason).toMatch(/magnetic field/i);
  });

  it('rejects crew systems on a robotic mission', () => {
    const mission = createMission('jupiter', 'jupiter_direct');
    expect(incompatibilityReason(getPart('ls_stored'), mission, emptyDesign())).toMatch(/robotic/i);
    expect(incompatibilityReason(getPart('hab_exercise'), mission, emptyDesign())).toMatch(/robotic/i);
  });

  it('rejects a heat shield when the mission never re-enters', () => {
    const mission = createMission('jupiter', 'jupiter_direct');
    expect(incompatibilityReason(getPart('shield_leo'), mission, emptyDesign())).toMatch(/atmosphere/i);
    const leo = createMission('leo', 'leo_400');
    expect(incompatibilityReason(getPart('shield_leo'), leo, emptyDesign())).toBeNull();
  });

  it('caps instruments by the bus slot count, with a reason', () => {
    const mission = createMission('leo', 'leo_400');
    const design = { ...emptyDesign(), busId: 'bus_small', instrumentIds: ['inst_imager'] };
    expect(incompatibilityReason(getPart('inst_camera'), mission, design)).toMatch(/room for 1 instrument/i);
    // The already-fitted instrument says "already on board".
    expect(incompatibilityReason(getPart('inst_imager'), mission, design)).toMatch(/already on board/i);
    const noBus = incompatibilityReason(getPart('inst_camera'), mission, emptyDesign());
    expect(noBus).toMatch(/choose a .*bus first/i);
  });

  it('hides crew-only slots on robotic pathways and keeps them for crews', () => {
    const jupiter = createMission('jupiter', 'jupiter_direct');
    expect(slotApplicable('lifeSupport', jupiter)).toBe(false);
    expect(slotApplicable('habitat', jupiter)).toBe(false);
    expect(slotApplicable('heatShield', jupiter)).toBe(false);
    expect(slotApplicable('power', jupiter)).toBe(true);
    const leo = createMission('leo', 'leo_400');
    expect(slotApplicable('lifeSupport', leo)).toBe(true);
    expect(slotApplicable('heatShield', leo)).toBe(true);
  });
});
