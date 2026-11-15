/**
 * Mission evaluation: did the mission meet its contract, and how well was
 * it engineered and flown? Weights follow implementation-plan/phase-09.
 */
import { challengesFor, physicsMastery } from '../challenges/generator';
import type { ChallengeResult, ChallengeTopic } from '../challenges/types';
import type { CrewMember } from '../core/crew';
import { computeCollaborationMetrics } from '../core/votes';
import { gameData, type GameData } from '../data/loadData';
import type { DecisionLogEntry, SlotId } from '../types';
import type { DesignSummary } from './design';
import { summarizeDesign } from './design';
import { fmt, gbPerDay, kms, money, watts } from './format';
import type { JourneyState } from './journey';
import { CREW_DOSE_LIMIT, reviewDesign, type CheckStatus, type ReviewResult } from './review';

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

/**
 * Combines in-flight event decision quality with team collaboration metrics
 * when a multi-player crew or voted decisions exist.
 */
export function computeDecisionsScore(
  state: JourneyState,
  crew: readonly CrewMember[] = [],
  decisionLog: readonly DecisionLogEntry[] = [],
): number | null {
  const eventScore = judgeEvents(state);
  const hasTeamVotes = crew.length > 1 || decisionLog.some((entry) => Boolean(entry.voteSummary));
  if (!hasTeamVotes) return eventScore;

  const collab = computeCollaborationMetrics(crew, decisionLog, state.events);
  const collabScore = Math.max(0, Math.min(1, collab.overallScore));
  if (eventScore === null) return collabScore;
  return eventScore * 0.6 + collabScore * 0.4;
}

export function buildScoreExtras(
  state: JourneyState,
  challengeResults: readonly ChallengeResult[] = [],
  crew: readonly CrewMember[] = [],
  decisionLog: readonly DecisionLogEntry[] = [],
): ScoreExtras {
  return {
    physics: physicsMastery(challengeResults),
    decisions: computeDecisionsScore(state, crew, decisionLog),
  };
}

export interface ErbVsRealityRow {
  id: string;
  checkId: string;
  title: string;
  erbStatus: CheckStatus;
  predicted: string;
  actual: string;
  verdict: 'matched' | 'tight_margin' | 'exceeded_limit';
  lesson: string;
  targetSlot: SlotId | 'bus' | 'instruments' | null;
}

/**
 * Compares what the Engineering Review Board predicted before launch against
 * what actually happened in flight (Phase 09 §2.5).
 */
