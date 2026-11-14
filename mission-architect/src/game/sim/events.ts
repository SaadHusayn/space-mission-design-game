/**
 * Random mission events. Each event offers choices that are trade-offs, and
 * the outcome depends on how the spacecraft was designed.
 */
import type { Difficulty, MissionContext } from '../types';
import type { DesignSummary } from './design';

export type EventWindow = 'launch' | 'cruise' | 'operations';

export interface EventOption {
  id: string;
  label: string;
  /** What this choice does, shown before deciding. */
  description: string;
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
    options: (ctx) => [
      {
        id: 'safe_mode',
        label: ctx.mission.pathway.crewed ? 'Safe mode: crew to the shelter' : 'Safe mode',
        description: 'Switch off the instruments until the storm passes to protect the spacecraft. You lose those days of science.',
      },
      {
        id: 'keep_operating',
        label: 'Keep observing',
        description: 'Keep the instruments running. More science, but more radiation, and the power may not last.',
      },
    ],
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
      { id: 'reroute', label: 'Reroute the wiring', description: 'Engineers find a workaround. Costs $5M, recovers half the loss.' },
      { id: 'accept', label: 'Accept the damage', description: 'Free, but you keep 20% less solar power for the rest of the mission.' },
    ],
    resolve: (_ctx, optionId) =>
      optionId === 'reroute'
        ? { effect: { days: 0, panelHealth: 0.9, cost: 5 }, outcome: 'The rerouted circuits recovered half the lost power.' }
        : { effect: { days: 0, panelHealth: 0.8 }, outcome: 'The array now makes 20% less power. Your power margin decides whether that matters.' },
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
        ? [{ id: 'spare', label: 'Switch to the spare wheel', description: 'No loss.' }]
        : [
            { id: 'thrusters', label: 'Point with thrusters', description: 'Use small thrusters to hold steady. Costs $8M of extra operations work; pointing stays good.' },
            { id: 'accept', label: 'Accept blurrier data', description: 'Free, but science from now on drops by 30%.' },
          ],
    resolve: (ctx, optionId) => {
      if (ctx.summary.resolved.adcs?.redundant || optionId === 'spare') {
        return { effect: { days: 0 }, outcome: 'The spare wheel spun up. Paying for a redundant system just saved the mission.' };
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
      { id: 'store', label: 'Keep observing and store the data', description: 'If the onboard memory fills up, the newest data is lost.' },
      { id: 'pause', label: 'Pause the instruments', description: 'Nothing is lost, but nothing new is collected until the station is back.' },
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
      },
      { id: 'hold', label: 'Hold position and wait', description: 'Safe, but no observations until contact returns.' },
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
    describe: () => 'A high-energy particle flips a bit in the flight computer\'s memory.',
    options: () => [
      { id: 'reboot', label: 'Reboot now', description: 'Two days offline while the computer restarts.' },
      { id: 'wait', label: 'Wait for the next ground pass', description: 'Keep going and hope the error is harmless.' },
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
      { id: 'rest', label: 'More exercise, less work', description: 'The crew spends more time exercising: science drops 5%.' },
      { id: 'continue', label: 'Keep the schedule', description: 'No science lost, but crew health drops by 8 points.' },
    ],
    resolve: (_ctx, optionId) =>
      optionId === 'rest'
        ? { effect: { days: 0, scienceFactor: 0.95 }, outcome: 'Extra exercise slowed the bone loss.' }
        : { effect: { days: 0, crewHealth: -8 }, outcome: 'The crew kept working, and their health suffered.' },
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
      },
      { id: 'end', label: 'Finish as planned', description: 'No extra cost.' },
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
      { id: 'wait', label: 'Wait a day', description: 'Costs $3M to keep the team and rocket ready.' },
      { id: 'launch', label: 'Launch anyway', description: 'Free, but strong winds shake the rocket harder.' },
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

export function getEvent(id: string): EventDef {
  const found = EVENTS.find((event) => event.id === id);
  if (!found) throw new Error(`Unknown event "${id}"`);
  return found;
}
