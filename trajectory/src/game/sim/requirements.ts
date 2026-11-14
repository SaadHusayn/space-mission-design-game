/**
 * The mission contract shown on the objective screen: what the mission must
 * achieve, in plain words. The same requirements are checked by the
 * Engineering Review and the mission report.
 */
import { DAYS_PER_YEAR } from '../physics';
import type { InstrumentType, MissionContext, Pathway } from '../types';
import { fmt, money } from './format';
import { missionDays } from './mission';

export interface ContractItem {
  id: string;
  icon: '🔭' | '🎯' | '⏱' | '💰' | '👩‍🚀' | '🚀' | '🔥';
  label: string;
  detail: string;
}

const INSTRUMENT_NAMES: Readonly<Record<InstrumentType, string>> = {
  camera: 'camera',
  imager: 'multispectral imager',
  radar: 'ice-mapping radar',
  spectrometer: 'atmospheric spectrometer',
  magnetometer: 'magnetometer',
  plasma: 'plasma wave sensor',
  radiometer: 'microwave radiometer',
  telescope: 'space telescope',
  photometer: 'transit photometer',
};

export function instrumentGroupText(group: readonly InstrumentType[]): string {
  const names = group.map((type) => INSTRUMENT_NAMES[type]);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/** Human-readable duration from days. */
export function durationText(days: number): string {
  if (days < 1) return 'less than a day';
  if (days < 60) return `${fmt(days)} days`;
  if (days < 2 * DAYS_PER_YEAR) return `${fmt(days / 30.44)} months`;
  return `${fmt(days / DAYS_PER_YEAR, 1)} years`;
}

/** Shortest and longest travel time to the destination over all trajectories. */
export function travelTimeText(pathway: Pathway): string {
  const days = pathway.trajectories.map((option) => option.overrides.cruiseDays ?? pathway.environment.cruiseDays);
  const min = Math.min(...days);
  const max = Math.max(...days);
  if (max < 1) return 'Already there: it starts in orbit';
  return min === max ? durationText(min) : `${durationText(min)} to ${durationText(max)}`;
}

export function missionContract(mission: MissionContext): ContractItem[] {
  const { pathway, env } = mission;
  const items: ContractItem[] = pathway.requiredInstruments.map((group, index) => ({
    id: `instrument-${index}`,
    icon: '🔭',
    label: `Carry ${/^[aeiou]/i.test(instrumentGroupText(group)) ? 'an' : 'a'} ${instrumentGroupText(group)}`,
    detail: 'Without the right instrument, the mission cannot answer its question.',
  }));
  items.push({
    id: 'science',
    icon: '🎯',
    label: `Deliver at least ${pathway.scienceTarget} science points`,
    detail: 'Science only counts once its data reaches Earth.',
  });
  items.push({
    id: 'duration',
    icon: '⏱',
    label: `Work for the whole mission: ${durationText(missionDays(env))}`,
    detail: 'Every part must last that long, including through radiation.',
  });
  items.push({
    id: 'budget',
    icon: '💰',
    label: `Stay within ${money(mission.budget)}`,
    detail: 'Parts, the rocket and running the mission all cost money.',
  });
  if (pathway.crewed) {
    items.push({
      id: 'crew',
      icon: '👩‍🚀',
      label: `Bring all ${pathway.crewSize} astronauts home safe and healthy`,
      detail: 'Supplies, radiation shielding and exercise keep them well.',
    });
  }
  if (env.deltaV > 0) {
    items.push({
      id: 'deltav',
      icon: '🚀',
      label: `Carry enough propellant for about ${fmt(env.deltaV / 1000, 1)} km/s of Δv`,
      detail: 'For the burns after the rocket lets go (depends on the route you choose).',
    });
  }
  if (pathway.returnEntrySpeed !== null) {
    items.push({
      id: 'reentry',
      icon: '🔥',
      label: `Survive re-entry at ${fmt(pathway.returnEntrySpeed, 1)} km/s`,
      detail: 'The heat shield must be rated for that speed.',
    });
  }
  return items;
}
