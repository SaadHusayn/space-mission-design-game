/**
 * Engineering Review Board (ERB): physics checks on a design before launch.
 *
 * Each check returns pass / warn / fail with the numbers, a plain-language
 * explanation and a hint for fixing it. Checks that need a launch vehicle are
 * "pending" until one is chosen; they are re-checked at GO/NO-GO.
 */
import { gameData, type GameData } from '../data/loadData';
import type { Design, LaunchVehicle, MissionContext } from '../types';
import { AUTONOMY_DELAY_LIMIT, adcsWorksThere, summarizeDesign, type DesignSummary } from './design';
import { duration, fmt, gbPerDay, kg, kms, money, watts, years } from './format';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'pending';

export type Discipline =
  | 'systems'
  | 'structures'
  | 'propulsion'
  | 'power'
  | 'communications'
  | 'thermal'
  | 'radiation'
  | 'crew'
  | 'science'
  | 'budget';

export interface ReviewCheck {
  id: string;
  discipline: Discipline;
  title: string;
  status: CheckStatus;
  /** What the design has, as text (e.g. "1,135 kg"). */
  value: string;
  /** What it needs, as text (e.g. "≤ 1,600 kg"). */
  limit: string;
  explanation: string;
  /** How to fix it. Empty when the check passes. */
  fixHint: string;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface ReviewResult {
  checks: ReviewCheck[];
  summary: DesignSummary;
  /** No failures and nothing pending: ready to launch. */
  go: boolean;
  /** No failures (pending checks allowed): ready to choose a trajectory and rocket. */
  passable: boolean;
  grade: Grade;
  counts: Record<CheckStatus, number>;
}

/** Crew radiation limit for one mission, mSv (based on agency career limits of 0.6–1 Sv). */
export const CREW_DOSE_LIMIT = 1000;
/** Δv margin the review asks for. */
export const DELTA_V_MARGIN = 1.1;
/** Power margin the review asks for. */
export const POWER_MARGIN = 1.15;
/** Supplies margin for crewed missions. */
export const SUPPLY_MARGIN = 1.1;
/** Minimum liftoff thrust-to-weight ratio. */
export const MIN_TWR = 1.2;

type Builder = Omit<ReviewCheck, 'fixHint'> & { fixHint?: string };

function check(spec: Builder): ReviewCheck {
  return { ...spec, fixHint: spec.status === 'pass' ? '' : (spec.fixHint ?? '') };
}

export function reviewDesign(
  design: Design,
  mission: MissionContext,
  vehicle: LaunchVehicle | null = null,
  data: GameData = gameData,
): ReviewResult {
  const s = summarizeDesign(design, mission, vehicle, data);
  const r = s.resolved;
  const { env, pathway } = mission;
  const crewed = pathway.crewed;
  const checks: ReviewCheck[] = [];

  // ERB-0 Required systems
  const missing: string[] = [];
  if (!r.bus) missing.push(crewed ? 'crew vehicle' : 'spacecraft bus');
  if (!r.power) missing.push('power source');
  // An RTG works without sunlight, so a battery is only essential with solar power or eclipses.
  if (!r.battery && (r.power?.source !== 'rtg' || env.eclipseHours > 0)) missing.push('battery');
  if (!r.computer) missing.push('flight computer');
  if (!r.adcs) missing.push('attitude control');
  if (!r.comms) missing.push('communications');
  if (!r.thermal) missing.push('thermal control');
  if (!r.propulsion && env.deltaV > 0) missing.push('propulsion');
  if (r.instruments.length === 0) missing.push('science instrument');
  if (crewed && !r.lifeSupport) missing.push('life support');
  if (pathway.returnEntrySpeed !== null && !r.heatShield) missing.push('heat shield');
  checks.push(
    check({
      id: 'ERB-0',
      discipline: 'systems',
      title: 'Required systems',
      status: missing.length === 0 ? 'pass' : 'fail',
      value: missing.length === 0 ? 'All fitted' : `${missing.length} missing`,
      limit: 'Every system fitted',
      explanation:
        missing.length === 0
          ? 'Every system this mission needs is on board.'
          : `This spacecraft has no ${missing.join(', ')}. A spacecraft is a system: every part has a job.`,
      fixHint: `Add: ${missing.join(', ')}.`,
    }),
  );

  // ERB-1 Structure
  if (r.bus) {
    const ok = s.wetMass <= r.bus.maxMass;
    checks.push(
      check({
        id: 'ERB-1',
        discipline: 'structures',
        title: 'Structural limit',
        status: ok ? 'pass' : 'fail',
        value: kg(s.wetMass),
        limit: `≤ ${kg(r.bus.maxMass)}`,
        explanation: ok
          ? `The ${r.bus.name} can carry everything, fuel included.`
          : `Fully fuelled, the spacecraft weighs ${kg(s.wetMass)}, more than the ${r.bus.name} is built to hold.`,
        fixHint: 'Choose a bigger bus, or lighter parts and less fuel.',
      }),
    );
  }

  // ERB-1L Launch capacity (needs a rocket)
  checks.push(
    vehicle && s.launchCapacity !== null
      ? check({
          id: 'ERB-1L',
          discipline: 'structures',
          title: 'Launch capacity',
          status: s.wetMass <= s.launchCapacity ? 'pass' : 'fail',
          value: kg(s.wetMass),
          limit: `≤ ${kg(s.launchCapacity)}`,
          explanation:
            s.wetMass <= s.launchCapacity
              ? `The ${vehicle.name} can send ${kg(s.launchCapacity)} on this trajectory: enough.`
              : `Too heavy: ${kg(s.wetMass)} > ${kg(s.launchCapacity)}. The farther a rocket throws a spacecraft, the less mass it can carry.`,
          fixHint: 'Choose a bigger rocket, a gentler trajectory, or make the spacecraft lighter.',
        })
      : check({
          id: 'ERB-1L',
          discipline: 'structures',
          title: 'Launch capacity',
          status: 'pending',
          value: kg(s.wetMass),
          limit: 'Choose a rocket',
          explanation: 'Checked once you choose a launch vehicle.',
        }),
  );

  // ERB-2 Δv
  if (env.deltaV > 0) {
    const need = env.deltaV * DELTA_V_MARGIN;
    const status = s.deltaV >= need ? 'pass' : s.deltaV >= env.deltaV ? 'warn' : 'fail';
    checks.push(
      check({
        id: 'ERB-2',
        discipline: 'propulsion',
        title: 'Δv budget',
        status,
        value: kms(s.deltaV),
        limit: `≥ ${kms(need)} (${kms(env.deltaV)} + 10% margin)`,
        explanation:
          status === 'pass'
            ? `With ${kg(s.fuelMass)} of propellant, the rocket equation gives ${kms(s.deltaV)}: enough for every burn, with a margin.`
            : status === 'warn'
              ? `Just enough Δv (${kms(s.deltaV)}) with no margin. A small mistake means you can't finish the mission.`
              : `The rocket equation gives only ${kms(s.deltaV)}, but the mission needs ${kms(env.deltaV)}. Every extra kilogram of spacecraft needs more propellant to push it.`,
        fixHint: 'Load more propellant (up to the tank size), use a more efficient engine, or remove mass.',
      }),
    );
  }

  // ERB-3 Liftoff thrust-to-weight
  checks.push(
    vehicle && s.liftoffTwr !== null
      ? check({
          id: 'ERB-3',
          discipline: 'propulsion',
          title: 'Liftoff thrust-to-weight',
          status: s.liftoffTwr >= MIN_TWR ? 'pass' : s.liftoffTwr > 1 ? 'warn' : 'fail',
          value: fmt(s.liftoffTwr, 2),
          limit: `≥ ${fmt(MIN_TWR, 1)}`,
          explanation:
            s.liftoffTwr >= MIN_TWR
              ? `The engines push ${fmt(s.liftoffTwr, 2)} times the rocket's weight: a clean liftoff.`
              : 'The engines barely beat gravity. A slow climb wastes fuel fighting gravity.',
          fixHint: 'Choose a more powerful rocket or a lighter spacecraft.',
        })
      : check({
          id: 'ERB-3',
          discipline: 'propulsion',
          title: 'Liftoff thrust-to-weight',
          status: 'pending',
          value: '—',
          limit: 'Choose a rocket',
          explanation: 'Checked once you choose a launch vehicle.',
        }),
  );

  // ERB-4 Power
  if (r.power) {
    const need = s.powerLoad * POWER_MARGIN;
    const status = s.powerAvailable >= need ? 'pass' : s.powerAvailable >= s.powerLoad ? 'warn' : 'fail';
    const solar = r.power.source === 'solar';
    const sunlight = 100 / (env.sunDistanceAU * env.sunDistanceAU);
    checks.push(
      check({
        id: 'ERB-4',
        discipline: 'power',
        title: 'Power at destination',
        status,
        value: watts(s.powerAvailable),
        limit: `≥ ${watts(need)} (load ${watts(s.powerLoad)} + 15%)`,
        explanation: solar
          ? `At ${fmt(env.sunDistanceAU, 2)} AU sunlight is ${fmt(sunlight, sunlight < 10 ? 2 : 0)}% as strong as at Earth (inverse-square law)${env.eclipseFraction > 0 ? `, and you spend ${fmt(env.eclipseFraction * 100)}% of the time in shadow` : ''}. Your array averages ${watts(s.powerAvailable)}.`
          : `The RTG's plutonium slowly decays: after ${years(s.years)} it still makes ${watts(s.powerAvailable)}.`,
        fixHint: solar
          ? 'Use a bigger solar array, switch to an RTG far from the Sun, or remove power-hungry parts.'
          : 'Remove power-hungry parts or shorten the mission.',
      }),
    );
  }

  // ERB-5 Eclipses
  if (r.battery) {
    const status = env.eclipseHours === 0 || s.batteryUsableWh >= s.batteryNeededWh ? 'pass' : 'fail';
    checks.push(
      check({
        id: 'ERB-5',
        discipline: 'power',
        title: 'Battery through eclipses',
        status,
        value: `${fmt(s.batteryUsableWh)} Wh usable`,
        limit: env.eclipseHours === 0 ? 'No eclipses' : `≥ ${fmt(s.batteryNeededWh)} Wh`,
        explanation:
          env.eclipseHours === 0
            ? 'This orbit is never in shadow.'
            : `In shadow for up to ${fmt(env.eclipseHours * 60)} minutes, the spacecraft runs on its battery: ${watts(s.powerLoad)} × ${fmt(env.eclipseHours, 1)} h = ${fmt(s.batteryNeededWh)} Wh.`,
        fixHint: 'Choose a bigger battery or reduce the power load.',
      }),
    );
  }

  // ERB-6 Communications
  if (r.comms) {
    const status = s.dataDelivered >= 0.999 ? 'pass' : s.dataDelivered >= 0.6 ? 'warn' : 'fail';
    checks.push(
      check({
        id: 'ERB-6',
        discipline: 'communications',
        title: 'Data downlink',
        status,
        value: gbPerDay(s.downlinkPerDay),
        limit: `≥ ${gbPerDay(s.dataPerDay)} (instruments)`,
        explanation:
          status === 'pass'
            ? `At ${fmt(env.earthDistanceAU, env.earthDistanceAU < 0.1 ? 4 : 1)} AU the ${r.comms.name} sends ${gbPerDay(s.downlinkPerDay)}: all your data gets home.`
            : `Radio signals weaken with the square of the distance. Only ${fmt(s.dataDelivered * 100)}% of your data reaches Earth; the rest is lost science.`,
        fixHint: 'Choose a bigger antenna, or instruments that produce less data.',
      }),
    );
  }

  // ERB-6A Autonomy
  if (s.signalDelaySeconds > AUTONOMY_DELAY_LIMIT && r.computer) {
    checks.push(
      check({
        id: 'ERB-6A',
        discipline: 'communications',
        title: 'Autonomy',
        status: r.computer.autonomy ? 'pass' : 'fail',
        value: r.computer.autonomy ? 'Autonomous' : 'Needs ground control',
        limit: `Signal delay ${duration(s.signalDelaySeconds)}`,
        explanation: `A radio message takes up to ${duration(s.signalDelaySeconds)} to arrive. Nobody on Earth can react in time, so the spacecraft must handle problems itself.`,
        fixHint: 'Choose an autonomous flight computer.',
      }),
    );
  }

  // ERB-7 Thermal
  if (r.thermal) {
    const cold = env.sunDistanceAU > 2;
    const rtgHeat = r.power?.source === 'rtg';
    const ok = !cold || r.thermal.coldRated || rtgHeat;
    checks.push(
      check({
        id: 'ERB-7',
        discipline: 'thermal',
        title: 'Temperature control',
        status: ok ? 'pass' : 'fail',
        value: r.thermal.name,
        limit: cold ? 'Must stay warm far from the Sun' : 'Normal sunlight',
        explanation: !cold
          ? 'Near the Sun, insulation keeps temperatures steady.'
          : ok
            ? rtgHeat && !r.thermal.coldRated
              ? 'Waste heat from the RTG keeps the electronics warm.'
              : 'Heaters keep the spacecraft warm in the cold, dim outer Solar System.'
            : `At ${fmt(env.sunDistanceAU, 1)} AU the Sun is too weak to keep the spacecraft warm. Fuel and electronics would freeze.`,
        fixHint: 'Add heaters, or use an RTG whose waste heat warms the spacecraft.',
      }),
    );
  }

  // ERB-8 Electronics radiation
  if (r.computer) {
    const tolerance = r.computer.radToleranceKrad;
    const status = s.electronicsDose <= tolerance * 0.8 ? 'pass' : s.electronicsDose <= tolerance ? 'warn' : 'fail';
    checks.push(
      check({
        id: 'ERB-8',
        discipline: 'radiation',
        title: 'Radiation on electronics',
        status,
        value: `${fmt(s.electronicsDose, s.electronicsDose < 10 ? 1 : 0)} krad`,
        limit: `≤ ${fmt(tolerance)} krad`,
        explanation:
          status === 'fail'
            ? `Over the mission, the electronics would soak up ${fmt(s.electronicsDose)} krad, far beyond what the ${r.computer.name} survives. It would fail after about ${years(s.designLifeYears)}.`
            : `The electronics absorb ${fmt(s.electronicsDose, 1)} krad over the mission, within their ${fmt(tolerance)} krad tolerance.`,
        fixHint: 'Add radiation shielding (a vault stops 99.7%), or a radiation-hardened computer.',
      }),
    );
  }

  // ERB-8C Crew radiation
  if (crewed) {
    const ok = s.crewDose <= CREW_DOSE_LIMIT;
    checks.push(
      check({
        id: 'ERB-8C',
        discipline: 'radiation',
        title: 'Crew radiation dose',
        status: ok ? (s.crewDose <= CREW_DOSE_LIMIT * 0.8 ? 'pass' : 'warn') : 'fail',
        value: `${fmt(s.crewDose)} mSv`,
        limit: `≤ ${fmt(CREW_DOSE_LIMIT)} mSv`,
        explanation: `${fmt(s.days)} days at ${fmt(env.crewDosePerDay, 1)} mSv/day${r.radiation?.crewAttenuation ? `, with ${fmt(r.radiation.crewAttenuation * 100)}% blocked by shielding` : ''}. Space agencies limit a whole career to about 600–1,000 mSv.`,
        fixHint: 'Add crew shielding, or choose a faster trajectory to spend fewer days in deep space.',
      }),
    );
  }

  // ERB-9 Launch loads
  if (r.bus) {
    checks.push(
      vehicle
        ? check({
            id: 'ERB-9',
            discipline: 'structures',
            title: 'Launch loads',
            status: r.bus.maxG >= vehicle.maxG ? 'pass' : 'fail',
            value: `Rated ${fmt(r.bus.maxG, 1)} g`,
            limit: `≥ ${fmt(vehicle.maxG, 1)} g (${vehicle.name})`,
            explanation:
              r.bus.maxG >= vehicle.maxG
                ? 'The structure survives the shaking and acceleration of launch.'
                : 'This rocket pushes harder than the structure is built for. It could buckle.',
            fixHint: 'Choose a gentler rocket or a stronger bus.',
          })
        : check({
            id: 'ERB-9',
            discipline: 'structures',
            title: 'Launch loads',
            status: 'pending',
            value: `Rated ${fmt(r.bus.maxG, 1)} g`,
            limit: 'Choose a rocket',
            explanation: 'Checked once you choose a launch vehicle.',
          }),
    );
  }

  // ERB-10 Crew accommodation, supplies, heat shield
  if (crewed && r.bus) {
    const seatsOk = r.bus.crewCapacity >= pathway.crewSize;
    const daysOk = r.bus.maxCrewDays >= s.days;
    checks.push(
      check({
        id: 'ERB-10',
        discipline: 'crew',
        title: 'Crew accommodation',
        status: seatsOk && daysOk ? 'pass' : 'fail',
        value: `${r.bus.crewCapacity} seats, ${fmt(r.bus.maxCrewDays)} days`,
        limit: `${pathway.crewSize} crew, ${fmt(s.days)} days`,
        explanation: !seatsOk
          ? `The ${r.bus.name} has ${r.bus.crewCapacity} seats; this mission flies ${pathway.crewSize} astronauts.`
          : daysOk
            ? `Room for the crew for the whole ${fmt(s.days)}-day mission.`
            : `The ${r.bus.name} supports a crew for ${fmt(r.bus.maxCrewDays)} days, but the mission lasts ${fmt(s.days)} days.`,
        fixHint: 'Choose a crew vehicle with enough seats and endurance.',
      }),
    );
  }
  if (crewed) {
    const supplyDays = design.options.supplyDays;
    const need = s.days * SUPPLY_MARGIN;
    checks.push(
      check({
        id: 'ERB-10S',
        discipline: 'crew',
        title: 'Food, water and air',
        status: supplyDays >= need ? 'pass' : supplyDays >= s.days ? 'warn' : 'fail',
        value: `${fmt(supplyDays)} days (${kg(s.suppliesMass)})`,
        limit: `≥ ${fmt(need)} days`,
        explanation: `${pathway.crewSize} astronauts need food, water and oxygen every day.${r.lifeSupport?.recycling ? ` The ${r.lifeSupport.name} recovers ${fmt(r.lifeSupport.recycling * 100)}% of the water and oxygen.` : ''}`,
        fixHint: 'Load more supply days, or add recycling to cut the mass.',
      }),
    );
  }
  if (pathway.returnEntrySpeed !== null && r.heatShield) {
    const ok = r.heatShield.entrySpeedRating >= pathway.returnEntrySpeed;
    checks.push(
      check({
        id: 'ERB-10H',
        discipline: 'crew',
        title: 'Re-entry heat shield',
        status: ok ? 'pass' : 'fail',
        value: `Rated ${fmt(r.heatShield.entrySpeedRating, 1)} km/s`,
        limit: `≥ ${fmt(pathway.returnEntrySpeed, 1)} km/s`,
        explanation: `Coming home, the capsule hits the atmosphere at about ${fmt(pathway.returnEntrySpeed, 1)} km/s. Heat rises steeply with speed.`,
        fixHint: 'Choose a heat shield rated for this entry speed.',
      }),
    );
  }

  // ERB-11 Crew health
  if (crewed && s.crewHealth !== null) {
    const status = s.crewHealth >= 80 ? 'pass' : s.crewHealth >= 65 ? 'warn' : 'fail';
    const spin =
      s.spinRpm > 0
        ? ` The habitat spins at ${fmt(s.spinRpm, 1)} rpm to give ${fmt(s.spinAcceleration, 2)} m/s² (${s.spinComfort}).`
        : '';
    checks.push(
      check({
        id: 'ERB-11',
        discipline: 'crew',
        title: 'Crew health',
        status,
        value: `${fmt(s.crewHealth)} / 100`,
        limit: '≥ 80',
        explanation: `In weightlessness, bones and muscles weaken.${spin} Expected crew health at the end of the mission: ${fmt(s.crewHealth)}.`,
        fixHint: 'Add exercise equipment or a spinning habitat. A longer arm spins slower and is more comfortable.',
      }),
    );
  }

  // ERB-12 Objective: instruments and pointing
  {
    const types = new Set(s.instrumentScores.filter((score) => score.fitted).map((score) => score.instrument.type));
    const unmet = pathway.requiredInstruments.filter((group) => !group.some((type) => types.has(type)));
    const overflow = s.instrumentScores.filter((score) => !score.fitted).length;
    const ok = unmet.length === 0 && overflow === 0;
    checks.push(
      check({
        id: 'ERB-12',
        discipline: 'science',
        title: 'Instruments for the objective',
        status: ok ? 'pass' : 'fail',
        value: `${s.instrumentScores.length} fitted`,
        limit: pathway.requiredInstruments.map((group) => group.join(' or ')).join(' + '),
        explanation:
          overflow > 0
            ? `The ${r.bus?.name ?? 'bus'} only has room for ${r.bus?.instrumentSlots ?? 0} instrument(s).`
            : unmet.length > 0
              ? `To answer this mission's question you need: ${unmet.map((group) => group.join(' or ')).join('; ')}.`
              : 'Your instruments can answer the mission question.',
        fixHint: overflow > 0 ? 'Remove an instrument or choose a bigger bus.' : 'Add the required instrument types.',
      }),
    );

    const adcsOk = adcsWorksThere(r.adcs, mission);
    const badPointing = s.instrumentScores.filter((score) => score.fitted && !score.pointingOk);
    if (r.adcs) {
      checks.push(
        check({
          id: 'ERB-12P',
          discipline: 'science',
          title: 'Pointing accuracy',
          status: !adcsOk ? 'fail' : badPointing.length > 0 ? 'warn' : 'pass',
          value: r.adcs.name,
          limit: 'Steady enough for every instrument',
          explanation: !adcsOk
            ? `${r.adcs.name} push against Earth's magnetic field, which is far too weak out here. The spacecraft could not point at all.`
            : badPointing.length > 0
              ? `${badPointing.map((score) => score.instrument.name).join(', ')} need steadier pointing, so their images blur and science drops by 60%.`
              : 'The spacecraft can hold every instrument steady on its target.',
          fixHint: 'Choose a more precise attitude-control system.',
        }),
      );
    }
  }

  // ERB-12S Science target
  {
    const target = pathway.scienceTarget;
    const status = s.science >= target ? 'pass' : s.science >= target * 0.8 ? 'warn' : 'fail';
    checks.push(
      check({
        id: 'ERB-12S',
        discipline: 'science',
        title: 'Expected science',
        status,
        value: fmt(s.science),
        limit: `≥ ${fmt(target)}`,
        explanation:
          status === 'pass'
            ? 'If everything works, this design meets the science goal.'
            : `Expected science is ${fmt(s.science)}${s.dataDelivered < 1 ? ` (only ${fmt(s.dataDelivered * 100)}% of the data gets home)` : ''}${s.designLifeYears < s.years ? ` and the spacecraft won't last the whole mission` : ''}.`,
        fixHint: 'Add better-suited instruments, a bigger antenna, steadier pointing, or a longer-lived design.',
      }),
    );
  }

  // ERB-13 Budget
  {
    const status = s.totalCost <= mission.budget ? 'pass' : 'fail';
    checks.push(
      check({
        id: 'ERB-13',
        discipline: 'budget',
        title: vehicle ? 'Budget' : 'Budget (before the rocket)',
        status,
        value: money(s.totalCost),
        limit: `≤ ${money(mission.budget)}`,
        explanation: `Parts ${money(s.partsCost)} + operations ${money(s.operationsCost)}${vehicle ? ` + launch ${money(s.launchCost ?? 0)}` : ''}${vehicle ? '' : '. The rocket will add more'}.`,
        fixHint: 'Choose cheaper parts, or simpler instruments.',
      }),
    );
  }

  // ERB-14 Lifetime
  if (r.computer) {
    const ok = s.designLifeYears >= s.years;
    checks.push(
      check({
        id: 'ERB-14',
        discipline: 'systems',
        title: 'Design life',
        status: ok ? 'pass' : s.designLifeYears >= s.years * 0.8 ? 'warn' : 'fail',
        value: Number.isFinite(s.designLifeYears) ? years(s.designLifeYears) : '—',
        limit: `≥ ${years(s.years)}`,
        explanation: ok
          ? 'Every part should last the whole mission.'
          : `The ${s.lifeLimitedBy} is expected to fail after ${years(s.designLifeYears)}, before the mission ends.`,
        fixHint: 'Choose longer-lasting parts or protect them from radiation.',
      }),
    );
  }

  const counts: Record<CheckStatus, number> = { pass: 0, warn: 0, fail: 0, pending: 0 };
  for (const item of checks) counts[item.status] += 1;
  const decided = counts.pass + counts.warn + counts.fail;
  const score = decided === 0 ? 0 : (counts.pass + counts.warn * 0.5) / decided;
  const grade: Grade =
    counts.fail > 0 ? (counts.fail > 2 ? 'F' : 'D') : score >= 0.95 ? 'A' : score >= 0.85 ? 'B' : 'C';

  return {
    checks,
    summary: s,
    go: counts.fail === 0 && counts.pending === 0,
    passable: counts.fail === 0,
    grade,
    counts,
  };
}
