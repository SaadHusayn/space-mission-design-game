import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { TRAINING_STEPS } from './steps';

export interface PartInfo {
  name: string;
  system: string;
  text: string;
}

/** What each part of the test spacecraft is (by node-name prefix). */
export const PART_INFO: readonly [prefix: string, info: PartInfo][] = [
  ['part_solar', { name: 'Solar array', system: 'Power', text: 'Turns sunlight into electricity. Farther from the Sun it makes much less.' }],
  ['part_boom', { name: 'Solar array boom', system: 'Structure', text: 'Holds the solar array away from the body so it can face the Sun.' }],
  ['part_antenna', { name: 'High-gain antenna', system: 'Communications', text: 'A dish that beams data to Earth. It must point accurately at Earth.' }],
  ['part_instrument', { name: 'Telescope', system: 'Science instrument', text: 'The reason the spacecraft exists: it collects the science data.' }],
  ['part_thruster', { name: 'Main thruster', system: 'Propulsion', text: 'Burns propellant to change speed. How much it can change is the Δv budget.' }],
  ['part_status_light', { name: 'Flight computer', system: 'Computer', text: 'The spacecraft’s brain. Far from Earth it must solve problems on its own.' }],
  ['part_body', { name: 'Spacecraft bus', system: 'Structure', text: 'The body that holds everything together. It limits how heavy the spacecraft can be.' }],
];

export function partInfoFor(nodeName: string): PartInfo | null {
  return PART_INFO.find(([prefix]) => nodeName.startsWith(prefix))?.[1] ?? null;
}

export interface TrainingState {
  step: number;
  orbited: boolean;
  zoomed: boolean;
  selected: string | null;
  swapped: boolean;
  answered: boolean;
  reset: () => void;
  next: () => void;
  markOrbited: () => void;
  markZoomed: () => void;
  select: (nodeName: string) => void;
  setSwapped: (swapped: boolean) => void;
  markAnswered: () => void;
}

export const trainingStore = createStore<TrainingState>()((set) => ({
  step: 0,
  orbited: false,
  zoomed: false,
  selected: null,
  swapped: false,
  answered: false,
  reset: () => set({ step: 0, orbited: false, zoomed: false, selected: null, swapped: false, answered: false }),
  next: () => set((state) => ({ step: Math.min(TRAINING_STEPS.length - 1, state.step + 1) })),
  markOrbited: () => set({ orbited: true }),
  markZoomed: () => set({ zoomed: true }),
  select: (nodeName) => set({ selected: nodeName }),
  setSwapped: (swapped) => set({ swapped }),
  markAnswered: () => set({ answered: true }),
}));

export function useTraining<T>(selector: (state: TrainingState) => T): T {
  return useStore(trainingStore, selector);
}

/** Is the current step's task done? */
export function taskDone(state: TrainingState): boolean {
  switch (TRAINING_STEPS[state.step].task) {
    case 'orbit':
      return state.orbited;
    case 'zoom':
      return state.zoomed;
    case 'select':
      return state.selected !== null;
    case 'swap':
      return state.swapped;
    case 'challenge':
      return state.answered;
    default:
      return true;
  }
}
