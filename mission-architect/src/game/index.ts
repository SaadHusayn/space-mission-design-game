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
  journeyEventContext,
  triggerJourneyEvent,
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
export {
  EVENTS,
  NEGOTIATION_EVENTS,
  EVENT_CATALOGUE,
  ADVISOR_CATALOGUE,
  getEvent,
  getEventCatalogueEntry,
  getNegotiationEvent,
  evaluateEventMitigations,
  advisorsForEvent,
  type EventDef,
  type EventOption,
  type EventEffect,
  type EventResolution,
  type EventContext,
  type EventWindow,
  type EventVisualCue,
  type EventCatalogueEntry,
  type EventMitigationStatus,
  type AdvisorOpinion,
  type NegotiationDef,
} from './sim/events';
export {
  SLOT_OWNER_ROLE,
  ownerRoleForChange,
  memberOwnsRole,
  computeDecisionDeltas,
  describeDesignChange,
  requiresTeamVote,
  createDesignProposal,
  createEventProposal,
  type Proposal,
  type ProposalKind,
  type ProposalReason,
  type ProposalOption,
} from './core/proposals';
export {
  REACTION_CHIPS,
  startVoteSession,
  setVoteHandoffMode,
  acknowledgeHandoff,
  castVote,
  resolveCommanderTieBreak,
  resolveNegotiationTimeout,
  computeCollaborationMetrics,
  type ReactionChip,
  type MemberVote,
  type VoteOutcome,
  type VoteResolution,
  type VoteSession,
  type CollaborationMetrics,
} from './core/votes';
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
