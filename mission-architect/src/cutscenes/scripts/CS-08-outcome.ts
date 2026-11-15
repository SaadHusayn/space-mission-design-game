import { readingTime, type CutsceneScript } from '@/cutscenes/timeline';
import type { EndReason, MissionContext, MissionOutcome } from '@/game';

/**
 * Builds the CS-08 Mission Outcome cutscene script (Phase 09 §4).
 *
 * - Success / Partial: the spacecraft operating on station with telemetry
 *   downlink, followed by Mission Control celebrating the science return.
 * - Failure: a calm, constructive engineering review ("Let's find out why")
 *   explaining which physical constraint stopped the flight.
 */
export function outcomeScript(
  mission: MissionContext,
  outcome: MissionOutcome,
  endReason: EndReason | null,
): CutsceneScript {
  const dest = mission.pathway.destination;
  const name = mission.pathway.name;

  if (outcome === 'success' || outcome === 'partial') {
    const line1 = `Telemetry lock confirmed from ${dest}. All primary science packets from ${name} are streaming cleanly through the Deep Space Network.`;
    const line2 =
      outcome === 'success'
        ? `Every contract requirement is verified green on the board! Science teams are already analysing the first calibrated datasets.`
        : `We captured over half of our target science dataset at ${dest}. Not every margin held, but the core payload delivered valuable discoveries.`;
    const line3 = `Outstanding work, crew. Let's open the full Engineering Debrief & Mission Report to see how each design choice shaped this flight.`;

    return {
      id: `CS-08-${mission.pathway.id}-${outcome}`,
      title: outcome === 'success' ? `Mission Accomplished · ${name}` : `Partial Mission Success · ${name}`,
      shots: [
        {
          set: 'orbit',
          duration: readingTime(line1) + 1,
          from: [-6.5, 2.2, 6.8],
          to: [-3.8, 1.6, 5.2],
          lookFrom: [0, 0.2, 0],
          lookTo: [0, 0.5, 0],
          caption: `${dest.toUpperCase()} · TELEMETRY DOWNLINK ACTIVE`,
          line: { speaker: 'ferreira', text: line1 },
        },
        {
          set: 'briefing',
          duration: readingTime(line2) + 1,
          from: [5.8, 3.1, 6.2],
          to: [3.2, 2.6, 4.8],
          lookFrom: [0, 1.8, 0],
          lookTo: [0, 2.1, 0],
          caption: 'OEA MISSION CONTROL · FLIGHT OPERATIONS',
          line: { speaker: 'echo', text: line2 },
        },
        {
          set: 'briefing',
          duration: readingTime(line3) + 1,
          from: [-4.2, 2.5, 5.4],
          to: [-2.4, 2.2, 4.2],
          lookFrom: [0, 1.9, 0],
          lookTo: [0, 2.0, 0],
          line: { speaker: 'hale', text: line3 },
        },
      ],
    };
  }

  const failureReasonText: Record<string, string> = {
    launch_failure: 'The spacecraft wet mass exceeded the launch vehicle capacity for this trajectory.',
    insertion_failure: 'Propellant reserves ran dry before orbit insertion completed — the rocket equation left no margin.',
    power_failure: 'Available electrical power fell below the spacecraft load at deep-space solar distance.',
    radiation: 'Cumulative ionizing radiation exceeded the avionics tolerance rating.',
    lifetime: 'Critical onboard hardware reached the end of its rated design life before mission completion.',
    supplies: 'Crew consumable supplies ran low, forcing an early return to protect the astronauts.',
    reentry_failure: 'The heat shield rating was insufficient for the atmospheric entry velocity.',
  };

  const detail =
    (endReason && failureReasonText[endReason]) ||
    `The mission fell short of its primary contract target at ${dest}.`;
  const line1 = `Flight telemetry has ended for ${name}. Let's stay calm and find out why — in spaceflight, every anomaly is an engineering lesson.`;
  const line2 = `${detail} Our pre-flight ERB numbers and flight recorders show the exact subsystem margin that gave way.`;
  const line3 = `Review the 'Why' analysis in the Mission Report, adjust the spacecraft in the Assembly Bay, and let's re-fly this pathway stronger.`;

  return {
    id: `CS-08-${mission.pathway.id}-failure`,
    title: `Engineering Debrief · ${name}`,
    shots: [
      {
        set: 'orbit',
        duration: readingTime(line1) + 1,
        from: [-6.2, 2.4, 6.6],
        to: [-4.2, 1.8, 5.0],
        lookFrom: [0, 0.2, 0],
        lookTo: [0, 0.4, 0],
        caption: `FLIGHT RECORDER REPLAY · LET'S FIND OUT WHY`,
        line: { speaker: 'okafor', text: line1 },
      },
      {
        set: 'hangar',
        duration: readingTime(line2) + 1,
        from: [6.4, 3.8, 7.6],
        to: [4.5, 3.0, 5.8],
        lookFrom: [0, 2.2, 0],
        lookTo: [0, 2.3, 0],
        caption: 'SUBSYSTEM MARGIN DIAGNOSTIC',
        line: { speaker: 'kenji', text: line2 },
      },
      {
        set: 'briefing',
        duration: readingTime(line3) + 1,
        from: [-4.0, 2.6, 5.5],
        to: [-2.5, 2.2, 4.3],
        lookFrom: [0, 1.9, 0],
        lookTo: [0, 2.0, 0],
        line: { speaker: 'hale', text: line3 },
      },
    ],
  };
}
