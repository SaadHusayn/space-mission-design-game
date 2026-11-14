import { describe, expect, it } from 'vitest';

import { getLaunchVehicle } from '../data/loadData';
import { summarizeDesign } from '../sim/design';
import { WINNING_DESIGNS } from '../sim/fixtures/designs';
import { createMission } from '../sim/mission';
import { challengesFor, generateChallenge, physicsMastery } from './generator';
import type { ChallengeContext } from './types';

function context(name: string): ChallengeContext {
  const item = WINNING_DESIGNS.find((fixture) => fixture.name.startsWith(name));
  if (!item) throw new Error(name);
  const mission = createMission(item.pathway, item.trajectory);
  const vehicle = getLaunchVehicle(item.vehicle);
  return { mission, vehicle, summary: summarizeDesign(item.design, mission, vehicle) };
}

describe('physics challenges', () => {
  it.each(WINNING_DESIGNS.map((item) => [item.name] as const))('%s: every challenge is well formed', (name) => {
    const challenges = challengesFor(context(name));
    expect(challenges.length).toBeGreaterThanOrEqual(2);
    for (const challenge of challenges) {
      expect(challenge.options.length).toBeGreaterThanOrEqual(3);
      expect(new Set(challenge.options.map((option) => option.label)).size, challenge.id).toBe(challenge.options.length);
      expect(challenge.formula.length).toBeGreaterThan(3);
      expect(challenge.givens.length).toBeGreaterThan(0);
      if (challenge.kind === 'single-correct') {
        expect(challenge.options.filter((option) => option.correct)).toHaveLength(1);
        for (const option of challenge.options) {
          const result = challenge.evaluate(option.id);
          expect(result.correct).toBe(option.correct === true);
          expect(result.explanation.length).toBeGreaterThan(30);
          if (!option.correct) {
            expect(option.misconception, `${challenge.id}/${option.id}`).toBeTruthy();
            expect(Object.keys(result.consequence).length).toBeGreaterThan(0);
          }
        }
      } else {
        for (const option of challenge.options) expect(challenge.evaluate(option.id).correct).toBeNull();
      }
      expect(() => challenge.evaluate('nope')).toThrow();
    }
  });

  it('orbit speed at 400 km is 7.67 km/s, and the centripetal force equals gravity there', () => {
    const ctx = context('LEO A');
    const orbit = generateChallenge('orbitSpeed', ctx);
    expect(orbit?.options.find((option) => option.correct)?.label).toBe('7.67 km/s');
    expect(orbit?.options.find((option) => option.id === 'escape')?.label).toBe('10.85 km/s');
    const force = generateChallenge('centripetal', ctx);
    const kn = (ctx.summary.dryMass * 8.694) / 1000;
    expect(force?.options.find((option) => option.correct)?.label).toContain(`${kn.toFixed(1)} kN`);
  });

  it('spin challenge uses the player\'s own arm: 85 m → 2.0 rpm', () => {
    const challenge = generateChallenge('artificialGravity', context('Mars B'));
    expect(challenge?.prompt).toContain('85 m');
    expect(challenge?.options.find((option) => option.correct)?.label).toBe('2.0 rpm');
  });

  it('sunlight at Jupiter follows the inverse-square law', () => {
    const challenge = generateChallenge('sunlight', context('Jupiter A'));
    expect(challenge?.options.find((option) => option.correct)?.label).toBe('518 W');
  });

  it('the Jupiter flyby is a trade-off: closer means more Δv but more radiation', () => {
    const challenge = generateChallenge('gravityAssist', context('Jupiter A'));
    expect(challenge?.kind).toBe('trade-off');
    const close = challenge!.evaluate('close');
    const far = challenge!.evaluate('far');
    expect(close.consequence.electronicsDose).toBeGreaterThan(far.consequence.electronicsDose ?? 0);
    expect(close.consequence.scienceFactor).toBeGreaterThan(far.consequence.scienceFactor ?? 0);
  });

  it('skips challenges that do not apply', () => {
    expect(generateChallenge('transit', context('LEO A'))).toBeNull();
    expect(generateChallenge('artificialGravity', context('Jupiter A'))).toBeNull();
    expect(generateChallenge('twr', { ...context('LEO A'), vehicle: null })).toBeNull();
  });

  it('keeps option order stable between calls', () => {
    const a = challengesFor(context('Mars A')).map((challenge) => challenge.options.map((option) => option.id));
    const b = challengesFor(context('Mars A')).map((challenge) => challenge.options.map((option) => option.id));
    expect(a).toEqual(b);
  });

  it('computes physics mastery from graded answers only', () => {
    expect(physicsMastery([])).toBeNull();
    const results = [
      { optionId: 'a', correct: true, explanation: '', consequence: {} },
      { optionId: 'b', correct: false, explanation: '', consequence: {} },
      { optionId: 'c', correct: null, explanation: '', consequence: {} },
    ];
    expect(physicsMastery(results)).toBe(0.5);
  });
});
