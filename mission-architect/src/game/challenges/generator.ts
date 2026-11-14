/**
 * Physics challenges built from the player's own mission numbers.
 * Wrong answers are common misconceptions, and every answer is explained:
 * the challenge asks the game to teach *why*, not just right or wrong.
 */
import { createRng } from '../core/rng';
import { AU, BODIES, G0, LIGHT_SPEED, type BodyId } from '../physics/constants';
import { centripetalForce, circularOrbitSpeed, escapeVelocity, gravityAt } from '../physics/orbit';
import { flybyDeltaV } from '../physics/gravityAssist';
import { spinAcceleration, spinComfort, spinRpm } from '../physics/artificialGravity';
import { thrustToWeight } from '../physics/rocket';
import { sunlightFraction } from '../physics/power';
import { transitDepth } from '../physics/transit';
import type { PathwayId } from '../types';
import { SPIN_TARGET_ACCELERATION } from '../sim/design';
import { duration, fmt } from '../sim/format';
import type { Challenge, ChallengeConsequence, ChallengeContext, ChallengeOption, ChallengeResult, ChallengeTopic } from './types';

type Generator = (ctx: ChallengeContext) => Challenge | null;

const WRONG_COST: ChallengeConsequence = { deltaVCost: 30 };

/** Builds a single-correct challenge. Options are shuffled with a seed so the order is stable. */
function singleCorrect(spec: {
  id: string;
  topic: ChallengeTopic;
  title: string;
  prompt: string;
  givens: Challenge['givens'];
  formula: string;
  workedHint: string;
  options: ChallengeOption[];
  right: string;
  wrongConsequence?: ChallengeConsequence;
  seed: string;
}): Challenge {
  const rng = createRng([...spec.seed].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7));
  // Never show two options that print the same (a wrong answer must look wrong).
  const seen = new Set<string>();
  const options = spec.options.filter((option) => {
    if (seen.has(option.label)) return false;
    seen.add(option.label);
    return true;
  });
  for (let i = options.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return {
    id: spec.id,
    topic: spec.topic,
    title: spec.title,
    prompt: spec.prompt,
    givens: spec.givens,
    formula: spec.formula,
    workedHint: spec.workedHint,
    kind: 'single-correct',
    options,
    evaluate: (optionId): ChallengeResult => {
      const option = options.find((item) => item.id === optionId);
      if (!option) throw new Error(`Challenge ${spec.id} has no option ${optionId}`);
      return option.correct
        ? { optionId, correct: true, explanation: `Correct! ${spec.right}`, consequence: {} }
        : {
            optionId,
            correct: false,
            explanation: `Not quite. ${option.misconception ?? ''} ${spec.right}`.trim(),
            consequence: spec.wrongConsequence ?? WRONG_COST,
          };
    },
  };
}

const ORBIT_BODY: Partial<Record<PathwayId, BodyId>> = { leo: 'earth', moon: 'moon', mars: 'mars', jupiter: 'jupiter' };

const twr: Generator = ({ vehicle, summary, mission }) => {
  if (!vehicle) return null;
  const mass = vehicle.liftoffMass + summary.wetMass;
  const value = thrustToWeight(vehicle.thrust, mass);
  const weightKN = (mass * G0) / 1000;
  const f = (v: number) => fmt(v, 2);
  return singleCorrect({
    id: 'C-TWR',
    topic: 'twr',
    title: 'Will it lift off?',
    prompt: `Your ${vehicle.name} and spacecraft weigh ${fmt(mass / 1000)} tonnes at liftoff. What is the thrust-to-weight ratio?`,
    givens: [
      { label: 'Engine thrust', value: `${fmt(vehicle.thrust / 1000)} kN` },
      { label: 'Total mass', value: `${fmt(mass)} kg` },
      { label: 'g₀', value: '9.81 m/s²' },
    ],
    formula: 'TWR = F ÷ (m × g₀)',
    workedHint: `Weight = ${fmt(mass)} kg × 9.81 = ${fmt(weightKN)} kN. Divide the thrust by that.`,
    options: [
      { id: 'right', label: f(value), correct: true },
      { id: 'no_g', label: f(value * G0), misconception: 'That divides thrust by mass in kilograms, forgetting that weight is mass × gravity.' },
      { id: 'inverse', label: f(1 / value), misconception: 'That is weight ÷ thrust, the wrong way round.' },
      { id: 'payload_only', label: f(thrustToWeight(vehicle.thrust, summary.wetMass)), misconception: 'That uses only the spacecraft, but the engines must lift the whole rocket, fuel and all.' },
    ],
    right: `${fmt(vehicle.thrust / 1000)} kN ÷ ${fmt(weightKN)} kN = ${f(value)}. Above 1 the rocket rises; the agency wants at least 1.2 so it doesn't waste fuel fighting gravity${mission.pathway.crewed ? ' with a crew on board' : ''}.`,
    seed: `twr-${mission.pathway.id}`,
  });
};

