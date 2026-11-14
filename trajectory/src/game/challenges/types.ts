import type { LaunchVehicle, MissionContext } from '../types';
import type { DesignSummary } from '../sim/design';

export type ChallengeTopic =
  | 'twr'
  | 'rocketEquation'
  | 'orbitSpeed'
  | 'centripetal'
  | 'artificialGravity'
  | 'gravityAssist'
  | 'sunlight'
  | 'signalDelay'
  | 'transit';

export interface ChallengeOption {
  id: string;
  label: string;
  /** Single-correct challenges: true for the one right answer. */
  correct?: boolean;
  /** For wrong answers: the misconception behind it. */
  misconception?: string;
}

/** What an answer changes in the mission (applied by the flight phases). */
export interface ChallengeConsequence {
  /** Extra Δv spent fixing a mistake, m/s. */
  deltaVCost?: number;
  /** Multiplies future science. */
  scienceFactor?: number;
  /** Extra electronics dose, krad (before shielding). */
  electronicsDose?: number;
  /** Crew health change. */
  crewHealth?: number;
}

export interface ChallengeResult {
  optionId: string;
  /** null for trade-off challenges, which have no single right answer. */
  correct: boolean | null;
  explanation: string;
  consequence: ChallengeConsequence;
}

export interface Challenge {
  id: string;
  topic: ChallengeTopic;
  title: string;
  prompt: string;
  /** Numbers from the player's own mission. */
  givens: { label: string; value: string }[];
  formula: string;
  /** A worked hint for Cadet difficulty. */
  workedHint: string;
  kind: 'single-correct' | 'trade-off';
  options: ChallengeOption[];
  evaluate: (optionId: string) => ChallengeResult;
}

export interface ChallengeContext {
  mission: MissionContext;
  summary: DesignSummary;
  vehicle: LaunchVehicle | null;
}
