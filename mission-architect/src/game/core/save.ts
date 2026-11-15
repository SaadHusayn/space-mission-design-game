/**
 * Persistence for saved designs, completed mission runs, local chapter
 * leaderboards, and JSON / URL-safe share-code export & import (Phase 09 §3).
 *
 * Pure TypeScript (no React/Three/Next imports).
 */
import { z } from 'zod';

import { gameData } from '../data/loadData';
import { PATHWAY_IDS } from '../data/schemas';
import type { MissionOutcome, ScoreComponent, ScoreGrade } from '../sim/scoring';
import { emptyDesign, SLOT_IDS, type Design, type Difficulty, type PathwayId, type SlotId } from '../types';
import { DEFAULT_PATCH, sanitisePatch, type MissionPatch } from './patch';

const DIFFICULTIES = ['cadet', 'engineer', 'director'] as const;

export const SAVED_DESIGNS_KEY = 'mission-architect:saved-designs';
export const SAVED_RUNS_KEY = 'mission-architect:saved-runs';
export const SAVE_SCHEMA_VERSION = 1;

export interface SimpleStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

const memoryFallback = new Map<string, string>();
const memoryStorage: SimpleStorage = {
  getItem: (key) => memoryFallback.get(key) ?? null,
  setItem: (key, value) => {
    memoryFallback.set(key, value);
  },
  removeItem: (key) => {
    memoryFallback.delete(key);
  },
};

export function defaultSaveStorage(): SimpleStorage {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return memoryStorage;
}

export interface SavedDesignEntry {
  id: string;
  name: string;
  createdAt: string;
  pathwayId: PathwayId;
  trajectoryId: string | null;
  vehicleId: string | null;
  difficulty: Difficulty;
  design: Design;
  designHash: string;
}

export type ComponentScoreMap = Record<ScoreComponent['id'], number | null>;

export interface SavedRunEntry {
  id: string;
  createdAt: string;
  pathwayId: PathwayId;
  trajectoryId: string;
  vehicleId: string;
  difficulty: Difficulty;
  callSign: string;
  crewNames: string[];
  patch: MissionPatch;
  outcome: MissionOutcome;
  score: number;
  grade: ScoreGrade;
  stars: 0 | 1 | 2 | 3;
  components: ComponentScoreMap;
  science: number;
  totalCost: number;
  wetMass: number;
  deltaV: number;
  days: number;
  dataDeliveredPct: number;
  endReason: string | null;
  design: Design;
  designHash: string;
}

export interface ExportedDesignBundle {
  version: number;
  exportedAt: string;
  name: string;
  pathwayId: PathwayId;
  trajectoryId: string | null;
  vehicleId: string | null;
  difficulty: Difficulty;
  design: Design;
  designHash: string;
  runSummary?: {
    callSign: string;
    outcome: MissionOutcome;
    score: number;
    grade: ScoreGrade;
    stars: 0 | 1 | 2 | 3;
    science: number;
    totalCost: number;
    wetMass: number;
    deltaV: number;
  };
}

/** Deterministic FNV-1a 32-bit hash of the spacecraft configuration. */
export function computeDesignHash(
  design: Design,
  pathwayId: PathwayId,
  trajectoryId: string | null = null,
  vehicleId: string | null = null,
): string {
  const canonical = JSON.stringify({
    p: pathwayId,
    t: trajectoryId ?? '',
    v: vehicleId ?? '',
    b: design.busId ?? '',
    s: SLOT_IDS.map((slot) => [slot, design.slots[slot] ?? '']),
    i: [...design.instrumentIds].sort(),
    o: {
      fuelMass: Math.round(design.options.fuelMass),
      supplyDays: Math.round(design.options.supplyDays),
      spinArmLength: Math.round(design.options.spinArmLength),
    },
  });
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `#${hash.toString(16).toUpperCase().padStart(8, '0').slice(0, 6)}`;
}

const designSlotsSchema = z.object({
  power: z.string().nullable().default(null),
  battery: z.string().nullable().default(null),
  computer: z.string().nullable().default(null),
  adcs: z.string().nullable().default(null),
  comms: z.string().nullable().default(null),
  propulsion: z.string().nullable().default(null),
  radiation: z.string().nullable().default(null),
  thermal: z.string().nullable().default(null),
  lifeSupport: z.string().nullable().default(null),
  habitat: z.string().nullable().default(null),
  heatShield: z.string().nullable().default(null),
});

