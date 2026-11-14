/**
 * Builds the context for one mission: pathway + chosen trajectory + difficulty.
 */
import { getPathway } from '../data/loadData';
import type { Difficulty, Environment, MissionContext, Pathway, PathwayId, TrajectoryOption } from '../types';

/** Budget multiplier per difficulty. */
export const BUDGET_FACTOR: Readonly<Record<Difficulty, number>> = {
  cadet: 1.3,
  engineer: 1,
  director: 0.8,
};

export function environmentFor(pathway: Pathway, trajectory: TrajectoryOption): Environment {
  return { ...pathway.environment, ...trajectory.overrides };
}

export function createMission(
  pathwayOrId: Pathway | PathwayId,
  trajectoryId?: string,
  difficulty: Difficulty = 'engineer',
): MissionContext {
  const pathway = typeof pathwayOrId === 'string' ? getPathway(pathwayOrId) : pathwayOrId;
  const trajectory = trajectoryId
    ? pathway.trajectories.find((option) => option.id === trajectoryId)
    : pathway.trajectories[0];
  if (!trajectory) throw new Error(`Pathway "${pathway.id}" has no trajectory "${trajectoryId}"`);
  return {
    pathway,
    trajectory,
    env: environmentFor(pathway, trajectory),
    difficulty,
    budget: Math.round(pathway.budget * BUDGET_FACTOR[difficulty]),
  };
}

/** Total mission length in days (out, working, and home). */
export function missionDays(env: Environment): number {
  return env.cruiseDays + env.operationsDays + env.returnDays;
}
