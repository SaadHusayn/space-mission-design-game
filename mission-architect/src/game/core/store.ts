/**
 * Game store (framework-free).
 *
 * Uses zustand's vanilla store so that src/game/** never imports React.
 * React components read it through the `useGame` hook in src/hooks.
 */
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { ChallengeResult } from '../challenges/types';
import type { DecisionDelta, DecisionLogEntry, Design, Difficulty, PathwayId, SlotId } from '../types';
import { emptyDesign } from '../types';
import { gameData, getLaunchVehicle, getPathway } from '../data/loadData';
import { AVATAR_COLOURS, MAX_CREW, ROLE_IDS, createCrew, holderOf, type CrewMember, type RoleId } from './crew';
import { applyChange, redoChange, undoChange, type DesignChange } from './designActions';
import { canTransition, type Phase } from './machine';
import { DEFAULT_PATCH, sanitisePatch, type MissionPatch } from './patch';
import { isUnlocked, recordResult, sanitiseProgress, type Progress } from './progress';
import { isPrologueStep, nextPrologueStep, type PrologueStep } from './prologue';
import {
  createDesignProposal,
  createEventProposal,
  requiresTeamVote,
} from './proposals';
import {
  acknowledgeHandoff,
  castVote,
  resolveCommanderTieBreak,
  resolveNegotiationTimeout,
  setVoteHandoffMode,
  startVoteSession,
  type VoteSession,
} from './votes';
import { recordRunToStorage, sanitiseDesign } from './save';
import type { LaunchResult } from '../sim/ascent';
import { createSavedRunSnapshot } from '../sim/compare';
import { summarizeDesign } from '../sim/design';
import {
  evaluateEventMitigations,
  getEventCatalogueEntry,
  getNegotiationEvent,
  type EventMitigationStatus,
} from '../sim/events';
import {
  advanceJourney,
  applyChallengeToJourney,
  journeyEventContext,
  nextJourneyMilestoneDay,
  resolveEvent,
  startJourney,
  triggerJourneyEvent,
  type JourneyState,
} from '../sim/journey';
import { createMission } from '../sim/mission';
import { reviewDesign } from '../sim/review';
import { buildScoreExtras, scoreMission } from '../sim/scoring';

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

export interface LastEventResolution {
  eventId: string;
  day: number;
  title: string;
  optionId: string;
  optionLabel: string;
  outcome: string;
  mitigations: EventMitigationStatus[];
  voteSummary?: DecisionLogEntry['voteSummary'];
}

/**
 * Which role owns each slot during assembly (phase-05 §5). The commander owns
 * no slot: they give the final GO and submit to the review. In solo mode every
 * role is held by one player, so the mapping only affects the decision log.
 */
export const SLOT_ACTOR: Readonly<Record<SlotId | 'bus' | 'instruments' | 'fuelMass' | 'supplyDays' | 'spinArmLength', string>> = {
  bus: 'engineer',
  power: 'engineer',
  battery: 'engineer',
  adcs: 'engineer',
  propulsion: 'engineer',
  thermal: 'engineer',
  radiation: 'engineer',
  lifeSupport: 'engineer',
  habitat: 'engineer',
  heatShield: 'engineer',
  instruments: 'science',
  computer: 'comms',
  comms: 'comms',
  supplyDays: 'comms',
  fuelMass: 'engineer',
  spinArmLength: 'engineer',
};

export interface GameState {
  phase: Phase;
  settings: Settings;
  settingsOpen: boolean;
  profile: Profile;
  prologueStep: PrologueStep;
  mission: CurrentMission | null;
  /** The spacecraft being assembled (null until a mission is accepted). */
  design: Design | null;
  designPast: Design[];
  designFuture: Design[];
  /** Every design choice, team vote, and event decision logged for the mission report. */
  decisionLog: DecisionLogEntry[];
  /** Selected launch vehicle ID (Phase 06), or null before selection. */
  vehicleId: string | null;
  /** Result of the launch ascent and orbit insertion (Phase 06). */
  launchResult: LaunchResult | null;
  /** Completed physics challenge results across the mission. */
  challengeResults: ChallengeResult[];
  /** IDs of completed in-flight physics challenges. */
  completedChallengeIds: string[];
  /** Active mission journey flight state (Phase 07). */
  journey: JourneyState | null;
  /** Chosen Jupiter flyby perijove in Jupiter radii (2, 5, or 20) from C-ASSIST. */
  flybyRadii: number | null;
  /** Index of the active crew member in hot-seat team play (0..crew.length-1). */
  activeCrewIndex: number;
  /** Active proposal / team vote session (Phase 08). */
  activeVote: VoteSession | null;
  /** Most recently resolved in-flight event / negotiation outcome card (Phase 08). */
  lastEventResolution: LastEventResolution | null;
  /** IDs of scripted negotiation dilemmas already triggered on this mission. */
  triggeredNegotiationIds: string[];