const designSchema = z.object({
  busId: z.string().nullable().default(null),
  slots: designSlotsSchema,
  instrumentIds: z.array(z.string()).max(6).default([]),
  options: z.object({
    fuelMass: z.number().min(0).max(500_000).default(0),
    supplyDays: z.number().min(0).max(5_000).default(0),
    spinArmLength: z.number().min(0).max(500).default(85),
  }),
});

const exportBundleSchema = z.object({
  version: z.number().int().min(1).default(SAVE_SCHEMA_VERSION),
  exportedAt: z.string().default(() => new Date().toISOString()),
  name: z.string().min(1).max(80).default('Custom Spacecraft Design'),
  pathwayId: z.enum(PATHWAY_IDS),
  trajectoryId: z.string().nullable().default(null),
  vehicleId: z.string().nullable().default(null),
  difficulty: z.enum(DIFFICULTIES).default('engineer'),
  design: designSchema,
  designHash: z.string().optional(),
  runSummary: z
    .object({
      callSign: z.string().max(32),
      outcome: z.enum(['success', 'partial', 'failure']),
      score: z.number().min(0).max(100),
      grade: z.enum(['S', 'A', 'B', 'C', 'F']),
      stars: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
      science: z.number().min(0),
      totalCost: z.number().min(0),
      wetMass: z.number().min(0),
      deltaV: z.number().min(0),
    })
    .optional(),
});

/** Sanitises a parsed Design so only real catalogue part IDs are kept. */
export function sanitiseDesign(raw: unknown): Design {
  const parsed = designSchema.safeParse(raw);
  if (!parsed.success) return emptyDesign();
  const d = parsed.data;
  const clean = emptyDesign();
  clean.busId = d.busId && gameData.partById.get(d.busId)?.category === 'bus' ? d.busId : null;
  for (const slot of SLOT_IDS) {
    const id = d.slots[slot];
    clean.slots[slot] = id && gameData.partById.get(id)?.category === slot ? id : null;
  }
  clean.instrumentIds = d.instrumentIds.filter((id) => gameData.partById.get(id)?.category === 'instrument');
  clean.options = {
    fuelMass: Math.max(0, Math.round(d.options.fuelMass)),
    supplyDays: Math.max(0, Math.round(d.options.supplyDays)),
    spinArmLength: Math.max(0, Math.round(d.options.spinArmLength)),
  };
  return clean;
}

export function loadSavedDesigns(storage: SimpleStorage = defaultSaveStorage()): SavedDesignEntry[] {
  try {
    const raw = storage.getItem(SAVED_DESIGNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: number; items?: unknown[] };
    const items = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
    const result: SavedDesignEntry[] = [];
    for (const item of items) {
      const check = exportBundleSchema.safeParse(item);
      if (!check.success) continue;
      const d = sanitiseDesign(check.data.design);
      const record = item as Partial<SavedDesignEntry>;
      result.push({
        id: typeof record.id === 'string' && record.id ? record.id : `design-${result.length + 1}`,
        name: check.data.name,
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : check.data.exportedAt,
        pathwayId: check.data.pathwayId,
        trajectoryId: check.data.trajectoryId,
        vehicleId: check.data.vehicleId,
        difficulty: check.data.difficulty,
        design: d,
        designHash: computeDesignHash(d, check.data.pathwayId, check.data.trajectoryId, check.data.vehicleId),
      });
    }
    return result;
  } catch {
    return [];
  }
}