export function buildErbVsReality(state: JourneyState, score: MissionScore): ErbVsRealityRow[] {
  const s = score.summary;
  const { mission } = state.input;
  const { env, pathway } = mission;
  const checkById = new Map(score.review.checks.map((c) => [c.id, c]));
  const rows: ErbVsRealityRow[] = [];

  // 1. Propellant & Δv Budget (ERB-2)
  if (env.deltaV > 0) {
    const check = checkById.get('ERB-2');
    const reserve = Math.max(0, s.deltaV - env.deltaV);
    const spent = Math.min(s.deltaV, env.deltaV);
    const failed = state.endReason === 'insertion_failure';
    const tight = !failed && reserve < env.deltaV * 0.05;
    rows.push({
      id: 'erb-reality-dv',
      checkId: 'ERB-2',
      title: 'Δv & Propellant Margin',
      erbStatus: check?.status ?? 'pass',
      predicted: `${kms(s.deltaV)} available vs ${kms(env.deltaV)} required`,
      actual: failed
        ? `Ran short during insertion (${kms(s.deltaV)} < ${kms(env.deltaV)})`
        : `${kms(spent)} burned · ${kms(reserve)} reserve left`,
      verdict: failed ? 'exceeded_limit' : tight ? 'tight_margin' : 'matched',
      lesson: failed
        ? 'The rocket equation leaves no room for shortfall: every burn requires full Δv.'
        : tight
          ? 'You made orbit with < 5% Δv reserve — one extra correction burn would have exhausted the tanks.'
          : 'A 10–20% Δv reserve absorbed course corrections and insertion burns cleanly.',
      targetSlot: 'propulsion',
    });
  }

  // 2. Power at Destination (ERB-4)
  {
    const check = checkById.get('ERB-4');
    const failed = state.endReason === 'power_failure';
    const brownouts = state.powerLimitedDays > 0;
    rows.push({
      id: 'erb-reality-power',
      checkId: 'ERB-4',
      title: 'Power at Destination',
      erbStatus: check?.status ?? 'pass',
      predicted: `${watts(s.powerAvailable)} generated vs ${watts(s.powerLoad)} load`,
      actual: failed
        ? `Power bus collapsed at ${fmt(env.sunDistanceAU, 1)} AU`
        : brownouts
          ? `${fmt(state.powerLimitedDays)} days in survival brownout`
          : `100% instrument duty cycle (${fmt(state.day)} days)`,
      verdict: failed ? 'exceeded_limit' : brownouts ? 'tight_margin' : 'matched',
      lesson: failed
        ? `Solar flux drops as 1/d² (${fmt(env.sunDistanceAU, 1)} AU). An RTG or larger array was essential.`
        : brownouts
          ? 'Survival mode saved the bus by shutting down instruments when power dipped.'
          : 'Generation exceeded load + 15% margin across the entire flight.',
      targetSlot: 'power',
    });
  }

  // 3. Communications & Downlink (ERB-6)
  {
    const check = checkById.get('ERB-6');
    const ratio = state.dataGeneratedGb > 0 ? state.dataSentGb / state.dataGeneratedGb : 1;
    const lost = state.dataLostGb > 0.5 || ratio < 0.95;
    rows.push({
      id: 'erb-reality-comms',
      checkId: 'ERB-6',
      title: 'Telemetry & Science Downlink',
      erbStatus: check?.status ?? 'pass',
      predicted: `${gbPerDay(s.downlinkPerDay)} capacity vs ${gbPerDay(s.dataPerDay)} generated`,
      actual:
        state.dataGeneratedGb > 0
          ? `${fmt(ratio * 100)}% returned (${fmt(state.dataSentGb, 1)} / ${fmt(state.dataGeneratedGb, 1)} Gb)`
          : 'No science data generated',
      verdict: ratio < 0.6 ? 'exceeded_limit' : lost ? 'tight_margin' : 'matched',
      lesson: lost
        ? `Inverse-square signal loss at ${fmt(env.earthDistanceAU, 2)} AU throttled downlink; ${fmt(state.dataLostGb, 1)} Gb overflowed on-board storage.`
        : 'Antenna gain matched instrument data rate without buffer overflow.',
      targetSlot: 'comms',
    });
  }

  // 4. Electronics Radiation Tolerance (ERB-8)
  if (s.resolved.computer) {
    const check = checkById.get('ERB-8');
    const tol = s.resolved.computer.radToleranceKrad;
    const failed = state.endReason === 'radiation';
    const high = !failed && state.electronicsDose > tol * 0.8;
    rows.push({
      id: 'erb-reality-rad',
      checkId: 'ERB-8',
      title: 'Electronics Radiation Dose',
      erbStatus: check?.status ?? 'pass',
      predicted: `${fmt(s.electronicsDose, 1)} krad expected vs ${fmt(tol)} krad limit`,
      actual: `${fmt(state.electronicsDose, 1)} krad absorbed${failed ? ' (avionics failure)' : ''}`,
      verdict: failed ? 'exceeded_limit' : high ? 'tight_margin' : 'matched',
      lesson:
        state.electronicsDose > s.electronicsDose + 1
          ? 'In-flight solar storms or close flyby passes added extra radiation beyond nominal cruise.'
          : 'Radiation shielding kept total ionizing dose within avionics limits.',
      targetSlot: 'radiation',
    });
  }

  // 5. Crew Health & Life Support (ERB-11 / ERB-10S) for crewed missions
  if (pathway.crewed) {
    const check = checkById.get('ERB-11');
    const failed = state.endReason === 'supplies' || state.endReason === 'reentry_failure' || (state.crewHealth ?? 0) < 65;
    const warn = !failed && (state.crewHealth ?? 100) < 80;
    rows.push({
      id: 'erb-reality-crew',
      checkId: 'ERB-11',
      title: 'Crew Health & Safe Return',
      erbStatus: check?.status ?? 'pass',
      predicted: `Health ${fmt(s.crewHealth ?? 100)}/100 · Dose ${fmt(s.crewDose)} mSv`,
      actual: `Health ${Math.round(state.crewHealth ?? 0)}/100 · Dose ${Math.round(state.crewDose)} mSv`,
      verdict: failed ? 'exceeded_limit' : warn ? 'tight_margin' : 'matched',
      lesson:
        s.spinRpm > 0
          ? `Artificial gravity (${fmt(s.spinRpm, 1)} rpm) protected bone and muscle conditioning in deep space.`
          : 'Countermeasures, supplies, and heat-shield rating govern crew survival all the way to splashdown.',
      targetSlot: state.endReason === 'reentry_failure' ? 'heatShield' : state.endReason === 'supplies' ? 'lifeSupport' : 'habitat',
    });
  }

  // 6. Science Return (ERB-12S)
  {
    const check = checkById.get('ERB-12S');
    const met = state.science >= pathway.scienceTarget;
    const partial = !met && state.science >= pathway.scienceTarget * 0.5;
    rows.push({
      id: 'erb-reality-science',
      checkId: 'ERB-12S',
      title: 'Science Return vs Contract Target',
      erbStatus: check?.status ?? 'pass',
      predicted: `${fmt(s.science)} pts projected (target ≥ ${pathway.scienceTarget})`,
      actual: `${Math.round(state.science)} pts delivered (${fmt((state.science / pathway.scienceTarget) * 100)}% of target)`,
      verdict: met ? 'matched' : partial ? 'tight_margin' : 'exceeded_limit',
      lesson: met
        ? 'Instrument selection, pointing stability, and downlink worked together to exceed the science contract.'
        : 'Actual science depends on instrument fit, pointing accuracy, power uptime, and downlink bandwidth.',
      targetSlot: 'instruments',
    });
  }

  // 7. Mission Budget (ERB-13)
  {
    const check = checkById.get('ERB-13');
    const over = score.totalCost > mission.budget;
    rows.push({
      id: 'erb-reality-budget',
      checkId: 'ERB-13',
      title: 'Total Mission Cost',
      erbStatus: check?.status ?? 'pass',
      predicted: `${money(s.totalCost)} pre-flight estimate (cap ${money(mission.budget)})`,
      actual: `${money(score.totalCost)} final${state.extraCost !== 0 ? ` (${state.extraCost > 0 ? '+' : ''}${money(state.extraCost)} in flight)` : ''}`,
      verdict: over ? 'exceeded_limit' : score.totalCost > mission.budget * 0.95 ? 'tight_margin' : 'matched',
      lesson:
        state.extraCost > 0
          ? `Emergency ground-station and mission extension choices added ${money(state.extraCost)} during flight.`
          : 'Keeping a budget reserve before launch protects against in-flight contingencies.',
      targetSlot: 'bus',
    });
  }

  return rows;
}

