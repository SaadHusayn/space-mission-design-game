/**
 * Mission flight simulation, one day per tick.
 *
 * The journey is a plain, serialisable state object. `advanceJourney` runs
 * days until the mission ends or an event needs a decision; `resolveEvent`
 * applies the crew's choice. Both return a new state (the old one is not
 * changed). Everything random comes from the seed, so the same design, seed
 * and choices always give the same mission.
 */
import { gameData, type GameData } from '../data/loadData';
import { createRng } from '../core/rng';
import { DAYS_PER_YEAR, dataPerDayGb, downlinkRateMbps, rtgPower, sunlightFraction } from '../physics';
import type { Design, LaunchVehicle, MissionContext } from '../types';
import { HEALTH_LOSS_PER_DAY, summarizeDesign, type DesignSummary } from './design';
import { EVENTS, MAX_EVENTS, getEvent, type EventContext, type EventEffect, type EventOption } from './events';
import { fmt, kg, kms } from './format';

export type Segment = 'launch' | 'cruise' | 'operations' | 'return' | 'done';

export type EndReason =
  | 'complete'
  | 'launch_failure'
  | 'insertion_failure'
  | 'power_failure'
  | 'radiation'
  | 'lifetime'
  | 'supplies'
  | 'reentry_failure';

export interface JourneyInput {
  design: Design;
  mission: MissionContext;
  vehicle: LaunchVehicle;
  seed: number;
}

export interface PendingEvent {
  eventId: string;
  day: number;
  title: string;
  description: string;
  options: EventOption[];
}

export interface CheckpointLog {
  id: string;
  day: number;
  title: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface EventLog {
  eventId: string;
  day: number;
  title: string;
  optionId: string;
  optionLabel: string;
  outcome: string;
}

export interface DaySample {
  day: number;
  segment: Segment;
  sunDistanceAU: number;
  earthDistanceAU: number;
  powerAvailable: number;
  powerLoad: number;
  batteryPercent: number;
  instrumentsOn: boolean;
  dataStoredGb: number;
  science: number;
  electronicsDose: number;
  crewDose: number;
  crewHealth: number | null;
}

interface ActiveEffect {
  eventId: string;
  untilDay: number;
  effect: EventEffect;
}

export interface JourneyState {
  input: JourneyInput;
  day: number;
  cruiseEnd: number;
  operationsEnd: number;
  totalDays: number;

  batteryWh: number;
  panelHealth: number;
  pointing: number;
  scienceFactor: number;
  extraCost: number;
  blackoutStreak: number;

  crewHealth: number | null;
  crewDose: number;
  electronicsDose: number;
  /** Days of crew supplies left. Null for robotic missions. */
  suppliesDays: number | null;

  dataStoredGb: number;
  valueStored: number;
  dataGeneratedGb: number;
  dataSentGb: number;
  dataLostGb: number;
  science: number;
  observingDays: number;
  powerLimitedDays: number;

  scheduled: { eventId: string; day: number }[];
  effects: ActiveEffect[];
  pending: PendingEvent | null;

