/**
 * 1D launch ascent simulation for Phase 06 (LAUNCH phase).
 * Pure TypeScript, SI units (metres, m/s, m/s², Pascals, seconds).
 */
import { generateChallenge } from '../challenges/generator';
import type { Challenge, ChallengeContext, ChallengeResult } from '../challenges/types';
import { BODIES, G0 } from '../physics/constants';
import { gravityAt, orbitSpeedAtAltitude } from '../physics/orbit';
import type { LaunchVehicle, MissionContext } from '../types';
import type { DesignSummary } from './design';

export const SEA_LEVEL_DENSITY = 1.225;
export const SCALE_HEIGHT_M = 8_500;
export const KARMAN_LINE_M = 80_000;
export const COUNTDOWN_START_S = -4;
export const ASCENT_DURATION_S = 160;
export const ASCENT_TIME_SCALE = 12;
export const CLEAN_IGNITION_WINDOW_S = 0.65;
export const CLEAN_IGNITION_BONUS_DV = 25;
export const MAX_Q_UNTHROTTLED_PENALTY_DV = 35;

export type AscentStage =
  | 'countdown'
  | 'stage1'
  | 'maxQ'
  | 'meco'
  | 'stage2'
  | 'fairing_sep'
  | 'insertion'
  | 'orbit';

export type IgnitionStatus = 'pending' | 'clean' | 'nominal';

export interface AscentState {
  /** Mission clock in seconds (starts at -4s countdown; 0s is liftoff; 160s is orbit insertion). */
  t: number;
  stage: AscentStage;
  stageLabel: string;
  /** Altitude above Earth's surface, m. */
  altitudeM: number;
  /** Speed, m/s. */
  velocityMs: number;
  /** Felt acceleration, in g (m/s² ÷ 9.81). */
  accelerationG: number;
  /** Instantaneous dynamic pressure q = ½ ρ(h) v², Pa. */
  dynamicPressurePa: number;
  /** Peak dynamic pressure experienced so far, Pa. */
  peakDynamicPressurePa: number;
  /** Normalized Max-Q meter [0..1], where >= 0.70 is the red throttle-down zone. */
  maxQRatio: number;
  /** Target parking/mission orbit altitude, m. */
  targetAltitudeM: number;
  /** Target circular orbital speed at targetAltitudeM, m/s. */
  targetSpeedMs: number;
  /** Liftoff thrust-to-weight ratio. */
  liftoffTwr: number;
  /** Maximum vehicle G-load rating, g. */
  vehicleMaxG: number;
  /** Spacecraft bus structural G-load rating, g. */
  busMaxG: number;
  /** Base spacecraft Δv margin (spacecraft Δv - mission required Δv), m/s. */
  baseDeltaVMargin: number;
  /** Effective spacecraft Δv margin including launch bonuses/penalties, m/s. */
  deltaVMargin: number;
  /** Ignition timing result. */
  ignitionStatus: IgnitionStatus;
  /** Bonus Δv earned from clean T-0 ignition, m/s. */
  ignitionBonusDv: number;
  /** True while the rocket is inside the Max-Q throttle-down interactive window. */
  inMaxQWindow: boolean;
  /** True if the player throttled down during the Max-Q window. */
  maxQHandled: boolean;
  /** Current engine throttle [0..1]. */
  throttle: number;
  /** True if Max-Q passed without throttling down on a low-margin bus. */
  structuralWarning: boolean;
  /** Warning message if structural stress occurred during Max-Q. */
  warningMessage: string | null;
  /** True once Stage 1 has separated (t >= 78 s). */
  stage1Separated: boolean;
  /** Time since Stage 1 separation, s (for 3D separation animation). */
  stage1SepElapsedS: number;
  /** True once the payload fairing has separated (t >= 115 s). */
  fairingSeparated: boolean;
  /** Time since fairing separation, s (for 3D fairing animation). */
  fairingSepElapsedS: number;
  /** Result of the orbit insertion physics challenge once completed. */
  insertionResult: ChallengeResult | null;
}

export interface LaunchResult {
  vehicleId: string;
  ignitionStatus: IgnitionStatus;
  ignitionBonusDv: number;
  maxQHandled: boolean;
  structuralWarning: boolean;
  peakDynamicPressureKPa: number;
  finalAltitudeKm: number;
  finalVelocityKms: number;
  deltaVMargin: number;
  insertionResult: ChallengeResult | null;
}

