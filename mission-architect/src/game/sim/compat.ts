/**
 * Why a part can't be used on the current mission, or null when it can.
 *
 * Incompatible parts are greyed out in the part browser **with a reason**
 * (phase-05 acceptance criterion). This is deliberately small: most bad
 * choices are *allowed* here and caught by the Engineering Review instead —
 * the game teaches trade-offs, it doesn't hide them. Only physically
 * impossible combinations are blocked.
 */
import { gameData, type GameData } from '../data/loadData';
import type { Design, MissionContext, Part } from '../types';

export function incompatibilityReason(part: Part, mission: MissionContext, design: Design, data: GameData = gameData): string | null {
  const { env, pathway } = mission;

  // Magnetorquers push against a planet's magnetic field: useless in deep space.
  if (part.category === 'adcs' && part.nearEarthOnly && env.earthDistanceAU >= 0.0001) {
    return 'Pushes against Earth’s magnetic field, which is far too weak out here.';
  }

  // Crew systems on a robotic mission: there is nobody to keep alive.
  const crewOnly = part.category === 'lifeSupport' || part.category === 'habitat';
  if (crewOnly && !pathway.crewed) {
    return 'This mission is robotic: there is no crew to keep alive.';
  }
  if (part.category === 'heatShield' && pathway.returnEntrySpeed === null) {
    return 'This mission never returns through an atmosphere, so it needs no heat shield.';
  }

  // A part that is already in the design can't be equipped twice (instruments).
  if (part.category === 'instrument' && design.instrumentIds.includes(part.id)) {
    return 'Already on board.';
  }

  // The bus decides how many instruments fit.
  if (part.category === 'instrument') {
    const busPart = design.busId ? data.partById.get(design.busId) : null;
    const bus = busPart?.category === 'bus' ? busPart : null;
    if (!bus) return 'Choose a spacecraft bus first.';
    if (!design.instrumentIds.includes(part.id) && design.instrumentIds.length >= bus.instrumentSlots) {
      return `The ${bus.name} has room for ${bus.instrumentSlots} instrument${bus.instrumentSlots === 1 ? '' : 's'} and they are full.`;
    }
  }

  return null;
}

/**
 * Slots that make no sense for this mission are hidden entirely (they are not
 * just disabled): crew systems on a robotic probe, the heat shield without a
 * return through an atmosphere.
 */
export function slotApplicable(slot: keyof Design['slots'], mission: MissionContext): boolean {
  const crewOnly = slot === 'lifeSupport' || slot === 'habitat';
  if (crewOnly) return mission.pathway.crewed;
  if (slot === 'heatShield') return mission.pathway.returnEntrySpeed !== null;
  return true;
}