export function saveDesignToStorage(
  input: Omit<SavedDesignEntry, 'id' | 'createdAt' | 'designHash'> & { id?: string; createdAt?: string },
  storage: SimpleStorage = defaultSaveStorage(),
): SavedDesignEntry[] {
  const existing = loadSavedDesigns(storage);
  const cleanDesign = sanitiseDesign(input.design);
  const entry: SavedDesignEntry = {
    id: input.id ?? `design-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim().slice(0, 60) || 'Saved Spacecraft',
    createdAt: input.createdAt ?? new Date().toISOString(),
    pathwayId: input.pathwayId,
    trajectoryId: input.trajectoryId,
    vehicleId: input.vehicleId,
    difficulty: input.difficulty,
    design: cleanDesign,
    designHash: computeDesignHash(cleanDesign, input.pathwayId, input.trajectoryId, input.vehicleId),
  };
  const next = [entry, ...existing.filter((item) => item.id !== entry.id)].slice(0, 30);
  storage.setItem(SAVED_DESIGNS_KEY, JSON.stringify({ version: SAVE_SCHEMA_VERSION, items: next }));
  return next;
}

export function deleteSavedDesign(id: string, storage: SimpleStorage = defaultSaveStorage()): SavedDesignEntry[] {
  const next = loadSavedDesigns(storage).filter((item) => item.id !== id);
  storage.setItem(SAVED_DESIGNS_KEY, JSON.stringify({ version: SAVE_SCHEMA_VERSION, items: next }));
  return next;
}

export function loadSavedRuns(storage: SimpleStorage = defaultSaveStorage()): SavedRunEntry[] {
  try {
    const raw = storage.getItem(SAVED_RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { version?: number; items?: unknown[] };
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const runs: SavedRunEntry[] = [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const r = item as Partial<SavedRunEntry>;
      if (!r.pathwayId || !(PATHWAY_IDS as readonly string[]).includes(r.pathwayId)) continue;
      const cleanDesign = sanitiseDesign(r.design);
      const outcome: MissionOutcome =
        r.outcome === 'success' || r.outcome === 'partial' || r.outcome === 'failure' ? r.outcome : 'failure';
      const grade: ScoreGrade =
        r.grade === 'S' || r.grade === 'A' || r.grade === 'B' || r.grade === 'C' || r.grade === 'F' ? r.grade : 'F';
      const stars = (r.stars === 3 || r.stars === 2 || r.stars === 1 ? r.stars : 0) as 0 | 1 | 2 | 3;
      runs.push({
        id: typeof r.id === 'string' && r.id ? r.id : `run-${runs.length + 1}`,
        createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
        pathwayId: r.pathwayId,
        trajectoryId: typeof r.trajectoryId === 'string' ? r.trajectoryId : '',
        vehicleId: typeof r.vehicleId === 'string' ? r.vehicleId : '',
        difficulty: r.difficulty === 'cadet' || r.difficulty === 'director' ? r.difficulty : 'engineer',
        callSign: typeof r.callSign === 'string' && r.callSign ? r.callSign.slice(0, 24) : 'Pathfinder',
        crewNames: Array.isArray(r.crewNames) ? r.crewNames.filter((n): n is string => typeof n === 'string') : [],
        patch: r.patch ? sanitisePatch(r.patch) : { ...DEFAULT_PATCH },
        outcome,
        score: typeof r.score === 'number' && Number.isFinite(r.score) ? Math.round(r.score) : 0,
        grade,
        stars,
        components: {
          objectives: r.components?.objectives ?? null,
          science: r.components?.science ?? null,
          engineering: r.components?.engineering ?? null,
          efficiency: r.components?.efficiency ?? null,
          physics: r.components?.physics ?? null,
          decisions: r.components?.decisions ?? null,
        },
        science: typeof r.science === 'number' ? Math.round(r.science) : 0,
        totalCost: typeof r.totalCost === 'number' ? Math.round(r.totalCost * 10) / 10 : 0,
        wetMass: typeof r.wetMass === 'number' ? Math.round(r.wetMass) : 0,
        deltaV: typeof r.deltaV === 'number' ? Math.round(r.deltaV) : 0,
        days: typeof r.days === 'number' ? Math.round(r.days) : 0,
        dataDeliveredPct: typeof r.dataDeliveredPct === 'number' ? Math.round(r.dataDeliveredPct) : 100,
        endReason: typeof r.endReason === 'string' ? r.endReason : null,
        design: cleanDesign,
        designHash:
          typeof r.designHash === 'string' && r.designHash
            ? r.designHash
            : computeDesignHash(cleanDesign, r.pathwayId, r.trajectoryId ?? null, r.vehicleId ?? null),
      });
    }
    return runs;
  } catch {
    return [];
  }
}

export function recordRunToStorage(
  input: Omit<SavedRunEntry, 'id' | 'createdAt' | 'designHash'> & { id?: string; createdAt?: string },
  storage: SimpleStorage = defaultSaveStorage(),
): SavedRunEntry[] {
  const existing = loadSavedRuns(storage);
  const cleanDesign = sanitiseDesign(input.design);
  const designHash = computeDesignHash(cleanDesign, input.pathwayId, input.trajectoryId, input.vehicleId);
  const entry: SavedRunEntry = {
    ...input,
    id: input.id ?? `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: input.createdAt ?? new Date().toISOString(),
    design: cleanDesign,
    designHash,
  };
  const next = [entry, ...existing.filter((item) => item.id !== entry.id)].slice(0, 60);
  storage.setItem(SAVED_RUNS_KEY, JSON.stringify({ version: SAVE_SCHEMA_VERSION, items: next }));
  return next;
}

