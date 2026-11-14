import { describe, expect, it } from 'vitest';

import instrumentsJson from './instruments.json';
import launchVehiclesJson from './launchVehicles.json';
import partsJson from './parts.json';
import pathwaysJson from './pathways.json';
import { GameDataError, buildGameData, gameData, getLaunchVehicle, getPart, getPathway, partsByCategory } from './loadData';

const raw = () =>
  structuredClone({
    parts: partsJson,
    instruments: instrumentsJson,
    launchVehicles: launchVehiclesJson,
    pathways: pathwaysJson,
  }) as { parts: unknown[]; instruments: unknown[]; launchVehicles: unknown[]; pathways: unknown[] };

describe('game data', () => {
  it('loads and validates', () => {
    expect(gameData.pathways.map((pathway) => pathway.id)).toEqual(['leo', 'moon', 'mars', 'jupiter', 'interstellar', 'exoplanet']);
    expect(gameData.launchVehicles).toHaveLength(4);
    expect(partsByCategory('instrument').length).toBeGreaterThanOrEqual(8);
    expect(partsByCategory('bus').every((bus) => bus.category === 'bus')).toBe(true);
  });

  it('has the subsystems the challenge lists, each with at least two choices', () => {
    for (const category of ['bus', 'power', 'battery', 'computer', 'adcs', 'comms', 'instrument'] as const) {
      expect(partsByCategory(category).length, category).toBeGreaterThanOrEqual(2);
    }
  });

  it('offers simple and advanced options (difficulty-dependent parts)', () => {
    const tiers = new Set(gameData.parts.map((part) => part.tier));
    expect([...tiers].sort()).toEqual(['advanced', 'simple', 'standard']);
  });

  it('looks things up and throws on unknown ids', () => {
    expect(getPart('rtg').name).toMatch(/RTG/);
    expect(getPathway('mars').crewed).toBe(true);
    expect(getLaunchVehicle('lv_heavy').cost).toBe(150);
    expect(() => getPart('nope')).toThrow(GameDataError);
    expect(() => getLaunchVehicle('nope')).toThrow(GameDataError);
  });

  it('rejects a part with a missing field', () => {
    const data = raw();
    delete (data.parts[0] as Record<string, unknown>).mass;
    expect(() => buildGameData(data)).toThrow(/parts\.json is invalid/);
  });

  it('rejects duplicate ids', () => {
    const data = raw();
    data.parts.push(structuredClone(data.parts[0]));
    expect(() => buildGameData(data)).toThrow(/duplicate part id/);
  });

  it('rejects a pathway that requires an instrument type nobody makes', () => {
    const data = raw();
    const instruments = data.instruments as { type: string }[];
    data.instruments = instruments.filter((instrument) => instrument.type !== 'photometer' && instrument.type !== 'telescope');
    expect(() => buildGameData(data)).toThrow(/requires \[photometer, telescope\]/);
  });

  it('rejects instruments placed in parts.json', () => {
    const data = raw();
    data.parts.push(structuredClone(data.instruments[0]));
    expect(() => buildGameData(data)).toThrow(/instruments belong/);
  });
});
