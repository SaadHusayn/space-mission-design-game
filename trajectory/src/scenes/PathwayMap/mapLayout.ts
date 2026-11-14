import type { PathwayId } from '@/game/types';

/**
 * Positions on the pathway map. Distances are compressed (not to scale) so
 * the whole journey fits on one screen; the real distances are shown as text.
 */
export const SUN: [number, number, number] = [0, 0, 0];
export const EARTH: [number, number, number] = [6.5, 0, 2.2];
export const MOON_OFFSET: [number, number, number] = [1.15, 0.15, 0.4];
export const L2_OFFSET: [number, number, number] = [1.9, 0.1, 0.65];
export const MARS: [number, number, number] = [-6.8, 0, 7.2];
export const JUPITER: [number, number, number] = [-13.5, 0, -6.5];
export const HELIOPAUSE_RADIUS = 24;
export const HELIOPAUSE_POINT: [number, number, number] = [18, 3, -14];
export const TRAPPIST: [number, number, number] = [25, 4, -19];

export const ORBIT_RADII = { earth: Math.hypot(EARTH[0], EARTH[2]), mars: Math.hypot(MARS[0], MARS[2]), jupiter: Math.hypot(JUPITER[0], JUPITER[2]) };

function add(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Where each pathway's label sits, and where the camera goes (and looks) when it's selected. */
export const PATHWAY_SPOTS: Readonly<
  Record<PathwayId, { marker: [number, number, number]; camera: [number, number, number]; target?: [number, number, number] }>
> = {
  leo: { marker: add(EARTH, [0, 0.75, 0]), camera: add(EARTH, [2.5, 2.2, 4.5]) },
  // The Moon's label sits below it so it never covers Earth's (Chapter 1) label.
  moon: { marker: add(add(EARTH, MOON_OFFSET), [0.6, -0.9, 0.6]), camera: add(EARTH, [3.5, 2.4, 4.5]), target: add(EARTH, [0.6, 0, 0.2]) },
  mars: { marker: add(MARS, [0, 0.85, 0]), camera: add(MARS, [3.5, 3, 5]) },
  jupiter: { marker: add(JUPITER, [0, 2, 0]), camera: add(JUPITER, [6, 4.5, 8]) },
  interstellar: { marker: HELIOPAUSE_POINT, camera: [10, 14, 6] },
  exoplanet: { marker: add(TRAPPIST, [0, 1.2, 0]), camera: add(TRAPPIST, [-12, 6, 12]) },
};

export const OVERVIEW_CAMERA: [number, number, number] = [6, 30, 34];
export const OVERVIEW_TARGET: [number, number, number] = [0, 0, 0];
