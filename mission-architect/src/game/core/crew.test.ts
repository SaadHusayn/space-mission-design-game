import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';

import { ROLE_IDS, createCrew, defaultRoleAssignment, holderOf, isCrewValid, normaliseCallSign, rotateRoles, validateCallSign } from './crew';
import { DEFAULT_PATCH, sanitisePatch } from './patch';
import { PROLOGUE_STEPS, nextPrologueStep } from './prologue';
import { SETTINGS_STORAGE_KEY, createGameStore, sanitiseProfile } from './store';

describe('roles', () => {
  it.each([1, 2, 3, 4])('every role is covered exactly once with %d player(s)', (count) => {
    const roles = defaultRoleAssignment(count).flat();
    expect(roles.sort()).toEqual([...ROLE_IDS].sort());
    expect(defaultRoleAssignment(count)).toHaveLength(count);
  });

  it('merges roles the way the plan says for two players', () => {
    expect(defaultRoleAssignment(2)).toEqual([
      ['commander', 'science'],
      ['engineer', 'comms'],
    ]);
  });

  it('rejects impossible crew sizes', () => {
    expect(() => defaultRoleAssignment(0)).toThrow();
    expect(() => defaultRoleAssignment(5)).toThrow();
  });

  it('rotates roles between players', () => {
    const crew = createCrew(3, ['Ava', 'Leo', 'Mira']);
    const rotated = rotateRoles(crew);
    expect(rotated[1].roles).toEqual(crew[0].roles);
    expect(rotated[0].roles).toEqual(crew[2].roles);
    expect(holderOf(rotated, 'commander')?.callSign).toBe('Leo');
    expect(rotateRoles(createCrew(1))[0].roles).toHaveLength(4);
  });
});

describe('call-signs', () => {
  it('accepts reasonable names and normalises spaces', () => {
    expect(validateCallSign('Nova')).toBeNull();
    expect(validateCallSign("Comet-7")).toBeNull();
    expect(validateCallSign('Lucía')).toBeNull();
    expect(normaliseCallSign('  Star   Lord ')).toBe('Star Lord');
  });

  it('rejects bad names with a helpful message', () => {
    expect(validateCallSign('A')).toMatch(/at least 2/);
    expect(validateCallSign('x'.repeat(17))).toMatch(/at most 16/);
    expect(validateCallSign('<script>')).toMatch(/letters/);
    expect(validateCallSign('nova', ['Nova'])).toMatch(/already/);
  });

  it('a crew is valid only with unique, valid names', () => {
    expect(isCrewValid(createCrew(2, ['Ava', 'Leo']))).toBe(true);
    expect(isCrewValid(createCrew(2, ['Ava', 'ava']))).toBe(false);
    expect(isCrewValid(createCrew(2, ['Ava', '']))).toBe(false);
    const broken = createCrew(2, ['Ava', 'Leo']);
    broken[1].roles = [];
    expect(isCrewValid(broken)).toBe(false);
  });
});

describe('prologue and patch', () => {
  it('walks the prologue steps in order and stops at the end', () => {
    expect(PROLOGUE_STEPS[0]).toBe('intro');
    expect(nextPrologueStep('crew')).toBe('selection');
    expect(nextPrologueStep('graduation')).toBeNull();
  });

  it('cleans patches', () => {
    expect(sanitisePatch(undefined)).toEqual(DEFAULT_PATCH);
    expect(sanitisePatch({ shape: 'triangle', motto: 'x'.repeat(40) }).shape).toBe('circle');
    expect(sanitisePatch({ motto: 'x'.repeat(40) }).motto).toHaveLength(24);
  });
});

describe('store: prologue and profile', () => {
  it('runs the prologue from the title to chapter select', () => {
    const store = createGameStore();
    store.getState().goTo('TITLE');
    expect(store.getState().startPrologue()).toBe(true);
    expect(store.getState().phase).toBe('PROLOGUE');
    for (let i = 0; i < PROLOGUE_STEPS.length - 1; i++) store.getState().advancePrologue();
    expect(store.getState().prologueStep).toBe('graduation');
    store.getState().advancePrologue();
    expect(store.getState().phase).toBe('CHAPTER_SELECT');
    expect(store.getState().profile.prologueDone).toBe(true);
  });

  it('can jump straight to training (replay from the menu)', () => {
    const store = createGameStore();
    store.getState().goTo('TITLE');
    expect(store.getState().startPrologue('training')).toBe(true);
    expect(store.getState().prologueStep).toBe('training');
  });

  it('refuses to start the prologue from the wrong phase', () => {
    const store = createGameStore();
    expect(store.getState().startPrologue()).toBe(false);
    expect(store.getState().phase).toBe('BOOT');
  });

  it('updates the profile', () => {
    const store = createGameStore();
    store.getState().setDifficulty('cadet');
    store.getState().setCrew(createCrew(2, ['Ava', 'Leo']));
    store.getState().markCutsceneSeen('CS-00');
    store.getState().markCutsceneSeen('CS-00');
    const { profile } = store.getState();
    expect(profile.difficulty).toBe('cadet');
    expect(profile.crew.map((member) => member.callSign)).toEqual(['Ava', 'Leo']);
    expect(profile.seenCutscenes).toEqual(['CS-00']);
  });

  it('saves and restores the profile, cleaning anything broken', () => {
    const data: Record<string, string> = {};
    const storage: StateStorage = {
      getItem: (key) => data[key] ?? null,
      setItem: (key, value) => {
        data[key] = value;
      },
      removeItem: (key) => {
        delete data[key];
      },
    };
    const first = createGameStore({ storage });
    first.getState().setCrew(createCrew(2, ['Ava', 'Leo']));
    first.getState().setDifficulty('director');
    const second = createGameStore({ storage });
    expect(second.getState().profile.crew.map((member) => member.callSign)).toEqual(['Ava', 'Leo']);
    expect(second.getState().profile.difficulty).toBe('director');

    data[SETTINGS_STORAGE_KEY] = JSON.stringify({
      state: { profile: { crew: [{ callSign: 'X'.repeat(40), roles: ['hacker'] }], difficulty: 'god', patch: 'nope' } },
      version: 2,
    });
    const third = createGameStore({ storage });
    const profile = third.getState().profile;
    expect(profile.difficulty).toBe('engineer');
    expect(profile.crew[0].callSign).toHaveLength(16);
    expect(profile.crew[0].roles).toHaveLength(4);
    expect(profile.patch).toEqual(DEFAULT_PATCH);
  });

  it('sanitises missing profiles to the default', () => {
    expect(sanitiseProfile(null).crew).toHaveLength(1);
  });
});
