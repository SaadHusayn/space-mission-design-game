/**
 * Radiation dose model (simplified): dose = rate × time × (1 − shielding).
 * @param ratePerDay dose rate of the environment
 * @param days exposure time
 * @param attenuation share of the dose the shielding stops, 0..1
 */
export function accumulatedDose(ratePerDay: number, days: number, attenuation: number = 0): number {
  const blocked = Math.min(1, Math.max(0, attenuation));
  return Math.max(0, ratePerDay) * Math.max(0, days) * (1 - blocked);
}