  /** Moves to another phase. Returns false if the transition isn't allowed. */
  goTo: (phase: Phase) => boolean;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setSettingsOpen: (open: boolean) => void;

  /** Applies one design change (equip/unequip/bus/instrument/option). False when nothing changed. */
  editDesign: (change: DesignChange, voteSummary?: DecisionLogEntry['voteSummary']) => boolean;
  /** In team mode, checks role ownership / budget limits and either applies immediately or opens a proposal vote. */
  proposeDesignChange: (change: DesignChange) => 'applied' | 'proposed' | 'noop';
  /** Steps the design back/forward one change. Does not touch the decision log. */
  undoDesign: () => void;
  redoDesign: () => void;

  /** Hot-seat turn & voting actions (Phase 08). */
  setActiveCrewIndex: (index: number) => void;
  nextCrewTurn: () => void;
  startEventVote: (useHandoff?: boolean) => boolean;
  startNegotiation: (negotiationId?: string) => boolean;
  setVoteHandoff: (useHandoff: boolean) => void;
  acknowledgeVoteHandoff: () => void;
  submitMemberVote: (memberId: string, optionId: string, reaction?: string) => void;
  breakVoteTie: (optionId: string) => void;
  expireNegotiationTimer: () => void;
  cancelActiveVote: () => void;
  dismissEventResolution: () => void;

