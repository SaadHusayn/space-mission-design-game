'use client';

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export type JourneyViewMode = 'system' | 'spacecraft' | 'destination' | 'exoplanet_artist';
export type TimeScale = 0 | 1 | 10 | 100 | 1000;

export interface JourneyViewState {
  viewMode: JourneyViewMode;
  timeScale: TimeScale;
  /** Selected target star in the Ch 5b Exoplanet Light-Curve analyzer. */
  exoplanetTarget: 'trappist1e' | 'trappist1b' | 'proximab' | 'sun_earth';
  setViewMode: (mode: JourneyViewMode) => void;
  setTimeScale: (scale: TimeScale) => void;
  setExoplanetTarget: (target: 'trappist1e' | 'trappist1b' | 'proximab' | 'sun_earth') => void;
  reset: (defaultMode?: JourneyViewMode) => void;
}

export const journeyViewStore = createStore<JourneyViewState>((set) => ({
  viewMode: 'destination',
  timeScale: 0,
  exoplanetTarget: 'trappist1e',
  setViewMode: (viewMode) => set({ viewMode }),
  setTimeScale: (timeScale) => set({ timeScale }),
  setExoplanetTarget: (exoplanetTarget) => set({ exoplanetTarget }),
  reset: (defaultMode = 'destination') =>
    set({
      viewMode: defaultMode,
      timeScale: 0,
      exoplanetTarget: 'trappist1e',
    }),
}));

export function useJourneyView<T>(selector: (state: JourneyViewState) => T): T {
  return useStore(journeyViewStore, selector);
}