/**
 * Returns the local leaderboard for a chapter pathway, sorted by highest total
 * score, then highest science return, then lowest total cost (Phase 09 §3, N1).
 */
export function getChapterLeaderboard(
  pathwayId: PathwayId,
  storage: SimpleStorage = defaultSaveStorage(),
): SavedRunEntry[] {
  return loadSavedRuns(storage)
    .filter((run) => run.pathwayId === pathwayId)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.science !== a.science) return b.science - a.science;
      return a.totalCost - b.totalCost;
    });
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(text, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(encoded: string): string {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob === 'function') {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(padded, 'base64').toString('utf8');
}

/**
 * Exports a design (and optional run summary) as both formatted JSON and a
 * compact shareable string (`MA1:...`) (Phase 09 §3, N2).
 */
export function exportDesignBundle(
  input: Omit<ExportedDesignBundle, 'version' | 'exportedAt' | 'designHash'>,
): { json: string; shareCode: string; bundle: ExportedDesignBundle } {
  const cleanDesign = sanitiseDesign(input.design);
  const designHash = computeDesignHash(cleanDesign, input.pathwayId, input.trajectoryId, input.vehicleId);
  const bundle: ExportedDesignBundle = {
    version: SAVE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    name: input.name.trim() || 'Mission Architect Design',
    pathwayId: input.pathwayId,
    trajectoryId: input.trajectoryId,
    vehicleId: input.vehicleId,
    difficulty: input.difficulty,
    design: cleanDesign,
    designHash,
    ...(input.runSummary ? { runSummary: input.runSummary } : {}),
  };
  const json = JSON.stringify(bundle, null, 2);
  const compact = JSON.stringify(bundle);
  const shareCode = `MA1:${toBase64Url(compact)}`;
  return { json, shareCode, bundle };
}

/**
 * Imports and validates a design bundle from either formatted JSON or a
 * `MA1:...` share code.
 */
export function importDesignBundle(
  rawInput: string,
): { ok: true; data: ExportedDesignBundle } | { ok: false; error: string } {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { ok: false, error: 'Paste a design JSON or MA1:... share code first.' };
  }

  let jsonText = trimmed;
  if (trimmed.startsWith('MA1:')) {
    try {
      jsonText = fromBase64Url(trimmed.slice(4).trim());
    } catch {
      return { ok: false, error: 'Invalid MA1 share code encoding.' };
    }
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: 'Could not parse JSON. Check for missing brackets or quotes.' };
  }

  const validated = exportBundleSchema.safeParse(parsedJson);
  if (!validated.success) {
    const issue = validated.error.issues[0];
    return {
      ok: false,
      error: `Invalid design schema (${issue?.path.join('.') || 'root'}: ${issue?.message ?? 'invalid format'}).`,
    };
  }

  const cleanDesign = sanitiseDesign(validated.data.design);
  // Check that at least a bus or one slot/instrument is valid if the input had non-null parts
  if (validated.data.design.busId && !cleanDesign.busId) {
    return { ok: false, error: `Unknown spacecraft bus ID "${validated.data.design.busId}".` };
  }
  for (const slot of SLOT_IDS as readonly SlotId[]) {
    const given = validated.data.design.slots[slot];
    if (given && !cleanDesign.slots[slot]) {
      return { ok: false, error: `Unknown part ID "${given}" in slot "${slot}".` };
    }
  }

  const designHash = computeDesignHash(
    cleanDesign,
    validated.data.pathwayId,
    validated.data.trajectoryId,
    validated.data.vehicleId,
  );

  return {
    ok: true,
    data: {
      ...validated.data,
      design: cleanDesign,
      designHash,
    },
  };
}