  /** Moves to the Engineering Review Board (from ASSEMBLY). */
  submitToErb: () => boolean;
  /** Proceeds from ERB_REVIEW to TRAJECTORY only when the design passes every mandatory ERB check. */
  proceedFromErb: () => boolean;
  /** Selects a trajectory option for the current pathway. */
  selectTrajectory: (trajectoryId: string) => boolean;
  /** Proceeds from TRAJECTORY to LAUNCH_VEHICLE. */
  proceedToLaunchVehicle: () => boolean;
  /** Selects a launch vehicle from the catalogue. */
  selectLaunchVehicle: (vehicleId: string) => boolean;
  /** Proceeds from LAUNCH_VEHICLE to GO_NO_GO when a rocket is selected. */
  proceedToGoNoGo: () => boolean;
  /** Proceeds from GO_NO_GO to ROLLOUT only when all ERB + rocket checks are GO (review.go === true). */
  confirmGoForLaunch: () => boolean;
  /** Proceeds from ROLLOUT cutscene to interactive LAUNCH. */
  startLaunch: () => boolean;
  /** Records a completed physics challenge result. */
  recordChallengeResult: (result: ChallengeResult) => void;
  /** Completes the LAUNCH phase and transitions to JOURNEY. */
  completeLaunch: (result: LaunchResult) => boolean;
  /** Initializes the journey state if not already initialized. */
  beginJourney: (seed?: number) => boolean;
  /** Advances the journey by up to `maxDays` days (pausing at pending events). */
  stepJourney: (maxDays?: number) => void;
  /** Advances the journey to the next milestone (checkpoint, scheduled challenge, event, or end). */
  stepToNextMilestone: () => void;
  /** Resolves a pending in-flight event with the chosen option ID. */
  chooseEventOption: (optionId: string, voteSummary?: DecisionLogEntry['voteSummary']) => boolean;
  /** Completes an in-flight physics challenge and applies its consequences to the journey. */
  completeJourneyChallenge: (challengeId: string, result: ChallengeResult) => void;
  /** Finishes the journey/operations phase, records mission results, and transitions to REPORT. */
  finishJourney: () => boolean;
  /** Returns from REPORT to ASSEMBLY keeping the current spacecraft design loaded for modification (Phase 09 §2.10, R4). */
  redesignAndRefly: () => boolean;
  /** Switches to the alternate trajectory for the current pathway and opens TRAJECTORY (or ASSEMBLY if ERB fails). */
  tryAnotherTrajectory: () => boolean;
  /** Loads a saved, imported, or alternate-fixture design into ASSEMBLY for the mission. */
  loadDesignForRefly: (
    design: Design,
    options?: { pathwayId?: PathwayId; trajectoryId?: string | null; vehicleId?: string | null },
  ) => boolean;

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

export const SETTINGS_STORAGE_KEY = 'mission-architect:save';
/** Save key used before the game was renamed (moved to the new key on first load). */
export const LEGACY_STORAGE_KEYS = ['trajectory:settings'] as const;

/** Copies a save from an old key to the current one, once. */
export function migrateLegacySave(storage: StateStorage): void {
  if (storage.getItem(SETTINGS_STORAGE_KEY) !== null) return;
  for (const key of LEGACY_STORAGE_KEYS) {
    const old = storage.getItem(key);
    if (typeof old === 'string') {
      storage.setItem(SETTINGS_STORAGE_KEY, old);
      storage.removeItem(key);
      return;
    }
  }
}

export function defaultProfile(): Profile {
  return { crew: createCrew(1), difficulty: 'engineer', patch: { ...DEFAULT_PATCH }, prologueDone: false, seenCutscenes: [], progress: {} };
}

/** The full mission context (pathway + trajectory + difficulty) for the mission being planned. */
function missionContextOf(state: Pick<GameState, 'mission' | 'profile'>): ReturnType<typeof createMission> {
  const mission = state.mission!;
  return createMission(mission.pathwayId, mission.trajectoryId ?? undefined, state.profile.difficulty);
}

/** The role responsible for a kind of design change. */
function actorFor(change: DesignChange): string {
  switch (change.kind) {
    case 'bus':
      return SLOT_ACTOR.bus;
    case 'equip':
    case 'unequip':
      return SLOT_ACTOR[change.slot];
    case 'addInstrument':
    case 'removeInstrument':
      return SLOT_ACTOR.instruments;
    case 'option':
      return SLOT_ACTOR[change.key];
  }
}

const OPTION_LABELS: Readonly<Record<'fuelMass' | 'supplyDays' | 'spinArmLength', string>> = {
  fuelMass: 'Propellant load',
  supplyDays: 'Crew supplies',
  spinArmLength: 'Spin habitat arm',
};

/** Which part the log entry is about (the removed one, for unequip/remove). */
function partFor(design: Design | null, change: DesignChange): { partId: string | null; partName: string } {
  const nameOf = (id: string | null) => (id ? (gameData.partById.get(id)?.name ?? id) : '');
  switch (change.kind) {
    case 'bus':
    case 'equip':
    case 'addInstrument':
    case 'removeInstrument':
      return { partId: change.partId, partName: nameOf(change.partId) };
    case 'unequip': {
      const id = design?.slots[change.slot] ?? null;
      return { partId: id, partName: nameOf(id) };
    }
    case 'option':
      return { partId: null, partName: OPTION_LABELS[change.key] };
  }
}

/** Builds the decision-log entry for a change, with the resource deltas it caused. */
function decisionEntry(
  state: Pick<GameState, 'decisionLog' | 'design' | 'profile' | 'activeCrewIndex'>,
  change: DesignChange,
  before: ReturnType<typeof summarizeDesign>,
  after: ReturnType<typeof summarizeDesign>,
  voteSummary?: DecisionLogEntry['voteSummary'],
): DecisionLogEntry {
  const deltas: Partial<Record<DecisionDelta, number>> = {};
  const record = (key: DecisionDelta, value: number) => {
    if (Math.abs(value) > 1e-9) deltas[key] = Math.round(value * 1000) / 1000;
  };
  record('mass', after.wetMass - before.wetMass);
  record('cost', after.totalCost - before.totalCost);
  record('power', after.powerLoad - before.powerLoad);
  record('data', after.dataPerDay - before.dataPerDay);
  record('deltaV', after.deltaV - before.deltaV);
  record('science', after.science - before.science);
  const { partId, partName } = partFor(state.design ?? null, change);
  const actor = actorFor(change);
  const activeMember = state.profile.crew[state.activeCrewIndex] ?? holderOf(state.profile.crew, actor as RoleId);
  return {
    id: state.decisionLog.length + 1,
    actor,
    proposerCallSign: activeMember?.callSign || undefined,
    kind: change.kind,
    slotId: change.kind === 'equip' || change.kind === 'unequip' ? change.slot : null,
    partId,
    partName,
    deltas,
    ...(voteSummary ? { voteSummary } : {}),
  };
}

function toVoteSummary(session: VoteSession): DecisionLogEntry['voteSummary'] | undefined {
  if (!session.resolution) return undefined;
  return {
    proposalTitle: session.proposal.title,
    votes: session.votes.map((v) => ({
      memberId: v.memberId,
      callSign: v.callSign,
      roles: [...v.roles],
      choice: v.optionId,
      ...(v.reaction ? { reaction: v.reaction } : {}),
    })),
    outcome: session.resolution.outcome,
    chosenOption: session.resolution.winningOptionId,
    consensus: session.resolution.consensus,
  };
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

  const applyResolvedVote = (
    session: VoteSession,
    set: StoreApi<GameState>['setState'],
    get: StoreApi<GameState>['getState'],
  ) => {
    const resolution = session.resolution;
    if (!resolution) return;
    const summary = toVoteSummary(session);
    const { proposal } = session;

    if (proposal.kind === 'design' && proposal.designChange) {
      if (resolution.outcome === 'rejected') {
        const state = get();
        const rejectedEntry: DecisionLogEntry = {
          id: state.decisionLog.length + 1,
          actor: proposal.ownerRole,
          proposerCallSign: proposal.proposerCallSign,
          kind: 'vote_rejected',
          slotId:
            proposal.designChange.kind === 'equip' || proposal.designChange.kind === 'unequip'
              ? proposal.designChange.slot
              : null,
          partId: null,
          partName: proposal.title,
          deltas: {},
          voteSummary: summary,
          outcomeText: resolution.summaryText,
        };
        set({
          activeVote: null,
          decisionLog: [...state.decisionLog, rejectedEntry],
        });
        return;
      }
      set({ activeVote: null });
      get().editDesign(proposal.designChange, summary);
      return;
    }

    if ((proposal.kind === 'event' || proposal.kind === 'negotiation') && get().journey?.pending) {
      set({ activeVote: null });
      get().chooseEventOption(resolution.winningOptionId, summary);
      return;
    }

    set({ activeVote: null });
  };

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
    design: null,
    designPast: [],
    designFuture: [],
    decisionLog: [],
    vehicleId: null,
    launchResult: null,
    challengeResults: [],
    completedChallengeIds: [],
    journey: null,
    flybyRadii: null,
    activeCrewIndex: 0,
    activeVote: null,
    lastEventResolution: null,
    triggeredNegotiationIds: [],

    goTo: (phase) => {
      if (!canTransition(get().phase, phase)) return false;
      set({ phase });
      return true;
    },
    setSetting: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),
    setSettingsOpen: (open) => set({ settingsOpen: open }),

