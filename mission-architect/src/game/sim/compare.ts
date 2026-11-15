/**
 * Side-by-side comparison of two mission runs and their spacecraft designs
 * (Phase 09 §3). Pure TypeScript.
 */
import { computeDesignHash, type ComponentScoreMap, type SavedRunEntry } from '../core/save';
import { DEFAULT_PATCH, type MissionPatch } from '../core/patch';
import { gameData, getPathway } from '../data/loadData';
import { SLOT_IDS, type Difficulty, type SlotId } from '../types';
import { fmt, kg, kms, money } from './format';
import type { JourneyState } from './journey';
import type { MissionScore, ScoreComponent } from './scoring';

export interface ComponentComparisonRow {
  id: ScoreComponent['id'];
  label: string;
  scoreA: number | null;
  scoreB: number | null;
  deltaPct: number | null;
}

export interface MetricComparisonRow {
  id: string;
  label: string;
  valueA: string;
  valueB: string;
  deltaText: string;
  better: 'A' | 'B' | 'tie';
}

export interface DesignDiffRow {
  id: string;
  label: string;
  valueA: string;
  valueB: string;
  changed: boolean;
}

export interface RunComparison {
  runA: SavedRunEntry;
  runB: SavedRunEntry;
  scoreDelta: number;
  components: ComponentComparisonRow[];
  metrics: MetricComparisonRow[];
  designDiffs: DesignDiffRow[];
  changedCount: number;
}

const SLOT_LABELS: Readonly<Record<SlotId, string>> = {
  power: 'Power Source',
  battery: 'Battery',
  computer: 'Flight Computer',
  adcs: 'Attitude Control',
  comms: 'Communications',
  propulsion: 'Propulsion',
  radiation: 'Radiation Shield',
  thermal: 'Thermal Control',
  lifeSupport: 'Life Support',
  habitat: 'Crew Habitat',
  heatShield: 'Heat Shield',
};

const COMPONENT_META: readonly { id: ScoreComponent['id']; label: string }[] = [
  { id: 'objectives', label: 'Mission Objectives' },
  { id: 'science', label: 'Science Return' },
  { id: 'engineering', label: 'Engineering Design' },
  { id: 'efficiency', label: 'Resource Efficiency' },
  { id: 'physics', label: 'Physics Mastery' },
  { id: 'decisions', label: 'Crew Decisions' },
];

function partNameOf(partId: string | null): string {
  if (!partId) return 'None';
  return gameData.partById.get(partId)?.name ?? partId;
}

function trajectoryNameOf(pathwayId: SavedRunEntry['pathwayId'], trajectoryId: string): string {
  if (!trajectoryId) return 'Default';
  const pathway = getPathway(pathwayId);
  return pathway.trajectories.find((t) => t.id === trajectoryId)?.name ?? trajectoryId;
}

function vehicleNameOf(vehicleId: string): string {
  if (!vehicleId) return 'None';
  return gameData.launchVehicleById.get(vehicleId)?.name ?? vehicleId;
}

/** Builds a SavedRunEntry snapshot from a completed JourneyState and MissionScore. */
export function createSavedRunSnapshot(params: {
  id?: string;
  createdAt?: string;
  state: JourneyState;
  score: MissionScore;
  callSign?: string;
  crewNames?: string[];
  patch?: MissionPatch;
  difficulty?: Difficulty;
}): SavedRunEntry {
  const { state, score } = params;
  const { design, mission, vehicle } = state.input;
  const components: ComponentScoreMap = {
    objectives: null,
    science: null,
    engineering: null,
    efficiency: null,
    physics: null,
    decisions: null,
  };
  for (const comp of score.components) {
    components[comp.id] = comp.score !== null ? Math.round(comp.score * 100) : null;
  }
  const dataDeliveredPct =
    state.dataGeneratedGb > 0 ? Math.round((state.dataSentGb / state.dataGeneratedGb) * 100) : 100;

  return {
    id: params.id ?? `run-${Date.now()}`,
    createdAt: params.createdAt ?? new Date().toISOString(),
    pathwayId: mission.pathway.id,
    trajectoryId: mission.trajectory.id,
    vehicleId: vehicle.id,
    difficulty: params.difficulty ?? mission.difficulty,
    callSign: params.callSign?.trim() || 'Pathfinder',
    crewNames: params.crewNames ?? [params.callSign?.trim() || 'Pathfinder'],
    patch: params.patch ?? { ...DEFAULT_PATCH },
    outcome: score.outcome,
    score: score.total,
    grade: score.grade,
    stars: score.stars,
    components,
    science: Math.round(state.science),
    totalCost: Math.round(score.totalCost * 10) / 10,
    wetMass: Math.round(score.summary.wetMass),
    deltaV: Math.round(score.summary.deltaV),
    days: Math.round(state.day),
    dataDeliveredPct,
    endReason: state.endReason,
    design: structuredClone(design),
    designHash: computeDesignHash(design, mission.pathway.id, mission.trajectory.id, vehicle.id),
  };
}

