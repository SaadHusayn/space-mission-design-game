/**
 * Story text: characters and the prologue's lines. All characters and the
 * agency are fictional (see implementation-plan/00-scope-and-story.md).
 */
import type { Difficulty } from '../types';

export const AGENCY_NAME = 'Orbital Exploration Agency';
export const AGENCY_SHORT = 'OEA';

export const SPEAKERS = {
  hale: { name: 'Director Hale', title: 'Mission Director, OEA', colour: '#e8f1ff', initials: 'DH' },
  okafor: { name: 'Dr. Imani Okafor', title: 'Propulsion & Structures', colour: '#ffb547', initials: 'IO' },
  kenji: { name: 'Kenji Watanabe', title: 'Power & Thermal', colour: '#5ce1ff', initials: 'KW' },
  ferreira: { name: 'Dr. Lucía Ferreira', title: 'Mission Scientist', colour: '#b48cff', initials: 'LF' },
  echo: { name: 'CAPCOM "Echo"', title: 'Mission Control', colour: '#4cf0a0', initials: 'EC' },
} as const;

export type SpeakerId = keyof typeof SPEAKERS;

export interface Line {
  speaker: SpeakerId;
  text: string;
}

export const DIFFICULTIES: Readonly<Record<Difficulty, { name: string; summary: string }>> = {
  cadet: { name: 'Cadet', summary: 'Bigger budgets (+30%), worked hints for every physics question, fewer surprises.' },
  engineer: { name: 'Engineer', summary: 'The standard mission. Hints on request.' },
  director: { name: 'Flight Director', summary: 'Budgets 20% tighter, more random events, no hints.' },
};