    editDesign: (change, voteSummary) => {
      const state = get();
      if (!state.design || !state.mission) return false;
      const context = missionContextOf(state);
      const before = summarizeDesign(state.design, context);
      const next = applyChange({ past: state.designPast, present: state.design, future: state.designFuture }, change);
      if (next.present === state.design) return false;
      const after = summarizeDesign(next.present, context);
      set({
        design: next.present,
        designPast: next.past,
        designFuture: next.future,
        decisionLog: [...state.decisionLog, decisionEntry(state, change, before, after, voteSummary)],
      });
      return true;
    },

    proposeDesignChange: (change) => {
      const state = get();
      if (!state.design || !state.mission) return 'noop';
      const context = missionContextOf(state);
      const before = summarizeDesign(state.design, context);
      const next = applyChange({ past: state.designPast, present: state.design, future: state.designFuture }, change);
      if (next.present === state.design) return 'noop';
      const after = summarizeDesign(next.present, context);

      const crew = state.profile.crew;
      const activeMember = crew[state.activeCrewIndex] ?? crew[0];
      const check = requiresTeamVote({
        crew,
        activeMemberId: activeMember?.id ?? 'p1',
        change,
        before,
        after,
        mission: context,
      });

      if (!check.required) {
        get().editDesign(change);
        return 'applied';
      }

      const proposal = createDesignProposal({
        id: `prop-${state.decisionLog.length + 1}`,
        crew,
        activeMemberId: activeMember?.id ?? 'p1',
        change,
        design: state.design,
        before,
        after,
        reason: check.reason!,
      });
      set({
        activeVote: startVoteSession(proposal, crew, false),
      });
      return 'proposed';
    },

    undoDesign: () => {
      const state = get();
      if (!state.design) return;
      const next = undoChange({ past: state.designPast, present: state.design, future: state.designFuture });
      set({ design: next.present, designPast: next.past, designFuture: next.future });
    },
    redoDesign: () => {
      const state = get();
      if (!state.design) return;
      const next = redoChange({ past: state.designPast, present: state.design, future: state.designFuture });
      set({ design: next.present, designPast: next.past, designFuture: next.future });
    },

