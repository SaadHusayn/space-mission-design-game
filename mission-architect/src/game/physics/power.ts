import { PU238_HALF_LIFE_YEARS } from './constants';

/** Share of Earth-level sunlight at a distance from the Sun: 1 / d² (d in AU). */
export function sunlightFraction(distanceAU: number): number {
  if (distanceAU <= 0) return 0;
  return 1 / (distanceAU * distanceAU);
}

/** Output of a solar array rated at 1 AU, at another distance from the Sun, W. */
export function solarPowerAt(powerAt1AU: number, distanceAU: number): number {
  return powerAt1AU * sunlightFraction(distanceAU);
}

/**
 * Output of a radioisotope generator after some years: P = P₀ · 0.5^(t / half-life), W.
 * Simplified: ignores the slow wear of the thermocouples.
 */
export function rtgPower(initialPower: number, years: number, halfLifeYears: number = PU238_HALF_LIFE_YEARS): number {
  return initialPower * 0.5 ** (Math.max(0, years) / halfLifeYears);
}
