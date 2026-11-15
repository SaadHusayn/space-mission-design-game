/**
 * Random and scripted mission events, negotiation dilemmas (N6), design
 * mitigation checks, and NPC advisor opinions.
 *
 * Each event offers choices that are trade-offs, and the outcome depends on
 * how the spacecraft was designed.
 */
import { z } from 'zod';

import type { RoleId } from '../core/crew';
import advisorsJson from '../data/advisors.json';
import eventsJson from '../data/events.json';
import { SPEAKERS, type SpeakerId } from '../data/story';
import type { Difficulty, MissionContext } from '../types';
import type { DesignSummary } from './design';

export type EventWindow = 'launch' | 'cruise' | 'operations';
export type EventVisualCue = 'solar_storm' | 'micrometeoroid' | 'comms_cut' | 'alarm' | 'celebration';

export interface EventOption {
  id: string;
  label: string;
  /** What this choice does, shown before deciding. */
  description: string;
  /** Optional role that champions this option in a negotiation dilemma. */
  championedBy?: RoleId;
}

/** Changes an event makes to the running mission. */
export interface EventEffect {
  /** Days the effect lasts (0 = instant / permanent changes only). */
  days: number;
  /** Multiplies solar output while it lasts. */
  powerFactor?: number;
  /** Instruments switched off while it lasts. */
  instrumentsOff?: boolean;
  /** No downlink while it lasts. */
  downlinkOff?: boolean;
  /** Extra dose to the electronics, krad per day, before shielding. */
  electronicsDosePerDay?: number;
  /** Extra crew dose, mSv per day, before shielding. */
  crewDosePerDay?: number;
  /** Crew are in the storm shelter (storm shielding applies). */
  crewSheltered?: boolean;
  /** Permanent: multiply solar panel health. */
  panelHealth?: number;
  /** Permanent: multiply pointing quality (science per observation). */
  pointing?: number;
  /** Permanent: multiply the value of all future science. */
  scienceFactor?: number;
  /** One-off cost, $M. */
  cost?: number;
  /** Crew health change (points). */
  crewHealth?: number;
  /** Extra days of operations. */
  extendDays?: number;
  /** Computer offline (no science, no autonomy) for `days`. */
  computerOffline?: boolean;
}

export interface EventResolution {
  effect: EventEffect;
  /** What happened and why, tied to the design. */
  outcome: string;
}

export interface EventContext {
  mission: MissionContext;
  summary: DesignSummary;
  /** Live solar output right now, W (0 with an RTG). */
  solarNow: number;
  /** Power the spacecraft needs with instruments on, W. */
  fullLoad: number;
  /** Power it needs with instruments off, W. */
  baseLoad: number;
}

export interface EventDef {
  id: string;
  title: string;
  window: EventWindow;
  /** Chance it happens on a mission, by difficulty. */
  chance: Readonly<Record<Difficulty, number>>;
  applies: (ctx: EventContext) => boolean;
  describe: (ctx: EventContext) => string;
  options: (ctx: EventContext) => EventOption[];
  resolve: (ctx: EventContext, optionId: string) => EventResolution;
}

export interface EventMitigationStatus {
  label: string;
  mitigated: boolean;
  detail: string;
}

export interface AdvisorOpinion {
  speaker: SpeakerId;
  speakerName: string;
  speakerTitle: string;
  colour: string;
  initials: string;
  recommendedOptionId: string;
  recommendedOptionLabel: string;
  quote: string;
}

export interface NegotiationDef extends EventDef {
  timerSeconds: number;
  commanderDefaultOptionId: string;
  roleStances: Readonly<Record<RoleId, { optionId: string; stance: string }>>;
}

const EventCatalogueEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  icon: z.string().min(1),
  window: z.enum(['launch', 'cruise', 'operations']),
  kind: z.enum(['anomaly', 'negotiation']),
  visualCue: z.enum(['solar_storm', 'micrometeoroid', 'comms_cut', 'alarm', 'celebration']),
  ownerRole: z.enum(['commander', 'engineer', 'science', 'comms']),
  chance: z.object({
    cadet: z.number().min(0).max(1),
    engineer: z.number().min(0).max(1),
    director: z.number().min(0).max(1),
  }),
  mitigatedBy: z.array(z.string()).min(1),
  timerSeconds: z.number().positive().optional(),
  commanderDefaultOptionId: z.string().optional(),
});

const AdvisorEntrySchema = z.object({
  speaker: z.enum(['hale', 'okafor', 'kenji', 'ferreira', 'echo']),
  recommendedOptionId: z.string().min(1),
  quote: z.string().min(1),
});