export interface PhysicsRecapItem {
  id: string;
  topic: ChallengeTopic;
  title: string;
  prompt: string;
  formula: string;
  playerAnswer: string;
  correctAnswer: string;
  status: 'correct' | 'trade-off' | 'incorrect' | 'not_taken';
  explanation: string;
}

/**
 * Summarizes every physics challenge for the mission pathway alongside the
 * player's chosen answer and the underlying physical formula (Phase 09 §2.6).
 */
export function buildPhysicsRecap(
  state: JourneyState,
  score: MissionScore,
  challengeResults: readonly ChallengeResult[] = [],
): PhysicsRecapItem[] {
  const challenges = challengesFor({
    mission: state.input.mission,
    summary: score.summary,
    vehicle: state.input.vehicle,
  });

  return challenges.map((ch) => {
    const rightOpt = ch.options.find((o) => o.correct) ?? ch.options[0];
    // Find a matching result whose optionId belongs to this challenge or whose explanation matches
    const matched = challengeResults.find((res) => {
      if (!ch.options.some((o) => o.id === res.optionId)) return false;
      try {
        const evalCheck = ch.evaluate(res.optionId);
        return evalCheck.explanation === res.explanation;
      } catch {
        return false;
      }
    });

    if (!matched) {
      const sampleEval = rightOpt ? ch.evaluate(rightOpt.id) : null;
      return {
        id: ch.id,
        topic: ch.topic,
        title: ch.title,
        prompt: ch.prompt,
        formula: ch.formula,
        playerAnswer: 'Reviewed automatically by flight computer',
        correctAnswer: rightOpt?.label ?? '—',
        status: 'not_taken',
        explanation: sampleEval?.explanation ?? ch.workedHint,
      };
    }

    const chosenOpt = ch.options.find((o) => o.id === matched.optionId);
    const status: PhysicsRecapItem['status'] =
      matched.correct === true ? 'correct' : matched.correct === null ? 'trade-off' : 'incorrect';

    return {
      id: ch.id,
      topic: ch.topic,
      title: ch.title,
      prompt: ch.prompt,
      formula: ch.formula,
      playerAnswer: chosenOpt?.label ?? matched.optionId,
      correctAnswer: ch.kind === 'trade-off' ? 'Engineering trade-off (context-dependent)' : (rightOpt?.label ?? '—'),
      status,
      explanation: matched.explanation,
    };
  });
}

