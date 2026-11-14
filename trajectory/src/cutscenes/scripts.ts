/**
 * Prologue cutscenes (implementation-plan/00-scope-and-story.md §5).
 * Shot durations are at least the reading time of their line.
 */
import type { CutsceneScript } from './timeline';

export const CS_INTRO: CutsceneScript = {
  id: 'CS-00',
  title: 'Every mission starts with a question',
  shots: [
    {
      set: 'launchpad',
      duration: 6,
      from: [14, 1.6, 18],
      to: [8, 4, 12],
      lookFrom: [0, 6, 0],
      lookTo: [0, 9, 0],
      line: { speaker: 'echo', text: 'Pad 39, systems quiet. A rocket waits for a mission that hasn’t been designed yet.' },
    },
    {
      set: 'orbit',
      duration: 6,
      from: [0, 0.3, 9],
      to: [0, 0.6, 7],
      lookFrom: [-1.4, 0, 0],
      lookTo: [-1.8, 0.2, 0],
      line: { speaker: 'hale', text: 'Every mission starts with a question. Where are we going? What will we find there?' },
    },
    {
      set: 'orbit',
      duration: 6,
      from: [3, 1.2, 6],
      to: [1.5, 0.4, 5],
      lookFrom: [0, 0, 0],
      lookTo: [0, 0, 0],
      line: { speaker: 'hale', text: 'And what will it take to get there? Every answer is a trade-off. Physics doesn’t negotiate.' },
    },
    {
      set: 'orbit',
      duration: 4.5,
      from: [0, 0.6, 10],
      to: [0, 0.4, 8.5],
      lookFrom: [0, 0.5, 0],
      lookTo: [0, 0.3, 0],
      caption: 'The Orbital Exploration Agency is looking for its next astronaut class.',
    },
  ],
};

export const CS_NOMINATION: CutsceneScript = {
  id: 'CS-01',
  title: 'Nomination',
  shots: [
    {
      set: 'message',
      duration: 5,
      from: [0, 2.2, 9],
      to: [0, 2, 6.5],
      lookFrom: [0, 2, 0],
      lookTo: [0, 2.1, 0],
      caption: 'INCOMING TRANSMISSION · ORBITAL EXPLORATION AGENCY',
      line: { speaker: 'hale', text: 'Candidates: congratulations. You have been nominated to the OEA astronaut class.' },
    },
    {
      set: 'message',
      duration: 5.5,
      from: [-2.5, 2, 6],
      to: [-1.5, 2.1, 5],
      lookFrom: [0, 2, 0],
      lookTo: [0, 2, 0],
      line: { speaker: 'hale', text: 'Our astronauts don’t just fly spacecraft. They design them, side by side with our engineers.' },
    },
    {
      set: 'message',
      duration: 4.5,
      from: [2, 2.3, 5.5],
      to: [1.2, 2.2, 4.8],
      lookFrom: [0, 2, 0],
      lookTo: [0, 2, 0],
      line: { speaker: 'hale', text: 'Before you train, tell us who you are.' },
    },
  ],
};

export const CS_SELECTION: CutsceneScript = {
  id: 'CS-02',
  title: 'Selection',
  shots: [
    {
      set: 'centrifuge',
      duration: 6,
      from: [10, 6, 10],
      to: [7, 3, 8],
      lookFrom: [0, 1.5, 0],
      lookTo: [0, 1.5, 0],
      line: { speaker: 'okafor', text: 'The centrifuge. Spin fast enough and you’re pushed outwards with four times your weight. Launches feel like this.' },
    },
    {
      set: 'simulator',
      duration: 5.5,
      from: [0, 1.6, 3.5],
      to: [0, 1.5, 2.2],
      lookFrom: [0, 1.3, -2],
      lookTo: [0, 1.4, -3],
      line: { speaker: 'echo', text: 'The simulator. Every launch you fly here follows the same physics as the real thing.' },
    },
    {
      set: 'pool',
      duration: 6,
      from: [6, 2, 7],
      to: [4, 0.5, 5],
      lookFrom: [0, -1, 0],
      lookTo: [0, -1.5, 0],
      line: { speaker: 'ferreira', text: 'The pool. Water lets you rehearse weightlessness: your body floats, your tools don’t fall.' },
    },
    {
      set: 'hangar',
      duration: 5,
      from: [12, 7, 14],
      to: [7, 4, 9],
      lookFrom: [0, 2, 0],
      lookTo: [0, 2, 0],
      line: { speaker: 'okafor', text: 'One last stop: the Mission Design Center. This is where your missions begin.' },
    },
  ],
};

export const CUTSCENES = { 'CS-00': CS_INTRO, 'CS-01': CS_NOMINATION, 'CS-02': CS_SELECTION } as const;