/** Compares two saved mission runs side by side (Phase 09 §3). */
export function compareRuns(runA: SavedRunEntry, runB: SavedRunEntry): RunComparison {
  const scoreDelta = runB.score - runA.score;

  const components: ComponentComparisonRow[] = COMPONENT_META.map(({ id, label }) => {
    const scoreA = runA.components[id];
    const scoreB = runB.components[id];
    const deltaPct = scoreA !== null && scoreB !== null ? scoreB - scoreA : null;
    return { id, label, scoreA, scoreB, deltaPct };
  });

  const signFmt = (val: number, unit = '') => (val === 0 ? `0${unit}` : `${val > 0 ? '+' : ''}${fmt(val)}${unit}`);

  const metrics: MetricComparisonRow[] = [
    {
      id: 'score',
      label: 'Total Score',
      valueA: `${runA.score} (${runA.grade})`,
      valueB: `${runB.score} (${runB.grade})`,
      deltaText: signFmt(runB.score - runA.score, ' pts'),
      better: runB.score > runA.score ? 'B' : runA.score > runB.score ? 'A' : 'tie',
    },
    {
      id: 'science',
      label: 'Science Delivered',
      valueA: `${fmt(runA.science)} pts`,
      valueB: `${fmt(runB.science)} pts`,
      deltaText: signFmt(runB.science - runA.science, ' pts'),
      better: runB.science > runA.science ? 'B' : runA.science > runB.science ? 'A' : 'tie',
    },
    {
      id: 'cost',
      label: 'Total Cost',
      valueA: money(runA.totalCost),
      valueB: money(runB.totalCost),
      deltaText:
        runB.totalCost === runA.totalCost
          ? '$0M'
          : `${runB.totalCost > runA.totalCost ? '+' : '-'}${money(Math.abs(runB.totalCost - runA.totalCost))}`,
      // Lower cost is better
      better: runB.totalCost < runA.totalCost ? 'B' : runA.totalCost < runB.totalCost ? 'A' : 'tie',
    },
    {
      id: 'wetMass',
      label: 'Wet Mass',
      valueA: kg(runA.wetMass),
      valueB: kg(runB.wetMass),
      deltaText: signFmt(runB.wetMass - runA.wetMass, ' kg'),
      better: runB.wetMass < runA.wetMass ? 'B' : runA.wetMass < runB.wetMass ? 'A' : 'tie',
    },
    {
      id: 'deltaV',
      label: 'Spacecraft Δv',
      valueA: kms(runA.deltaV),
      valueB: kms(runB.deltaV),
      deltaText: signFmt(runB.deltaV - runA.deltaV, ' m/s'),
      better: runB.deltaV > runA.deltaV ? 'B' : runA.deltaV > runB.deltaV ? 'A' : 'tie',
    },
    {
      id: 'downlink',
      label: 'Data Downlinked',
      valueA: `${runA.dataDeliveredPct}%`,
      valueB: `${runB.dataDeliveredPct}%`,
      deltaText: signFmt(runB.dataDeliveredPct - runA.dataDeliveredPct, '%'),
      better:
        runB.dataDeliveredPct > runA.dataDeliveredPct
          ? 'B'
          : runA.dataDeliveredPct > runB.dataDeliveredPct
            ? 'A'
            : 'tie',
    },
  ];

  const designDiffs: DesignDiffRow[] = [];
  const addDiff = (id: string, label: string, valueA: string, valueB: string) => {
    designDiffs.push({ id, label, valueA, valueB, changed: valueA !== valueB });
  };

  addDiff(
    'trajectory',
    'Trajectory',
    trajectoryNameOf(runA.pathwayId, runA.trajectoryId),
    trajectoryNameOf(runB.pathwayId, runB.trajectoryId),
  );
  addDiff('vehicle', 'Launch Vehicle', vehicleNameOf(runA.vehicleId), vehicleNameOf(runB.vehicleId));
  addDiff('bus', 'Spacecraft Bus', partNameOf(runA.design.busId), partNameOf(runB.design.busId));

  for (const slot of SLOT_IDS) {
    const a = partNameOf(runA.design.slots[slot]);
    const b = partNameOf(runB.design.slots[slot]);
    if (a === 'None' && b === 'None') continue;
    addDiff(slot, SLOT_LABELS[slot], a, b);
  }

  const instA = runA.design.instrumentIds.map((id) => partNameOf(id)).join(', ') || 'None';
  const instB = runB.design.instrumentIds.map((id) => partNameOf(id)).join(', ') || 'None';
  addDiff('instruments', 'Instruments', instA, instB);

  addDiff('fuelMass', 'Propellant Load', kg(runA.design.options.fuelMass), kg(runB.design.options.fuelMass));
  if (runA.design.options.supplyDays > 0 || runB.design.options.supplyDays > 0) {
    addDiff(
      'supplyDays',
      'Crew Supplies',
      `${fmt(runA.design.options.supplyDays)} days`,
      `${fmt(runB.design.options.supplyDays)} days`,
    );
  }
  if (runA.design.slots.habitat === 'hab_spin' || runB.design.slots.habitat === 'hab_spin') {
    addDiff(
      'spinArmLength',
      'Spin Habitat Arm',
      `${fmt(runA.design.options.spinArmLength)} m`,
      `${fmt(runB.design.options.spinArmLength)} m`,
    );
  }

  const changedCount = designDiffs.filter((d) => d.changed).length;

  return {
    runA,
    runB,
    scoreDelta,
    components,
    metrics,
    designDiffs,
    changedCount,
  };
}
