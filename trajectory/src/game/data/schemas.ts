/**
 * Data schemas. Every JSON file in this folder is validated against these at
 * load time, so a typo in the data fails loudly instead of breaking the game
 * in some subtle way. The TypeScript types are derived from the schemas.
 */
import { z } from 'zod';

export const TierSchema = z.enum(['simple', 'standard', 'advanced']);

export const PATHWAY_IDS = ['leo', 'moon', 'mars', 'jupiter', 'interstellar', 'exoplanet'] as const;
export const PathwayIdSchema = z.enum(PATHWAY_IDS);

export const LAUNCH_TARGETS = ['LEO', 'SSO', 'TLI', 'TMI', 'TJI', 'EGA', 'L2', 'ESCAPE'] as const;
export const LaunchTargetSchema = z.enum(LAUNCH_TARGETS);

export const INSTRUMENT_TYPES = [
  'camera',
  'imager',
  'radar',
  'spectrometer',
  'magnetometer',
  'plasma',
  'radiometer',
  'telescope',
  'photometer',
] as const;
export const InstrumentTypeSchema = z.enum(INSTRUMENT_TYPES);

const amount = z.number().finite().nonnegative();
const share = z.number().min(0).max(1);

/** Fields every part has. Mass in kg, cost in $M, power draw in W. */
const partBase = {
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  tier: TierSchema,
  mass: amount,
  cost: amount,
  powerDraw: amount,
  /** One or two plain-language sentences shown to the player. */
  description: z.string().min(1),
};

export const BusSchema = z.object({
  ...partBase,
  category: z.literal('bus'),
  /** Heaviest fully loaded spacecraft the structure can carry, kg. */
  maxMass: amount,
  /** Highest launch acceleration the structure survives, in g. */
  maxG: amount,
  /** Number of instruments it can carry. */
  instrumentSlots: z.number().int().min(1),
  /** Seats. 0 for robotic spacecraft. */
  crewCapacity: z.number().int().min(0),
  /** Longest time a crew can live in it, days. 0 for robotic spacecraft. */
  maxCrewDays: amount,
});

export const PowerSchema = z.object({
  ...partBase,
  category: z.literal('power'),
  source: z.enum(['solar', 'rtg']),
  /** Solar: W in full sunlight at 1 AU. RTG: W at launch. */
  output: amount,
});

export const BatterySchema = z.object({
  ...partBase,
  category: z.literal('battery'),
  energyWh: amount,
  lifeYears: amount,
});

export const ComputerSchema = z.object({
  ...partBase,
  category: z.literal('computer'),
  /** Can it handle problems on its own when Earth is too far away to help? */
  autonomy: z.boolean(),
  /** Total radiation dose the electronics tolerate, krad. */
  radToleranceKrad: amount,
  lifeYears: amount,
  /** Onboard data storage, Gb. */
  storageGb: amount,
});

export const AdcsSchema = z.object({
  ...partBase,
  category: z.literal('adcs'),
  /** 1 coarse, 2 fine, 3 very fine. */
  pointing: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  /** Magnetorquers push against the Earth's magnetic field, so they only work near Earth. */
  nearEarthOnly: z.boolean(),
  /** Has a spare, so one failure doesn't hurt pointing. */
  redundant: z.boolean(),
});

export const CommsSchema = z.object({
  ...partBase,
  category: z.literal('comms'),
  /** Downlink rate at 1 AU from Earth, Mbps. */
  rateAt1AU: amount,
  /** Hardware limit near Earth, Mbps. */
  maxRate: amount,
});

export const PropulsionSchema = z.object({
  ...partBase,
  category: z.literal('propulsion'),
  /** Specific impulse, s. Higher means more Δv from the same propellant. */
  isp: amount,
  /** Most propellant the tanks hold, kg. */
  fuelCapacity: amount,
});

export const RadiationSchema = z.object({
  ...partBase,
  category: z.literal('radiation'),
  /** Share of the dose kept away from the electronics. */
  electronicsAttenuation: share,
  /** Share of the everyday cosmic-ray dose kept away from the crew. */
  crewAttenuation: share,
  /** Share of a solar-storm dose kept away from the crew. */
  stormAttenuation: share,
});

export const ThermalSchema = z.object({
  ...partBase,
  category: z.literal('thermal'),
  /** Keeps the spacecraft warm far from the Sun (beyond about 2 AU). */
  coldRated: z.boolean(),
  /** Keeps telescopes cold enough for their best science. */
  cooling: z.boolean(),
});

export const LifeSupportSchema = z.object({
  ...partBase,
  category: z.literal('lifeSupport'),
  /** Share of water and oxygen recovered. */
  recycling: share,
});

export const HabitatSchema = z.object({
  ...partBase,
  category: z.literal('habitat'),
  kind: z.enum(['exercise', 'spin']),
  /** Extra mass per metre of spin arm, kg/m (spin habitats only). */
  massPerMetre: amount,
  /** Share of bone and muscle loss it prevents at best. */
  protection: share,
});