export type EventCatalogueEntry = z.infer<typeof EventCatalogueEntrySchema>;

export const EVENT_CATALOGUE: readonly EventCatalogueEntry[] = z.array(EventCatalogueEntrySchema).parse(eventsJson);
export const ADVISOR_CATALOGUE: Readonly<Record<string, readonly z.infer<typeof AdvisorEntrySchema>[]>> = z
  .record(z.string(), z.array(AdvisorEntrySchema))
  .parse(advisorsJson);

export function getEventCatalogueEntry(id: string): EventCatalogueEntry | undefined {
  return EVENT_CATALOGUE.find((item) => item.id === id);
}

/** Most events that can happen on one mission. */
export const MAX_EVENTS: Readonly<Record<Difficulty, number>> = { cadet: 1, engineer: 2, director: 4 };

const w = (watts: number) => `${Math.round(watts).toLocaleString('en-US')} W`;

export const EVENTS: readonly EventDef[] = [
  {
    id: 'solar_storm',
    title: 'Solar storm',
    window: 'operations',
    chance: { cadet: 0.5, engineer: 0.7, director: 0.9 },
    applies: () => true,
    describe: (ctx) =>
      `A burst of energetic particles from the Sun hits the spacecraft. ${ctx.summary.resolved.power?.source === 'solar' ? 'The solar arrays lose 30% of their output until it passes. ' : ''}Radiation spikes for everyone on board.`,
    options: (ctx) => {
      const base: EventOption[] = [
        {
          id: 'safe_mode',
          label: ctx.mission.pathway.crewed ? 'Safe mode: crew to the shelter' : 'Safe mode',
          description: 'Switch off the instruments until the storm passes to protect the spacecraft. You lose those days of science.',
          championedBy: 'engineer',
        },
        {
          id: 'keep_operating',
          label: 'Keep observing',
          description: 'Keep the instruments running. More science, but more radiation, and the power may not last.',
          championedBy: 'science',
        },
      ];
      if (ctx.mission.pathway.crewed) {
        base.push({
          id: 'shelter',
          label: 'Crew to storm shelter (keep minimal telemetry)',
          description: 'Astronauts shelter behind water-wall shielding while automated dosimeters log the storm (halves radiation risk, keeps 98% science).',
          championedBy: 'commander',
        });
      }
      return base;
    },
    resolve: (ctx, optionId) => {
      const solar = ctx.summary.resolved.power?.source === 'solar';
      const powerFactor = solar ? 0.7 : 1;
      const stormSolar = ctx.solarNow * powerFactor;
      const crewed = ctx.mission.pathway.crewed;
      if (optionId === 'safe_mode') {
        return {
          effect: { days: 10, powerFactor, instrumentsOff: true, electronicsDosePerDay: 0.5, crewDosePerDay: 30, crewSheltered: true },
          outcome: `Safe mode protected the spacecraft${crewed ? ' and the crew sheltered behind water walls' : ''}. You lost the observations during the storm.`,
        };
      }
      if (optionId === 'shelter') {
        return {
          effect: { days: 10, powerFactor, instrumentsOff: false, electronicsDosePerDay: 0.75, crewDosePerDay: 30, crewSheltered: true, scienceFactor: 0.98 },
          outcome: 'The crew sheltered behind storm shielding while automated sensors rode out the flare with minimal science loss.',
        };
      }
      const enough = !solar || stormSolar >= ctx.fullLoad;
      return {
        effect: {
          days: 10,
          powerFactor,
          electronicsDosePerDay: 1.5,
          crewDosePerDay: 30,
          crewSheltered: false,
        },
        outcome: enough
          ? `Your power system still made ${w(stormSolar)} against a load of ${w(ctx.fullLoad)}, so observing continued. ${crewed ? 'But the crew took the full storm dose without shelter.' : ''}`
          : `At 70% power the arrays made only ${w(stormSolar)} but the instruments needed ${w(ctx.fullLoad)}. They kept shutting down, and the battery drained.`,
      };
    },
  },
  {
    id: 'micrometeoroid',
    title: 'Micrometeoroid hit',
    window: 'cruise',
    chance: { cadet: 0.2, engineer: 0.35, director: 0.5 },
    applies: (ctx) => ctx.summary.resolved.power?.source === 'solar',
    describe: () => 'A grain of dust travelling faster than a bullet punches through a solar array. It now makes 20% less power.',
    options: () => [
      { id: 'reroute', label: 'Reroute the wiring', description: 'Engineers find a workaround. Costs $5M, recovers half the loss.', championedBy: 'engineer' },
      { id: 'repoint', label: 'Re-point array attitude', description: 'Feather the wing angle. Free and keeps 92% panel health, with a 6% pointing trim.', championedBy: 'commander' },
      { id: 'accept', label: 'Accept the damage', description: 'Free, but you keep 20% less solar power for the rest of the mission.', championedBy: 'comms' },
    ],
    resolve: (_ctx, optionId) => {
      if (optionId === 'reroute') {
        return { effect: { days: 0, panelHealth: 0.9, cost: 5 }, outcome: 'The rerouted circuits recovered half the lost power.' };
      }
      if (optionId === 'repoint') {
        return {
          effect: { days: 0, panelHealth: 0.92, pointing: 0.94 },
          outcome: 'Re-pointing the array angle protected solar output (92% retained) at the cost of slightly wider pointing jitter.',
        };
      }
      return { effect: { days: 0, panelHealth: 0.8 }, outcome: 'The array now makes 20% less power. Your power margin decides whether that matters.' };
    },
  },
  {
    id: 'wheel_failure',
    title: 'Reaction wheel failure',
    window: 'operations',
    chance: { cadet: 0.15, engineer: 0.3, director: 0.45 },
    applies: (ctx) => (ctx.summary.resolved.adcs?.pointing ?? 0) >= 2,
    describe: (ctx) =>
      ctx.summary.resolved.adcs?.redundant
        ? 'A reaction wheel has failed. Your precision system carries a spare.'
        : 'A reaction wheel has failed. Without it, the spacecraft wobbles and images blur.',
    options: (ctx) =>
      ctx.summary.resolved.adcs?.redundant
        ? [
            { id: 'spare', label: 'Switch to the spare wheel', description: 'Engage the redundant reaction wheel assembly with zero pointing loss.', championedBy: 'engineer' },
            { id: 'thrusters', label: 'Hold spare in reserve (use thrusters)', description: 'Save the spare wheel and point with RCS thrusters ($4M ops support).', championedBy: 'science' },
          ]
        : [
            { id: 'thrusters', label: 'Point with thrusters', description: 'Use small thrusters to hold steady. Costs $8M of extra operations work; pointing stays good.', championedBy: 'science' },
            { id: 'accept', label: 'Accept blurrier data', description: 'Free, but science from now on drops by 30%.', championedBy: 'comms' },
          ],
    resolve: (ctx, optionId) => {
      if (optionId === 'spare') {
        return { effect: { days: 0 }, outcome: 'The spare wheel spun up. Paying for a redundant system just saved the mission.' };
      }
      if (ctx.summary.resolved.adcs?.redundant && optionId === 'thrusters') {
        return { effect: { days: 0, cost: 4 }, outcome: 'RCS thrusters held pointing steady while keeping the backup reaction wheel in reserve.' };
      }
      return optionId === 'thrusters'
        ? { effect: { days: 0, cost: 8 }, outcome: 'Thruster pointing kept the instruments steady, at a cost.' }
        : { effect: { days: 0, pointing: 0.7 }, outcome: 'Without the wheel, images blur and science drops by 30%.' };
    },
  },
  {
    id: 'ground_outage',
    title: 'Ground station outage',
    window: 'operations',
    chance: { cadet: 0.3, engineer: 0.4, director: 0.5 },
    applies: () => true,
    describe: () => 'A storm on Earth knocks out the ground station. No data can come home for several days.',
    options: () => [
      { id: 'store', label: 'Keep observing and store the data', description: 'If the onboard memory fills up, the newest data is lost.', championedBy: 'science' },
      { id: 'pause', label: 'Pause the instruments', description: 'Nothing is lost, but nothing new is collected until the station is back.', championedBy: 'comms' },
    ],
    resolve: (ctx, optionId) =>
      optionId === 'pause'
        ? { effect: { days: 5, downlinkOff: true, instrumentsOff: true }, outcome: 'The instruments rested until the station came back.' }
        : {
            effect: { days: 5, downlinkOff: true },
            outcome: `The data piled up in the ${ctx.summary.resolved.computer?.storageGb ?? 0} Gb onboard memory until contact returned.`,
          },
  },
  {
    id: 'conjunction',
    title: 'Solar conjunction',
    window: 'operations',
    chance: { cadet: 0.4, engineer: 0.6, director: 0.8 },
    applies: (ctx) => ctx.mission.env.earthDistanceAU > 1.5,
    describe: () => 'The Sun passes between Earth and the spacecraft. Its radio noise blocks all contact for up to two weeks.',
    options: (ctx) => [
      {
        id: 'preprogram',
        label: 'Pre-program the observations',
        description: ctx.summary.resolved.computer?.autonomy
          ? 'Your autonomous computer can run the plan alone.'
          : 'Risky: your computer needs ground control to handle problems.',
        championedBy: 'science',
      },
      { id: 'hold', label: 'Hold position and wait', description: 'Safe, but no observations until contact returns.', championedBy: 'engineer' },
    ],
    resolve: (ctx, optionId) => {
      if (optionId === 'hold') {
        return { effect: { days: 14, downlinkOff: true, instrumentsOff: true }, outcome: 'The spacecraft waited quietly behind the Sun.' };
      }
      return ctx.summary.resolved.computer?.autonomy
        ? { effect: { days: 14, downlinkOff: true }, outcome: 'The autonomous computer ran the plan perfectly. The data came home after the blackout.' }
        : {
            effect: { days: 14, downlinkOff: true, instrumentsOff: true, computerOffline: true },
            outcome: 'Without autonomy, the computer hit a problem nobody could fix in time and sat in safe mode for the whole blackout.',
          };
    },
  },
  {
    id: 'radiation_upset',
    title: 'Radiation upset',
    window: 'operations',
    chance: { cadet: 0.3, engineer: 0.5, director: 0.7 },
    applies: (ctx) => ctx.mission.env.operationsElectronicsDose >= 1 || ctx.mission.trajectory.tags.includes('jupiter-assist'),
    describe: () => "A high-energy particle flips a bit in the flight computer's memory.",
    options: () => [
      { id: 'reboot', label: 'Reboot now', description: 'Two days offline while the computer restarts.', championedBy: 'engineer' },
      { id: 'wait', label: 'Wait for the next ground pass', description: 'Keep going and hope the error is harmless.', championedBy: 'science' },
    ],
    resolve: (ctx, optionId) => {
      const hardened = (ctx.summary.resolved.computer?.radToleranceKrad ?? 0) >= 1000;
      if (hardened) return { effect: { days: 0 }, outcome: 'The radiation-hardened computer corrected the error by itself.' };
      return optionId === 'reboot'
        ? { effect: { days: 2, instrumentsOff: true, computerOffline: true }, outcome: 'Two days offline, then back to normal.' }
        : { effect: { days: 0, scienceFactor: 0.9 }, outcome: 'The error corrupted part of the stored data: 10% of future science is lost.' };
    },
  },
  {
    id: 'crew_illness',
    title: 'Crew health warning',
    window: 'cruise',
    chance: { cadet: 0.2, engineer: 0.35, director: 0.5 },
    applies: (ctx) => ctx.mission.pathway.crewed && ctx.mission.env.cruiseDays >= 100,
    describe: () => 'Medical checks show an astronaut losing bone density faster than expected.',
    options: () => [
      { id: 'rest', label: 'More exercise, less work', description: 'The crew spends more time exercising: science drops 5%.', championedBy: 'commander' },
      { id: 'medkit', label: 'Medical kit & spin-gravity protocol', description: 'Deploy medical countermeasures ($2M support). Best when paired with a spin habitat.', championedBy: 'engineer' },
      { id: 'continue', label: 'Keep the schedule', description: 'No science lost, but crew health drops by 8 points.', championedBy: 'science' },
    ],
    resolve: (ctx, optionId) => {
      if (optionId === 'rest') {
        return { effect: { days: 0, scienceFactor: 0.95 }, outcome: 'Extra exercise slowed the bone loss.' };
      }
      if (optionId === 'medkit') {
        const hasSpin = ctx.summary.resolved.habitat?.kind === 'spin' && ctx.summary.spinRpm > 0;
        return hasSpin
          ? { effect: { days: 0, cost: 2, crewHealth: 4 }, outcome: 'Combined spin-habitat artificial gravity and medical countermeasures restored crew bone density.' }
          : { effect: { days: 0, cost: 2, crewHealth: -2 }, outcome: 'Medical countermeasures helped, though without a spin habitat some bone loss continued.' };
      }
      return { effect: { days: 0, crewHealth: -8 }, outcome: 'The crew kept working, and their health suffered.' };
    },
  },
  {
    id: 'bonus_discovery',
    title: 'Bonus discovery',
    window: 'operations',
    chance: { cadet: 0.4, engineer: 0.35, director: 0.3 },
    applies: (ctx) => ctx.summary.sciencePotential >= ctx.mission.pathway.scienceTarget * 1.2,
    describe: () => 'Your instruments spotted something unexpected. Scientists want more observations.',
    options: (ctx) => [
      {
        id: 'extend',
        label: 'Extend the mission',
        description: `20% more days of operations. Costs about $${Math.round((ctx.mission.env.operationsCostPerYear * ctx.mission.env.operationsDays * 0.2) / 365.25 + 5)}M and wears the parts.`,
        championedBy: 'science',
      },
      { id: 'end', label: 'Finish as planned', description: 'No extra cost.', championedBy: 'comms' },
    ],
    resolve: (ctx, optionId) =>
      optionId === 'extend'
        ? {
            effect: {
              days: 0,
              extendDays: Math.round(ctx.mission.env.operationsDays * 0.2),
              cost: (ctx.mission.env.operationsCostPerYear * ctx.mission.env.operationsDays * 0.2) / 365.25 + 5,
              scienceFactor: 1.05,
            },
            outcome: 'The extended mission followed up the discovery.',
          }
        : { effect: { days: 0 }, outcome: 'The mission ended on schedule. The discovery waits for a future mission.' },
  },
  {
    id: 'launch_weather',
    title: 'Weather at the launch site',
    window: 'launch',
    chance: { cadet: 0.3, engineer: 0.4, director: 0.6 },
    applies: () => true,
    describe: () => 'High winds over the launch pad. The launch director asks: go or wait?',
    options: () => [
      { id: 'wait', label: 'Wait a day', description: 'Costs $3M to keep the team and rocket ready.', championedBy: 'engineer' },
      { id: 'launch', label: 'Launch anyway', description: 'Free, but strong winds shake the rocket harder.', championedBy: 'comms' },
    ],
    resolve: (ctx, optionId) => {
      if (optionId === 'wait') return { effect: { days: 0, cost: 3 }, outcome: 'One day later the skies were clear.' };
      const strong = (ctx.summary.resolved.bus?.maxG ?? 0) >= 6;
      return strong
        ? { effect: { days: 0 }, outcome: 'The strong structure shrugged off the buffeting.' }
        : { effect: { days: 0, panelHealth: 0.9 }, outcome: 'The buffeting damaged a solar array hinge: 10% less power.' };
    },
  },
];

