import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';

import { SETTINGS_STORAGE_KEY, createGameStore } from './store';

function memoryStorage(initial: Record<string, string> = {}): StateStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

describe('game store', () => {
  it('starts at BOOT with default settings', () => {
    const store = createGameStore();
    expect(store.getState().phase).toBe('BOOT');
    expect(store.getState().settings).toEqual({ quality: 'high', reducedMotion: false });
    expect(store.getState().settingsOpen).toBe(false);
  });

  it('takes the reduced-motion default from the OS preference', () => {
    const store = createGameStore({ prefersReducedMotion: true });
    expect(store.getState().settings.reducedMotion).toBe(true);
  });

  it('allows valid transitions and rejects invalid ones', () => {
    const store = createGameStore();
    expect(store.getState().goTo('REPORT')).toBe(false);
    expect(store.getState().phase).toBe('BOOT');
    expect(store.getState().goTo('TITLE')).toBe(true);
    expect(store.getState().goTo('PROLOGUE')).toBe(true);
    expect(store.getState().phase).toBe('PROLOGUE');
    expect(store.getState().goTo('LAUNCH')).toBe(false);
    expect(store.getState().phase).toBe('PROLOGUE');
  });

  it('updates settings without touching the other ones', () => {
    const store = createGameStore();
    store.getState().setSetting('quality', 'low');
    expect(store.getState().settings).toEqual({ quality: 'low', reducedMotion: false });
    store.getState().setSettingsOpen(true);
    expect(store.getState().settingsOpen).toBe(true);
  });

  it('saves only the settings and the profile', () => {
    const storage = memoryStorage();
    const store = createGameStore({ storage });
    store.getState().goTo('TITLE');
    store.getState().setSetting('quality', 'low');
    const saved = JSON.parse(storage.data[SETTINGS_STORAGE_KEY]);
    expect(Object.keys(saved.state).sort()).toEqual(['profile', 'settings']);
    expect(saved.state.settings).toEqual({ quality: 'low', reducedMotion: false });
  });

  it('restores saved settings but always restarts at BOOT', () => {
    const storage = memoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        state: { settings: { quality: 'low', reducedMotion: true }, phase: 'REPORT' },
        version: 1,
      }),
    });
    const store = createGameStore({ storage });
    expect(store.getState().settings).toEqual({ quality: 'low', reducedMotion: true });
    expect(store.getState().phase).toBe('BOOT');
  });

  it('keeps defaults for settings missing from an older save', () => {
    const storage = memoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({ state: { settings: { quality: 'low' } }, version: 1 }),
    });
    const store = createGameStore({ storage, prefersReducedMotion: true });
    expect(store.getState().settings).toEqual({ quality: 'low', reducedMotion: true });
  });
});
