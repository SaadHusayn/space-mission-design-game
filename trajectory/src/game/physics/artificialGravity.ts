/**
 * Artificial gravity in a spinning habitat. The crew feel an outward
 * (centrifugal) acceleration a = ω² r, where ω is the spin rate in rad/s.
 */

const RPM_TO_RAD_PER_S = (2 * Math.PI) / 60;

/** Acceleration felt at a distance r from the spin axis, m/s². */
export function spinAcceleration(rpm: number, radius: number): number {
  const omega = rpm * RPM_TO_RAD_PER_S;
  return omega * omega * radius;
}

/** Spin rate that gives an acceleration at a radius, rpm. */
export function spinRpm(acceleration: number, radius: number): number {
  if (radius <= 0 || acceleration <= 0) return 0;
  return Math.sqrt(acceleration / radius) / RPM_TO_RAD_PER_S;
}

/** Arm length that gives an acceleration at a spin rate, m. */
export function spinRadius(acceleration: number, rpm: number): number {
  const omega = rpm * RPM_TO_RAD_PER_S;
  if (omega <= 0) return Infinity;
  return acceleration / (omega * omega);
}

export type SpinComfort = 'comfortable' | 'adaptation' | 'uncomfortable';

/** Game rule of thumb for how well a crew tolerates a spin rate. */
export function spinComfort(rpm: number): SpinComfort {
  if (rpm <= 2.05) return 'comfortable';
  if (rpm <= 4.05) return 'adaptation';
  return 'uncomfortable';
}
