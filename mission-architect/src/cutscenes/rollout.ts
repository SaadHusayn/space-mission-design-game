import { readingTime, type CutsceneScript } from '@/cutscenes/timeline';
import type { LaunchVehicle, MissionContext } from '@/game/types';

/** Builds the CS-04 Rollout to Launch Pad cutscene script. */
export function rolloutScript(mission: MissionContext, vehicle: LaunchVehicle): CutsceneScript {
  const line1 = `Crawler-transporter on the pad. ${vehicle.name} is vertical at Launch Complex 39 with your ${mission.pathway.name} spacecraft encapsulated in the nose fairing.`;
  const line2 = `Propellant load is underway. Liftoff thrust is ${(vehicle.thrust / 1000).toLocaleString('en-US')} kilonewtons; watch dynamic pressure closely as we climb through Max-Q.`;
  const line3 = `All stations are GO. Flight crew, take your consoles for terminal countdown and orbit insertion.`;

  return {
    id: `CS-04-${mission.pathway.id}`,
    title: `Rollout: ${vehicle.name}`,
    shots: [
      {
        set: 'launchpad',
        duration: readingTime(line1) + 1,
        from: [18, 3.5, 22],
        to: [13, 5.5, 16],
        lookFrom: [0, 6, 0],
        lookTo: [0, 10, 0],
        caption: `LAUNCH COMPLEX · ${vehicle.name.toUpperCase()}`,
        line: { speaker: 'hale', text: line1 },
      },
      {
        set: 'launchpad',
        duration: readingTime(line2) + 1,
        from: [-12, 4, 15],
        to: [-8, 12, 11],
        lookFrom: [0, 8, 0],
        lookTo: [0, 15, 0],
        line: { speaker: 'okafor', text: line2 },
      },
      {
        set: 'launchpad',
        duration: readingTime(line3) + 1,
        from: [6, 16, 14],
        to: [4, 18, 10],
        lookFrom: [0, 16, 0],
        lookTo: [0, 19, 0],
        line: { speaker: 'echo', text: line3 },
      },
    ],
  };
}