    setActiveCrewIndex: (index) => {
      const crewLen = get().profile.crew.length;
      if (crewLen <= 0) return;
      const safe = ((index % crewLen) + crewLen) % crewLen;
      set({ activeCrewIndex: safe });
    },
    nextCrewTurn: () => {
      const state = get();
      const crewLen = state.profile.crew.length;
      if (crewLen <= 1) return;
      set({ activeCrewIndex: (state.activeCrewIndex + 1) % crewLen });
    },
    startEventVote: (useHandoff = false) => {
      const state = get();
      if (!state.journey?.pending) return false;
      const proposal = createEventProposal({
        id: `ev-${state.journey.pending.eventId}-${state.journey.day}`,
        crew: state.profile.crew,
        pending: state.journey.pending,
      });
      set({
        activeVote: startVoteSession(proposal, state.profile.crew, useHandoff),
      });
      return true;
    },
    startNegotiation: (negotiationId) => {
      const state = get();
      if (!state.journey || state.journey.ended || state.journey.pending) return false;
      const candidates = ['neg_budget_cut', 'neg_bonus_target', 'neg_bandwidth_clash'];
      const chosenId =
        negotiationId ??
        candidates.find((id) => !state.triggeredNegotiationIds.includes(id)) ??
        'neg_budget_cut';
      const nextJourney = triggerJourneyEvent(state.journey, chosenId);
      if (!nextJourney.pending) return false;
      const triggered = state.triggeredNegotiationIds.includes(chosenId)
        ? state.triggeredNegotiationIds
        : [...state.triggeredNegotiationIds, chosenId];

      let activeVote: VoteSession | null = null;
      if (state.profile.crew.length > 1) {
        const proposal = createEventProposal({
          id: `neg-${chosenId}-${nextJourney.day}`,
          crew: state.profile.crew,
          pending: nextJourney.pending,
        });
        activeVote = startVoteSession(proposal, state.profile.crew, false);
      }

      set({
        journey: nextJourney,
        triggeredNegotiationIds: triggered,
        activeVote,
        lastEventResolution: null,
      });
      return true;
    },
    setVoteHandoff: (useHandoff) => {
      const state = get();
      if (!state.activeVote) return;
      set({ activeVote: setVoteHandoffMode(state.activeVote, useHandoff) });
    },
    acknowledgeVoteHandoff: () => {
      const state = get();
      if (!state.activeVote) return;
      set({ activeVote: acknowledgeHandoff(state.activeVote) });
    },
    submitMemberVote: (memberId, optionId, reaction) => {
      const state = get();
      if (!state.activeVote) return;
      const updated = castVote(state.activeVote, memberId, optionId, reaction);
      if (updated.status === 'resolved') {
        applyResolvedVote(updated, set, get);
      } else {
        set({ activeVote: updated });
      }
    },
    breakVoteTie: (optionId) => {
      const state = get();
      if (!state.activeVote || state.activeVote.status !== 'tie_break') return;
      const resolved = resolveCommanderTieBreak(state.activeVote, optionId);
      applyResolvedVote(resolved, set, get);
    },
    expireNegotiationTimer: () => {
      const state = get();
      if (state.activeVote) {
        const resolved = resolveNegotiationTimeout(state.activeVote);
        applyResolvedVote(resolved, set, get);
        return;
      }
      if (state.journey?.pending) {
        const neg = getNegotiationEvent(state.journey.pending.eventId);
        const fallback = neg?.commanderDefaultOptionId ?? state.journey.pending.options[0]?.id;
        if (fallback) {
          get().chooseEventOption(fallback, {
            proposalTitle: state.journey.pending.title,
            votes: [],
            outcome: 'timeout_default',
            chosenOption: fallback,
            consensus: false,
          });
        }
      }
    },
    cancelActiveVote: () => set({ activeVote: null }),
    dismissEventResolution: () => set({ lastEventResolution: null }),