const rocketEquation: Generator = ({ summary, mission }) => {
  const engine = summary.resolved.propulsion;
  if (!engine || summary.fuelMass <= 0) return null;
  const value = summary.deltaV;
  const ratio = summary.wetMass / summary.dryMass;
  const k = (v: number) => (value < 1000 ? `${fmt(v)} m/s` : `${fmt(v / 1000, 2)} km/s`);
  return singleCorrect({
    id: 'C-ROCKET',
    topic: 'rocketEquation',
    title: 'How much Δv do you have?',
    prompt: `Your ${engine.name} has an exhaust efficiency (Isp) of ${engine.isp} s. Fully fuelled, the spacecraft weighs ${fmt(summary.wetMass)} kg; with empty tanks, ${fmt(summary.dryMass)} kg. How much can it change its speed?`,
    givens: [
      { label: 'Isp', value: `${engine.isp} s` },
      { label: 'm₀ (full)', value: `${fmt(summary.wetMass)} kg` },
      { label: 'm_f (empty)', value: `${fmt(summary.dryMass)} kg` },
    ],
    formula: 'Δv = Isp × g₀ × ln(m₀ ÷ m_f)',
    workedHint: `m₀ ÷ m_f = ${fmt(ratio, 3)}; ln of that = ${fmt(Math.log(ratio), 3)}; × ${engine.isp} × 9.81.`,
    options: [
      { id: 'right', label: k(value), correct: true },
      { id: 'no_log', label: k(engine.isp * G0 * ratio), misconception: 'That skips the logarithm. Doubling the fuel does not double the Δv: each extra kilogram of fuel also has to push all the other fuel.' },
      { id: 'no_g', label: k(engine.isp * Math.log(ratio)), misconception: 'That forgets g₀. Isp in seconds must be multiplied by 9.81 m/s² to get the exhaust speed.' },
      { id: 'fuel_ratio', label: k(engine.isp * G0 * (summary.fuelMass / summary.wetMass)), misconception: 'That uses the share of fuel instead of the logarithm of the mass ratio.' },
    ],
    right: `${engine.isp} × 9.81 × ln(${fmt(ratio, 3)}) = ${k(value)}. This mission needs ${k(mission.env.deltaV)}.`,
    seed: `rocket-${mission.pathway.id}`,
  });
};

