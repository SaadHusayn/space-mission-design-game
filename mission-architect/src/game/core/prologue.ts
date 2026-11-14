/**
 * The prologue: from nomination to graduation, in order.
 */
export const PROLOGUE_STEPS = ['intro', 'nomination', 'crew', 'selection', 'training', 'graduation'] as const;
export type PrologueStep = (typeof PROLOGUE_STEPS)[number];

/** The step after `step`, or null at the end of the prologue. */
export function nextPrologueStep(step: PrologueStep): PrologueStep | null {
  const index = PROLOGUE_STEPS.indexOf(step);
  return index < PROLOGUE_STEPS.length - 1 ? PROLOGUE_STEPS[index + 1] : null;
}

export function isPrologueStep(value: unknown): value is PrologueStep {
  return typeof value === 'string' && (PROLOGUE_STEPS as readonly string[]).includes(value);
}
