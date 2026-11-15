/**
 * "Why did the mission end this way?" Plain-language bullets, each tied to a
 * decision the player made and the physics behind it.
 */
import { getLaunchVehicle, getPathway } from '../data/loadData';
import { DAYS_PER_YEAR, sunlightFraction } from '../physics';
import type { DecisionLogEntry, Design, PathwayId, SlotId } from '../types';
import { fmt, gbPerDay, kg, money, watts } from './format';
import type { JourneyState } from './journey';
import type { MissionScore } from './scoring';
import { WINNING_DESIGNS } from './fixtures/designs';

export type WhyTargetSlot = SlotId | 'bus' | 'instruments' | null;

export interface WhyBullet {
  tone: 'good' | 'bad' | 'info';
  /** The player decision this bullet is about (for highlighting the part in 3D). */
  decision: string;
  /** Optional 3D spacecraft target slot corresponding to this decision. */
  targetSlot?: WhyTargetSlot;
  text: string;
  /** Higher = more important. Used to pick the top bullets. */
  impact: number;
}

export interface ExplainMissionOptions {
  decisionLog?: readonly DecisionLogEntry[];
  flybyRadii?: number | null;
}

export function decisionToTargetSlot(decision: string): WhyTargetSlot {
  if (decision === 'bus' || decision === 'budget' || decision === 'launchVehicle') return 'bus';
  if (decision === 'instruments') return 'instruments';
  if (
    decision === 'power' ||
    decision === 'battery' ||
    decision === 'computer' ||
    decision === 'adcs' ||
    decision === 'comms' ||
    decision === 'propulsion' ||
    decision === 'radiation' ||
    decision === 'thermal' ||
    decision === 'lifeSupport' ||
    decision === 'habitat' ||
    decision === 'heatShield'
  ) {
    return decision;
  }
  if (decision.startsWith('event:')) {
    const evId = decision.slice('event:'.length);
    if (evId === 'solar_storm' || evId === 'radiation_belt') return 'radiation';
    if (evId === 'micrometeoroid') return 'bus';
    if (evId === 'comms_blackout' || evId === 'neg_bandwidth_clash') return 'comms';
    if (evId === 'fuel_valve_leak' || evId === 'thruster_underburn') return 'propulsion';
    if (evId === 'wheel_failure') return 'adcs';
    if (evId === 'battery_cell_fault') return 'battery';
    if (evId === 'crew_illness') return 'lifeSupport';
    if (evId === 'neg_bonus_target') return 'instruments';
  }
  return null;
}

