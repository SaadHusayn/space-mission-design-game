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

/** Lines for each pathway's briefing (CS-03). `{budget}` is filled in for the chosen difficulty. */
export const BRIEFINGS: Readonly<Record<import('../types').PathwayId, readonly Line[]>> = {
  leo: [
    { speaker: 'hale', text: 'Your first mission: fly two astronauts into orbit, photograph Earth’s weather and climate, and bring them home.' },
    { speaker: 'okafor', text: 'To stay up there you need about 7.7 kilometres per second, sideways. Too slow, and you fall back.' },
    { speaker: 'hale', text: 'Your budget is {budget}. Your crew’s safety comes first.' },
  ],
  moon: [
    { speaker: 'hale', text: 'Near the Moon’s poles, some craters never see sunlight. Ice may hide inside them. Find it.' },
    { speaker: 'okafor', text: 'Getting into lunar orbit and home again costs about two kilometres per second. Every extra kilogram needs more propellant.' },
    { speaker: 'hale', text: 'Budget: {budget}. A crew of two, home in under two weeks.' },
  ],
  mars: [
    { speaker: 'hale', text: 'Carry four astronauts into orbit around Mars, study its thin atmosphere, then bring them home.' },
    { speaker: 'kenji', text: 'Sunlight at Mars is only 43 percent of Earth’s, and a radio message takes up to 22 minutes.' },
    { speaker: 'ferreira', text: 'More than a year in deep space. Radiation and weightlessness are the real dangers for your crew.' },
    { speaker: 'hale', text: 'Budget: {budget}. This is the hardest crewed mission we have ever planned.' },
  ],
  jupiter: [
    { speaker: 'hale', text: 'Jupiter: a giant planet with a magnetic field bigger than the Sun. Send a robot to study it.' },
    { speaker: 'kenji', text: 'Sunlight out there is 3.7 percent of Earth’s. Your solar arrays must be enormous.' },
    { speaker: 'okafor', text: 'Its radiation belts destroy unprotected electronics within days. Shield them. Budget: {budget}.' },
  ],
  interstellar: [
    { speaker: 'hale', text: 'Voyager 1 crossed the edge of the Sun’s bubble at about 121 AU. Send a new probe past it.' },
    { speaker: 'kenji', text: 'At 120 AU sunlight is 14,400 times weaker. Solar panels are useless there.' },
    { speaker: 'echo', text: 'A command takes more than 16 hours to arrive. Your probe must think for itself. Budget: {budget}.' },
  ],
  exoplanet: [
    { speaker: 'hale', text: 'Are there Earth-sized worlds around other stars? We can’t fly there yet, but we can watch them.' },
    { speaker: 'ferreira', text: 'When a planet passes in front of its star, the starlight dips. For an Earth around the Sun, the dip is just 0.0084 percent.' },
    { speaker: 'okafor', text: 'From L2, 1.5 million kilometres out, the Sun, Earth and Moon all stay behind you. Budget: {budget}.' },
  ],
};