/** Scripted Negotiation Dilemmas (N6) where roles have competing priorities and a countdown timer. */
export const NEGOTIATION_EVENTS: readonly NegotiationDef[] = [
  {
    id: 'neg_budget_cut',
    title: 'Agency Reserve Squeeze (−10% Contingency)',
    window: 'cruise',
    chance: { cadet: 0, engineer: 0, director: 0 },
    timerSeconds: 45,
    commanderDefaultOptionId: 'balanced_trim',
    roleStances: {
      science: { optionId: 'protect_science', stance: 'Keep full instrument calibration (+5% science, costs $4M reserve).' },
      engineer: { optionId: 'protect_margins', stance: 'Prioritise power & structural margins (+3% panel health, −4% science).' },
      comms: { optionId: 'trim_dsn', stance: 'Compress ground-station passes (saves $6M, slightly lower pointing).' },
      commander: { optionId: 'balanced_trim', stance: 'Share a 3% trim across all desks to keep the team aligned.' },
    },
    applies: () => true,
    describe: () =>
      'OEA headquarters requests an immediate operations reserve reallocation. Each mission desk has a competing priority for what to protect.',
    options: () => [
      {
        id: 'protect_science',
        label: 'Protect Science Calibration (Science Lead)',
        description: 'Boost instrument calibration (+5% science return), adding $4M to operations cost.',
        championedBy: 'science',
      },
      {
        id: 'protect_margins',
        label: 'Protect Engineering Margins (Flight Engineer)',
        description: 'Dedicate crew & ground hours to array conditioning (+3% panel health, −4% science time).',
        championedBy: 'engineer',
      },
      {
        id: 'trim_dsn',
        label: 'Compress DSN Passes (Comms & Resources)',
        description: 'Cut ground-station dish leases to save $6M immediately (−4% pointing calibration).',
        championedBy: 'comms',
      },
      {
        id: 'balanced_trim',
        label: 'Balanced Desk Compromise (Commander)',
        description: 'Share a modest $2M savings across all desks with no subsystem penalty.',
        championedBy: 'commander',
      },
    ],
    resolve: (_ctx, optionId) => {
      switch (optionId) {
        case 'protect_science':
          return {
            effect: { days: 0, scienceFactor: 1.05, cost: 4 },
            outcome: 'Science calibration was protected (+5% science return) at the cost of $4M from contingency reserves.',
          };
        case 'protect_margins':
          return {
            effect: { days: 0, panelHealth: 1.03, scienceFactor: 0.96 },
            outcome: 'Engineering margins were reinforced (+3% array health), trading away 4% of observation time.',
          };
        case 'trim_dsn':
          return {
            effect: { days: 0, cost: -6, pointing: 0.96 },
            outcome: 'Compressed DSN passes saved $6M in operations budget with a minor 4% pointing trim.',
          };
        default:
          return {
            effect: { days: 0, cost: -2 },
            outcome: 'The crew agreed on a balanced cross-desk trim, saving $2M while keeping all subsystems nominal.',
          };
      }
    },
  },
  {
    id: 'neg_bonus_target',
    title: 'Transient Phenomenon Priority Clash',
    window: 'operations',
    chance: { cadet: 0, engineer: 0, director: 0 },
    timerSeconds: 45,
    commanderDefaultOptionId: 'split_window',
    roleStances: {
      science: { optionId: 'slew_all_in', stance: 'Slew immediately for full-cadence observations (+10% science).' },
      engineer: { optionId: 'hold_nominal', stance: 'Keep solar arrays locked on the Sun to protect battery & thermal health.' },
      comms: { optionId: 'priority_downlink', stance: 'Flush onboard memory over a priority DSN pass ($2M) before slewing.' },
      commander: { optionId: 'split_window', stance: 'Run a 2-hour target-of-opportunity scan (+5% science) within safe margins.' },
    },
    applies: () => true,
    describe: () =>
      'Sensors detect a short-lived transient plume! Science wants an immediate off-Sun slew, Engineer warns about array angle, and Comms worries about buffer overflow.',
    options: () => [
      {
        id: 'slew_all_in',
        label: 'Aggressive Off-Sun Slew (Science Lead)',
        description: '+10% science return, but array wear trims panel health by 4%.',
        championedBy: 'science',
      },
      {
        id: 'hold_nominal',
        label: 'Hold Sun-Pointed Attitude (Flight Engineer)',
        description: 'Zero power or thermal risk, no extra science.',
        championedBy: 'engineer',
      },
      {
        id: 'priority_downlink',
        label: 'Priority DSN Downlink First (Comms & Resources)',
        description: 'Costs $2M for an emergency dish pass, capturing +4% science safely.',
        championedBy: 'comms',
      },
      {
        id: 'split_window',
        label: 'Timed 2-Hour Window (Commander)',
        description: 'Balanced scan that adds +5% science without exceeding battery limits.',
        championedBy: 'commander',
      },
    ],
    resolve: (_ctx, optionId) => {
      switch (optionId) {
        case 'slew_all_in':
          return {
            effect: { days: 0, scienceFactor: 1.1, panelHealth: 0.96 },
            outcome: 'The aggressive slew captured the full transient plume (+10% science) with 4% thermal cycling wear.',
          };
        case 'hold_nominal':
          return {
            effect: { days: 0 },
            outcome: 'The spacecraft held its nominal Sun-pointed attitude, keeping power margins untouched.',
          };
        case 'priority_downlink':
          return {
            effect: { days: 0, cost: 2, scienceFactor: 1.04 },
            outcome: 'An emergency DSN pass cleared the buffer and captured the tail of the event (+4% science).',
          };
        default:
          return {
            effect: { days: 0, scienceFactor: 1.05 },
            outcome: 'The 2-hour split window captured key spectra (+5% science) while preserving battery reserves.',
          };
      }
    },
  },
  {
    id: 'neg_bandwidth_clash',
    title: 'Deep-Space Telemetry Bandwidth Allocation',
    window: 'operations',
    chance: { cadet: 0, engineer: 0, director: 0 },
    timerSeconds: 45,
    commanderDefaultOptionId: 'compressed_burst',
    roleStances: {
      science: { optionId: 'raw_science_stream', stance: 'Allocate 80% of downlink to uncompressed instrument frames (+7% science).' },
      engineer: { optionId: 'engineering_telemetry', stance: 'Prioritise high-rate ADCS & thermal diagnostics (+5% pointing).' },
      comms: { optionId: 'compressed_burst', stance: 'Enable lossless onboard compression for balanced throughput ($0M).' },
      commander: { optionId: 'compressed_burst', stance: 'Use lossless packet compression so both Science and Engineering get their data.' },
    },
    applies: () => true,
    describe: () =>
      'Downlink contact hours are tight this week. Science and Flight Engineering both want priority on the high-gain dish.',
    options: () => [
      {
        id: 'raw_science_stream',
        label: '80% Raw Science Stream (Science Lead)',
        description: '+7% science value, but coarser engineering telemetry (−3% pointing).',
        championedBy: 'science',
      },
      {
        id: 'engineering_telemetry',
        label: 'Continuous Engineering Diagnostics (Flight Engineer)',
        description: '+5% pointing stability, −2% science frame allocation.',
        championedBy: 'engineer',
      },
      {
        id: 'compressed_burst',
        label: 'Lossless Packet Compression (Comms / Commander)',
        description: '+3% science and +2% pointing with no extra cost.',
        championedBy: 'comms',
      },
    ],
    resolve: (_ctx, optionId) => {
      switch (optionId) {
        case 'raw_science_stream':
          return {
            effect: { days: 0, scienceFactor: 1.07, pointing: 0.97 },
            outcome: 'Raw science frames dominated the downlink (+7% science), with slightly coarser attitude calibration.',
          };
        case 'engineering_telemetry':
          return {
            effect: { days: 0, pointing: 1.05, scienceFactor: 0.98 },
            outcome: 'Continuous diagnostic streams sharpened pointing (+5%) at a 2% science bandwidth trade-off.',
          };
        default:
          return {
            effect: { days: 0, scienceFactor: 1.03, pointing: 1.02 },
            outcome: 'Lossless packet compression delivered both science frames and engineering diagnostics cleanly.',
          };
      }
    },
  },
];