export const HeatShieldSchema = z.object({
  ...partBase,
  category: z.literal('heatShield'),
  /** Fastest atmospheric entry it survives, km/s. */
  entrySpeedRating: amount,
});

export const InstrumentSchema = z.object({
  ...partBase,
  category: z.literal('instrument'),
  type: InstrumentTypeSchema,
  /** Data produced while observing, Gb/day. */
  dataPerDay: amount,
  /** Science value if all its data reaches Earth for the whole mission. */
  science: amount,
  /** Pointing accuracy it needs: 0 none … 3 very fine. */
  needsPointing: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  /** Does better behind a sunshield. */
  benefitsFromCooling: z.boolean(),
  /** How useful it is on each pathway (1 = fully). Missing pathways count as `defaultFit`. */
  fit: z.partialRecord(PathwayIdSchema, amount),
  defaultFit: amount,
});

export const PartSchema = z.discriminatedUnion('category', [
  BusSchema,
  PowerSchema,
  BatterySchema,
  ComputerSchema,
  AdcsSchema,
  CommsSchema,
  PropulsionSchema,
  RadiationSchema,
  ThermalSchema,
  LifeSupportSchema,
  HabitatSchema,
  HeatShieldSchema,
  InstrumentSchema,
]);

export const LaunchVehicleSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  /** $M. */
  cost: amount,
  /** Liftoff thrust, N. */
  thrust: amount,
  /** Rocket mass at liftoff without the spacecraft, kg. */
  liftoffMass: amount,
  /** Peak acceleration during ascent, in g. */
  maxG: amount,
  /** Heaviest spacecraft it can send to each target, kg. */
  capacity: z.record(LaunchTargetSchema, amount),
});

/** The conditions a spacecraft must be designed for. */
export const EnvironmentSchema = z.object({
  /** Where the rocket has to deliver the spacecraft. */
  launchTarget: LaunchTargetSchema,
  /** Multiplier on the rocket's capacity (below 1 for an energetic, faster trajectory). */
  launchCapacityFactor: amount,
  /** Velocity change the spacecraft's own engine must provide after separation, m/s. */
  deltaV: amount,
  /** Travel time to the destination, days. */
  cruiseDays: amount,
  /** Planned time working at the destination, days. */
  operationsDays: amount,
  /** Trip home, days (crewed missions that return in the same vehicle). */
  returnDays: amount,
  /** Distance from the Sun at the destination, AU. */
  sunDistanceAU: amount,
  /** Largest distance from Earth, AU (sizes the radio link and the signal delay). */
  earthDistanceAU: amount,
  /** Longest time in shadow per orbit, hours. */
  eclipseHours: amount,
  /** Share of time spent in shadow. */
  eclipseFraction: share,
  /** Ground-station contact per day, hours. */
  contactHoursPerDay: amount,
  /** Dose rate for electronics while travelling, krad/day. */
  cruiseElectronicsDose: amount,
  /** Dose rate for electronics at the destination, krad/day. */
  operationsElectronicsDose: amount,
  /** Dose rate for the crew, mSv/day. */
  crewDosePerDay: amount,
  /** Multiplier on science value (how good the vantage point is). */
  scienceMultiplier: amount,
  /** Cost of running the mission, $M per year. */
  operationsCostPerYear: amount,
});

export const TrajectoryOptionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  /** One-line summary. */
  summary: z.string().min(1),
  pros: z.array(z.string()).min(1),
  cons: z.array(z.string()).min(1),
  /** Environment values this option changes. */
  overrides: EnvironmentSchema.partial(),
  /** Markers used by the flight scenarios, e.g. "jupiter-assist". */
  tags: z.array(z.string()).default([]),
});

export const OrbitInfoSchema = z.object({
  body: z.enum(['earth', 'moon', 'mars', 'jupiter']),
  altitudeKm: amount,
});

export const PathwaySchema = z.object({
  id: PathwayIdSchema,
  chapter: z.number().int().min(1),
  name: z.string().min(1),
  destination: z.string().min(1),
  /** The science question, in one sentence. */
  objective: z.string().min(1),
  /** Why this destination is hard, with real numbers. */
  hazards: z.array(z.string()).min(1),
  crewed: z.boolean(),
  crewSize: z.number().int().min(0),
  /** $M at Engineer difficulty. */
  budget: amount,
  /** Science value the mission must deliver. */
  scienceTarget: amount,
  /**
   * Instruments the objective needs. Each inner list is "any one of these
   * types"; every inner list must be satisfied.
   */
  requiredInstruments: z.array(z.array(InstrumentTypeSchema).min(1)).min(1),
  /** Speed of re-entry at the end, km/s. Null when the spacecraft doesn't return. */
  returnEntrySpeed: amount.nullable(),
  /** Resources that matter most on this pathway. */
  critical: z.array(z.enum(['mass', 'power', 'budget', 'data', 'comms', 'time'])).min(1),
  /** The final orbit, for the orbit physics challenges. */
  orbit: OrbitInfoSchema.nullable(),
  environment: EnvironmentSchema,
  /** At least two ways to fly it. The first one is the default. */
  trajectories: z.array(TrajectoryOptionSchema).min(2),
});
