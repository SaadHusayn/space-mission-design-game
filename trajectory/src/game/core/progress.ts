/**
 * Chapter progress: best result per pathway and which pathways are unlocked.
 */
import { PATHWAY_IDS } from '../data/schemas';
import type { PathwayId } from '../types';

export interface PathwayResult {
  /** Best stars earned (0–3). */
  stars: number;
  /** Best total score (0–100). */
  bestScore: number;
}

export type Progress = Partial<Record<PathwayId, PathwayResult>>;

/** Each pathway opens when the listed pathway has at least one star. Null = open from the start. */
export const UNLOCKED_BY: Readonly<Record<PathwayId, PathwayId | null>> = {
  leo: null,
  moon: 'leo',
  mars: 'moon',
  jupiter: 'mars',
  interstellar: 'jupiter',
  exoplanet: 'jupiter',
};

export function isUnlocked(pathway: PathwayId, progress: Progress, unlockAll = false): boolean {
  if (unlockAll) return true;
  const needed = UNLOCKED_BY[pathway];
  return needed === null || (progress[needed]?.stars ?? 0) >= 1;
}

/** Keeps the best stars and score for a pathway. */
export function recordResult(progress: Progress, pathway: PathwayId, stars: number, score: number): Progress {
  const previous = progress[pathway];
  return {
    ...progress,
    [pathway]: {
      stars: Math.max(previous?.stars ?? 0, clampInt(stars, 0, 3)),
      bestScore: Math.max(previous?.bestScore ?? 0, clampInt(score, 0, 100)),
    },
  };
}

export function sanitiseProgress(value: unknown): Progress {
  if (!value || typeof value !== 'object') return {};
  const result: Progress = {};
  for (const id of PATHWAY_IDS) {
    const entry = (value as Record<string, unknown>)[id] as Partial<PathwayResult> | undefined;
    if (entry && typeof entry === 'object') {
      result[id] = { stars: clampInt(entry.stars, 0, 3), bestScore: clampInt(entry.bestScore, 0, 100) };
    }
  }
  return result;
}

function clampInt(value: unknown, min: number, max: number): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : min;
  return Math.min(max, Math.max(min, number));
}