    submitToErb: () => {
      const state = get();
      if (!state.design || !state.mission) return false;
      return state.goTo('ERB_REVIEW');
    },
    proceedFromErb: () => {
      const state = get();
      if (state.phase !== 'ERB_REVIEW' || !state.design || !state.mission) return false;
      const review = reviewDesign(state.design, missionContextOf(state));
      if (!review.passable) return false;
      if (!state.mission.trajectoryId) {
        const defaultTrajectory = getPathway(state.mission.pathwayId).trajectories[0]?.id ?? null;
        set({ mission: { ...state.mission, trajectoryId: defaultTrajectory } });
      }
      return state.goTo('TRAJECTORY');
    },
    selectTrajectory: (trajectoryId) => {
      const state = get();
      if (!state.mission) return false;
      const pathway = getPathway(state.mission.pathwayId);
      const chosen = pathway.trajectories.find((item) => item.id === trajectoryId);
      if (!chosen) return false;
      const currentId = state.mission.trajectoryId ?? pathway.trajectories[0]?.id ?? null;
      if (currentId === trajectoryId && state.mission.trajectoryId === trajectoryId) return true;

      let decisionLog = state.decisionLog;
      if (state.design && currentId !== trajectoryId) {
        const vehicle = state.vehicleId ? getLaunchVehicle(state.vehicleId) : null;
        const beforeCtx = createMission(pathway, currentId ?? undefined, state.profile.difficulty);
        const afterCtx = createMission(pathway, trajectoryId, state.profile.difficulty);
        const before = summarizeDesign(state.design, beforeCtx, vehicle);
        const after = summarizeDesign(state.design, afterCtx, vehicle);
        const deltas: Partial<Record<DecisionDelta, number>> = {};
        const dvReqDiff = afterCtx.env.deltaV - beforeCtx.env.deltaV;
        if (Math.abs(dvReqDiff) > 1e-9) deltas.deltaV = -dvReqDiff;
        const powerDiff = after.powerAvailable - before.powerAvailable;
        if (Math.abs(powerDiff) > 1e-9) deltas.power = Math.round(powerDiff);
        const cdr = holderOf(state.profile.crew, 'commander');
        decisionLog = [
          ...decisionLog,
          {
            id: decisionLog.length + 1,
            actor: 'commander',
            proposerCallSign: cdr?.callSign || undefined,
            kind: 'trajectory',
            slotId: null,
            partId: chosen.id,
            partName: chosen.name,
            deltas,
          },
        ];
      }

      set({
        mission: { ...state.mission, trajectoryId },
        decisionLog,
      });
      return true;
    },
    proceedToLaunchVehicle: () => {
      const state = get();
      if (state.phase !== 'TRAJECTORY' || !state.mission || !state.design) return false;
      if (!state.mission.trajectoryId) {
        const defaultTrajectory = getPathway(state.mission.pathwayId).trajectories[0]?.id ?? null;
        set({ mission: { ...state.mission, trajectoryId: defaultTrajectory } });
      }
      return state.goTo('LAUNCH_VEHICLE');
    },
    selectLaunchVehicle: (vehicleId) => {
      const state = get();
      if (!state.mission || !gameData.launchVehicleById.has(vehicleId)) return false;
      if (state.vehicleId === vehicleId) return true;
      const nextVehicle = getLaunchVehicle(vehicleId);
      const prevVehicle = state.vehicleId ? getLaunchVehicle(state.vehicleId) : null;
      let decisionLog = state.decisionLog;
      if (state.design) {
        const costDiff = nextVehicle.cost - (prevVehicle?.cost ?? 0);
        const eng = holderOf(state.profile.crew, 'engineer');
        decisionLog = [
          ...decisionLog,
          {
            id: decisionLog.length + 1,
            actor: 'engineer',
            proposerCallSign: eng?.callSign || undefined,
            kind: 'vehicle',
            slotId: null,
            partId: nextVehicle.id,
            partName: nextVehicle.name,
            deltas: costDiff !== 0 ? { cost: costDiff } : {},
          },
        ];
      }
      set({ vehicleId, decisionLog });
      return true;
    },
    proceedToGoNoGo: () => {
      const state = get();
      if (state.phase !== 'LAUNCH_VEHICLE' || !state.mission || !state.design || !state.vehicleId) return false;
      return state.goTo('GO_NO_GO');
    },
    confirmGoForLaunch: () => {
      const state = get();
      if (state.phase !== 'GO_NO_GO' || !state.mission || !state.design || !state.vehicleId) return false;
      const vehicle = getLaunchVehicle(state.vehicleId);
      const review = reviewDesign(state.design, missionContextOf(state), vehicle);
      if (!review.go) return false;
      return state.goTo('ROLLOUT');
    },
    startLaunch: () => {
      const state = get();
      if (state.phase !== 'ROLLOUT' || !state.mission || !state.design || !state.vehicleId) return false;
      return state.goTo('LAUNCH');
    },
    recordChallengeResult: (result) => {
      set((state) => ({
        challengeResults: [...state.challengeResults, result],
      }));
    },
    completeLaunch: (result) => {
      const state = get();
      if (state.phase !== 'LAUNCH') return false;
      const challengeResults =
        result.insertionResult && !state.challengeResults.includes(result.insertionResult)
          ? [...state.challengeResults, result.insertionResult]
          : state.challengeResults;
      set({ launchResult: result, challengeResults });
      const moved = state.goTo('JOURNEY');
      if (moved) get().beginJourney(1);
      return moved;
    },
    beginJourney: (seed = 1) => {
      const state = get();
      if (!state.mission || !state.design || !state.vehicleId) return false;
      const vehicle = getLaunchVehicle(state.vehicleId);
      const initial = startJourney({
        design: state.design,
        mission: missionContextOf(state),
        vehicle,
        seed,
      });
      const next = advanceJourney(initial, 1);
      set({
        journey: next,
        completedChallengeIds: [],
        flybyRadii: null,
        activeVote: null,
        lastEventResolution: null,
        triggeredNegotiationIds: [],
      });
      return true;
    },
    stepJourney: (maxDays = 1) => {
      const state = get();
      if (!state.journey || state.journey.ended || state.journey.pending) return;
      const next = advanceJourney(state.journey, Math.max(1, maxDays));
      set({
        journey: next,
        lastEventResolution: next.pending ? null : state.lastEventResolution,
      });
      if (next.day > next.cruiseEnd && !next.ended && get().phase === 'JOURNEY') {
        get().goTo('OPERATIONS');
      }
    },
    stepToNextMilestone: () => {
      const state = get();
      if (!state.journey || state.journey.ended || state.journey.pending) return;
      const target = nextJourneyMilestoneDay(state.journey, state.completedChallengeIds);
      const days = Math.max(1, target - state.journey.day);
      get().stepJourney(days);
    },
    chooseEventOption: (optionId, voteSummary) => {
      const state = get();
      const pending = state.journey?.pending;
      if (!state.journey || !pending) return false;
      try {
        const ctx = journeyEventContext(state.journey);
        const mitigations = evaluateEventMitigations(pending.eventId, ctx);
        const next = resolveEvent(state.journey, optionId);
        const resolvedLog = next.events.at(-1);
        const cat = getEventCatalogueEntry(pending.eventId);
        const ownerRole: RoleId = cat?.ownerRole ?? 'commander';
        const ownerHolder = holderOf(state.profile.crew, ownerRole) ?? state.profile.crew[state.activeCrewIndex];
        const kind = cat?.kind === 'negotiation' || getNegotiationEvent(pending.eventId) ? 'negotiation' : 'event';

        const logEntry: DecisionLogEntry = {
          id: state.decisionLog.length + 1,
          actor: ownerRole,
          proposerCallSign: ownerHolder?.callSign || undefined,
          kind,
          slotId: null,
          partId: optionId,
          partName: `${pending.title}: ${resolvedLog?.optionLabel ?? optionId}`,
          deltas: {},
          ...(voteSummary ? { voteSummary } : {}),
          outcomeText: resolvedLog?.outcome,
        };

        set({
          journey: next,
          activeVote: null,
          decisionLog: [...state.decisionLog, logEntry],
          lastEventResolution: resolvedLog
            ? {
                eventId: resolvedLog.eventId,
                day: resolvedLog.day,
                title: resolvedLog.title,
                optionId: resolvedLog.optionId,
                optionLabel: resolvedLog.optionLabel,
                outcome: resolvedLog.outcome,
                mitigations,
                voteSummary,
              }
            : null,
        });
        return true;
      } catch {
        return false;
      }
    },
    completeJourneyChallenge: (challengeId, result) => {
      const state = get();
      const challengeResults = [...state.challengeResults, result];
      const completedChallengeIds = state.completedChallengeIds.includes(challengeId)
        ? state.completedChallengeIds
        : [...state.completedChallengeIds, challengeId];
      if (!state.journey) {
        set({ challengeResults, completedChallengeIds });
        return;
      }
      const applied = applyChallengeToJourney(state.journey, challengeId, result);
      set({
        journey: applied.journey,
        challengeResults,
        completedChallengeIds,
        flybyRadii: applied.flybyRadii ?? state.flybyRadii,
      });
    },
    finishJourney: () => {
      const state = get();
      if (!state.journey?.ended) return false;
      const moved = state.goTo('REPORT');
      if (moved) {
        const extras = buildScoreExtras(
          state.journey,
          state.challengeResults,
          state.profile.crew,
          state.decisionLog,
        );
        const score = scoreMission(state.journey, extras);
        const pathwayId = state.mission?.pathwayId ?? state.journey.input.mission.pathway.id;
        get().recordMissionResult(pathwayId, score.stars, score.total);
        const crewNames = state.profile.crew
          .map((m) => m.callSign.trim())
          .filter((name) => name.length > 0);
        const leadCallSign = crewNames[0] || 'Pathfinder';
        const snapshot = createSavedRunSnapshot({
          state: state.journey,
          score,
          callSign: leadCallSign,
          crewNames: crewNames.length > 0 ? crewNames : [leadCallSign],
          patch: state.profile.patch,
          difficulty: state.profile.difficulty,
        });
        recordRunToStorage(snapshot);
      }
      return moved;
    },
    redesignAndRefly: () => {
      const state = get();
      if (!state.design || !state.mission || !canTransition(state.phase, 'ASSEMBLY')) return false;
      set({
        journey: null,
        launchResult: null,
        challengeResults: [],
        completedChallengeIds: [],
        flybyRadii: null,
        activeVote: null,
        lastEventResolution: null,
        triggeredNegotiationIds: [],
        phase: 'ASSEMBLY',
      });
      return true;
    },
    tryAnotherTrajectory: () => {
      const state = get();
      if (!state.design || !state.mission) return false;
      const pathway = getPathway(state.mission.pathwayId);
      const currentTrajId = state.mission.trajectoryId ?? pathway.trajectories[0]?.id ?? null;
      const altTraj =
        pathway.trajectories.find((t) => t.id !== currentTrajId) ?? pathway.trajectories[0] ?? null;
      const nextTrajId = altTraj?.id ?? currentTrajId;
      const nextMission: CurrentMission = {
        pathwayId: state.mission.pathwayId,
        trajectoryId: nextTrajId,
      };
      const context = createMission(
        nextMission.pathwayId,
        nextMission.trajectoryId ?? undefined,
        state.profile.difficulty,
      );
      const review = reviewDesign(state.design, context);
      const targetPhase: Phase =
        review.passable && canTransition(state.phase, 'TRAJECTORY') ? 'TRAJECTORY' : 'ASSEMBLY';
      if (!canTransition(state.phase, targetPhase)) return false;

      set({
        mission: nextMission,
        journey: null,
        launchResult: null,
        challengeResults: [],
        completedChallengeIds: [],
        flybyRadii: null,
        activeVote: null,
        lastEventResolution: null,
        triggeredNegotiationIds: [],
        phase: targetPhase,
      });
      return true;
    },
    loadDesignForRefly: (design, loadOptions) => {
      const state = get();
      const pathwayId = loadOptions?.pathwayId ?? state.mission?.pathwayId ?? 'leo';
      const trajectoryId =
        loadOptions?.trajectoryId !== undefined
          ? loadOptions.trajectoryId
          : (state.mission?.trajectoryId ?? getPathway(pathwayId).trajectories[0]?.id ?? null);
      const vehicleId =
        loadOptions?.vehicleId !== undefined ? loadOptions.vehicleId : state.vehicleId;
      const clean = sanitiseDesign(design);
      set({
        mission: { pathwayId, trajectoryId },
        design: clean,
        designPast: state.design ? [...state.designPast, state.design] : [],
        designFuture: [],
        vehicleId: vehicleId && gameData.launchVehicleById.has(vehicleId) ? vehicleId : state.vehicleId,
        journey: null,
        launchResult: null,
        challengeResults: [],
        completedChallengeIds: [],
        flybyRadii: null,
        activeVote: null,
        lastEventResolution: null,
        triggeredNegotiationIds: [],
        ...(canTransition(state.phase, 'ASSEMBLY') ? { phase: 'ASSEMBLY' as const } : {}),
      });
      return true;
    },

