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

/** Resource deltas recorded for one design decision (report "why" bullets use these). */
export type DecisionDelta = 'mass' | 'cost' | 'power' | 'data' | 'deltaV' | 'science';

/** One design choice, team vote, or event decision logged for the mission report. */
export interface DecisionLogEntry {
  /** 1-based, in order. */
  id: number;
  /** The role that owns the changed slot ('crew' in solo mode). */
  actor: string;
  /** Call-sign of the crew member who proposed or made the decision (optional). */
  proposerCallSign?: string;
  /** What was done, e.g. "equip" / "unequip" / "bus" / "option" / "event" / "negotiation" / "vote". */
  kind: string;
  slotId: SlotId | null;
  partId: string | null;
  partName: string;
  /** Change in each affected resource (mass in kg, cost in $M, power in W, data in Gb/day, Δv in m/s, science in points). */
  deltas: Partial<Record<DecisionDelta, number>>;
  /** Optional vote summary when decided by team vote. */
  voteSummary?: {
    proposalTitle: string;
    votes: { memberId: string; callSign: string; roles: string[]; choice: string; reaction?: string }[];
    outcome: 'approved' | 'rejected' | 'tie_broken' | 'timeout_default';
    chosenOption?: string;
    consensus: boolean;
  };
  /** Optional explanation of the outcome (for events and negotiations). */
  outcomeText?: string;
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
