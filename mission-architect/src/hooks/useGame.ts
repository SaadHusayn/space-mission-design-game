import { useStore } from 'zustand';

import { gameStore, type GameState } from '@/game/core/store';

/** React binding for the framework-free game store. */
export function useGame<T>(selector: (state: GameState) => T): T {
  return useStore(gameStore, selector);
}