export interface CrewAward {
  id: 'best_call' | 'budget_hawk' | 'science_hero' | 'systems_guardian';
  title: string;
  badge: string;
  recipientCallSign: string;
  recipientRole: string;
  avatar: number;
  reason: string;
}

/**
 * Light-hearted crew awards recognizing specific decisions made by the crew
 * across assembly and flight (Phase 09 §2.7).
 */
export function buildCrewAwards(
  state: JourneyState,
  score: MissionScore,
  crew: readonly CrewMember[] = [],
  decisionLog: readonly DecisionLogEntry[] = [],
): CrewAward[] {
  const safeCrew: CrewMember[] =
    crew.length > 0
      ? [...crew]
      : [{ id: 'p1', callSign: 'Pathfinder', avatar: 0, roles: ['commander', 'engineer', 'science', 'comms'] }];

  const memberForRole = (role: string): CrewMember =>
    safeCrew.find((m) => m.roles.includes(role as CrewMember['roles'][number])) ?? safeCrew[0];

  const cdr = memberForRole('commander');
  const eng = memberForRole('engineer');
  const sci = memberForRole('science');
  const com = memberForRole('comms');

  const lastEvent = state.events.at(-1);
  const votedEvent = [...decisionLog].reverse().find((d) => d.voteSummary);
  const bestCallReason = lastEvent
    ? `Chose "${lastEvent.optionLabel}" during ${lastEvent.title} (Day ${fmt(lastEvent.day)}).`
    : votedEvent?.voteSummary
      ? `Led team resolution on "${votedEvent.voteSummary.proposalTitle}" (${votedEvent.voteSummary.consensus ? 'unanimous consensus' : votedEvent.voteSummary.outcome}).`
      : `Guided the ${state.input.mission.trajectory.name} flight plan from launch to ${state.input.mission.pathway.destination}.`;

  const budgetLeft = state.input.mission.budget - score.totalCost;
  const budgetReason =
    budgetLeft >= 0
      ? `Kept the mission ${money(budgetLeft)} under the ${money(state.input.mission.budget)} agency cap with ${state.input.vehicle.name}.`
      : `Pushed the hardware envelope (${money(-budgetLeft)} over cap) in pursuit of mission performance.`;

  const bestInst = [...score.summary.instrumentScores].filter((i) => i.fitted).sort((a, b) => b.potential - a.potential)[0];
  const scienceReason = bestInst
    ? `Championed the ${bestInst.instrument.name}, delivering ${Math.round(state.science)} / ${state.input.mission.pathway.scienceTarget} science points.`
    : `Managed payload operations for ${Math.round(state.science)} science points.`;

  const dataRatio = state.dataGeneratedGb > 0 ? Math.round((state.dataSentGb / state.dataGeneratedGb) * 100) : 100;
  const guardianReason = `Maintained ${dataRatio}% telemetry downlink (${fmt(state.dataSentGb, 1)} Gb) and ${score.review.counts.pass} passing ERB checks.`;

  return [
    {
      id: 'best_call',
      title: 'Best Call',
      badge: '🎖️',
      recipientCallSign: cdr.callSign || 'Commander',
      recipientRole: 'Mission Commander (CDR)',
      avatar: cdr.avatar,
      reason: bestCallReason,
    },
    {
      id: 'budget_hawk',
      title: 'Budget Hawk',
      badge: '🦅',
      recipientCallSign: eng.callSign || 'Engineer',
      recipientRole: 'Systems Engineer (ENG)',
      avatar: eng.avatar,
      reason: budgetReason,
    },
    {
      id: 'science_hero',
      title: 'Science Hero',
      badge: '🔭',
      recipientCallSign: sci.callSign || 'Scientist',
      recipientRole: 'Payload Scientist (SCI)',
      avatar: sci.avatar,
      reason: scienceReason,
    },
    {
      id: 'systems_guardian',
      title: 'Systems Guardian',
      badge: '📡',
      recipientCallSign: com.callSign || 'Flight Ops',
      recipientRole: 'Flight Operations (COM)',
      avatar: com.avatar,
      reason: guardianReason,
    },
  ];
}

