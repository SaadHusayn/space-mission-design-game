import type { SpeakerId } from '@/game/data/story';

export type TrainingTask = 'orbit' | 'zoom' | 'select' | 'swap' | 'challenge' | 'none';

export interface TrainingStep {
  id: string;
  speaker: SpeakerId;
  text: string;
  task: TrainingTask;
  /** What the player must do, shown as a checklist item. */
  taskLabel?: string;
}

export const TRAINING_STEPS: readonly TrainingStep[] = [
  {
    id: 'welcome',
    speaker: 'okafor',
    text: 'Welcome to the Mission Design Center. I’m Dr. Imani Okafor, propulsion and structures. This is our test spacecraft. Have a look around it.',
    task: 'orbit',
    taskLabel: 'Drag with the mouse (or one finger) to look around',
  },
  {
    id: 'zoom',
    speaker: 'okafor',
    text: 'Good. Engineers work up close: zoom in on the spacecraft.',
    task: 'zoom',
    taskLabel: 'Scroll, or pinch with two fingers, to zoom',
  },
  {
    id: 'select',
    speaker: 'kenji',
    text: 'I’m Kenji Watanabe, power and thermal. Every part of a spacecraft has a job. Click a part to find out what it does.',
    task: 'select',
    taskLabel: 'Click any part of the spacecraft',
  },
  {
    id: 'swap',
    speaker: 'ferreira',
    text: 'I’m Dr. Lucía Ferreira, mission scientist. This panel shows every resource the mission has. Watch what happens when we fit a bigger solar array.',
    task: 'swap',
    taskLabel: 'Fit the bigger solar array',
  },
  {
    id: 'tradeoff',
    speaker: 'ferreira',
    text: 'More power, but more mass, more cost and less Δv to spare. That’s a trade-off. In mission design, nothing comes free.',
    task: 'none',
  },
  {
    id: 'challenge',
    speaker: 'okafor',
    text: 'Last test: physics. Before any launch we check that the rocket can actually lift off.',
    task: 'challenge',
    taskLabel: 'Answer the physics question',
  },
  {
    id: 'done',
    speaker: 'hale',
    text: 'Training complete. Welcome to the astronaut class. One tradition before your first mission: design your crew’s patch.',
    task: 'none',
  },
];
