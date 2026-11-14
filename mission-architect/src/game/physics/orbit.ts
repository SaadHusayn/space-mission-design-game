import type { Body } from './constants';

/** Gravitational acceleration at a distance r from a body's centre, m/s². */
export function gravityAt(gm: number, r: number): number {
  return gm / (r * r);
}

/** Surface gravity of a body, m/s². */
export function surfaceGravity(body: Body): number {
  return gravityAt(body.gm, body.radius);
}

/** Speed of a circular orbit of radius r: v = √(GM / r), m/s. */
export function circularOrbitSpeed(gm: number, r: number): number {
  return Math.sqrt(gm / r);
}

/** Circular orbit speed at an altitude above a body's surface, m/s. */
export function orbitSpeedAtAltitude(body: Body, altitude: number): number {
  return circularOrbitSpeed(body.gm, body.radius + altitude);
}

/**
 * Centripetal force that keeps a mass on a circle: F = m v² / r, N.
 * In orbit this force is supplied entirely by gravity.
 */
export function centripetalForce(mass: number, speed: number, r: number): number {
  return (mass * speed * speed) / r;
}

/** Escape velocity at a distance r: v = √(2GM / r), m/s. */
export function escapeVelocity(gm: number, r: number): number {
  return Math.sqrt((2 * gm) / r);
}

/** Period of an orbit with semi-major axis a, s. */
export function orbitalPeriod(gm: number, semiMajorAxis: number): number {
  return 2 * Math.PI * Math.sqrt(semiMajorAxis ** 3 / gm);
}

/**
 * Travel time of a Hohmann transfer between two circular orbits around the
 * same central body (half the period of the transfer ellipse), s.
 */
export function hohmannTransferTime(r1: number, r2: number, gmCentral: number): number {
  return orbitalPeriod(gmCentral, (r1 + r2) / 2) / 2;
}

/**
 * Velocity change to brake from a flyby into an elliptical orbit, burning at
 * the closest approach. Burning deeper in the gravity well costs less
 * (the Oberth effect).
 * @param gm planet's gravitational parameter
 * @param vInfinity approach speed far from the planet, m/s
 * @param periapsis closest-approach distance from the planet's centre, m
 * @param apoapsis farthest distance of the capture orbit, m
 */
export function captureDeltaV(gm: number, vInfinity: number, periapsis: number, apoapsis: number): number {
  const semiMajorAxis = (periapsis + apoapsis) / 2;
  const arrivalSpeed = Math.sqrt(vInfinity * vInfinity + (2 * gm) / periapsis);
  const orbitSpeed = Math.sqrt((2 * gm) / periapsis - gm / semiMajorAxis);
  return arrivalSpeed - orbitSpeed;
}
