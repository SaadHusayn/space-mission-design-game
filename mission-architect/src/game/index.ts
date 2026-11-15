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
  liveTelemetry,
  journeyChallengeSchedule,
  nextJourneyMilestoneDay,
  applyChallengeToJourney,
  type JourneyInput,
  type JourneyState,
  type PendingEvent,
  type DaySample,
  type CheckpointLog,
  type EventLog,
  type EndReason,
  type LiveTelemetry,
  type ScheduledChallenge,
} from './sim/journey';
export { EVENTS, getEvent, type EventDef } from './sim/events';
export { scoreMission, marginScore, type MissionScore, type MissionOutcome, type RequirementResult, type ScoreComponent } from './sim/scoring';
export { explainMission, type WhyBullet } from './sim/why';
export { duration, fmt, gbPerDay, kg, kms, money, ms, round, watts, years } from './sim/format';
export { WINNING_DESIGNS, makeDesign, type DesignFixture } from './sim/fixtures/designs';
export { challengesFor, generateChallenge, physicsMastery, PATHWAY_CHALLENGES } from './challenges/generator';
export type { Challenge, ChallengeOption, ChallengeResult, ChallengeTopic, ChallengeConsequence } from './challenges/types';
export { applyChange, emptyHistory, redoChange, undoChange, HISTORY_LIMIT, type DesignChange, type DesignHistory } from './core/designActions';
export { SLOT_ACTOR } from './core/store';
export { incompatibilityReason, slotApplicable } from './sim/compat';
export {
  ASCENT_DURATION_S,
  ASCENT_TIME_SCALE,
  CLEAN_IGNITION_BONUS_DV,
  CLEAN_IGNITION_WINDOW_S,
  COUNTDOWN_START_S,
  KARMAN_LINE_M,
  MAX_Q_UNTHROTTLED_PENALTY_DV,
  SCALE_HEIGHT_M,
  SEA_LEVEL_DENSITY,
  STAGE_LABELS,
  VEHICLE_HEIGHT_M,
  atmosphericDensity,
  completeInsertion,
  createAscent,
  dynamicPressure,
  engageMaxQThrottle,
  insertionChallengeFor,
  skipToInsertion,
  stageForTime,
  stepAscent,
  targetOrbitalSpeed,
  targetParkingAltitude,
  toLaunchResult,
  triggerIgnition,
  vehicleHeightM,
  type AscentStage,
  type AscentState,
  type IgnitionStatus,
  type LaunchResult,
} from './sim/ascent';
export * as physics from './physics';
