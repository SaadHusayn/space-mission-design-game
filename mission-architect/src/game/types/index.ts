import type { z } from 'zod';

import type {
  EnvironmentSchema,
  InstrumentTypeSchema,
  LaunchTargetSchema,
  LaunchVehicleSchema,
  PartSchema,
  PathwayIdSchema,
  PathwaySchema,
  TierSchema,
  TrajectoryOptionSchema,
} from '../data/schemas';

export type Tier = z.infer<typeof TierSchema>;
export type PathwayId = z.infer<typeof PathwayIdSchema>;
export type LaunchTarget = z.infer<typeof LaunchTargetSchema>;
export type InstrumentType = z.infer<typeof InstrumentTypeSchema>;

export type Part = z.infer<typeof PartSchema>;
export type PartCategory = Part['category'];
export type PartOf<C extends PartCategory> = Extract<Part, { category: C }>;
export type Bus = PartOf<'bus'>;
export type PowerSource = PartOf<'power'>;
export type Battery = PartOf<'battery'>;
export type Computer = PartOf<'computer'>;
export type Adcs = PartOf<'adcs'>;
export type Comms = PartOf<'comms'>;
export type Propulsion = PartOf<'propulsion'>;
export type RadiationShield = PartOf<'radiation'>;
export type Thermal = PartOf<'thermal'>;
export type LifeSupport = PartOf<'lifeSupport'>;
export type Habitat = PartOf<'habitat'>;
export type HeatShield = PartOf<'heatShield'>;
export type Instrument = PartOf<'instrument'>;

export type LaunchVehicle = z.infer<typeof LaunchVehicleSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
export type TrajectoryOption = z.infer<typeof TrajectoryOptionSchema>;
export type Pathway = z.infer<typeof PathwaySchema>;

export type Difficulty = 'cadet' | 'engineer' | 'director';

/** Single-part slots on a spacecraft. The bus and the instruments are separate. */
export const SLOT_IDS = [
  'power',
  'battery',
  'computer',
  'adcs',
  'comms',
  'propulsion',
  'radiation',
  'thermal',
  'lifeSupport',
  'habitat',
  'heatShield',
] as const;
export type SlotId = (typeof SLOT_IDS)[number];

/** Everything the player decides when building a spacecraft. */
export interface Design {
  busId: string | null;
  slots: Record<SlotId, string | null>;
  instrumentIds: string[];
  options: {
    /** Propellant loaded, kg (limited by the tanks). */
    fuelMass: number;
    /** Days of crew supplies loaded. */
    supplyDays: number;
    /** Length of the spin-habitat arm, m. */
    spinArmLength: number;
  };
}

export function emptyDesign(): Design {
  return {
    busId: null,
    slots: {
      power: null,
      battery: null,
      computer: null,
      adcs: null,
      comms: null,
      propulsion: null,
      radiation: null,
      thermal: null,
      lifeSupport: null,
      habitat: null,
      heatShield: null,
    },
    instrumentIds: [],
    options: { fuelMass: 0, supplyDays: 0, spinArmLength: 0 },
  };
}

/** One mission being planned: where, how, and at what difficulty. */
export interface MissionContext {
  pathway: Pathway;
  trajectory: TrajectoryOption;
  /** The pathway's environment with the trajectory's changes applied. */
  env: Environment;
  difficulty: Difficulty;
  /** Budget after the difficulty adjustment, $M. */
  budget: number;
}
