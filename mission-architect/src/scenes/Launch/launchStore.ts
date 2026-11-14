'use client';

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import {
  completeInsertion,
  createAscent,
  engageMaxQThrottle,
  skipToInsertion,
  stepAscent,
  triggerIgnition,
  type AscentState,
  type ChallengeResult,
  type DesignSummary,
  type LaunchVehicle,
  type MissionContext,
} from '@/game';

export interface LaunchStoreState {
  ascent: AscentState | null;
  timeScale: 1 | 2 | 4;
  init: (mission: MissionContext, summary: DesignSummary, vehicle: LaunchVehicle) => void;
  tick: (dtSeconds: number) => void;
  ignite: () => void;
  throttleDownMaxQ: () => void;
  setTimeScale: (scale: 1 | 2 | 4) => void;
  skipToOrbitInsertion: () => void;
  finishInsertion: (result: ChallengeResult) => void;
}

export const launchStore = createStore<LaunchStoreState>((set) => ({
  ascent: null,
  timeScale: 1,
  init: (mission, summary, vehicle) =>
    set({
      ascent: createAscent(mission, summary, vehicle),
      timeScale: 1,
    }),
  tick: (dtSeconds) =>
    set((state) => {
      if (!state.ascent) return state;
      const next = stepAscent(state.ascent, dtSeconds, state.timeScale);
      return next === state.ascent ? state : { ascent: next };
    }),
  ignite: () =>
    set((state) => {
      if (!state.ascent) return state;
      return { ascent: triggerIgnition(state.ascent) };
    }),
  throttleDownMaxQ: () =>
    set((state) => {
      if (!state.ascent) return state;
      return { ascent: engageMaxQThrottle(state.ascent) };
    }),
  setTimeScale: (scale) => set({ timeScale: scale }),
  skipToOrbitInsertion: () =>
    set((state) => {
      if (!state.ascent) return state;
      return { ascent: skipToInsertion(state.ascent) };
    }),
  finishInsertion: (result) =>
    set((state) => {
      if (!state.ascent) return state;
      return { ascent: completeInsertion(state.ascent, result) };
    }),
}));

export function useLaunch<T>(selector: (state: LaunchStoreState) => T): T {
  return useStore(launchStore, selector);
}