export const STAGE_LABELS: Readonly<Record<AscentStage, string>> = {
  countdown: 'Countdown',
  stage1: 'Stage 1',
  maxQ: 'Max-Q',
  meco: 'MECO',
  stage2: 'Stage 2',
  fairing_sep: 'Fairing Sep',
  insertion: 'Orbit Insertion',
  orbit: 'Orbit',
};

/** Exponential atmospheric density model ρ(h) = ρ₀ · exp(-h / H), kg/m³. */
export function atmosphericDensity(altitudeM: number): number {
  if (altitudeM <= 0) return SEA_LEVEL_DENSITY;
  if (altitudeM > 150_000) return 0;
  return SEA_LEVEL_DENSITY * Math.exp(-altitudeM / SCALE_HEIGHT_M);
}

/** Aerodynamic dynamic pressure q = ½ · ρ(h) · v², Pa. */
export function dynamicPressure(altitudeM: number, velocityMs: number): number {
  if (velocityMs <= 0) return 0;
  return 0.5 * atmosphericDensity(altitudeM) * velocityMs * velocityMs;
}

export const VEHICLE_HEIGHT_M: Readonly<Record<string, number>> = {
  lv_light: 24,
  lv_medium: 48,
  lv_heavy: 64,
  lv_superheavy: 92,
};

export function vehicleHeightM(vehicleId: string): number {
  return VEHICLE_HEIGHT_M[vehicleId] ?? 48;
}

/** Parking or target orbit altitude in metres for launch insertion. */
export function targetParkingAltitude(mission: MissionContext): number {
  if (mission.pathway.id === 'leo') {
    return mission.trajectory.id === 'leo_550' ? 550_000 : (mission.pathway.orbit?.altitudeKm ?? 400) * 1000;
  }
  return 250_000;
}

/** Circular orbit speed around Earth at `altitudeM`, m/s. */
export function targetOrbitalSpeed(altitudeM: number): number {
  return orbitSpeedAtAltitude(BODIES.earth, altitudeM);
}

/** Stage for a given mission clock time `t` (before orbit insertion is answered). */
export function stageForTime(t: number, completedInsertion: boolean): AscentStage {
  if (completedInsertion) return 'orbit';
  if (t < 0) return 'countdown';
  if (t < 26) return 'stage1';
  if (t < 62) return 'maxQ';
  if (t < 78) return 'meco';
  if (t < 115) return 'stage2';
  if (t < ASCENT_DURATION_S) return 'fairing_sep';
  return 'insertion';
}

/** Smooth hermite interpolation s(u) = 3u² - 2u³ for u in [0, 1]. */
function smoothstep(u: number): number {
  const x = Math.max(0, Math.min(1, u));
  return x * x * (3 - 2 * x);
}

/**
 * Computes physical altitude (m), speed (m/s), and felt acceleration (g) at mission time `t`.
 */
