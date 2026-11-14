/** Number formatting for explanations shown to players (rounded, with units). */

export function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function fmt(value: number, digits = 0): string {
  return round(value, digits).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export const kg = (value: number) => `${fmt(value)} kg`;
export const watts = (value: number) => `${fmt(value)} W`;
export const money = (value: number) => `$${fmt(value)}M`;
export const kms = (metresPerSecond: number) => `${fmt(metresPerSecond / 1000, 2)} km/s`;
export const ms = (metresPerSecond: number) => `${fmt(metresPerSecond)} m/s`;
export const gbPerDay = (value: number) => `${fmt(value, value < 1 ? 3 : 1)} Gb/day`;
export const years = (value: number) => `${fmt(value, 1)} years`;

export function duration(seconds: number): string {
  if (seconds < 60) return `${fmt(seconds, 1)} s`;
  if (seconds < 3600) return `${fmt(seconds / 60, 1)} min`;
  return `${fmt(seconds / 3600, 1)} hours`;
}
