/**
 * "Why did the mission end this way?" Plain-language bullets, each tied to a
 * decision the player made and the physics behind it.
 */
import { DAYS_PER_YEAR, sunlightFraction } from '../physics';
import { fmt, gbPerDay, kg, money, watts } from './format';
import type { JourneyState } from './journey';
import type { MissionScore } from './scoring';
import { WINNING_DESIGNS } from './fixtures/designs';

export interface WhyBullet {
  tone: 'good' | 'bad' | 'info';
  /** The player decision this bullet is about (for highlighting the part in 3D). */
  decision: string;
  text: string;
  /** Higher = more important. Used to pick the top bullets. */
  impact: number;
}

export function explainMission(state: JourneyState, score: MissionScore, limit = 5): WhyBullet[] {
  const { mission, vehicle } = state.input;
  const { env, pathway, trajectory } = mission;
  const s = score.summary;
  const r = s.resolved;
  const bullets: WhyBullet[] = [];
  const add = (tone: WhyBullet['tone'], decision: string, impact: number, text: string) =>
    bullets.push({ tone, decision, impact, text });

  // How it ended.
  const lastFail = [...state.checkpoints].reverse().find((item) => item.status === 'fail');
  switch (state.endReason) {
    case 'launch_failure':
      add('bad', 'launchVehicle', 100, `Launch: ${lastFail?.detail ?? 'the rocket could not do the job.'}`);
      break;
    case 'insertion_failure':
      add('bad', 'propulsion', 100, `${lastFail?.detail ?? ''} Every extra kilogram needs more propellant: the rocket equation is unforgiving.`);
      break;
    case 'power_failure':
      add('bad', 'power', 100, `${lastFail?.detail ?? ''} At ${fmt(env.sunDistanceAU, 1)} AU sunlight is only ${fmt(sunlightFraction(env.sunDistanceAU) * 100, 1)}% as strong as at Earth.`);
      break;
    case 'radiation':
      add('bad', 'radiation', 100, `${lastFail?.detail ?? ''} Shielding or a radiation-hardened computer would have saved it.`);
      break;
    case 'lifetime':
      add('bad', 'computer', 90, `${lastFail?.detail ?? ''} The mission lasted ${fmt(s.years, 1)} years, so every part had to last that long.`);
      break;
    case 'supplies':
      add('bad', 'lifeSupport', 100, `${lastFail?.detail ?? ''} The crew needed supplies for ${fmt(s.days)} days.`);
      break;
    case 'reentry_failure':
      add('bad', 'heatShield', 100, lastFail?.detail ?? 'The heat shield failed on re-entry.');
      break;
    default:
      break;
  }

  // Science and instruments.
  const best = [...s.instrumentScores].filter((item) => item.fitted).sort((a, b) => b.potential - a.potential)[0];
  if (best) {
    const share = s.sciencePotential > 0 ? best.potential / s.sciencePotential : 0;
    const extras: string[] = [];
    if (best.cooled) extras.push('the sunshield kept it cold (+30%)');
    if (!best.pointingOk) extras.push('but the pointing was too shaky, which blurred its data (−60%)');
    add(
      state.science >= pathway.scienceTarget ? 'good' : 'info',
      'instruments',
      40 + share * 20,
      `Your ${best.instrument.name} produced ${fmt(share * 100)}% of the science${extras.length ? `; ${extras.join(', ')}` : ''}.`,
    );
  }

  // Data and communications.
  if (state.dataGeneratedGb > 0) {
    const delivered = state.dataSentGb / state.dataGeneratedGb;
    if (delivered < 0.95) {
      add(
        'bad',
        'comms',
        70,
        `Only ${fmt(delivered * 100)}% of your data reached Earth. At ${fmt(env.earthDistanceAU, env.earthDistanceAU < 0.1 ? 3 : 1)} AU the ${r.comms?.name ?? 'radio'} could send about ${gbPerDay(s.downlinkPerDay)}, against ${gbPerDay(s.dataPerDay)} collected: radio signals fade with the square of the distance.`,
      );
    } else if (env.earthDistanceAU > 1) {
      add('good', 'comms', 35, `The ${r.comms?.name} got ${fmt(delivered * 100)}% of your data home from ${fmt(env.earthDistanceAU, 1)} AU away.`);
    }
  }

  // Power.
  if (state.powerLimitedDays > 0) {
    add(
      'bad',
      'power',
      65,
      `For ${fmt(state.powerLimitedDays)} days there wasn't enough power to run the instruments (load ${watts(s.powerLoad)}, ${r.power?.source === 'rtg' ? 'RTG' : 'arrays'} about ${watts(s.powerAvailable)}).`,
    );
  } else if (r.power && env.sunDistanceAU > 2) {
    add(
      'good',
      'power',
      45,
      r.power.source === 'rtg'
        ? `The RTG kept working where sunlight is ${fmt(sunlightFraction(env.sunDistanceAU) * 100, env.sunDistanceAU > 50 ? 4 : 1)}% of Earth's, still making ${watts(s.powerAvailable)} at the end.`
        : `At ${fmt(env.sunDistanceAU, 1)} AU your ${r.power.name} made only about ${watts(s.powerAvailable)}, but that was enough for the ${watts(s.powerLoad)} load.`,
    );
  }

  // Trajectory.
  add('info', 'trajectory', 30, `You chose the ${trajectory.name.toLowerCase()}: ${trajectory.pros[0].toLowerCase()}, but ${trajectory.cons[0].toLowerCase()}.`);

  // Rocket.
  if (s.launchCapacity !== null) {
    const used = s.wetMass / s.launchCapacity;
    if (used < 0.5 && vehicle.cost > 50) {
      add('info', 'launchVehicle', 38, `The ${vehicle.name} could carry ${kg(s.launchCapacity)} but you only needed ${kg(s.wetMass)}. A smaller rocket might have saved money.`);
    } else if (used >= 0.9) {
      add('good', 'launchVehicle', 36, `The ${vehicle.name} carried ${kg(s.wetMass)} of its ${kg(s.launchCapacity)} limit: a tight, efficient choice.`);
    }
  }

  // Budget.
  const left = mission.budget - score.totalCost;
  add(
    left >= 0 ? 'good' : 'bad',
    'budget',
    left >= 0 ? 25 : 80,
    left >= 0
      ? `You finished ${money(left)} under budget.`
      : `The mission cost ${money(-left)} more than the ${money(mission.budget)} budget.`,
  );

  // Crew.
  if (pathway.crewed && state.crewHealth !== null) {
    const protection = r.habitat
      ? r.habitat.kind === 'spin'
        ? `the ${fmt(spinArm(state))} m spin arm turning at ${fmt(s.spinRpm, 1)} rpm`
        : 'daily exercise'
      : 'nothing to protect them';
    add(
      state.crewHealth >= 80 ? 'good' : 'bad',
      'habitat',
      state.crewHealth >= 80 ? 45 : 75,
      `After ${fmt(state.day)} days with ${protection}, crew health ended at ${fmt(state.crewHealth)}/100.`,
    );
    if (state.crewDose > 0.8 * 1000) {
      add('bad', 'radiation', 60, `The crew absorbed ${fmt(state.crewDose)} mSv, close to the 1,000 mSv limit. Shielding or a faster trajectory would cut it.`);
    }
  }

  // Events.
  for (const event of state.events) {
    const good = /saved|protected|perfectly|shrugged|still made|corrected|recovered|followed up|clear/i.test(event.outcome);
    add(good ? 'good' : 'bad', `event:${event.eventId}`, good ? 50 : 55, `${event.title} (day ${fmt(event.day)}): you chose "${event.optionLabel}". ${event.outcome}`);
  }

  // Another way to win (there is rarely one perfect design).
  const alternatives = WINNING_DESIGNS.filter((item) => item.pathway === pathway.id && item.trajectory !== trajectory.id);
  if (alternatives[0]) {
    add('info', 'alternative', 20, `Another way to win: ${alternatives[0].name.split(': ')[1] ?? alternatives[0].name}.`);
  }

  const years = state.day / DAYS_PER_YEAR;
  if (years >= 10 && state.endReason === 'complete') {
    add('good', 'computer', 30, `Every part survived ${fmt(years, 1)} years in deep space.`);
  }

  return bullets.sort((a, b) => b.impact - a.impact).slice(0, limit);
}

function spinArm(state: JourneyState): number {
  return state.input.design.options.spinArmLength;
}
