/** Approximate consumables per person per day, kg (game values). */
export const CONSUMABLES_PER_PERSON_DAY = { oxygen: 0.8, water: 3.0, food: 1.8 } as const;

/**
 * Supplies one person needs per day, kg. Recycling recovers a share of the
 * water and oxygen. Food is not recycled.
 * @param recycling share of water and oxygen recovered, 0..1
 */
export function consumablesPerPersonDay(recycling: number = 0): number {
  const share = Math.min(1, Math.max(0, recycling));
  const { oxygen, water, food } = CONSUMABLES_PER_PERSON_DAY;
  return food + (oxygen + water) * (1 - share);
}

/** Supplies for a crew over a number of days, kg. */
export function consumablesMass(crew: number, days: number, recycling: number = 0): number {
  return Math.max(0, crew) * Math.max(0, days) * consumablesPerPersonDay(recycling);
}
