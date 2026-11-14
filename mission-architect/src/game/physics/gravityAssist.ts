/**
 * Gravity assist (unpowered flyby).
 *
 * Relative to the planet, the spacecraft leaves as fast as it arrived; only
 * its direction turns. Relative to the Sun, that turn is a real change of
 * velocity, paid for by a tiny change in the planet's own orbit.
 */

/**
 * Angle the flyby path turns through: sin(δ/2) = 1 / (1 + r_p v∞² / GM), rad.
 * @param gm planet's gravitational parameter
 * @param vInfinity approach speed far from the planet, m/s
 * @param periapsis closest-approach distance from the planet's centre, m
 */
export function flybyTurnAngle(gm: number, vInfinity: number, periapsis: number): number {
  const sinHalf = 1 / (1 + (periapsis * vInfinity * vInfinity) / gm);
  return 2 * Math.asin(sinHalf);
}

/** Size of the velocity change in the Sun's frame: |Δv| = 2 v∞ sin(δ/2), m/s. */
export function flybyDeltaV(gm: number, vInfinity: number, periapsis: number): number {
  return 2 * vInfinity * Math.sin(flybyTurnAngle(gm, vInfinity, periapsis) / 2);
}
