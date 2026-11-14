import { describe, expect, it } from 'vitest';

import { PHASES, TRANSITIONS, canTransition, isPhase, nextPhases, type Phase } from './machine';

describe('phase machine', () => {
  it('defines transitions for every phase, all pointing at known phases', () => {
    for (const phase of PHASES) {
      expect(TRANSITIONS[phase], phase).toBeDefined();
      for (const target of TRANSITIONS[phase]) expect(isPhase(target), `${phase} -> ${target}`).toBe(true);
    }
  });

  it('can reach every phase from BOOT', () => {
    const seen = new Set<Phase>(['BOOT']);
    const queue: Phase[] = ['BOOT'];
    while (queue.length > 0) {
      const current = queue.shift() as Phase;
      for (const target of nextPhases(current)) {
        if (!seen.has(target)) {
          seen.add(target);
          queue.push(target);
        }
      }
    }
    expect([...seen].sort()).toEqual([...PHASES].sort());
  });

  it('never returns to BOOT and has no dead ends', () => {
    for (const phase of PHASES) {
      expect(TRANSITIONS[phase]).not.toContain('BOOT');
      expect(TRANSITIONS[phase].length, phase).toBeGreaterThan(0);
    }
  });

  it('follows the mission order and blocks skipping steps', () => {
    expect(canTransition('BOOT', 'TITLE')).toBe(true);
    expect(canTransition('ASSEMBLY', 'ERB_REVIEW')).toBe(true);
    expect(canTransition('ERB_REVIEW', 'ASSEMBLY')).toBe(true);
    expect(canTransition('REPORT', 'ASSEMBLY')).toBe(true);
    // The engineering review and the GO/NO-GO check can't be skipped.
    expect(canTransition('ASSEMBLY', 'LAUNCH')).toBe(false);
    expect(canTransition('ASSEMBLY', 'TRAJECTORY')).toBe(false);
    expect(canTransition('LAUNCH_VEHICLE', 'LAUNCH')).toBe(false);
    expect(canTransition('TITLE', 'REPORT')).toBe(false);
  });

  it('recognises phase names', () => {
    expect(isPhase('TITLE')).toBe(true);
    expect(isPhase('title')).toBe(false);
    expect(isPhase(42)).toBe(false);
  });
});
