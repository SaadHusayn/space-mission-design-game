import { AU, LIGHT_SPEED } from './constants';

/** One-way travel time of a radio signal over a distance, s. */
export function lightDelaySeconds(distanceAU: number): number {
  return (distanceAU * AU) / LIGHT_SPEED;
}

/**
 * Downlink rate at a distance from Earth, Mbps. The signal spreads out, so
 * the rate falls with the square of the distance; close to Earth it is
 * limited by the radio hardware instead.
 * @param rateAt1AU rate the antenna reaches at 1 AU, Mbps
 * @param maxRate hardware limit, Mbps
 */
export function downlinkRateMbps(rateAt1AU: number, maxRate: number, distanceAU: number): number {
  if (distanceAU <= 0) return maxRate;
  return Math.min(maxRate, rateAt1AU / (distanceAU * distanceAU));
}

/** Data sent per day at a rate (Mbps) over the daily ground-station contact time, Gb. */
export function dataPerDayGb(rateMbps: number, contactHours: number): number {
  return (rateMbps * contactHours * 3600) / 1000;
}
