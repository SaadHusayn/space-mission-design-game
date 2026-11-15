'use client';

import { physics } from '@/game';

interface DistanceLadderProps {
  currentSunAU: number;
}

const LADDER_RUNGS = [
  {
    id: 'moon',
    label: 'Moon (Lunar Orbit)',
    au: 0.00257,
    auLabel: '0.0026 AU (384,400 km)',
    lightTime: '1.28 s',
    voyagerTime: '~26 hours',
  },
  {
    id: 'earth',
    label: 'Earth Orbit',
    au: 1,
    auLabel: '1.0 AU (150M km)',
    lightTime: '8.3 min',
    voyagerTime: 'Departure',
  },
  {
    id: 'mars',
    label: 'Mars Orbit',
    au: 1.524,
    auLabel: '1.52 AU',
    lightTime: '12.7 min',
    voyagerTime: '~5 months',
  },
  {
    id: 'jupiter',
    label: 'Jupiter Gravity Assist',
    au: 5.2,
    auLabel: '5.2 AU',
    lightTime: '43 min',
    voyagerTime: '~1.5 years',
  },
  {
    id: 'heliopause',
    label: 'Heliopause (Voyager 1 · 121 AU)',
    au: 120,
    auLabel: '120 AU (18B km)',
    lightTime: '16.6 hours',
    voyagerTime: '~17–33 years',
  },
  {
    id: 'proxima',
    label: 'Proxima Centauri (Nearest Star)',
    au: 268_000,
    auLabel: '268,000 AU (4.24 ly)',
    lightTime: '4.24 years',
    voyagerTime: '~74,000 years',
  },
] as const;

/**
 * Chapter 5a Interstellar Probe comparative distance ladder:
 * 120 AU Heliopause (~17–33 yr) vs. 268,000 AU Proxima Centauri (~74,000 yr).
 */
export function DistanceLadder({ currentSunAU }: DistanceLadderProps) {
  const sunlightAtCurrent = physics.sunlightFraction(Math.max(1, currentSunAU)) * 100;

  return (
    <div
      className="rounded-xl border border-accent/40 bg-space/90 p-3.5 text-xs"
      role="region"
      aria-label="Cosmic Distance Ladder"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          Interstellar Distance Ladder
        </span>
        <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-mono text-[11px] text-accent">
          Probe at {currentSunAU.toFixed(1)} AU · Sunlight {sunlightAtCurrent < 0.05 ? sunlightAtCurrent.toFixed(4) : sunlightAtCurrent.toFixed(1)}%
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Crossing the heliopause at 120 AU enters interstellar space — yet the nearest star is still 2,200× farther out.
      </p>

      <div className="mt-2.5 space-y-1.5">
        {LADDER_RUNGS.map((rung) => {
          const reached = currentSunAU >= rung.au * 0.95 && rung.id !== 'proxima';
          const isHeliopause = rung.id === 'heliopause';
          const isProxima = rung.id === 'proxima';
          return (
            <div
              key={rung.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] ${
                isHeliopause
                  ? 'border-accent/60 bg-accent/15 text-ink'
                  : isProxima
                    ? 'border-amber-400/45 bg-amber-500/10 text-amber-200'
                    : reached
                      ? 'border-ok/35 bg-ok/10 text-ink'
                      : 'border-line bg-black/30 text-muted'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={reached ? 'text-ok' : isProxima ? 'text-amber-300' : 'text-muted'}>
                  {reached ? '✓' : isProxima ? '★' : '○'}
                </span>
                <span className="font-semibold text-ink">{rung.label}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[10px]">
                <span>{rung.auLabel}</span>
                <span className="text-accent">Light: {rung.lightTime}</span>
                <span className={isProxima ? 'font-bold text-amber-300' : 'text-muted'}>
                  Travel: {rung.voyagerTime}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
