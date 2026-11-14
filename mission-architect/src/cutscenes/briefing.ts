import { BRIEFINGS } from '@/game/data/story';
import { money } from '@/game/sim/format';
import type { MissionContext } from '@/game/types';

import { readingTime, type CutsceneScript, type CutsceneShot, type Vec3 } from './timeline';

/** Camera moves around the holo-table, used in order for each line. */
const ANGLES: readonly { from: Vec3; to: Vec3; lookFrom: Vec3; lookTo: Vec3 }[] = [
  { from: [8.5, 5, 9.5], to: [6.5, 4, 7.5], lookFrom: [0, 2.2, 0], lookTo: [0, 2.3, 0] },
  { from: [2.6, 2.9, 3.6], to: [1.9, 2.7, 2.9], lookFrom: [0, 2.6, 0], lookTo: [0, 2.6, 0] },
  { from: [-3.4, 2.5, 4.4], to: [-2.5, 2.3, 3.4], lookFrom: [-1.7, 1.9, 0.2], lookTo: [-1.5, 1.9, 0.2] },
  { from: [-2.6, 3.4, -3.2], to: [-1.9, 3.1, -2.5], lookFrom: [0, 2.6, 0], lookTo: [0, 2.6, 0] },
];

/** Builds the CS-03 briefing cutscene for a mission (lines from story data, budget filled in). */
export function briefingScript(mission: MissionContext): CutsceneScript {
  const lines = BRIEFINGS[mission.pathway.id];
  const shots: CutsceneShot[] = lines.map((line, index) => {
    const angle = ANGLES[index % ANGLES.length];
    const text = line.text.replace('{budget}', money(mission.budget));
    return { set: 'briefing', duration: readingTime(text) + 1, ...angle, line: { ...line, text } };
  });
  shots[0] = { ...shots[0], caption: `CHAPTER ${mission.pathway.chapter} · ${mission.pathway.name.toUpperCase()}` };
  return { id: `CS-03-${mission.pathway.id}`, title: `Briefing: ${mission.pathway.name}`, shots };
}