function kinematicsAt(
  t: number,
  targetAltitudeM: number,
  targetSpeedMs: number,
  liftoffTwr: number,
  vehicleMaxG: number,
  throttle: number,
): { altitudeM: number; velocityMs: number; accelerationG: number } {
  if (t <= 0 || liftoffTwr <= 1) {
    return { altitudeM: 0, velocityMs: 0, accelerationG: t < 0 ? 1.0 : Math.max(0, liftoffTwr) };
  }

  const progress = Math.min(1, t / ASCENT_DURATION_S);
  // Altitude follows a gravity-turn curve: steep climb in Stage 1/2, leveling off into circular orbit at targetAltitudeM.
  let altitudeM: number;
  if (t <= 62) {
    // 0 to 42 km through Stage 1 & Max-Q
    const u = t / 62;
    altitudeM = 42_000 * Math.pow(u, 1.85);
  } else if (t <= 115) {
    // 42 km to 115 km through MECO, Stage 2 ignition, and Karman line
    const u = (t - 62) / (115 - 62);
    altitudeM = 42_000 + (115_000 - 42_000) * smoothstep(u);
  } else {
    // 115 km to targetAltitudeM (e.g. 250 km or 400 km or 550 km)
    const u = (t - 115) / (ASCENT_DURATION_S - 115);
    altitudeM = 115_000 + (targetAltitudeM - 115_000) * smoothstep(u);
  }

  // Velocity builds monotonically to orbital speed v = sqrt(GM / r)
  let velocityMs: number;
  if (t <= 62) {
    // 0 to 1,650 m/s by end of Max-Q (passes ~520 m/s around h = 12 km where q peaks)
    const u = t / 62;
    velocityMs = 1_650 * Math.pow(u, 1.45);
  } else if (t <= 78) {
    // MECO coast / staging around 1,650 -> 2,150 m/s
    const u = (t - 62) / (78 - 62);
    velocityMs = 1_650 + 500 * u;
  } else {
    // Stage 2 burn from 2,150 m/s to targetSpeedMs (~7,670 m/s)
    const u = Math.min(1, (t - 78) / (ASCENT_DURATION_S - 78));
    velocityMs = 2_150 + (targetSpeedMs - 2_150) * Math.pow(u, 1.12);
  }

  // Acceleration in g: starts at liftoffTwr, climbs toward vehicleMaxG before MECO, drops during MECO, then Stage 2 burn, then 0g in free-fall orbit
  const localG = gravityAt(BODIES.earth.gm, BODIES.earth.radius + altitudeM);
  const gravityRatio = localG / G0;
  let accelerationG: number;
  if (progress >= 1) {
    // In circular orbit, spacecraft is in free fall (0 g felt acceleration)
    accelerationG = 0;
  } else if (t >= 62 && t < 75) {
    // Brief MECO / staging dip
    accelerationG = 0.25;
  } else if (t < 62) {
    const stage1Frac = t / 62;
    const rawG = liftoffTwr + (vehicleMaxG - liftoffTwr) * Math.pow(stage1Frac, 1.15);
    accelerationG = Math.min(vehicleMaxG, rawG * throttle);
  } else {
    const stage2Frac = (t - 75) / (ASCENT_DURATION_S - 75);
    accelerationG = (1.35 + (vehicleMaxG * 0.88 - 1.35) * stage2Frac) * gravityRatio;
  }

  return { altitudeM, velocityMs, accelerationG };
}

/** Creates the initial ascent state on the launch pad at T-4 seconds. */
export function createAscent(
  mission: MissionContext,
  summary: DesignSummary,
  vehicle: LaunchVehicle,
): AscentState {
  const targetAltitudeM = targetParkingAltitude(mission);
  const targetSpeedMs = targetOrbitalSpeed(targetAltitudeM);
  const busMaxG = summary.resolved.bus?.maxG ?? vehicle.maxG;
  const baseDeltaVMargin = Math.round(summary.deltaV - mission.env.deltaV);

  const liftoffTwr =
    summary.liftoffTwr ?? vehicle.thrust / ((vehicle.liftoffMass + summary.wetMass) * G0);

  return {
    t: COUNTDOWN_START_S,
    stage: 'countdown',
    stageLabel: STAGE_LABELS.countdown,
    altitudeM: 0,
    velocityMs: 0,
    accelerationG: 1.0,
    dynamicPressurePa: 0,
    peakDynamicPressurePa: 0,
    maxQRatio: 0,
    targetAltitudeM,
    targetSpeedMs,
    liftoffTwr,
    vehicleMaxG: vehicle.maxG,
    busMaxG,
    baseDeltaVMargin,
    deltaVMargin: baseDeltaVMargin,
    ignitionStatus: 'pending',
    ignitionBonusDv: 0,
    inMaxQWindow: false,
    maxQHandled: false,
    throttle: 1.0,
    structuralWarning: false,
    warningMessage: null,
    stage1Separated: false,
    stage1SepElapsedS: 0,
    fairingSeparated: false,
    fairingSepElapsedS: 0,
    insertionResult: null,
  };
}

/**
 * Evaluates the player's ignition button press during countdown.
 * Pressing near T-0 (within [-0.65s, +0.4s]) grants a clean ignition +25 m/s Δv bonus
 * and immediately starts liftoff at T=0 if in the window.
 */