const orbitSpeed: Generator = ({ mission }) => {
  const orbit = mission.pathway.orbit;
  const bodyId = ORBIT_BODY[mission.pathway.id];
  if (!orbit || !bodyId) return null;
  const body = BODIES[bodyId];
  const r = body.radius + orbit.altitudeKm * 1000;
  const v = circularOrbitSpeed(body.gm, r);
  const k = (value: number) => `${fmt(value / 1000, 2)} km/s`;
  return singleCorrect({
    id: 'C-ORBIT',
    topic: 'orbitSpeed',
    title: 'How fast to stay in orbit?',
    prompt: `To orbit ${orbit.altitudeKm.toLocaleString('en-US')} km above ${body.name}, how fast must the spacecraft fly sideways?`,
    givens: [
      { label: `GM of ${body.name}`, value: `${body.gm.toExponential(3)} m³/s²` },
      { label: `${body.name}'s radius`, value: `${fmt(body.radius / 1000)} km` },
      { label: 'Altitude', value: `${fmt(orbit.altitudeKm)} km` },
    ],
    formula: 'v = √(GM ÷ r), with r = radius + altitude',
    workedHint: `r = ${fmt(body.radius / 1000)} + ${fmt(orbit.altitudeKm)} = ${fmt(r / 1000)} km = ${r.toExponential(3)} m.`,
    options: [
      { id: 'right', label: k(v), correct: true },
      { id: 'escape', label: k(escapeVelocity(body.gm, r)), misconception: 'That is escape speed (√2 times faster): fast enough to leave for good, not to circle.' },
      { id: 'altitude_only', label: k(circularOrbitSpeed(body.gm, orbit.altitudeKm * 1000)), misconception: "That measures r from the surface. r is the distance from the planet's centre." },
      { id: 'surface', label: k(circularOrbitSpeed(body.gm, body.radius)), misconception: 'That is the speed for an orbit skimming the surface, ignoring the altitude.' },
    ],
    right: `v = √(${body.gm.toExponential(3)} ÷ ${r.toExponential(3)}) = ${k(v)}. Slower and gravity pulls you down; faster and the orbit stretches out.`,
    wrongConsequence: { deltaVCost: 40 },
    seed: `orbit-${mission.pathway.id}`,
  });
};

const centripetal: Generator = ({ mission, summary }) => {
  const orbit = mission.pathway.orbit;
  const bodyId = ORBIT_BODY[mission.pathway.id];
  if (!orbit || !bodyId || summary.dryMass <= 0) return null;
  const body = BODIES[bodyId];
  const r = body.radius + orbit.altitudeKm * 1000;
  const v = circularOrbitSpeed(body.gm, r);
  const mass = summary.dryMass;
  const force = centripetalForce(mass, v, r);
  const kn = (value: number) => `${fmt(value / 1000, 1)} kN`;
  const surfaceG = gravityAt(body.gm, body.radius);
  return singleCorrect({
    id: 'C-CENTRIPETAL',
    topic: 'centripetal',
    title: 'What keeps you in orbit?',
    prompt: `Your ${fmt(mass)} kg spacecraft circles ${body.name} at ${fmt(v / 1000, 2)} km/s, ${fmt(orbit.altitudeKm)} km up. How big is the force that keeps it on its curved path?`,
    givens: [
      { label: 'Mass', value: `${fmt(mass)} kg` },
      { label: 'Speed', value: `${fmt(v)} m/s` },
      { label: 'Orbit radius', value: `${fmt(r / 1000)} km` },
    ],
    formula: 'F = m v² ÷ r',
    workedHint: `${fmt(v)}² ÷ ${fmt(r)} = ${fmt(v * v / r, 2)} m/s², then × ${fmt(mass)} kg.`,
    options: [
      { id: 'right', label: `${kn(force)}: gravity, acting as the centripetal force`, correct: true },
      { id: 'surface', label: `${kn(mass * surfaceG)}: its weight at the surface`, misconception: 'Gravity gets weaker with distance; at this height it is less than at the surface.' },
      { id: 'zero', label: '0 kN: astronauts are weightless, so there is no gravity', misconception: 'There is plenty of gravity in orbit. Everything is falling together, so it feels weightless.' },
      { id: 'engine', label: `${kn(force)}: the engines push it around the curve`, misconception: 'No engine is needed to stay in orbit. Gravity bends the path all by itself.' },
    ],
    right: `F = ${fmt(mass)} × ${fmt(v)}² ÷ ${fmt(r)} = ${kn(force)}, exactly the pull of ${body.name}'s gravity at that height. In orbit, gravity is the centripetal force.`,
    seed: `centripetal-${mission.pathway.id}`,
  });
};

