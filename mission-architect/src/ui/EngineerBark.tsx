'use client';

import { SPEAKERS, type SpeakerId } from '@/game/data/story';
import type { DesignSummary } from '@/game/sim/design';
import type { MissionContext, PathwayId } from '@/game/types';

const PATHWAY_INTRO_BARKS: Readonly<Record<PathwayId, { speaker: SpeakerId; text: string }>> = {
  leo: {
    speaker: 'okafor',
    text: 'In low Earth orbit you pass through shadow on every 92-minute lap. Don’t forget a battery and an Earth-rated heat shield.',
  },
  moon: {
    speaker: 'okafor',
    text: 'Getting into lunar orbit and home again takes over 2.1 km/s of Δv. Keep your capsule light or pack the service module full.',
  },
  mars: {
    speaker: 'ferreira',
    text: 'Over a year in deep space: cosmic radiation and weightlessness will wear the crew down without shielding and countermeasures.',
  },
  jupiter: {
    speaker: 'kenji',
    text: 'At Jupiter your solar arrays get under 4% of Earth’s sunlight, and its radiation belts fry unshielded electronics.',
  },
  interstellar: {
    speaker: 'kenji',
    text: 'At 120 AU sunlight is 14,400 times weaker than at Earth. Solar panels are useless out there — you need an RTG.',
  },
  exoplanet: {
    speaker: 'ferreira',
    text: 'At L2, catching a tiny starlight dip takes a steady precision pointing system and a cold telescope.',
  },
};

export function selectBark(summary: DesignSummary, mission: MissionContext): { speaker: SpeakerId; text: string } {
  const r = summary.resolved;
  if (!r.bus) {
    return PATHWAY_INTRO_BARKS[mission.pathway.id];
  }
  if (summary.wetMass > r.bus.maxMass) {
    return {
      speaker: 'okafor',
      text: `Fully fuelled, the craft is ${Math.round(summary.wetMass).toLocaleString('en-US')} kg — heavier than the ${r.bus.name} limit (${r.bus.maxMass.toLocaleString('en-US')} kg).`,
    };
  }
  if (r.power && summary.powerAvailable < summary.powerLoad) {
    return {
      speaker: 'kenji',
      text: `Power deficit! Your systems draw ${Math.round(summary.powerLoad)} W, but you only generate ${Math.round(summary.powerAvailable)} W at ${mission.env.sunDistanceAU} AU.`,
    };
  }
  if (r.propulsion && summary.deltaV < summary.deltaVRequired) {
    return {
      speaker: 'okafor',
      text: `You have ${(summary.deltaV / 1000).toFixed(2)} km/s of Δv, short of the ${(summary.deltaVRequired / 1000).toFixed(2)} km/s needed. Load more propellant or cut dry mass.`,
    };
  }
  if (summary.totalCost > mission.budget) {
    return {
      speaker: 'hale',
      text: `We are over budget ($${Math.round(summary.totalCost)}M vs $${mission.budget}M limit). Trim expensive subsystems before review.`,
    };
  }
  if (r.instruments.length > 0 && summary.science < mission.pathway.scienceTarget) {
    return {
      speaker: 'ferreira',
      text: `Expected science is ${Math.round(summary.science)} / ${mission.pathway.scienceTarget}. Check instrument fit, pointing accuracy, or antenna downlink rate.`,
    };
  }
  return PATHWAY_INTRO_BARKS[mission.pathway.id];
}

export function EngineerBark({ summary, mission }: { summary: DesignSummary; mission: MissionContext }) {
  const { speaker, text } = selectBark(summary, mission);
  const who = SPEAKERS[speaker];

  return (
    <div
      className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-panel px-3.5 py-2.5 backdrop-blur"
      role="region"
      aria-label={`Engineer advice from ${who.name}`}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
        style={{ borderColor: who.colour, color: who.colour }}
        aria-hidden
      >
        {who.initials}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold" style={{ color: who.colour }}>
          {who.name} <span className="font-normal text-muted">· {who.title}</span>
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink/90">{text}</p>
      </div>
    </div>
  );
}
