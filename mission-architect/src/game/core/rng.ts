/**
 * Seeded random number generator (mulberry32).
 *
 * The game never calls Math.random(): every random choice goes through a
 * seeded generator so that the same seed and the same decisions always give
 * the same mission result (fair leaderboards, reproducible bugs).
 */

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  /** True with the given probability (0..1). */
  chance(probability: number): boolean;
  /** One element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const range = (min: number, max: number): number => min + (max - min) * next();

  return {
    next,
    range,
    int: (min, max) => Math.floor(range(min, max + 1)),
    chance: (probability) => next() < probability,
    pick: (items) => {
      if (items.length === 0) throw new Error('rng.pick: empty array');
      return items[Math.floor(next() * items.length)];
    },
  };
}

/** Turns a string (for example a mission name) into a 32-bit seed (FNV-1a). */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
