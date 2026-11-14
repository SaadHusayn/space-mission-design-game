/**
 * Transit method: when a planet crosses in front of its star, the star dims
 * by the share of its disc the planet covers: depth = (R_planet / R_star)².
 */
export function transitDepth(planetRadius: number, starRadius: number): number {
  if (starRadius <= 0) return 0;
  const ratio = planetRadius / starRadius;
  return ratio * ratio;
}
