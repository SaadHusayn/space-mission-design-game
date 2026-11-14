import { G0 } from './constants';

/**
 * Thrust-to-weight ratio. A rocket only leaves the pad if this is above 1.
 * @param thrust engine thrust, N
 * @param mass total mass, kg
 * @param gravity local gravity, m/s² (Earth's surface by default)
 */
export function thrustToWeight(thrust: number, mass: number, gravity: number = G0): number {
  if (mass <= 0 || gravity <= 0) return 0;
  return thrust / (mass * gravity);
}

/**
 * Tsiolkovsky rocket equation: Δv = Isp · g₀ · ln(m₀ / m_f).
 * @param isp specific impulse, s
 * @param wetMass mass before the burn, kg
 * @param dryMass mass after the burn, kg
 * @returns velocity change, m/s (0 when there is no propellant to burn)
 */
export function deltaV(isp: number, wetMass: number, dryMass: number): number {
  if (isp <= 0 || dryMass <= 0 || wetMass <= dryMass) return 0;
  return isp * G0 * Math.log(wetMass / dryMass);
}

/** Mass ratio m₀ / m_f needed for a velocity change. */
export function massRatioFor(dv: number, isp: number): number {
  if (isp <= 0) return Infinity;
  return Math.exp(Math.max(0, dv) / (isp * G0));
}

/** Propellant needed to give `dryMass` a velocity change of `dv`, kg. */
export function propellantFor(dv: number, isp: number, dryMass: number): number {
  return dryMass * (massRatioFor(dv, isp) - 1);
}
