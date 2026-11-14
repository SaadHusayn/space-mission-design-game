/**
 * Public API of the game logic. UI code should import from '@/game'.
 * Everything here is pure TypeScript: no React, no Three.js.
 */
export * from './types';
export { gameData, getLaunchVehicle, getPart, getPathway, partsByCategory, GameDataError, type GameData } from './data/loadData';
export { createMission, environmentFor, missionDays, BUDGET_FACTOR } from './sim/mission';
export { summarizeDesign, resolveDesign, designParts, adcsWorksThere, type DesignSummary, type ResolvedDesign } from './sim/design';
export { reviewDesign, type ReviewCheck, type ReviewResult, type CheckStatus, type Discipline } from './sim/review';
export {
  startJourney,
  advanceJourney,
  resolveEvent,
  runJourney,
  type JourneyInput,
  type JourneyState,
  type PendingEvent,
  type DaySample,
  type CheckpointLog,
  type EventLog,
  type EndReason,
} from './sim/journey';
export { EVENTS, getEvent, type EventDef } from './sim/events';
export { scoreMission, marginScore, type MissionScore, type MissionOutcome, type RequirementResult, type ScoreComponent } from './sim/scoring';
export { explainMission, type WhyBullet } from './sim/why';
export { WINNING_DESIGNS, makeDesign, type DesignFixture } from './sim/fixtures/designs';
export { challengesFor, generateChallenge, physicsMastery, PATHWAY_CHALLENGES } from './challenges/generator';
export type { Challenge, ChallengeOption, ChallengeResult, ChallengeTopic, ChallengeConsequence } from './challenges/types';
export { applyChange, emptyHistory, redoChange, undoChange, HISTORY_LIMIT, type DesignChange, type DesignHistory } from './core/designActions';
export { SLOT_ACTOR } from './core/store';
export { incompatibilityReason, slotApplicable } from './sim/compat';
export * as physics from './physics';
