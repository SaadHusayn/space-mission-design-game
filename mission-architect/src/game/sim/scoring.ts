/**
 * Mission evaluation: did the mission meet its contract, and how well was
 * it engineered and flown? Weights follow implementation-plan/phase-09.
 */
import { gameData, type GameData } from '../data/loadData';
import type { DesignSummary } from './design';
import { summarizeDesign } from './design';
import { money } from './format';
import type { JourneyState } from './journey';
import { CREW_DOSE_LIMIT, reviewDesign, type ReviewResult } from './review';

export type MissionOutcome = 'success' | 'partial' | 'failure';
export type ScoreGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface RequirementResult {
  id: string;
  label: string;
  met: boolean;
  value: string;
  target: string;
}

export interface ScoreComponent {
  id: 'objectives' | 'science' | 'engineering' | 'efficiency' | 'physics' | 'decisions';
  label: string;
  weight: number;
  /** 0..1, or null when it doesn't apply (its weight is shared out). */
  score: number | null;
}

export interface MissionScore {
  outcome: MissionOutcome;
  total: number;
  grade: ScoreGrade;
  stars: 0 | 1 | 2 | 3;
  components: ScoreComponent[];
  requirements: RequirementResult[];
  totalCost: number;
  review: ReviewResult;
  summary: DesignSummary;
}

export interface ScoreExtras {
  /** Physics challenges: share answered well (0..1). Leave out if none were asked. */
  physics?: number | null;
  /** Quality of crew decisions / teamwork (0..1). Leave out to judge events automatically. */
  decisions?: number | null;
}

/** 1 for a healthy margin (5–25%), less for too little or wastefully too much. */
export function marginScore(available: number, used: number): number {
  if (available <= 0) return used <= 0 ? 1 : 0;
  const margin = (available - used) / available;
  if (margin < 0) return 0;
  if (margin < 0.05) return 0.6 + 8 * margin;
  if (margin <= 0.25) return 1;
  return Math.max(0.5, 1 - (margin - 0.25));
}

const SAFE_OPTIONS = new Set(['safe_mode', 'reroute', 'spare', 'thrusters', 'pause', 'preprogram', 'reboot', 'rest', 'wait']);

/** Default decision score: share of events where the crew chose the option that protected the mission. */
function judgeEvents(state: JourneyState): number | null {
  if (state.events.length === 0) return null;
  let good = 0;
  for (const event of state.events) {
    if (SAFE_OPTIONS.has(event.optionId)) good += 1;
    else if (/still made|shrugged|followed up|perfectly/i.test(event.outcome)) good += 1;
    else if (event.optionId === 'extend' || event.optionId === 'end' || event.optionId === 'store' || event.optionId === 'hold') good += 0.75;
    else good += 0.25;
  }
  return good / state.events.length;
}

function gradeOf(total: number): ScoreGrade {
  if (total >= 95) return 'S';
  if (total >= 85) return 'A';
  if (total >= 70) return 'B';
  if (total >= 55) return 'C';
  return 'F';
}

export function scoreMission(state: JourneyState, extras: ScoreExtras = {}, data: GameData = gameData): MissionScore {
  const { design, mission, vehicle } = state.input;
  const { pathway } = mission;
  const summary = summarizeDesign(design, mission, vehicle, data);
  const review = reviewDesign(design, mission, vehicle, data);
  const totalCost = summary.totalCost + state.extraCost;

  // --- Contract
  const fittedTypes = new Set(summary.instrumentScores.filter((score) => score.fitted).map((score) => score.instrument.type));
  const requirements: RequirementResult[] = [
    {
      id: 'complete',
      label: 'Mission completed',
      met: state.endReason === 'complete',
      value: state.endReason === 'complete' ? 'Yes' : `Ended: ${state.endReason ?? 'in progress'}`,
      target: 'Complete',
    },
    {
      id: 'instruments',
      label: 'Right instruments',
      met: pathway.requiredInstruments.every((group) => group.some((type) => fittedTypes.has(type))),
      value: [...fittedTypes].join(', ') || 'none',
      target: pathway.requiredInstruments.map((group) => group.join(' or ')).join(' + '),
    },
    {
      id: 'science',
      label: 'Science goal',
      met: state.science >= pathway.scienceTarget,
      value: Math.round(state.science).toString(),
      target: `≥ ${pathway.scienceTarget}`,
    },
    {
      id: 'budget',
      label: 'Within budget',
      met: totalCost <= mission.budget,
      value: money(totalCost),
      target: `≤ ${money(mission.budget)}`,
    },
  ];
  if (pathway.crewed) {
    const home = state.endReason === 'complete';
    requirements.push({
      id: 'crew',
      label: 'Crew home safe and healthy',
      met: home && (state.crewHealth ?? 0) >= 65 && state.crewDose <= CREW_DOSE_LIMIT,
      value: `${home ? 'Home' : 'Not home'} · health ${Math.round(state.crewHealth ?? 0)} · ${Math.round(state.crewDose)} mSv`,
      target: `Home · health ≥ 65 · ≤ ${CREW_DOSE_LIMIT} mSv`,
    });
  }

  // --- Components
  const met = requirements.filter((item) => item.met).length;
  const reviewDecided = review.counts.pass + review.counts.warn + review.counts.fail;
  const efficiencyParts = [
    marginScore(mission.budget, totalCost),
    summary.launchCapacity !== null ? marginScore(summary.launchCapacity, summary.wetMass) : 1,
    marginScore(summary.powerAvailable, summary.powerLoad),
    summary.deltaVRequired > 0 ? marginScore(summary.deltaV, summary.deltaVRequired) : 1,
  ];
  const components: ScoreComponent[] = [
    { id: 'objectives', label: 'Mission objectives', weight: 30, score: met / requirements.length },
    { id: 'science', label: 'Science return', weight: 20, score: Math.min(1, state.science / pathway.scienceTarget) },
    {
      id: 'engineering',
      label: 'Engineering design',
      weight: 15,
      score: reviewDecided === 0 ? 0 : (review.counts.pass + 0.5 * review.counts.warn) / reviewDecided,
    },
    {
      id: 'efficiency',
      label: 'Resource efficiency',
      weight: 15,
      score: efficiencyParts.reduce((sum, value) => sum + value, 0) / efficiencyParts.length,
    },
    { id: 'physics', label: 'Physics mastery', weight: 10, score: extras.physics ?? null },
    {
      id: 'decisions',
      label: pathway.crewed ? 'Crew decisions' : 'Mission decisions',
      weight: 10,
      score: extras.decisions ?? judgeEvents(state),
    },
  ];

  const usedWeight = components.reduce((sum, item) => sum + (item.score === null ? 0 : item.weight), 0);
  const weighted = components.reduce((sum, item) => sum + (item.score === null ? 0 : item.weight * item.score), 0);
  let total = usedWeight > 0 ? (weighted / usedWeight) * 100 : 0;

  const allMet = met === requirements.length;
  const crewLost = state.endReason === 'reentry_failure' || state.endReason === 'launch_failure';
  const outcome: MissionOutcome = allMet
    ? 'success'
    : !crewLost && state.science >= pathway.scienceTarget * 0.5
      ? 'partial'
      : 'failure';
  if (outcome === 'failure') total = Math.min(total, 54);
  if (outcome === 'partial') total = Math.min(total, 84);
  total = Math.round(total);

  const stars: MissionScore['stars'] =
    outcome === 'success' ? (total >= 85 ? 3 : 2) : outcome === 'partial' ? 1 : 0;

  return { outcome, total, grade: gradeOf(total), stars, components, requirements, totalCost, review, summary };
}
