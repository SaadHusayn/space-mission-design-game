/**
 * Design totals: everything the HUD and the Engineering Review need to know
 * about a spacecraft design on a given mission. Pure function of
 * (design, mission, launch vehicle).
 */
import { gameData, type GameData } from '../data/loadData';
import {
  DAYS_PER_YEAR,
  G0,
  consumablesMass,
  dataPerDayGb,
  deltaV,
  downlinkRateMbps,
  lightDelaySeconds,
  rtgPower,
  spinAcceleration,
  spinComfort,
  spinRpm,
  sunlightFraction,
  thrustToWeight,
  type SpinComfort,
} from '../physics';
import type {
  Adcs,
  Battery,
  Bus,
  Comms,
  Computer,
  Design,
  Habitat,
  HeatShield,
  Instrument,
  LaunchVehicle,
  LifeSupport,
  MissionContext,
  Part,
  PartCategory,
  PartOf,
  PowerSource,
  Propulsion,
  RadiationShield,
  SlotId,
  Thermal,
} from '../types';
import { missionDays } from './mission';

/** Mars-like gravity, the target for spin habitats (m/s²). */
export const SPIN_TARGET_ACCELERATION = 3.73;
/** Crew health points lost per day of weightlessness with no countermeasures. */
export const HEALTH_LOSS_PER_DAY = 0.07;
/** Share of a battery's energy that can be used without damaging it. */
export const BATTERY_DEPTH_OF_DISCHARGE = 0.8;
/** Signal delays above this (seconds) need an autonomous computer. */
export const AUTONOMY_DELAY_LIMIT = 300;
/** Science multiplier for an instrument kept cold behind a sunshield. */
export const COOLING_BONUS = 1.3;
/** Science multiplier for an instrument without the pointing accuracy it needs. */
export const POOR_POINTING_FACTOR = 0.4;

const SPIN_COMFORT_FACTOR: Readonly<Record<SpinComfort, number>> = {
  comfortable: 1,
  adaptation: 0.85,
  uncomfortable: 0.5,
};

/** Every part in the design, resolved from its id. Missing slots are null. */
export interface ResolvedDesign {
  bus: Bus | null;
  power: PowerSource | null;
  battery: Battery | null;
  computer: Computer | null;
  adcs: Adcs | null;
  comms: Comms | null;
  propulsion: Propulsion | null;
  radiation: RadiationShield | null;
  thermal: Thermal | null;
  lifeSupport: LifeSupport | null;
  habitat: Habitat | null;
  heatShield: HeatShield | null;
  instruments: Instrument[];
}

export interface InstrumentScore {
  instrument: Instrument;
  /** Fits inside the bus's instrument slots. */
  fitted: boolean;
  fit: number;
  pointingOk: boolean;
  cooled: boolean;
  /** Science if all its data reaches Earth for the whole mission. */
  potential: number;
}

export interface DesignSummary {
  resolved: ResolvedDesign;
  days: number;
  years: number;

  // Mass, kg
  partsMass: number;
  spinArmMass: number;
  suppliesMass: number;
  dryMass: number;
  fuelMass: number;
  wetMass: number;

  // Propulsion
  deltaV: number;
  deltaVRequired: number;

  // Power, W
  powerLoad: number;
  /** Average power available at the destination (end of mission for an RTG). */
  powerAvailable: number;
  batteryNeededWh: number;
  batteryUsableWh: number;

  // Data and comms
  dataPerDay: number;
  downlinkPerDay: number;
  /** Share of the data that reaches Earth (0..1). */
  dataDelivered: number;
  signalDelaySeconds: number;

  // Money, $M
  partsCost: number;
  operationsCost: number;
  launchCost: number | null;
  totalCost: number;

  // Durability
  electronicsDose: number;
  crewDose: number;
  designLifeYears: number;
  lifeLimitedBy: string | null;

  // Crew
  spinRpm: number;
  spinAcceleration: number;
  spinComfort: SpinComfort | null;
  /** Crew health at the end of the mission, 0..100. Null for robotic missions. */
  crewHealth: number | null;
  /** Share of weightlessness damage prevented by exercise or spin (0..1). */
  crewProtection: number;

  // Science
  instrumentScores: InstrumentScore[];
  sciencePotential: number;
  /** Expected science delivered (potential × data delivered × lifetime share). */
  science: number;

  // Launch (null until a vehicle is chosen)
  launchCapacity: number | null;
  liftoffTwr: number | null;
}

function slot<C extends PartCategory>(
  id: string | null,
  category: C,
  data: GameData,
): PartOf<C> | null {
  if (!id) return null;
  const part = data.partById.get(id);
  if (!part || part.category !== category) return null;
  return part as PartOf<C>;
}