export function getEvent(id: string): EventDef {
  const found = EVENTS.find((event) => event.id === id) ?? NEGOTIATION_EVENTS.find((event) => event.id === id);
  if (!found) throw new Error(`Unknown event "${id}"`);
  return found;
}

export function getNegotiationEvent(id: string): NegotiationDef | undefined {
  return NEGOTIATION_EVENTS.find((event) => event.id === id);
}

/** Evaluates how the player's built spacecraft design mitigates (or is vulnerable to) an event. */
export function evaluateEventMitigations(eventId: string, ctx: EventContext): EventMitigationStatus[] {
  const r = ctx.summary.resolved;
  switch (eventId) {
    case 'solar_storm': {
      const powerMargin = ctx.summary.powerAvailable - ctx.summary.powerLoad;
      const isRtg = r.power?.source === 'rtg';
      const hasVault = (r.radiation?.electronicsAttenuation ?? 0) >= 0.5;
      const hasStormShelter = (r.radiation?.stormAttenuation ?? 0) >= 0.5;
      const items: EventMitigationStatus[] = [
        {
          label: isRtg ? 'RTG Power Source' : '30% Solar Storm Margin',
          mitigated: isRtg || ctx.solarNow * 0.7 >= ctx.fullLoad,
          detail: isRtg
            ? 'RTG output is unaffected by solar flares.'
            : ctx.solarNow * 0.7 >= ctx.fullLoad
              ? `70% array output (${w(ctx.solarNow * 0.7)}) still covers full load (${w(ctx.fullLoad)}).`
              : `70% array output (${w(ctx.solarNow * 0.7)}) falls short of full load (${w(ctx.fullLoad)}; margin ${w(powerMargin)}).`,
        },
        {
          label: 'Electronics Radiation Shielding',
          mitigated: hasVault,
          detail: r.radiation
            ? `${r.radiation.name} blocks ${Math.round(r.radiation.electronicsAttenuation * 100)}% of electronics dose.`
            : 'No radiation shield equipped.',
        },
      ];
      if (ctx.mission.pathway.crewed) {
        items.push({
          label: 'Crew Storm Shelter',
          mitigated: hasStormShelter,
          detail: r.radiation
            ? `${r.radiation.name} blocks ${Math.round(r.radiation.stormAttenuation * 100)}% of solar storm crew dose.`
            : 'No storm shelter shielding fitted.',
        });
      }
      return items;
    }
    case 'micrometeoroid': {
      const marginPct = ctx.summary.powerLoad > 0 ? ((ctx.summary.powerAvailable - ctx.summary.powerLoad) / ctx.summary.powerLoad) * 100 : 0;
      return [
        {
          label: 'Solar Power Margin (≥ 20%)',
          mitigated: marginPct >= 20,
          detail: `Current power margin is ${Math.round(marginPct)}% (${w(ctx.summary.powerAvailable)} vs ${w(ctx.summary.powerLoad)} load).`,
        },
      ];
    }
    case 'wheel_failure': {
      const redundant = Boolean(r.adcs?.redundant);
      return [
        {
          label: 'Redundant Reaction Wheels',
          mitigated: redundant,
          detail: redundant
            ? `${r.adcs?.name} carries a spare wheel — zero science loss!`
            : `${r.adcs?.name ?? 'ADCS'} has no spare wheel; requires $8M thruster pointing or 30% science loss.`,
        },
      ];
    }
    case 'ground_outage': {
      const storage = r.computer?.storageGb ?? 0;
      const needed = ctx.summary.dataPerDay * 5;
      return [
        {
          label: '5-Day Onboard Data Buffer',
          mitigated: storage >= needed,
          detail: `${r.computer?.name ?? 'Computer'} stores ${storage} Gb vs ${needed.toFixed(1)} Gb generated over 5 days.`,
        },
      ];
    }
    case 'conjunction': {
      const auto = Boolean(r.computer?.autonomy);
      return [
        {
          label: 'Autonomous Flight Computer',
          mitigated: auto,
          detail: auto
            ? `${r.computer?.name} has onboard autonomy and can observe through the 14-day blackout.`
            : `${r.computer?.name ?? 'Computer'} lacks autonomy; pre-programming risks safe-mode lockup.`,
        },
      ];
    }
    case 'radiation_upset': {
      const tol = r.computer?.radToleranceKrad ?? 0;
      const vault = (r.radiation?.electronicsAttenuation ?? 0) >= 0.5;
      return [
        {
          label: 'Radiation-Hardened Computer or Vault',
          mitigated: tol >= 1000 || vault,
          detail:
            tol >= 1000
              ? `${r.computer?.name} is rated for ${tol} krad (auto-scrubs bit flips).`
              : vault
                ? `${r.radiation?.name} attenuates ${Math.round((r.radiation?.electronicsAttenuation ?? 0) * 100)}% of electronics dose.`
                : `${r.computer?.name ?? 'Computer'} (${tol} krad) has no radiation vault protection.`,
        },
      ];
    }
    case 'crew_illness': {
      const hasSpin = r.habitat?.kind === 'spin' && ctx.summary.spinRpm > 0;
      return [
        {
          label: 'Spin Habitat Countermeasure',
          mitigated: hasSpin,
          detail: hasSpin
            ? `${r.habitat?.name} spinning at ${ctx.summary.spinRpm.toFixed(1)} RPM provides artificial gravity.`
            : `${r.habitat?.name ?? 'No spin habitat'} — crew relies on resistance exercise.`,
        },
      ];
    }
    case 'bonus_discovery': {
      const budgetLeft = ctx.mission.budget - ctx.summary.totalCost;
      return [
        {
          label: 'Contingency Budget Reserve',
          mitigated: budgetLeft >= 10,
          detail: `$${Math.round(budgetLeft)}M budget margin remaining for extended operations.`,
        },
      ];
    }
    case 'launch_weather': {
      const maxG = r.bus?.maxG ?? 0;
      return [
        {
          label: 'High-G Structural Bus (≥ 6 g)',
          mitigated: maxG >= 6,
          detail: `${r.bus?.name ?? 'Bus'} is rated for ${maxG} g (${maxG >= 6 ? 'shrugs off wind buffeting' : 'vulnerable to wind shear'}).`,
        },
      ];
    }
    default: {
      const cat = getEventCatalogueEntry(eventId);
      return (cat?.mitigatedBy ?? ['System margins']).map((label) => ({
        label,
        mitigated: ctx.summary.powerAvailable >= ctx.summary.powerLoad && ctx.summary.totalCost <= ctx.mission.budget,
        detail: `Power ${w(ctx.summary.powerAvailable)}/${w(ctx.summary.powerLoad)} · Budget $${Math.round(ctx.summary.totalCost)}M/$${ctx.mission.budget}M.`,
      }));
    }
  }
}

/** Returns NPC engineer advisor opinions for an event, filtered to options available in the current context. */
export function advisorsForEvent(eventId: string, ctx: EventContext): AdvisorOpinion[] {
  const event = getEvent(eventId);
  const options = event.options(ctx);
  const raw = ADVISOR_CATALOGUE[eventId] ?? [];
  const results: AdvisorOpinion[] = [];

  for (const item of raw) {
    const opt = options.find((o) => o.id === item.recommendedOptionId) ?? options[0];
    if (!opt) continue;
    const speakerInfo = SPEAKERS[item.speaker];
    results.push({
      speaker: item.speaker,
      speakerName: speakerInfo.name,
      speakerTitle: speakerInfo.title,
      colour: speakerInfo.colour,
      initials: speakerInfo.initials,
      recommendedOptionId: opt.id,
      recommendedOptionLabel: opt.label,
      quote: item.quote,
    });
  }
  return results;
}
