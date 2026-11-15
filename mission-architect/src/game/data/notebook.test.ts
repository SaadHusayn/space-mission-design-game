import { describe, expect, it } from 'vitest';

import { createGameStore } from '../core/store';
import { NOTEBOOK_CARDS } from './notebook';

describe('Mission Notebook & Phase 10 settings', () => {
  it('provides physics concept cards across all categories with formulas and examples', () => {
    expect(NOTEBOOK_CARDS.length).toBeGreaterThanOrEqual(6);
    const categories = new Set(NOTEBOOK_CARDS.map((card) => card.category));
    expect(categories).toEqual(new Set(['Propulsion', 'Orbits', 'Power & Comms', 'Science']));

    for (const card of NOTEBOOK_CARDS) {
      expect(card.title.length).toBeGreaterThan(3);
      expect(card.formula.length).toBeGreaterThan(3);
      expect(card.summary.length).toBeGreaterThan(10);
      expect(card.example.length).toBeGreaterThan(10);
    }
  });

  it('initializes and updates audio, accessibility, and modal settings in the store', () => {
    const store = createGameStore();
    const initial = store.getState();

    expect(initial.settings.musicVolume).toBeCloseTo(0.45, 2);
    expect(initial.settings.sfxVolume).toBeCloseTo(0.7, 2);
    expect(initial.settings.muted).toBe(false);
    expect(initial.settings.largeText).toBe(false);
    expect(initial.settings.subtitles).toBe(true);
    expect(initial.settings.highContrast).toBe(false);
    expect(initial.pauseOpen).toBe(false);
    expect(initial.notebookOpen).toBe(false);

    initial.setSetting('muted', true);
    initial.setSetting('musicVolume', 0.25);
    initial.setSetting('largeText', true);
    initial.setSetting('highContrast', true);
    initial.setPauseOpen(true);
    initial.setNotebookOpen(true);

    const updated = store.getState();
    expect(updated.settings.muted).toBe(true);
    expect(updated.settings.musicVolume).toBeCloseTo(0.25, 2);
    expect(updated.settings.largeText).toBe(true);
    expect(updated.settings.highContrast).toBe(true);
    expect(updated.pauseOpen).toBe(true);
    expect(updated.notebookOpen).toBe(true);
  });
});
