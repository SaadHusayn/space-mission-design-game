import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import type { SlotId } from '@/game/types';

/** Everything that can be selected in the assembly bay: the bus, a single-part slot, or the instruments bay. */
export type AssemblyTarget = 'bus' | SlotId | 'instruments';

export interface AssemblyUiState {
  selectedTarget: AssemblyTarget;
  hoveredTarget: AssemblyTarget | null;
  exploded: boolean;
  calculatorOpen: boolean;
  requirementsOpen: boolean;
  selectTarget: (target: AssemblyTarget) => void;
  hoverTarget: (target: AssemblyTarget | null) => void;
  setExploded: (exploded: boolean) => void;
  toggleExploded: () => void;
  setCalculatorOpen: (open: boolean) => void;
  setRequirementsOpen: (open: boolean) => void;
  reset: () => void;
}

export const assemblyStore = createStore<AssemblyUiState>()((set) => ({
  selectedTarget: 'bus',
  hoveredTarget: null,
  exploded: false,
  calculatorOpen: false,
  requirementsOpen: false,
  selectTarget: (selectedTarget) => set({ selectedTarget }),
  hoverTarget: (hoveredTarget) => set({ hoveredTarget }),
  setExploded: (exploded) => set({ exploded }),
  toggleExploded: () => set((state) => ({ exploded: !state.exploded })),
  setCalculatorOpen: (calculatorOpen) => set({ calculatorOpen }),
  setRequirementsOpen: (requirementsOpen) => set({ requirementsOpen }),
  reset: () =>
    set({
      selectedTarget: 'bus',
      hoveredTarget: null,
      exploded: false,
      calculatorOpen: false,
      requirementsOpen: false,
    }),
}));

export function useAssembly<T>(selector: (state: AssemblyUiState) => T): T {
  return useStore(assemblyStore, selector);
}
