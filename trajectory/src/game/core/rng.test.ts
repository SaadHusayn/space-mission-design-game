import { describe, expect, it } from 'vitest';

import { createRng, hashSeed } from './rng';

describe('seeded rng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRng(1234);
    const b = createRng(1234);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('gives different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const same = Array.from({ length: 20 }, () => a.next() === b.next()).filter(Boolean).length;
    expect(same).toBeLessThan(20);
  });

  it('stays inside [0, 1) and is roughly uniform', () => {
    const rng = createRng(99);
    let sum = 0;
    for (let i = 0; i < 20000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      sum += value;
    }
    expect(sum / 20000).toBeCloseTo(0.5, 1);
  });

  it('respects range and int bounds, including both int ends', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const f = rng.range(-2, 3);
      expect(f).toBeGreaterThanOrEqual(-2);
      expect(f).toBeLessThan(3);
      const n = rng.int(1, 6);
      expect(Number.isInteger(n)).toBe(true);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('handles chance extremes and pick', () => {
    const rng = createRng(5);
    for (let i = 0; i < 50; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
      expect(['a', 'b', 'c']).toContain(rng.pick(['a', 'b', 'c']));
    }
    expect(() => rng.pick([])).toThrow();
  });

  it('hashes strings to stable 32-bit seeds', () => {
    expect(hashSeed('mission-1')).toBe(hashSeed('mission-1'));
    expect(hashSeed('mission-1')).not.toBe(hashSeed('mission-2'));
    expect(Number.isInteger(hashSeed('x'))).toBe(true);
    expect(hashSeed('x')).toBeGreaterThanOrEqual(0);
    expect(hashSeed('x')).toBeLessThanOrEqual(0xffffffff);
  });
});
