import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { PathwayId } from '@/game/types';

interface MapState {
  focused: PathwayId | null;
  focus: (id: PathwayId | null) => void;
}

/** Which pathway the map is showing details for (hover, click or keyboard focus). */
export const mapStore = createStore<MapState>()((set) => ({
  focused: null,
  focus: (focused) => set({ focused }),
}));

export function useMap<T>(selector: (state: MapState) => T): T {
  return useStore(mapStore, selector);
}

/** `?unlock=all` in the URL opens every chapter (for testing and demos). */
export function unlockAllFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('unlock') === 'all';
}
