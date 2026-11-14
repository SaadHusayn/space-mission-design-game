/**
 * Game store (framework-free).
 *
 * Uses zustand's vanilla store so that src/game/** never imports React.
 * React components read it through the `useGame` hook in src/hooks.
 */
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { Difficulty, PathwayId } from '../types';
import { AVATAR_COLOURS, MAX_CREW, ROLE_IDS, createCrew, type CrewMember } from './crew';
import { canTransition, type Phase } from './machine';
import { DEFAULT_PATCH, sanitisePatch, type MissionPatch } from './patch';
import { isUnlocked, recordResult, sanitiseProgress, type Progress } from './progress';
import { isPrologueStep, nextPrologueStep, type PrologueStep } from './prologue';

export type Quality = 'low' | 'high';

export interface Settings {
  /** Low turns off the expensive effects and renders at 1x pixel ratio. */
  quality: Quality;
  /** Stops camera drift and other non-essential motion. */
  reducedMotion: boolean;
}

/** Everything about the player's astronaut class that is kept between visits. */
export interface Profile {
  crew: CrewMember[];
  difficulty: Difficulty;
  patch: MissionPatch;
  /** Training finished at least once. */
  prologueDone: boolean;
  /** Cutscenes already watched. */
  seenCutscenes: string[];
  /** Best result per pathway (unlocks the next chapters). */
  progress: Progress;
}

/** The mission being planned right now. */
export interface CurrentMission {
  pathwayId: PathwayId;
  trajectoryId: string | null;
}

export interface GameState {
  phase: Phase;
  settings: Settings;
  settingsOpen: boolean;
  profile: Profile;
  prologueStep: PrologueStep;
  mission: CurrentMission | null;

  /** Moves to another phase. Returns false if the transition isn't allowed. */
  goTo: (phase: Phase) => boolean;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setSettingsOpen: (open: boolean) => void;

  setCrew: (crew: CrewMember[]) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setPatch: (patch: MissionPatch) => void;
  markCutsceneSeen: (id: string) => void;
  /** Starts the prologue at a step (from the title screen). */
  startPrologue: (step?: PrologueStep) => boolean;
  /** Moves to the next prologue step; after graduation, opens chapter select. */
  advancePrologue: () => void;

  /** Chapter select → briefing for a pathway. Refused if the pathway is locked (unless `unlockAll`). */
  selectPathway: (pathwayId: PathwayId, unlockAll?: boolean) => boolean;
  /** Briefing → objective screen. */
  openObjective: () => boolean;
  /** Objective → spacecraft assembly. */
  acceptMission: () => boolean;
  /** Briefing or objective → back to the map. */
  backToMap: () => boolean;
  /** Saves a finished mission's stars and score. */
  recordMissionResult: (pathwayId: PathwayId, stars: number, score: number) => void;
}

export interface GameStoreOptions {
  /** Where settings and the profile are saved. Leave out to keep everything in memory. */
  storage?: StateStorage;
  /** Initial value for reduced motion (from the OS preference). */
  prefersReducedMotion?: boolean;
}

export const SETTINGS_STORAGE_KEY = 'trajectory:settings';

export function defaultProfile(): Profile {
  return { crew: createCrew(1), difficulty: 'engineer', patch: { ...DEFAULT_PATCH }, prologueDone: false, seenCutscenes: [], progress: {} };
}

/** Cleans a profile loaded from storage, so a damaged or old save can't break the game. */
export function sanitiseProfile(value: unknown): Profile {
  const base = defaultProfile();
  const input = (value ?? {}) as Partial<Profile>;
  const difficulty: Difficulty = input.difficulty === 'cadet' || input.difficulty === 'director' ? input.difficulty : 'engineer';
  let crew = base.crew;
  if (Array.isArray(input.crew) && input.crew.length >= 1 && input.crew.length <= MAX_CREW) {
    const cleaned = input.crew.map((member, index) => ({
      id: `p${index + 1}`,
      callSign: typeof member?.callSign === 'string' ? member.callSign.slice(0, 16) : '',
      avatar: Number.isInteger(member?.avatar) && member.avatar >= 0 && member.avatar < AVATAR_COLOURS.length ? member.avatar : index,
      roles: Array.isArray(member?.roles) ? member.roles.filter((role) => (ROLE_IDS as readonly string[]).includes(role)) : [],
    }));
    const roles = cleaned.flatMap((member) => member.roles);
    const complete = roles.length === ROLE_IDS.length && ROLE_IDS.every((role) => roles.includes(role));
    crew = complete ? cleaned : createCrew(cleaned.length, cleaned.map((member) => member.callSign));
  }
  return {
    crew,
    difficulty,
    patch: sanitisePatch(input.patch),
    prologueDone: input.prologueDone === true,
    seenCutscenes: Array.isArray(input.seenCutscenes) ? input.seenCutscenes.filter((id) => typeof id === 'string').slice(0, 50) : [],
    progress: sanitiseProgress(input.progress),
  };
}

