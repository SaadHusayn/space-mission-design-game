import { describe, expect, it } from 'vitest';

import { getPathway } from '../data/loadData';
import { createMission } from '../sim/mission';
import { durationText, instrumentGroupText, missionContract, travelTimeText } from '../sim/requirements';
import { isUnlocked, recordResult, sanitiseProgress, UNLOCKED_BY } from './progress';
import { createGameStore } from './store';

describe('chapter progress', () => {
  it('opens only the first chapter at the start', () => {
    expect(isUnlocked('leo', {})).toBe(true);
    for (const id of ['moon', 'mars', 'jupiter', 'interstellar', 'exoplanet'] as const) expect(isUnlocked(id, {})).toBe(false);
    expect(isUnlocked('mars', {}, true)).toBe(true);
  });

  it('opens the next chapter after at least one star', () => {
    expect(isUnlocked('moon', { leo: { stars: 0, bestScore: 40 } })).toBe(false);
    expect(isUnlocked('moon', { leo: { stars: 1, bestScore: 60 } })).toBe(true);
    expect(isUnlocked('exoplanet', { jupiter: { stars: 2, bestScore: 80 } })).toBe(true);
    expect(UNLOCKED_BY.interstellar).toBe('jupiter');
  });

  it('keeps the best result', () => {
    let progress = recordResult({}, 'leo', 2, 78);
    progress = recordResult(progress, 'leo', 1, 90);
    expect(progress.leo).toEqual({ stars: 2, bestScore: 90 });
    expect(recordResult({}, 'leo', 9, 400).leo).toEqual({ stars: 3, bestScore: 100 });
  });

  it('cleans saved progress', () => {
    expect(sanitiseProgress(null)).toEqual({});
    expect(sanitiseProgress({ leo: { stars: '3', bestScore: 50 }, pluto: { stars: 3 } })).toEqual({ leo: { stars: 0, bestScore: 50 } });
  });
});

describe('mission contract', () => {
  it('lists instruments, science, duration, budget, crew, Δv and re-entry for a crewed mission', () => {
    const items = missionContract(createMission('moon'));
    expect(items.map((item) => item.id)).toEqual(['instrument-0', 'science', 'duration', 'budget', 'crew', 'deltav', 'reentry']);
    expect(items[0].label).toBe('Carry an ice-mapping radar or multispectral imager');
    expect(items.find((item) => item.id === 'budget')?.label).toBe('Stay within $1,100M');
    expect(items.find((item) => item.id === 'reentry')?.label).toContain('11.0 km/s');
  });

  it('has no crew or re-entry items for a robotic mission, and uses the difficulty budget', () => {
    const items = missionContract(createMission('jupiter', undefined, 'cadet'));
    expect(items.some((item) => item.id === 'crew' || item.id === 'reentry')).toBe(false);
    expect(items.filter((item) => item.id.startsWith('instrument'))).toHaveLength(2);
    expect(items.find((item) => item.id === 'budget')?.label).toBe('Stay within $910M');
  });

  it('describes durations and travel times in plain words', () => {
    expect(durationText(13)).toBe('13 days');
    expect(durationText(589)).toBe('19 months');
    expect(durationText(1600)).toBe('4.4 years');
    expect(travelTimeText(getPathway('leo'))).toMatch(/starts in orbit/);
    expect(travelTimeText(getPathway('mars'))).toBe('6 months to 9 months');
    expect(travelTimeText(getPathway('interstellar'))).toBe('17.0 years to 32.9 years');
    expect(instrumentGroupText(['magnetometer', 'plasma'])).toBe('magnetometer or plasma wave sensor');
  });
});

describe('store: map → briefing → objective → assembly', () => {
  function graduated() {
    const store = createGameStore();
    store.getState().goTo('TITLE');
    store.getState().goTo('CHAPTER_SELECT');
    return store;
  }

  it('selects an unlocked pathway and walks to assembly', () => {
    const store = graduated();
    expect(store.getState().selectPathway('leo')).toBe(true);
    expect(store.getState().phase).toBe('BRIEFING');
    expect(store.getState().mission).toEqual({ pathwayId: 'leo', trajectoryId: null });
    expect(store.getState().openObjective()).toBe(true);
    expect(store.getState().acceptMission()).toBe(true);
    expect(store.getState().phase).toBe('ASSEMBLY');
  });

  it('refuses locked pathways unless everything is unlocked', () => {
    const store = graduated();
    expect(store.getState().selectPathway('mars')).toBe(false);
    expect(store.getState().phase).toBe('CHAPTER_SELECT');
    expect(store.getState().selectPathway('mars', true)).toBe(true);
  });

  it('goes back to the map from the briefing', () => {
    const store = graduated();
    store.getState().selectPathway('leo');
    expect(store.getState().backToMap()).toBe(true);
    expect(store.getState().phase).toBe('CHAPTER_SELECT');
  });

  it('records results and unlocks the next chapter', () => {
    const store = graduated();
    store.getState().recordMissionResult('leo', 2, 81);
    expect(store.getState().profile.progress.leo).toEqual({ stars: 2, bestScore: 81 });
    expect(store.getState().selectPathway('moon')).toBe(true);
  });
});
