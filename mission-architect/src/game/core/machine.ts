/**
 * Game phase state machine.
 *
 * Pure TypeScript: no React, no Three. The single persistent <Canvas> swaps
 * scenes based on the current phase, so every screen in the game maps to one
 * of these phases.
 */

export const PHASES = [
  'BOOT',
  'TITLE',
  'PROLOGUE',
  'CHAPTER_SELECT',
  'BRIEFING',
  'OBJECTIVE',
  'ASSEMBLY',
  'ERB_REVIEW',
  'TRAJECTORY',
  'LAUNCH_VEHICLE',
  'GO_NO_GO',
  'ROLLOUT',
  'LAUNCH',
  'JOURNEY',
  'OPERATIONS',
  'REPORT',
] as const;

export type Phase = (typeof PHASES)[number];

/** Allowed transitions. Anything not listed here is rejected by the store. */
export const TRANSITIONS: Readonly<Record<Phase, readonly Phase[]>> = {
  BOOT: ['TITLE'],
  TITLE: ['PROLOGUE', 'CHAPTER_SELECT'],
  PROLOGUE: ['CHAPTER_SELECT', 'TITLE'],
  CHAPTER_SELECT: ['BRIEFING', 'TITLE'],
  BRIEFING: ['OBJECTIVE', 'CHAPTER_SELECT'],
  OBJECTIVE: ['ASSEMBLY', 'CHAPTER_SELECT'],
  ASSEMBLY: ['ERB_REVIEW', 'OBJECTIVE'],
  ERB_REVIEW: ['TRAJECTORY', 'ASSEMBLY'],
  TRAJECTORY: ['LAUNCH_VEHICLE', 'ASSEMBLY'],
  LAUNCH_VEHICLE: ['GO_NO_GO', 'TRAJECTORY'],
  GO_NO_GO: ['ROLLOUT', 'LAUNCH_VEHICLE', 'ASSEMBLY'],
  ROLLOUT: ['LAUNCH'],
  // A launch can end early (abort), which goes straight to the report.
  LAUNCH: ['JOURNEY', 'REPORT'],
  JOURNEY: ['OPERATIONS', 'REPORT'],
  OPERATIONS: ['REPORT'],
  // Redesign & re-fly returns to assembly with the same design; Try another trajectory opens the trajectory room.
  REPORT: ['ASSEMBLY', 'TRAJECTORY', 'CHAPTER_SELECT', 'TITLE'],
};

export function isPhase(value: unknown): value is Phase {
  return typeof value === 'string' && (PHASES as readonly string[]).includes(value);
}

export function canTransition(from: Phase, to: Phase): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextPhases(from: Phase): readonly Phase[] {
  return TRANSITIONS[from];
}