export function createGameStore(options: GameStoreOptions = {}): StoreApi<GameState> {
  const { storage, prefersReducedMotion = false } = options;

  const initializer = (
    set: StoreApi<GameState>['setState'],
    get: StoreApi<GameState>['getState'],
  ): GameState => ({
    phase: 'BOOT',
    settings: { quality: 'high', reducedMotion: prefersReducedMotion },
    settingsOpen: false,
    profile: defaultProfile(),
    prologueStep: 'intro',
    mission: null,

    goTo: (phase) => {
      if (!canTransition(get().phase, phase)) return false;
      set({ phase });
      return true;
    },
    setSetting: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),
    setSettingsOpen: (open) => set({ settingsOpen: open }),

    setCrew: (crew) => set((state) => ({ profile: { ...state.profile, crew: crew.map((member) => ({ ...member, roles: [...member.roles] })) } })),
    setDifficulty: (difficulty) => set((state) => ({ profile: { ...state.profile, difficulty } })),
    setPatch: (patch) => set((state) => ({ profile: { ...state.profile, patch: sanitisePatch(patch) } })),
    markCutsceneSeen: (id) =>
      set((state) =>
        state.profile.seenCutscenes.includes(id)
          ? state
          : { profile: { ...state.profile, seenCutscenes: [...state.profile.seenCutscenes, id] } },
      ),
    startPrologue: (step = 'intro') => {
      if (!isPrologueStep(step) || !canTransition(get().phase, 'PROLOGUE')) return false;
      set({ phase: 'PROLOGUE', prologueStep: step });
      return true;
    },
    advancePrologue: () => {
      const state = get();
      if (state.phase !== 'PROLOGUE') return;
      const next = nextPrologueStep(state.prologueStep);
      if (next) {
        set({ prologueStep: next });
        return;
      }
      set({ profile: { ...state.profile, prologueDone: true } });
      get().goTo('CHAPTER_SELECT');
    },

    selectPathway: (pathwayId, unlockAll = false) => {
      const state = get();
      if (!isUnlocked(pathwayId, state.profile.progress, unlockAll) || !canTransition(state.phase, 'BRIEFING')) return false;
      set({ mission: { pathwayId, trajectoryId: null }, phase: 'BRIEFING' });
      return true;
    },
    openObjective: () => (get().mission ? get().goTo('OBJECTIVE') : false),
    acceptMission: () => (get().mission ? get().goTo('ASSEMBLY') : false),
    backToMap: () => get().goTo('CHAPTER_SELECT'),
    recordMissionResult: (pathwayId, stars, score) =>
      set((state) => ({ profile: { ...state.profile, progress: recordResult(state.profile.progress, pathwayId, stars, score) } })),
  });

  if (!storage) return createStore<GameState>()(initializer);

  return createStore<GameState>()(
    persist(initializer, {
      name: SETTINGS_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => storage),
      // Settings and the profile survive a reload. The phase always restarts at BOOT.
      partialize: (state) => ({ settings: state.settings, profile: state.profile }) as GameState,
      // Version 1 saves only had settings; the profile starts fresh.
      migrate: (persisted) => persisted as GameState,
      merge: (persisted, current) => {
        const saved = persisted as Partial<GameState> | undefined;
        return {
          ...current,
          settings: { ...current.settings, ...saved?.settings },
          profile: saved?.profile ? sanitiseProfile(saved.profile) : current.profile,
        };
      },
    }),
  );
}

const hasWindow = typeof window !== 'undefined';

/** The one store instance used by the running game. */
export const gameStore = createGameStore({
  storage: hasWindow ? window.localStorage : undefined,
  prefersReducedMotion: hasWindow
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false,
});