const artificialGravity: Generator = ({ mission, summary }) => {
  if (!mission.pathway.crewed || mission.env.cruiseDays < 100) return null;
  // The player's own arm length if they built a spin habitat, otherwise a typical 85 m design.
  const omega = (summary.spinRpm * 2 * Math.PI) / 60;
  const arm = omega > 0 ? Math.round(SPIN_TARGET_ACCELERATION / (omega * omega)) : 85;
  const rpm = spinRpm(SPIN_TARGET_ACCELERATION, arm);
  const r = (value: number) => `${fmt(value, 1)} rpm`;
  return singleCorrect({
    id: 'C-SPIN',
    topic: 'artificialGravity',
    title: 'Artificial gravity',
    prompt: `The habitat arm is ${fmt(arm)} m long. How fast must it spin so the crew feel Mars-like gravity (3.73 m/s²) pushing them outwards?`,
    givens: [
      { label: 'Arm length r', value: `${fmt(arm)} m` },
      { label: 'Target a', value: '3.73 m/s² (0.38 g)' },
    ],
    formula: 'a = ω² r  →  ω = √(a ÷ r);  rpm = ω × 60 ÷ 2π',
    workedHint: `ω = √(3.73 ÷ ${fmt(arm)}) = ${fmt(Math.sqrt(SPIN_TARGET_ACCELERATION / arm), 3)} rad/s.`,
    options: [
      { id: 'right', label: r(rpm), correct: true },
      { id: 'earth_g', label: r(spinRpm(G0, arm)), misconception: 'That gives Earth gravity (9.81 m/s²), more than the goal, and the faster spin makes the crew dizzy.' },
      { id: 'no_sqrt', label: r(((SPIN_TARGET_ACCELERATION / arm) * 60) / (2 * Math.PI)), misconception: 'That forgets the square root: a depends on ω squared.' },
      { id: 'double_arm', label: r(spinRpm(SPIN_TARGET_ACCELERATION, arm * 2)), misconception: 'That would suit an arm twice as long. A shorter arm must spin faster to give the same push.' },
    ],
    right: `ω = √(3.73 ÷ ${fmt(arm)}) → ${r(rpm)} (${spinComfort(rpm)}). The crew feel ${fmt(spinAcceleration(rpm, arm), 2)} m/s² outwards: the centrifugal effect of the spin.`,
    wrongConsequence: { crewHealth: -3 },
    seed: `spin-${mission.pathway.id}`,
  });
};

const sunlight: Generator = ({ mission, summary }) => {
  const d = mission.env.sunDistanceAU;
  if (d < 1.3) return null;
  const output = summary.resolved.power?.source === 'solar' ? summary.resolved.power.output : 10_000;
  const w = (value: number) => `${fmt(value, value < 10 ? 1 : 0)} W`;
  return singleCorrect({
    id: 'C-SUN',
    topic: 'sunlight',
    title: 'Solar power far from the Sun',
    prompt: `A solar array makes ${fmt(output)} W at Earth (1 AU). How much does it make at ${fmt(d, 2)} AU?`,
    givens: [
      { label: 'Power at 1 AU', value: `${fmt(output)} W` },
      { label: 'Distance', value: `${fmt(d, 2)} AU` },
    ],
    formula: 'P = P₁ ÷ d²   (inverse-square law)',
    workedHint: `d² = ${fmt(d * d, 2)}. Divide ${fmt(output)} W by that.`,
    options: [
      { id: 'right', label: w(output * sunlightFraction(d)), correct: true },
      { id: 'linear', label: w(output / d), misconception: 'Sunlight spreads out over an area, so it fades with the square of the distance, not just the distance.' },
      { id: 'same', label: w(output), misconception: 'The Sun looks just as bright from far away? No: its light is spread over a much bigger sphere.' },
      { id: 'cube', label: w(output / d ** 3), misconception: 'Too far: light spreads over a surface (two dimensions), so the power drops with d², not d³.' },
    ],
    right: `${fmt(output)} ÷ ${fmt(d, 2)}² = ${w(output * sunlightFraction(d))}: only ${fmt(sunlightFraction(d) * 100, 1)}% of what it makes at Earth.${d > 4 ? ' That is why missions beyond Jupiter use RTGs.' : ''}`,
    wrongConsequence: { scienceFactor: 0.98 },
    seed: `sun-${mission.pathway.id}`,
  });
};