    setCrew: (crew) =>
      set((state) => ({
        profile: { ...state.profile, crew: crew.map((member) => ({ ...member, roles: [...member.roles] })) },
        activeCrewIndex: 0,
      })),
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
      set({
        mission: { pathwayId, trajectoryId: null },
        design: null,
        designPast: [],
        designFuture: [],
        decisionLog: [],
        vehicleId: null,
        launchResult: null,
        challengeResults: [],
        completedChallengeIds: [],
        journey: null,
        flybyRadii: null,
        activeCrewIndex: 0,
        activeVote: null,
        lastEventResolution: null,
        triggeredNegotiationIds: [],
        phase: 'BRIEFING',
      });
      return true;
    },
    openObjective: () => (get().mission ? get().goTo('OBJECTIVE') : false),
    acceptMission: () => {
      const state = get();
      if (!state.mission) return false;
      set({
        design: emptyDesign(),
        designPast: [],
        designFuture: [],
        decisionLog: [],
        vehicleId: null,
        launchResult: null,
        challengeResults: [],
        completedChallengeIds: [],
        journey: null,
        flybyRadii: null,
        activeCrewIndex: 0,
        activeVote: null,
        lastEventResolution: null,
        triggeredNegotiationIds: [],
      });
      return state.goTo('ASSEMBLY');
    },
    backToMap: () => get().goTo('CHAPTER_SELECT'),
    recordMissionResult: (pathwayId, stars, score) =>
      set((state) => ({ profile: { ...state.profile, progress: recordResult(state.profile.progress, pathwayId, stars, score) } })),
  });

  if (!storage) return createStore<GameState>()(initializer);
  migrateLegacySave(storage);

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
