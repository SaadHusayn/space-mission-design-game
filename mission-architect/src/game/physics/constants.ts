/**
 * Physical constants (SI units unless the name says otherwise).
 * Values are rounded to the precision a learning game needs.
 */

/** Standard gravity at the Earth's surface, m/s². */
export const G0 = 9.81;
/** Astronomical unit, m. */
export const AU = 1.496e11;
/** Speed of light, m/s. */
export const LIGHT_SPEED = 299_792_458;
export const SECONDS_PER_DAY = 86_400;
export const DAYS_PER_YEAR = 365.25;
/** One light-year in astronomical units. */
export const LIGHT_YEAR_AU = 63_241;
/** Half-life of plutonium-238, the fuel in radioisotope generators, years. */
export const PU238_HALF_LIFE_YEARS = 87.7;

export interface Body {
  name: string;
  /** Gravitational parameter GM, m³/s². */
  gm: number;
  /** Mean radius (equatorial for Jupiter), m. */
  radius: number;
}

export const BODIES = {
  sun: { name: 'Sun', gm: 1.327e20, radius: 6.957e8 },
  earth: { name: 'Earth', gm: 3.986e14, radius: 6.371e6 },
  moon: { name: 'Moon', gm: 4.905e12, radius: 1.737e6 },
  mars: { name: 'Mars', gm: 4.283e13, radius: 3.39e6 },
  jupiter: { name: 'Jupiter', gm: 1.267e17, radius: 7.1492e7 },
} as const satisfies Record<string, Body>;

export type BodyId = keyof typeof BODIES;