const signalDelay: Generator = ({ mission }) => {
  const d = mission.env.earthDistanceAU;
  if (d < 0.002) return null;
  const seconds = (d * AU) / LIGHT_SPEED;
  return singleCorrect({
    id: 'C-DELAY',
    topic: 'signalDelay',
    title: 'Talking across space',
    prompt: `The spacecraft is up to ${d < 0.1 ? `${fmt((d * AU) / 1e3)} km` : `${fmt(d, 1)} AU`} from Earth. How long does a radio command take to arrive?`,
    givens: [
      { label: 'Distance', value: `${fmt(d * AU / 1000)} km` },
      { label: 'Speed of light', value: '299,792 km/s' },
    ],
    formula: 't = distance ÷ speed of light',
    workedHint: `${fmt((d * AU) / 1000)} km ÷ 299,792 km/s.`,
    options: [
      { id: 'right', label: duration(seconds), correct: true },
      { id: 'instant', label: 'Instantly: radio is immediate', misconception: 'Radio waves travel at the speed of light: fast, but not instant.' },
      { id: 'round_trip', label: duration(seconds * 2), misconception: 'That is the round trip: there and back.' },
      { id: 'sound', label: duration((d * AU) / 343), misconception: 'That uses the speed of sound. Sound cannot travel through space at all.' },
    ],
    right: `${fmt((d * AU) / 1000)} km ÷ 299,792 km/s ≈ ${duration(seconds)} one way.${seconds > 300 ? ' Too slow to steer by joystick: the spacecraft needs an autonomous computer.' : ''}`,
    wrongConsequence: { scienceFactor: 0.98 },
    seed: `delay-${mission.pathway.id}`,
  });
};

const transit: Generator = ({ mission }) => {
  if (mission.pathway.id !== 'exoplanet') return null;
  const earthSun = transitDepth(6371, 696_000) * 100;
  const earthDwarf = transitDepth(6371, 0.119 * 696_000) * 100;
  return singleCorrect({
    id: 'C-TRANSIT',
    topic: 'transit',
    title: 'Finding Earth-sized planets',
    prompt: 'A planet passing in front of its star blocks a little light. Around which star is an Earth-sized planet easiest to detect?',
    givens: [
      { label: 'Earth radius', value: '6,371 km' },
      { label: 'Sun radius', value: '696,000 km' },
      { label: 'TRAPPIST-1 radius', value: '≈ 0.12 × the Sun' },
    ],
    formula: 'dip = (R_planet ÷ R_star)²',
    workedHint: `For the Sun: (6,371 ÷ 696,000)² = ${fmt(earthSun, 4)}%.`,
    options: [
      { id: 'right', label: `A small red dwarf like TRAPPIST-1 (dip ≈ ${fmt(earthDwarf, 2)}%)`, correct: true },
      { id: 'sun', label: `A Sun-like star (dip ≈ ${fmt(earthSun, 4)}%)`, misconception: 'A big star hides a small planet: the dip is tiny.' },
      { id: 'giant', label: 'A giant star, because it is brighter', misconception: 'More light, but the planet covers a much smaller share of the bigger disc.' },
      { id: 'same', label: 'It makes no difference', misconception: 'The dip depends on how much of the star the planet covers, so star size matters a lot.' },
    ],
    right: `The dip is the share of the star's disc the planet covers. Around a small star an Earth-sized planet blocks about ${fmt(earthDwarf, 2)}%, about 70 times more than around the Sun.`,
    wrongConsequence: { scienceFactor: 0.97 },
    seed: 'transit',
  });
};

