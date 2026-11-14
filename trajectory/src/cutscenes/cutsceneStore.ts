/**
 * Shared state between the 3D cutscene director (camera, sets) and the 2D
 * overlay (subtitles, skip button).
 */
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { CutsceneScript } from './timeline';

export interface CutsceneUiState {
  script: CutsceneScript | null;
  index: number;
  /** Bumped when the player asks for the next shot. */
  nextRequests: number;
  skipRequested: boolean;
  start: (script: CutsceneScript) => void;
  setIndex: (index: number) => void;
  requestNext: () => void;
  requestSkip: () => void;
  stop: () => void;
}

export const cutsceneStore = createStore<CutsceneUiState>()((set) => ({
  script: null,
  index: 0,
  nextRequests: 0,
  skipRequested: false,
  start: (script) => set({ script, index: 0, nextRequests: 0, skipRequested: false }),
  setIndex: (index) => set({ index }),
  requestNext: () => set((state) => ({ nextRequests: state.nextRequests + 1 })),
  requestSkip: () => set({ skipRequested: true }),
  stop: () => set({ script: null, index: 0, nextRequests: 0, skipRequested: false }),
}));

export function useCutscene<T>(selector: (state: CutsceneUiState) => T): T {
  return useStore(cutsceneStore, selector);
}