export function explainMission(
  state: JourneyState,
  score: MissionScore,
  limit = 5,
  options: ExplainMissionOptions = {},
): WhyBullet[] {
  const { mission, vehicle } = state.input;
  const { env, pathway, trajectory } = mission;
  const s = score.summary;
  const r = s.resolved;
  const bullets: WhyBullet[] = [];
  const add = (tone: WhyBullet['tone'], decision: string, impact: number, text: string) =>
    bullets.push({ tone, decision, targetSlot: decisionToTargetSlot(decision), impact, text });

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

  // Jupiter flyby trade-off decision (from options.flybyRadii or checkpoint).
  const flybyR = options.flybyRadii ?? null;
  if (flybyR !== null) {
    const shieldName = r.radiation?.name ?? 'no radiation vault';
    if (flybyR === 2) {
      add(
        state.endReason === 'radiation' ? 'bad' : 'info',
        'radiation',
        58,
        `Flying at 2 R_J instead of 20 R_J gained maximum gravity-assist velocity change (+8% science bonus), while exposing electronics to 400 krad before your ${shieldName}.`,
      );
    } else if (flybyR === 5) {
      add(
        'good',
        'radiation',
        48,
        `Flying at 5 R_J balanced a strong gravity-assist bend (+4% science bonus) against 100 krad of radiation absorbed by your ${shieldName}.`,
      );
    } else if (flybyR === 20) {
      add(
        'info',
        'radiation',
        42,
        `Flying a conservative 20 R_J perijove kept radiation exposure down to 10 krad before shielding, trading away extra gravity-assist speed.`,
      );
    }
  }

  // Team voting / decision log highlights (when provided).
  if (options.decisionLog && options.decisionLog.length > 0) {
    const voted = [...options.decisionLog].reverse().find((entry) => entry.voteSummary);
    if (voted?.voteSummary) {
      const vs = voted.voteSummary;
      const mode = vs.consensus
        ? 'by unanimous crew consensus'
        : vs.outcome === 'tie_broken'
          ? 'via Mission Commander tie-break'
          : `by crew ballot (${vs.outcome})`;
      add(
        vs.outcome === 'rejected' ? 'info' : 'good',
        voted.slotId ?? 'bus',
        44,
        `Crew decision on "${vs.proposalTitle}" was resolved ${mode}${voted.proposerCallSign ? ` (proposed by ${voted.proposerCallSign})` : ''}.`,
      );
    }
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

export interface AnotherWayHint {
  fixtureName: string;
  headline: string;
  description: string;
  pathwayId: PathwayId;
  trajectoryId: string;
  trajectoryName: string;
  vehicleId: string;
  vehicleName: string;
  design: Design;
}

/**
 * Suggests an alternate winning architecture from WINNING_DESIGNS for the same
 * pathway (Phase 09 §2.8, R5: multiple valid solutions).
 */
export function anotherWayToWin(pathwayId: PathwayId, currentTrajectoryId?: string | null): AnotherWayHint | null {
  const candidates = WINNING_DESIGNS.filter((item) => item.pathway === pathwayId);
  if (candidates.length === 0) return null;
  const alt = candidates.find((item) => item.trajectory !== currentTrajectoryId) ?? candidates[0];
  const pathway = getPathway(pathwayId);
  const traj = pathway.trajectories.find((t) => t.id === alt.trajectory) ?? pathway.trajectories[0];
  const vehicle = getLaunchVehicle(alt.vehicle);
  const shortTitle = alt.name.split(': ')[1] ?? alt.name;

  return {
    fixtureName: alt.name,
    headline: `Another way to win: ${shortTitle}`,
    description: `Fly the ${traj.name} on ${vehicle.name} with ${alt.design.options.fuelMass.toLocaleString('en-US')} kg of propellant. Different engineering trade-offs, same mission success!`,
    pathwayId,
    trajectoryId: traj.id,
    trajectoryName: traj.name,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    design: structuredClone(alt.design),
  };
}

export interface RealMissionFact {
  id: string;
  name: string;
  subtitle: string;
  years: string;
  destination: string;
  keyPhysics: string;
  parallelToGame: string;
  creditsHref: string;
}

const REAL_MISSIONS: Readonly<Record<PathwayId, readonly RealMissionFact[]>> = {
  leo: [
    {
      id: 'real-iss-landsat',
      name: 'International Space Station & Landsat / Sentinel',
      subtitle: 'Crewed Low Earth Orbit & Multispectral Earth Observation',
      years: '1998–Present',
      destination: 'Low Earth Orbit (400–700 km)',
      keyPhysics: 'Orbital speed v = √(GM/r) ≈ 7.67 km/s; 90-minute orbits with ~35-minute eclipse shadow phases requiring rechargeable batteries.',
      parallelToGame: 'Just like your Chapter 1 mission, LEO spacecraft balance battery capacity across frequent eclipses with high-rate S/X-band downlinks.',
      creditsHref: '/credits',
    },
    {
      id: 'real-gemini-apollo-leo',
      name: 'Gemini & Crew Dragon / Soyuz LEO Test Flights',
      subtitle: 'Crewed Orbital Qualification & Re-Entry',
      years: '1965–Present',
      destination: 'Low Earth Orbit (300–550 km)',
      keyPhysics: 'Atmospheric re-entry at ~7.8 km/s converts orbital kinetic energy into plasma heat absorbed by an ablative heat shield.',
      parallelToGame: 'Your crew capsule and Earth-orbit heat shield mirror real crewed qualification flights before venturing to the Moon.',
      creditsHref: '/credits',
    },
  ],
  moon: [
    {
      id: 'real-artemis-lro',
      name: 'Artemis Program & Lunar Reconnaissance Orbiter (LRO)',
      subtitle: 'Crewed Lunar Return & Polar Ice Radar Mapping',
      years: '2009–Present',
      destination: 'Lunar Polar Orbit',
      keyPhysics: 'Trans-lunar injection requires ~3.1 km/s Δv plus lunar orbit insertion; lunar return hits Earth’s atmosphere at ~11.0 km/s (nearly double LEO heating energy per kg).',
      parallelToGame: 'Your polar radar mapping of permanently shadowed craters and lunar-rated heat shield directly parallel LRO and Orion/Artemis.',
      creditsHref: '/credits',
    },
  ],
  mars: [
    {
      id: 'real-maven-mars',
      name: 'MAVEN & Crewed Mars Transit Architectures',
      subtitle: 'Mars Atmospheric Evolution & Deep-Space Habitat Studies',
      years: '2013–Present',
      destination: 'Mars Orbit (1.52 AU)',
      keyPhysics: 'Hohmann transfer (~259 days each way) vs faster high-energy transfers; solar irradiance at Mars is 1/1.52² ≈ 43% of Earth’s.',
      parallelToGame: 'Your choice between a minimum-energy Hohmann transfer with storm shielding vs a fast nuclear transit with spin artificial gravity reflects real Mars architecture trade studies.',
      creditsHref: '/credits',
    },
  ],
  jupiter: [
    {
      id: 'real-juno',
      name: 'Juno (Jupiter Polar Orbiter)',
      subtitle: 'Solar-Powered Giant Planet Explorer with Titanium Radiation Vault',
      years: '2011–Present',
      destination: 'Jupiter Polar Orbit (5.2 AU)',
      keyPhysics: 'At 5.2 AU sunlight is only 3.7% of Earth’s (1/5.2²). Juno used three massive solar wings plus a 172 kg titanium vault to shield avionics from Jupiter’s deadly radiation belts.',
      parallelToGame: 'Your Chapter 4 trade-off — giant solar wings vs RTG, Ka-band dish, and titanium radiation vault — is modeled directly on Juno’s engineering.',
      creditsHref: '/credits',
    },
    {
      id: 'real-europa-clipper',
      name: 'Europa Clipper & Galileo',
      subtitle: 'Jovian Magnetosphere & Gravity-Assist Tours',
      years: '1989–Present',
      destination: 'Jupiter System (5.2 AU)',
      keyPhysics: 'Earth-gravity-assist trajectories trade longer cruise duration for lower launch vehicle mass requirements.',
      parallelToGame: 'Your choice between a direct heavy launch and an Earth-flyby trajectory mirrors how real outer-planet missions fit within launcher limits.',
      creditsHref: '/credits',
    },
  ],
  interstellar: [
    {
      id: 'real-voyager',
      name: 'Voyager 1 & 2 / Interstellar Probe Concept',
      subtitle: 'Jupiter Gravity Assist to the Heliopause (~120 AU)',
      years: '1977–Present',
      destination: 'Heliopause & Interstellar Medium (>120 AU)',
      keyPhysics: 'At 120 AU solar flux is 0.007% of Earth’s, requiring plutonium-238 RTGs (87.7-year half-life), autonomous fault protection (16+ hour light delay), and a Jupiter gravity assist.',
      parallelToGame: 'Your Chapter 5a probe uses the exact physics that carried Voyager 1 & 2 across the heliopause and still trickles plasma data home decades later.',
      creditsHref: '/credits',
    },
  ],
  exoplanet: [
    {
      id: 'real-jwst-tess',
      name: 'James Webb Space Telescope (JWST) & TESS / Kepler',
      subtitle: 'Sun–Earth L2 Infrared Observatory & Transit Photometry',
      years: '2009–Present',
      destination: 'Sun–Earth L2 Halo Orbit (1.5 million km)',
      keyPhysics: 'Transit depth ΔF/F = (R_p/R_*)² makes Earth-sized planets ~70× easier to detect around small M-dwarf stars like TRAPPIST-1 than around Sun-like stars, while a multi-layer sunshield passively cools infrared optics.',
      parallelToGame: 'Your L2 sunshield cooling bonus (+30%), precision star-tracker pointing, and TRAPPIST-1 transit light-curve analysis match real exoplanet observatories.',
      creditsHref: '/credits',
    },
  ],
};

export function realMissionsForPathway(pathwayId: PathwayId): RealMissionFact[] {
  return [...(REAL_MISSIONS[pathwayId] ?? REAL_MISSIONS.leo)];
}