  samples: DaySample[];
  checkpoints: CheckpointLog[];
  events: EventLog[];
  inserted: boolean;
  ended: boolean;
  endReason: EndReason | null;
}

const sampleInterval = (totalDays: number) => Math.max(1, Math.ceil(totalDays / 300));

/** Share of the radio's power (and data rate) cut in survival mode. */
export const SURVIVAL_COMMS_CUT = 0.8;
/** Timed events last at most this share of the mission phase they happen in. */
export const EVENT_DURATION_SHARE = 0.05;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function segmentOf(state: JourneyState, day: number): Segment {
  if (day < state.cruiseEnd) return 'cruise';
  if (day < state.operationsEnd) return 'operations';
  if (day < state.totalDays) return 'return';
  return 'done';
}

/** Distances from the Sun and from Earth on a given day (simple interpolation). */
function distances(state: JourneyState, day: number): { sun: number; earth: number } {
  const env = state.input.mission.env;
  const nearEarth = Math.min(env.earthDistanceAU, 0.00001);
  const segment = segmentOf(state, day);
  if (segment === 'cruise') {
    const t = state.cruiseEnd > 0 ? day / state.cruiseEnd : 1;
    return { sun: lerp(1, env.sunDistanceAU, t), earth: lerp(nearEarth, env.earthDistanceAU, t) };
  }
  if (segment === 'return') {
    const span = state.totalDays - state.operationsEnd;
    const t = span > 0 ? (day - state.operationsEnd) / span : 1;
    return { sun: lerp(env.sunDistanceAU, 1, t), earth: lerp(env.earthDistanceAU, nearEarth, t) };
  }
  return { sun: env.sunDistanceAU, earth: env.earthDistanceAU };
}

function summaryOf(state: JourneyState, data: GameData): DesignSummary {
  const { design, mission, vehicle } = state.input;
  return summarizeDesign(design, mission, vehicle, data);
}

function instrumentsDraw(summary: DesignSummary): number {
  return summary.instrumentScores.filter((score) => score.fitted).reduce((sum, score) => sum + score.instrument.powerDraw, 0);
}

function solarNow(state: JourneyState, summary: DesignSummary, day: number, powerFactor = 1): number {
  const power = summary.resolved.power;
  if (!power) return 0;
  const years = day / DAYS_PER_YEAR;
  if (power.source === 'rtg') return rtgPower(power.output, years);
  const { sun } = distances(state, day);
  const ageing = Math.max(0.5, 1 - 0.01 * years);
  return power.output * sunlightFraction(sun) * (1 - state.input.mission.env.eclipseFraction) * state.panelHealth * ageing * powerFactor;
}

function eventContext(state: JourneyState, summary: DesignSummary): EventContext {
  const full = summary.powerLoad;
  return {
    mission: state.input.mission,
    summary,
    solarNow: solarNow(state, summary, state.day),
    fullLoad: full,
    baseLoad: full - instrumentsDraw(summary),
  };
}

function end(state: JourneyState, reason: EndReason): void {
  state.ended = true;
  state.endReason = reason;
  state.pending = null;
}

function logCheckpoint(state: JourneyState, entry: Omit<CheckpointLog, 'day'>): void {
  state.checkpoints.push({ ...entry, day: state.day });
}

/** Creates a journey at launch day. Events are scheduled from the seed. */
export function startJourney(input: JourneyInput, data: GameData = gameData): JourneyState {
  const env = input.mission.env;
  const cruiseEnd = Math.round(env.cruiseDays);
  const operationsEnd = cruiseEnd + Math.round(env.operationsDays);
  const totalDays = operationsEnd + Math.round(env.returnDays);
  const draft = summarizeDesign(input.design, input.mission, input.vehicle, data);

  const state: JourneyState = {
    input: structuredClone(input),
    day: 0,
    cruiseEnd,
    operationsEnd,
    totalDays,
    batteryWh: draft.resolved.battery?.energyWh ?? 0,
    panelHealth: 1,
    pointing: 1,
    scienceFactor: 1,
    extraCost: 0,
    blackoutStreak: 0,
    crewHealth: draft.crewHealth === null ? null : 100,
    crewDose: 0,
    electronicsDose: 0,
    suppliesDays: input.mission.pathway.crewed ? input.design.options.supplyDays : null,
    dataStoredGb: 0,
    valueStored: 0,
    dataGeneratedGb: 0,
    dataSentGb: 0,
    dataLostGb: 0,
    science: 0,
    observingDays: 0,
    powerLimitedDays: 0,
    scheduled: [],
    effects: [],
    pending: null,
    samples: [],
    checkpoints: [],
    events: [],
    inserted: env.deltaV <= 0,
    ended: false,
    endReason: null,
  };

  // Schedule events: each applicable event rolls its chance; keep a random subset.
  const rng = createRng(input.seed);
  const ctx = eventContext(state, draft);
  const candidates: { eventId: string; day: number }[] = [];
  for (const event of EVENTS) {
    if (!event.applies(ctx) || !rng.chance(event.chance[input.mission.difficulty])) continue;
    let day: number | null = null;
    if (event.window === 'launch') day = 0;
    if (event.window === 'cruise' && cruiseEnd >= 3) day = rng.int(1, cruiseEnd - 2);
    if (event.window === 'operations' && operationsEnd - cruiseEnd >= 3) day = rng.int(cruiseEnd + 1, operationsEnd - 2);
    if (day !== null) candidates.push({ eventId: event.id, day });
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  state.scheduled = candidates.slice(0, MAX_EVENTS[input.mission.difficulty]).sort((a, b) => a.day - b.day);
  return state;
}

function launchCheckpoint(state: JourneyState, summary: DesignSummary): void {
  const vehicle = state.input.vehicle;
  const capacity = summary.launchCapacity ?? 0;
  const bus = summary.resolved.bus;
  if (summary.wetMass > capacity) {
    logCheckpoint(state, {
      id: 'launch',
      title: 'Launch',
      status: 'fail',
      detail: `The ${vehicle.name} couldn't reach the target orbit: ${kg(summary.wetMass)} is more than its ${kg(capacity)} capacity.`,
    });
    end(state, 'launch_failure');
    return;
  }
  if (!bus || bus.maxG < vehicle.maxG) {
    logCheckpoint(state, {
      id: 'launch',
      title: 'Launch',
      status: 'fail',
      detail: `The structure buckled at ${fmt(vehicle.maxG, 1)} g during the climb.`,
    });
    end(state, 'launch_failure');
    return;
  }
  logCheckpoint(state, {
    id: 'launch',
    title: 'Launch',
    status: 'pass',
    detail: `Liftoff thrust-to-weight ${fmt(summary.liftoffTwr ?? 0, 2)}. The ${vehicle.name} delivered ${kg(summary.wetMass)} on its way.`,
  });
}

function insertionCheckpoint(state: JourneyState, summary: DesignSummary): void {
  const env = state.input.mission.env;
  const destination = state.input.mission.pathway.destination;
  if (summary.deltaV >= env.deltaV) {
    state.inserted = true;
    logCheckpoint(state, {
      id: 'insertion',
      title: `Arrival: ${destination}`,
      status: summary.deltaV >= env.deltaV * 1.1 ? 'pass' : 'warn',
      detail: `The engine had ${kms(summary.deltaV)} of Δv for the ${kms(env.deltaV)} the mission needs.`,
    });
    return;
  }
  logCheckpoint(state, {
    id: 'insertion',
    title: `Arrival: ${destination}`,
    status: 'fail',
    detail: `The tanks ran dry: the spacecraft had only ${kms(summary.deltaV)} of Δv but needed ${kms(env.deltaV)}. It flew past without stopping.`,
  });
  end(state, 'insertion_failure');
}

function arrivalChecks(state: JourneyState, summary: DesignSummary): void {
  const env = state.input.mission.env;
  const tags = state.input.mission.trajectory.tags;
  if (env.sunDistanceAU > 2) {
    const warm = summary.resolved.thermal?.coldRated || summary.resolved.power?.source === 'rtg';
    logCheckpoint(state, {
      id: 'cold',
      title: 'Deep cold',
      status: warm ? 'pass' : 'fail',
      detail: warm
        ? `At ${fmt(env.sunDistanceAU, 1)} AU the spacecraft stays warm.`
        : 'Without heaters the instruments froze. Most of the science is lost.',
    });
    if (!warm) state.scienceFactor *= 0.3;
  }
  if (tags.includes('jupiter-assist')) {
    logCheckpoint(state, {
      id: 'jupiter_flyby',
      title: 'Jupiter gravity assist',
      status: 'pass',
      detail: 'The flyby bent the trajectory and flung the probe outwards at about 7 AU per year.',
    });
  }
  if (state.input.mission.pathway.id === 'interstellar') {
    logCheckpoint(state, {
      id: 'heliopause',
      title: 'Crossing the heliopause',
      status: 'pass',
      detail: `After ${fmt(state.day / DAYS_PER_YEAR, 1)} years the probe left the Sun's bubble, about 120 AU out.`,
    });
  }
}

function reentryCheckpoint(state: JourneyState, summary: DesignSummary): void {
  const speed = state.input.mission.pathway.returnEntrySpeed;
  if (speed === null) return;
  const shield = summary.resolved.heatShield;
  const ok = !!shield && shield.entrySpeedRating >= speed;
  logCheckpoint(state, {
    id: 'reentry',
    title: 'Re-entry',
    status: ok ? 'pass' : 'fail',
    detail: ok
      ? `The heat shield survived a ${fmt(speed, 1)} km/s entry. The crew is home.`
      : `The heat shield wasn't rated for ${fmt(speed, 1)} km/s. The capsule was lost.`,
  });
  if (!ok) end(state, 'reentry_failure');
}

function simulateDay(state: JourneyState, summary: DesignSummary): void {
  const { mission } = state.input;
  const env = mission.env;
  const day = state.day;
  const segment = segmentOf(state, day);
  const years = day / DAYS_PER_YEAR;
  const active = state.effects.filter((item) => item.untilDay > day).map((item) => item.effect);
  const resolved = summary.resolved;

  const powerFactor = active.reduce((factor, effect) => factor * (effect.powerFactor ?? 1), 1);
  const available = solarNow(state, summary, day, powerFactor);
  const fullLoad = summary.powerLoad;
  const baseLoad = fullLoad - instrumentsDraw(summary);
  // Survival mode: instruments off and the radio turned down to a trickle.
  const survivalLoad = baseLoad - SURVIVAL_COMMS_CUT * (resolved.comms?.powerDraw ?? 0);
  const capacity = resolved.battery?.energyWh ?? 0;

  const computerOffline = active.some((effect) => effect.computerOffline);
  const wantInstruments =
    segment === 'operations' && state.inserted && !computerOffline && !active.some((effect) => effect.instrumentsOff);

  let instrumentsOn = false;
  let survival = false;
  if (available >= fullLoad) {
    instrumentsOn = wantInstruments;
    state.batteryWh = Math.min(capacity, state.batteryWh + (available - fullLoad) * 24);
    state.blackoutStreak = 0;
  } else if (available >= baseLoad) {
    if (wantInstruments) state.powerLimitedDays += 1;
    state.batteryWh = Math.min(capacity, state.batteryWh + (available - baseLoad) * 24);
    state.blackoutStreak = 0;
  } else if (available >= survivalLoad) {
    survival = true;
    if (wantInstruments) state.powerLimitedDays += 1;
    state.batteryWh = Math.min(capacity, state.batteryWh + (available - survivalLoad) * 24);
    state.blackoutStreak = 0;
  } else {
    survival = true;
    if (wantInstruments) state.powerLimitedDays += 1;
    state.batteryWh -= (survivalLoad - available) * 24;
    if (state.batteryWh <= 0) {
      state.batteryWh = 0;
      state.blackoutStreak += 1;
    }
  }
  if (state.blackoutStreak >= 3) {
    logCheckpoint(state, {
      id: 'power',
      title: 'Power failure',
      status: 'fail',
      detail: `The ${resolved.power?.source === 'rtg' ? 'RTG' : 'arrays'} made ${fmt(available)} W but the spacecraft needed ${fmt(survivalLoad)} W just to stay alive. The battery ran flat.`,
    });
    end(state, 'power_failure');
    return;
  }

  // Science data: observe, store, send home.
  const batteryAlive = !resolved.battery || years <= resolved.battery.lifeYears;
  const observeShare = !batteryAlive && env.eclipseHours > 0 ? 1 - env.eclipseFraction : 1;
  if (instrumentsOn) {
    state.observingDays += observeShare;
    const generated = summary.dataPerDay * observeShare;
    const valuePerGb = summary.dataPerDay > 0 ? summary.sciencePotential / (summary.dataPerDay * env.operationsDays) : 0;
    state.dataGeneratedGb += generated;
    state.dataStoredGb += generated;
    state.valueStored += generated * valuePerGb * state.pointing * state.scienceFactor;
  }
  const downlinkOff = active.some((effect) => effect.downlinkOff);
  const { earth } = distances(state, day);
  const capacityGb =
    downlinkOff || !resolved.comms
      ? 0
      : dataPerDayGb(downlinkRateMbps(resolved.comms.rateAt1AU, resolved.comms.maxRate, earth), env.contactHoursPerDay) *
        (survival ? 1 - SURVIVAL_COMMS_CUT : 1);
  if (state.dataStoredGb > 0) {
    const sent = Math.min(state.dataStoredGb, capacityGb);
    const share = sent / state.dataStoredGb;
    state.science += state.valueStored * share;
    state.valueStored *= 1 - share;
    state.dataStoredGb -= sent;
    state.dataSentGb += sent;
    const storage = resolved.computer?.storageGb ?? 0;
    if (state.dataStoredGb > storage) {
      const lost = state.dataStoredGb - storage;
      state.valueStored *= storage / state.dataStoredGb;
      state.dataLostGb += lost;
      state.dataStoredGb = storage;
    }
  }

  // Radiation on the electronics.
  const baseRate = segment === 'operations' ? env.operationsElectronicsDose : env.cruiseElectronicsDose;
  const extraRate = active.reduce((sum, effect) => sum + (effect.electronicsDosePerDay ?? 0), 0);
  state.electronicsDose += (baseRate + extraRate) * (1 - (resolved.radiation?.electronicsAttenuation ?? 0));
  const computer = resolved.computer;
  if (computer && state.electronicsDose > computer.radToleranceKrad) {
    logCheckpoint(state, {
      id: 'radiation',
      title: 'Electronics failure',
      status: 'fail',
      detail: `After ${fmt(state.electronicsDose)} krad of radiation, the ${computer.name} stopped working.`,
    });
    end(state, 'radiation');
    return;
  }
  if (computer && years > computer.lifeYears) {
    logCheckpoint(state, {
      id: 'lifetime',
      title: 'Worn out',
      status: 'fail',
      detail: `The ${computer.name} reached the end of its ${fmt(computer.lifeYears)}-year design life.`,
    });
    end(state, 'lifetime');
    return;
  }

  // Crew.
  if (state.crewHealth !== null) {
    const shield = resolved.radiation;
    let dose = env.crewDosePerDay;
    for (const effect of active) {
      const storm = effect.crewDosePerDay ?? 0;
      dose += effect.crewSheltered ? storm * (1 - (shield?.stormAttenuation ?? 0)) : storm;
    }
    state.crewDose += dose * (1 - (shield?.crewAttenuation ?? 0));
    state.crewHealth = Math.max(0, state.crewHealth - HEALTH_LOSS_PER_DAY * (1 - summary.crewProtection));
    if (state.suppliesDays !== null) state.suppliesDays -= 1;
    if (state.suppliesDays !== null && state.suppliesDays < 0) {
      logCheckpoint(state, {
        id: 'supplies',
        title: 'Out of supplies',
        status: 'fail',
        detail: 'The crew ran out of food, water and air before the mission was over. They had to cut it short.',
      });
      end(state, 'supplies');
      return;
    }
  }

  if (day % sampleInterval(state.totalDays) === 0) {
    state.samples.push({
      day,
      segment,
      sunDistanceAU: distances(state, day).sun,
      earthDistanceAU: earth,
      powerAvailable: available,
      powerLoad: instrumentsOn ? fullLoad : baseLoad,
      batteryPercent: capacity > 0 ? (state.batteryWh / capacity) * 100 : 0,
      instrumentsOn,
      dataStoredGb: state.dataStoredGb,
      science: state.science,
      electronicsDose: state.electronicsDose,
      crewDose: state.crewDose,
      crewHealth: state.crewHealth,
    });
  }
}

/**
 * Runs the mission until it ends, an event needs a decision, or `maxDays`
 * days have passed.
 */
export function advanceJourney(previous: JourneyState, maxDays = Infinity, data: GameData = gameData): JourneyState {
  if (previous.ended || previous.pending) return previous;
  const state = structuredClone(previous);
  const summary = summaryOf(state, data);
  const stopAt = state.day + maxDays;

  while (!state.ended && state.day < stopAt) {
    if (state.day === 0 && state.checkpoints.length === 0) {
      launchCheckpoint(state, summary);
      if (state.ended) break;
    }

    const due = state.scheduled.find((item) => item.day === state.day && !state.events.some((log) => log.eventId === item.eventId));
    if (due) {
      const event = getEvent(due.eventId);
      const ctx = eventContext(state, summary);
      state.pending = {
        eventId: event.id,
        day: state.day,
        title: event.title,
        description: event.describe(ctx),
        options: event.options(ctx),
      };
      return state;
    }

    if (state.day === state.cruiseEnd && !state.checkpoints.some((log) => log.id === 'insertion')) {
      if (state.input.mission.env.deltaV > 0) insertionCheckpoint(state, summary);
      if (state.ended) break;
      arrivalChecks(state, summary);
    }

    if (state.day >= state.totalDays) {
      reentryCheckpoint(state, summary);
      if (!state.ended) end(state, 'complete');
      break;
    }

    simulateDay(state, summary);
    if (!state.ended) state.day += 1;
  }
  return state;
}

/** Applies a decision to the pending event. */
export function resolveEvent(previous: JourneyState, optionId: string, data: GameData = gameData): JourneyState {
  const pending = previous.pending;
  if (!pending) throw new Error('No event is waiting for a decision');
  const option = pending.options.find((item) => item.id === optionId);
  if (!option) throw new Error(`Event "${pending.eventId}" has no option "${optionId}"`);

  const state = structuredClone(previous);
  const summary = summaryOf(state, data);
  const { effect, outcome } = getEvent(pending.eventId).resolve(eventContext(state, summary), optionId);

  if (effect.panelHealth) state.panelHealth *= effect.panelHealth;
  if (effect.pointing) state.pointing *= effect.pointing;
  if (effect.scienceFactor) state.scienceFactor *= effect.scienceFactor;
  if (effect.cost) state.extraCost += effect.cost;
  if (effect.crewHealth && state.crewHealth !== null) state.crewHealth = Math.max(0, Math.min(100, state.crewHealth + effect.crewHealth));
  if (effect.extendDays) {
    // More operations; the return trip (if any) moves later. The parts must still last.
    state.operationsEnd += effect.extendDays;
    state.totalDays += effect.extendDays;
    state.input.mission.env.operationsDays += effect.extendDays;
  }
  if (effect.days > 0) {
    // Scale timed effects to the mission: a 10-day storm can't erase a whole 5-day mission.
    const env = state.input.mission.env;
    const phaseDays = segmentOf(state, state.day) === 'operations' ? env.operationsDays : Math.max(env.cruiseDays, env.operationsDays);
    const days = Math.max(1, Math.min(effect.days, Math.ceil(phaseDays * EVENT_DURATION_SHARE)));
    state.effects.push({ eventId: pending.eventId, untilDay: state.day + days, effect: { ...effect, days } });
  }

  state.events.push({
    eventId: pending.eventId,
    day: pending.day,
    title: pending.title,
    optionId,
    optionLabel: option.label,
    outcome,
  });
  state.pending = null;
  return state;
}

/** Chooses an option for an event. Default: the first option. */
export type Chooser = (event: PendingEvent, state: JourneyState) => string;

/** Runs a whole mission, answering every event with `choose`. */
export function runJourney(input: JourneyInput, choose?: Chooser, data: GameData = gameData): JourneyState {
  let state = startJourney(input, data);
  for (let guard = 0; guard < 100; guard++) {
    state = advanceJourney(state, Infinity, data);
    if (state.ended) return state;
    if (state.pending) state = resolveEvent(state, choose ? choose(state.pending, state) : state.pending.options[0].id, data);
  }
  throw new Error('Journey did not finish');
}