const SLOT_CATEGORY: Readonly<Record<SlotId, PartCategory>> = {
  power: 'power',
  battery: 'battery',
  computer: 'computer',
  adcs: 'adcs',
  comms: 'comms',
  propulsion: 'propulsion',
  radiation: 'radiation',
  thermal: 'thermal',
  lifeSupport: 'lifeSupport',
  habitat: 'habitat',
  heatShield: 'heatShield',
};

export function resolveDesign(design: Design, data: GameData = gameData): ResolvedDesign {
  const instruments = design.instrumentIds
    .map((id) => data.partById.get(id))
    .filter((part): part is Instrument => part?.category === 'instrument');
  return {
    bus: slot(design.busId, 'bus', data),
    power: slot(design.slots.power, 'power', data),
    battery: slot(design.slots.battery, 'battery', data),
    computer: slot(design.slots.computer, 'computer', data),
    adcs: slot(design.slots.adcs, 'adcs', data),
    comms: slot(design.slots.comms, 'comms', data),
    propulsion: slot(design.slots.propulsion, 'propulsion', data),
    radiation: slot(design.slots.radiation, 'radiation', data),
    thermal: slot(design.slots.thermal, 'thermal', data),
    lifeSupport: slot(design.slots.lifeSupport, 'lifeSupport', data),
    habitat: slot(design.slots.habitat, 'habitat', data),
    heatShield: slot(design.slots.heatShield, 'heatShield', data),
    instruments,
  };
}

/** All parts in the design (bus, slots, instruments), ignoring empty slots. */
export function designParts(resolved: ResolvedDesign): Part[] {
  const list: (Part | null)[] = [resolved.bus];
  for (const key of Object.keys(SLOT_CATEGORY) as SlotId[]) list.push(resolved[key]);
  return [...list.filter((part): part is Part => part !== null), ...resolved.instruments];
}

/** Can the attitude-control system work at this destination? */
export function adcsWorksThere(adcs: Adcs | null, mission: MissionContext): boolean {
  if (!adcs) return false;
  // Magnetorquers need a strong magnetic field: only in Earth orbit.
  return !adcs.nearEarthOnly || mission.env.earthDistanceAU < 0.0001;
}