export function triggerIgnition(state: AscentState): AscentState {
  if (state.ignitionStatus !== 'pending') return state;
  const isClean = state.t >= -CLEAN_IGNITION_WINDOW_S && state.t <= 0.4;
  const ignitionStatus: IgnitionStatus = isClean ? 'clean' : 'nominal';
  const ignitionBonusDv = isClean ? CLEAN_IGNITION_BONUS_DV : 0;
  const nextT = state.t < 0 ? 0 : state.t;
  const stage = stageForTime(nextT, state.insertionResult !== null);

  return {
    ...state,
    t: nextT,
    stage,
    stageLabel: STAGE_LABELS[stage],
    ignitionStatus,
    ignitionBonusDv,
    deltaVMargin: state.baseDeltaVMargin + ignitionBonusDv,
  };
}

/**
 * Engages Max-Q throttle-down when dynamic pressure climbs into the Max-Q region.
 */
export function engageMaxQThrottle(state: AscentState): AscentState {
  if (state.maxQHandled || state.t < 10 || state.t > 70) return state;
  return {
    ...state,
    maxQHandled: true,
    throttle: 0.72,
    structuralWarning: false,
    warningMessage: null,
  };
}

/**
 * Steps the 1D ascent simulation forward by `realDtSeconds` of wall-clock time.
 * Countdown runs at 1x real time; powered ascent runs at `ASCENT_TIME_SCALE * timeScale`
 * until `t = ASCENT_DURATION_S` (`'insertion'`), where it pauses for the Orbit Insertion physics challenge.
 */
export function stepAscent(state: AscentState, realDtSeconds: number, timeScale = 1): AscentState {
  if (state.stage === 'orbit' || state.stage === 'insertion') return state;
  if (realDtSeconds <= 0) return state;

  const clampedDt = Math.min(realDtSeconds, 5.0) * Math.max(0.25, timeScale);
  let nextT: number;
  if (state.t < 0) {
    nextT = state.t + clampedDt;
    if (nextT >= 0) {
      // Crossed T-0 into liftoff
      nextT = nextT * ASCENT_TIME_SCALE;
    }
  } else {
    nextT = Math.min(ASCENT_DURATION_S, state.t + clampedDt * ASCENT_TIME_SCALE);
  }

  let ignitionStatus = state.ignitionStatus;
  const ignitionBonusDv = state.ignitionBonusDv;
  if (nextT >= 0 && ignitionStatus === 'pending') {
    ignitionStatus = 'nominal';
  }

  const stage = stageForTime(nextT, state.insertionResult !== null);
  const inMaxQWindow = nextT >= 22 && nextT <= 58;
  const throttle = inMaxQWindow && state.maxQHandled ? 0.72 : 1.0;

  const { altitudeM, velocityMs, accelerationG } = kinematicsAt(
    nextT,
    state.targetAltitudeM,
    state.targetSpeedMs,
    state.liftoffTwr,
    state.vehicleMaxG,
    throttle,
  );

  const rawQ = dynamicPressure(altitudeM, velocityMs);
  const dynamicPressurePa = state.maxQHandled && inMaxQWindow ? rawQ * 0.76 : rawQ;
  const peakDynamicPressurePa = Math.max(state.peakDynamicPressurePa, dynamicPressurePa);
  // Reference peak dynamic pressure is ~35,000 Pa (35 kPa)
  const maxQRatio = Math.min(1, dynamicPressurePa / 34_000);

  // Check if rocket just exited Max-Q without throttling down
  let structuralWarning = state.structuralWarning;
  let warningMessage = state.warningMessage;
  if (nextT > 60 && !state.maxQHandled && !structuralWarning) {
    const gMargin = state.busMaxG - state.vehicleMaxG;
    if (gMargin <= 1.5) {
      structuralWarning = true;
      warningMessage =
        'High aerodynamic stress through Max-Q without throttling down cost 35 m/s of attitude-control propellant.';
    } else {
      warningMessage = 'Max-Q passed at full throttle; the bus structure absorbed the peak aerodynamic load.';
    }
  }

  const penaltyDv = structuralWarning ? MAX_Q_UNTHROTTLED_PENALTY_DV : 0;
  const challengeDvCost = state.insertionResult?.consequence.deltaVCost ?? 0;
  const deltaVMargin = state.baseDeltaVMargin + ignitionBonusDv - penaltyDv - challengeDvCost;

  const stage1Separated = nextT >= 78;
  const stage1SepElapsedS = stage1Separated ? (nextT - 78) / ASCENT_TIME_SCALE : 0;
  const fairingSeparated = nextT >= 115;
  const fairingSepElapsedS = fairingSeparated ? (nextT - 115) / ASCENT_TIME_SCALE : 0;

  return {
    ...state,
    t: nextT,
    stage,
    stageLabel: STAGE_LABELS[stage],
    altitudeM,
    velocityMs,
    accelerationG,
    dynamicPressurePa,
    peakDynamicPressurePa,
    maxQRatio,
    ignitionStatus,
    ignitionBonusDv,
    inMaxQWindow,
    throttle,
    structuralWarning,
    warningMessage,
    deltaVMargin,
    stage1Separated,
    stage1SepElapsedS,
    fairingSeparated,
    fairingSepElapsedS,
  };
}