/** Jupiter flyby: a trade-off with no single right answer. */
const gravityAssist: Generator = ({ mission }) => {
  const isJupiter = mission.pathway.id === 'jupiter' || mission.trajectory.tags.includes('jupiter-assist');
  if (!isJupiter) return null;
  const jupiter = BODIES.jupiter;
  const vInf = 6000;
  const choices = [
    { id: 'close', radii: 2, dose: 400 },
    { id: 'medium', radii: 5, dose: 100 },
    { id: 'far', radii: 20, dose: 10 },
  ];
  const label = (radii: number) => `${radii} Jupiter radii`;
  const values = choices.map((choice) => ({ ...choice, dv: flybyDeltaV(jupiter.gm, vInf, choice.radii * jupiter.radius) }));
  return {
    id: 'C-ASSIST',
    topic: 'gravityAssist',
    title: 'Jupiter flyby',
    prompt: 'How close should you fly past Jupiter? Closer bends your path more, but Jupiter\'s radiation belts are deadly.',
    givens: [
      { label: 'Approach speed v∞', value: '6 km/s' },
      { label: "Jupiter's GM", value: `${jupiter.gm.toExponential(3)} m³/s²` },
    ],
    formula: 'sin(δ/2) = 1 ÷ (1 + r_p v∞² ÷ GM);  |Δv| = 2 v∞ sin(δ/2)',
    workedHint: 'A smaller r_p (closer approach) makes sin(δ/2) bigger, so the path bends more.',
    kind: 'trade-off',
    options: values.map((value) => ({
      id: value.id,
      label: `${label(value.radii)}: Δv ≈ ${fmt(value.dv / 1000, 1)} km/s, radiation ${value.dose >= 400 ? 'extreme' : value.dose >= 100 ? 'high' : 'low'}`,
    })),
    evaluate: (optionId) => {
      const value = values.find((item) => item.id === optionId);
      if (!value) throw new Error(`No flyby option ${optionId}`);
      const far = values[values.length - 1];
      const bonus = (value.dv - far.dv) / 1000;
      return {
        optionId,
        correct: null,
        explanation: `At ${label(value.radii)} Jupiter turns your path by enough to change your velocity by about ${fmt(value.dv / 1000, 1)} km/s${bonus > 0 ? `, ${fmt(bonus, 1)} km/s more than a distant pass` : ''}. The price: about ${value.dose} krad of radiation before shielding. Jupiter doesn't create energy: the spacecraft steals a tiny bit of Jupiter's orbital momentum.`,
        consequence: { electronicsDose: value.dose, scienceFactor: 1 + Math.max(0, bonus) * 0.02 },
      };
    },
  };
};

const GENERATORS: Readonly<Record<ChallengeTopic, Generator>> = {
  twr,
  rocketEquation,
  orbitSpeed,
  centripetal,
  artificialGravity,
  gravityAssist,
  sunlight,
  signalDelay,
  transit,
};

/** Which challenges each pathway asks, in story order. */
export const PATHWAY_CHALLENGES: Readonly<Record<PathwayId, readonly ChallengeTopic[]>> = {
  leo: ['twr', 'orbitSpeed', 'centripetal'],
  moon: ['rocketEquation', 'orbitSpeed', 'signalDelay'],
  mars: ['rocketEquation', 'artificialGravity', 'sunlight', 'signalDelay'],
  jupiter: ['sunlight', 'gravityAssist', 'signalDelay', 'centripetal'],
  interstellar: ['gravityAssist', 'sunlight', 'signalDelay'],
  exoplanet: ['twr', 'transit', 'rocketEquation'],
};

export function generateChallenge(topic: ChallengeTopic, ctx: ChallengeContext): Challenge | null {
  return GENERATORS[topic](ctx);
}

/** All challenges for a mission (topics that don't apply are skipped). */
export function challengesFor(ctx: ChallengeContext): Challenge[] {
  return PATHWAY_CHALLENGES[ctx.mission.pathway.id]
    .map((topic) => generateChallenge(topic, ctx))
    .filter((challenge): challenge is Challenge => challenge !== null);
}

/** Share of single-correct challenges answered correctly (for the score). Null if none. */
export function physicsMastery(results: readonly ChallengeResult[]): number | null {
  const graded = results.filter((result) => result.correct !== null);
  if (graded.length === 0) return null;
  return graded.filter((result) => result.correct).length / graded.length;
}