export function summarizeDesign(
  design: Design,
  mission: MissionContext,
  vehicle: LaunchVehicle | null = null,
  data: GameData = gameData,
): DesignSummary {
  const resolved = resolveDesign(design, data);
  const { env, pathway } = mission;
  const days = missionDays(env);
  const years = days / DAYS_PER_YEAR;
  const parts = designParts(resolved);

  // --- Crew systems
  const crew = pathway.crewed ? pathway.crewSize : 0;
  const recycling = resolved.lifeSupport?.recycling ?? 0;
  const suppliesMass = crew > 0 ? consumablesMass(crew, design.options.supplyDays, recycling) : 0;
  const spinHabitat = resolved.habitat?.kind === 'spin' ? resolved.habitat : null;
  const armLength = spinHabitat ? Math.max(0, design.options.spinArmLength) : 0;
  const spinArmMass = spinHabitat ? spinHabitat.massPerMetre * armLength : 0;
  const rpm = armLength > 0 ? spinRpm(SPIN_TARGET_ACCELERATION, armLength) : 0;
  const comfort = armLength > 0 ? spinComfort(rpm) : null;

  // --- Mass
  const partsMass = parts.reduce((sum, part) => sum + part.mass, 0);
  const dryMass = partsMass + spinArmMass + suppliesMass;
  const fuelMass = resolved.propulsion
    ? Math.min(Math.max(0, design.options.fuelMass), resolved.propulsion.fuelCapacity)
    : 0;
  const wetMass = dryMass + fuelMass;

  // --- Δv
  const dv = resolved.propulsion ? deltaV(resolved.propulsion.isp, wetMass, dryMass) : 0;

  // --- Power
  const powerLoad = parts.reduce((sum, part) => sum + part.powerDraw, 0);
  let powerAvailable = 0;
  if (resolved.power?.source === 'solar') {
    powerAvailable = resolved.power.output * sunlightFraction(env.sunDistanceAU) * (1 - env.eclipseFraction);
  } else if (resolved.power?.source === 'rtg') {
    powerAvailable = rtgPower(resolved.power.output, years);
  }
  const batteryNeededWh = powerLoad * env.eclipseHours;
  const batteryUsableWh = (resolved.battery?.energyWh ?? 0) * BATTERY_DEPTH_OF_DISCHARGE;

  // --- Data
  const fittedCount = resolved.bus?.instrumentSlots ?? 0;
  const dataPerDay = resolved.instruments
    .slice(0, fittedCount)
    .reduce((sum, instrument) => sum + instrument.dataPerDay, 0);
  const downlinkPerDay = resolved.comms
    ? dataPerDayGb(
        downlinkRateMbps(resolved.comms.rateAt1AU, resolved.comms.maxRate, env.earthDistanceAU),
        env.contactHoursPerDay,
      )
    : 0;
  const dataDelivered = dataPerDay <= 0 ? (resolved.comms ? 1 : 0) : Math.min(1, downlinkPerDay / dataPerDay);
  const signalDelaySeconds = lightDelaySeconds(env.earthDistanceAU);

  // --- Cost
  const partsCost = parts.reduce((sum, part) => sum + part.cost, 0);
  const operationsCost = env.operationsCostPerYear * years;
  const launchCost = vehicle ? vehicle.cost : null;
  const totalCost = partsCost + operationsCost + (launchCost ?? 0);

  // --- Radiation
  const travelDays = env.cruiseDays + env.returnDays;
  const electronicsAttenuation = resolved.radiation?.electronicsAttenuation ?? 0;
  const electronicsDose =
    (env.cruiseElectronicsDose * travelDays + env.operationsElectronicsDose * env.operationsDays) *
    (1 - electronicsAttenuation);
  const crewDose = crew > 0 ? env.crewDosePerDay * days * (1 - (resolved.radiation?.crewAttenuation ?? 0)) : 0;

  // --- Design life: the weakest part decides.
  const lifeCandidates: [string, number][] = [];
  if (resolved.battery) lifeCandidates.push([resolved.battery.name, resolved.battery.lifeYears]);
  if (resolved.computer) {
    lifeCandidates.push([resolved.computer.name, resolved.computer.lifeYears]);
    if (electronicsDose > resolved.computer.radToleranceKrad && electronicsDose > 0) {
      // Radiation kills the electronics partway through the mission.
      const share = resolved.computer.radToleranceKrad / electronicsDose;
      lifeCandidates.push([`${resolved.computer.name} (radiation damage)`, years * share]);
    }
  }
  let designLifeYears = lifeCandidates.length > 0 ? Infinity : 0;
  let lifeLimitedBy: string | null = null;
  for (const [name, life] of lifeCandidates) {
    if (life < designLifeYears) {
      designLifeYears = life;
      lifeLimitedBy = name;
    }
  }

  // --- Crew health
  let crewHealth: number | null = null;
  let crewProtection = resolved.habitat?.kind === 'exercise' ? resolved.habitat.protection : 0;
  if (spinHabitat && comfort) crewProtection = spinHabitat.protection * SPIN_COMFORT_FACTOR[comfort];
  if (crew > 0) crewHealth = Math.max(0, 100 - HEALTH_LOSS_PER_DAY * days * (1 - crewProtection));

  // --- Science
  const thermalCooling = resolved.thermal?.cooling ?? false;
  const pointing = adcsWorksThere(resolved.adcs, mission) ? (resolved.adcs?.pointing ?? 0) : 0;
  const instrumentScores: InstrumentScore[] = resolved.instruments.map((instrument, index) => {
    const fitted = index < fittedCount;
    const fit = instrument.fit[pathway.id] ?? instrument.defaultFit;
    const pointingOk = instrument.needsPointing <= pointing;
    const cooled = instrument.benefitsFromCooling && thermalCooling;
    const potential = fitted
      ? instrument.science *
        fit *
        env.scienceMultiplier *
        (pointingOk ? 1 : POOR_POINTING_FACTOR) *
        (cooled ? COOLING_BONUS : 1)
      : 0;
    return { instrument, fitted, fit, pointingOk, cooled, potential };
  });
  const sciencePotential = instrumentScores.reduce((sum, score) => sum + score.potential, 0);
  const lifeShare = years > 0 ? Math.min(1, designLifeYears / years) : 1;
  const science = sciencePotential * dataDelivered * lifeShare;

  // --- Launch
  const launchCapacity = vehicle ? vehicle.capacity[env.launchTarget] * env.launchCapacityFactor : null;
  const liftoffTwr = vehicle ? thrustToWeight(vehicle.thrust, vehicle.liftoffMass + wetMass, G0) : null;

  return {
    resolved,
    days,
    years,
    partsMass,
    spinArmMass,
    suppliesMass,
    dryMass,
    fuelMass,
    wetMass,
    deltaV: dv,
    deltaVRequired: env.deltaV,
    powerLoad,
    powerAvailable,
    batteryNeededWh,
    batteryUsableWh,
    dataPerDay,
    downlinkPerDay,
    dataDelivered,
    signalDelaySeconds,
    partsCost,
    operationsCost,
    launchCost,
    totalCost,
    electronicsDose,
    crewDose,
    designLifeYears,
    lifeLimitedBy,
    spinRpm: rpm,
    spinAcceleration: armLength > 0 ? spinAcceleration(rpm, armLength) : 0,
    spinComfort: comfort,
    crewHealth,
    crewProtection,
    instrumentScores,
    sciencePotential,
    science,
    launchCapacity,
    liftoffTwr,
  };
}