/** Jumps the ascent directly to the Orbit Insertion challenge at `t = ASCENT_DURATION_S`. */
export function skipToInsertion(state: AscentState): AscentState {
  if (state.stage === 'orbit' || state.stage === 'insertion') return state;
  const ignitionStatus: IgnitionStatus = state.ignitionStatus === 'pending' ? 'nominal' : state.ignitionStatus;
  const { altitudeM, velocityMs } = kinematicsAt(
    ASCENT_DURATION_S,
    state.targetAltitudeM,
    state.targetSpeedMs,
    state.liftoffTwr,
    state.vehicleMaxG,
    1.0,
  );
  return {
    ...state,
    t: ASCENT_DURATION_S,
    stage: 'insertion',
    stageLabel: STAGE_LABELS.insertion,
    altitudeM,
    velocityMs,
    accelerationG: 0,
    dynamicPressurePa: 0,
    peakDynamicPressurePa: Math.max(state.peakDynamicPressurePa, 31_500),
    maxQRatio: 0,
    ignitionStatus,
    inMaxQWindow: false,
    throttle: 1.0,
    stage1Separated: true,
    stage1SepElapsedS: 6,
    fairingSeparated: true,
    fairingSepElapsedS: 4,
  };
}

/** Completes the Orbit Insertion physics challenge and transitions the ascent state to `'orbit'`. */
export function completeInsertion(state: AscentState, result: ChallengeResult): AscentState {
  const penaltyDv = state.structuralWarning ? MAX_Q_UNTHROTTLED_PENALTY_DV : 0;
  const challengeDvCost = result.consequence.deltaVCost ?? 0;
  const deltaVMargin = state.baseDeltaVMargin + state.ignitionBonusDv - penaltyDv - challengeDvCost;
  return {
    ...state,
    t: ASCENT_DURATION_S,
    stage: 'orbit',
    stageLabel: STAGE_LABELS.orbit,
    altitudeM: state.targetAltitudeM,
    velocityMs: state.targetSpeedMs,
    accelerationG: 0,
    dynamicPressurePa: 0,
    maxQRatio: 0,
    inMaxQWindow: false,
    insertionResult: result,
    deltaVMargin,
  };
}

/** Summarizes the completed ascent into a `LaunchResult` stored in `gameStore`. */
export function toLaunchResult(state: AscentState, vehicleId: string): LaunchResult {
  return {
    vehicleId,
    ignitionStatus: state.ignitionStatus,
    ignitionBonusDv: state.ignitionBonusDv,
    maxQHandled: state.maxQHandled,
    structuralWarning: state.structuralWarning,
    peakDynamicPressureKPa: Math.round((state.peakDynamicPressurePa / 1000) * 10) / 10,
    finalAltitudeKm: Math.round(state.altitudeM / 1000),
    finalVelocityKms: Math.round((state.velocityMs / 1000) * 100) / 100,
    deltaVMargin: state.deltaVMargin,
    insertionResult: state.insertionResult,
  };
}

/**
 * Selects the Orbit Insertion physics challenge for the mission (`orbitSpeed` or `centripetal`,
 * with fallback to `rocketEquation` or `twr` for non-planetary-orbit pathways).
 */
export function insertionChallengeFor(ctx: ChallengeContext): Challenge {
  const challenge =
    generateChallenge('orbitSpeed', ctx) ??
    generateChallenge('centripetal', ctx) ??
    generateChallenge('rocketEquation', ctx) ??
    generateChallenge('twr', ctx);
  if (!challenge) {
    throw new Error(`No orbit insertion challenge available for pathway "${ctx.mission.pathway.id}"`);
  }
  return challenge;
}
