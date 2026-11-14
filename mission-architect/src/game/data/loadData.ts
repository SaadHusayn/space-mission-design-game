/**
 * Loads and validates all game data. Every file is checked against its
 * schema, then cross-checked (unique ids, references that must exist), so
 * broken data fails immediately with a clear message.
 */
import { z } from 'zod';

import type {
  Bus,
  Instrument,
  LaunchVehicle,
  Part,
  PartCategory,
  PartOf,
  Pathway,
  PathwayId,
} from '../types';
import instrumentsJson from './instruments.json';
import launchVehiclesJson from './launchVehicles.json';
import partsJson from './parts.json';
import pathwaysJson from './pathways.json';
import { InstrumentSchema, LaunchVehicleSchema, PartSchema, PathwaySchema } from './schemas';

export interface GameData {
  parts: readonly Part[];
  instruments: readonly Instrument[];
  launchVehicles: readonly LaunchVehicle[];
  pathways: readonly Pathway[];
  /** Any part (including instruments) by id. */
  partById: ReadonlyMap<string, Part>;
  launchVehicleById: ReadonlyMap<string, LaunchVehicle>;
  pathwayById: ReadonlyMap<PathwayId, Pathway>;
}

export class GameDataError extends Error {
  constructor(message: string) {
    super(`Game data error: ${message}`);
    this.name = 'GameDataError';
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown, file: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new GameDataError(`${file} is invalid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

function uniqueIds(items: readonly { id: string }[], label: string): void {
  const seen = new Set<string>();
  for (const { id } of items) {
    if (seen.has(id)) throw new GameDataError(`duplicate ${label} id "${id}"`);
    seen.add(id);
  }
}

/** Validates raw data. Exported so tests can feed in broken data. */
export function buildGameData(raw: {
  parts: unknown;
  instruments: unknown;
  launchVehicles: unknown;
  pathways: unknown;
}): GameData {
  const parts = parse(z.array(PartSchema), raw.parts, 'parts.json');
  const instruments = parse(z.array(InstrumentSchema), raw.instruments, 'instruments.json');
  const launchVehicles = parse(z.array(LaunchVehicleSchema), raw.launchVehicles, 'launchVehicles.json');
  const pathways = parse(z.array(PathwaySchema), raw.pathways, 'pathways.json');

  if (parts.some((part) => part.category === 'instrument')) {
    throw new GameDataError('instruments belong in instruments.json, not parts.json');
  }
  const allParts: Part[] = [...parts, ...instruments];
  uniqueIds(allParts, 'part');
  uniqueIds(launchVehicles, 'launch vehicle');
  uniqueIds(pathways, 'pathway');

  const instrumentTypes = new Set(instruments.map((instrument) => instrument.type));
  for (const pathway of pathways) {
    for (const group of pathway.requiredInstruments) {
      if (!group.some((type) => instrumentTypes.has(type))) {
        throw new GameDataError(`pathway "${pathway.id}" requires [${group.join(', ')}] but no instrument has that type`);
      }
    }
    uniqueIds(pathway.trajectories, `trajectory in "${pathway.id}"`);
    if (pathway.crewed) {
      const seats = parts.some((part) => part.category === 'bus' && part.crewCapacity >= pathway.crewSize);
      if (!seats) throw new GameDataError(`pathway "${pathway.id}" needs ${pathway.crewSize} seats but no bus has them`);
    }
  }

  return {
    parts: allParts,
    instruments,
    launchVehicles,
    pathways,
    partById: new Map(allParts.map((part) => [part.id, part])),
    launchVehicleById: new Map(launchVehicles.map((vehicle) => [vehicle.id, vehicle])),
    pathwayById: new Map(pathways.map((pathway) => [pathway.id, pathway])),
  };
}

/** The game's data, validated once when this module is first imported. */
export const gameData: GameData = buildGameData({
  parts: partsJson,
  instruments: instrumentsJson,
  launchVehicles: launchVehiclesJson,
  pathways: pathwaysJson,
});

export function partsByCategory<C extends PartCategory>(category: C, data: GameData = gameData): PartOf<C>[] {
  return data.parts.filter((part): part is PartOf<C> => part.category === category);
}

export function getPart(id: string, data: GameData = gameData): Part {
  const part = data.partById.get(id);
  if (!part) throw new GameDataError(`unknown part "${id}"`);
  return part;
}

export function getPathway(id: PathwayId, data: GameData = gameData): Pathway {
  const pathway = data.pathwayById.get(id);
  if (!pathway) throw new GameDataError(`unknown pathway "${id}"`);
  return pathway;
}

export function getLaunchVehicle(id: string, data: GameData = gameData): LaunchVehicle {
  const vehicle = data.launchVehicleById.get(id);
  if (!vehicle) throw new GameDataError(`unknown launch vehicle "${id}"`);
  return vehicle;
}

export function isBus(part: Part): part is Bus {
  return part.category === 'bus';
}
