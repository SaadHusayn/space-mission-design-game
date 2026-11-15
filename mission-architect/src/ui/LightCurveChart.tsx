'use client';

import { physics } from '@/game';
import { journeyViewStore, useJourneyView } from '@/scenes/Journey/journeyViewStore';

interface LightCurveChartProps {
  pointingQuality: number;
  cooled: boolean;
}

const EARTH_R_KM = 6371;
const SUN_R_KM = 696_000;

const TARGETS = {
  trappist1e: {
    id: 'trappist1e' as const,
    name: 'TRAPPIST-1e (Habitable Zone)',
    starName: 'TRAPPIST-1 (M8V Ultra-Cool Red Dwarf · 40 ly)',
    planetRadiusEarth: 0.92,
    starRadiusSun: 0.119,
    periodDays: 6.1,
    summary: 'Earth-sized world in the temperate zone of a tiny red dwarf.',
  },
  trappist1b: {
    id: 'trappist1b' as const,
    name: 'TRAPPIST-1b (Inner World)',
    starName: 'TRAPPIST-1 (M8V Ultra-Cool Red Dwarf · 40 ly)',
    planetRadiusEarth: 1.12,
    starRadiusSun: 0.119,
    periodDays: 1.51,
    summary: 'Closest planet to TRAPPIST-1; produces a deep 0.77% transit dip every 36 hours.',
  },
  proximab: {
    id: 'proximab' as const,
    name: 'Proxima Centauri b (4.24 ly)',
    starName: 'Proxima Centauri (M5.5V Red Dwarf · Nearest Exoplanet)',
    planetRadiusEarth: 1.07,
    starRadiusSun: 0.154,
    periodDays: 11.2,
    summary: 'The closest known exoplanet to our Solar System, orbiting our nearest stellar neighbour.',
  },
  sun_earth: {
    id: 'sun_earth' as const,
    name: 'Earth Analogue around Sun-like Star',
    starName: 'G2V Sun-like Star',
    planetRadiusEarth: 1.0,
    starRadiusSun: 1.0,
    periodDays: 365.25,
    summary: 'A big Sun-like star hides a small rocky planet: the 0.0084% dip is 60–90× shallower than around TRAPPIST-1.',
  },
};

/**
 * Chapter 5b Exoplanet Transit Photometry Light-Curve Analyzer:
 * Displays starlight brightness vs. time and ΔF/F = (R_p / R_star)².
 */
export function LightCurveChart({ pointingQuality, cooled }: LightCurveChartProps) {
  const targetKey = useJourneyView((state) => state.exoplanetTarget);
  const viewMode = useJourneyView((state) => state.viewMode);
  const target = TARGETS[targetKey];

  const dipFraction = physics.transitDepth(
    target.planetRadiusEarth * EARTH_R_KM,
    target.starRadiusSun * SUN_R_KM,
  );
  const dipPercent = dipFraction * 100;

  // Visual dip depth in the SVG (scaled so tiny Sun-like dips vs deep red-dwarf dips are clearly comparable)
  const visualDipPx = targetKey === 'sun_earth' ? 7 : Math.min(48, Math.max(18, dipPercent * 58));
  const noisePx = pointingQuality >= 0.95 && cooled ? 1.2 : pointingQuality >= 0.8 ? 3.5 : 7.5;

  const samplePoints = Array.from({ length: 33 }, (_, i) => {
    const x = 18 + (i / 32) * 284;
    const inTransit = i >= 11 && i <= 21;
    const ingressEgress = i === 11 || i === 21 ? 0.5 : inTransit ? 1 : 0;
    const jitter = Math.sin(i * 2.9) * noisePx;
    const y = 24 + ingressEgress * visualDipPx + jitter;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div
      className="rounded-xl border border-purple-400/45 bg-space/90 p-3.5 text-xs"
      role="region"
      aria-label="Exoplanet Transit Light-Curve Analyzer"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-purple-300">
            Transit Photometry Light Curve · ΔF/F = (R_p ÷ R_★)²
          </span>
          <p className="mt-0.5 text-[11px] text-muted">{target.starName}</p>
        </div>
        <button
          type="button"
          onClick={() =>
            journeyViewStore
              .getState()
              .setViewMode(viewMode === 'exoplanet_artist' ? 'destination' : 'exoplanet_artist')
          }
          className="rounded-lg border border-purple-400/60 bg-purple-500/20 px-2.5 py-1 font-mono text-[11px] font-semibold text-purple-200 transition hover:bg-purple-500/30"
        >
          {viewMode === 'exoplanet_artist' ? 'VIEW L2 TELESCOPE ORBIT' : 'VIEW 3D EXOPLANET SYSTEM'}
        </button>
      </div>

      {/* Target selector pills */}
      <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Target Star Systems">
        {(Object.keys(TARGETS) as (keyof typeof TARGETS)[]).map((key) => {
          const item = TARGETS[key];
          const active = key === targetKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => journeyViewStore.getState().setExoplanetTarget(key)}
              className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ${
                active
                  ? 'border-purple-400 bg-purple-500/25 font-bold text-ink'
                  : 'border-line bg-black/30 text-muted hover:border-purple-400/50 hover:text-ink'
              }`}
            >
              {item.name}
            </button>
          );
        })}
      </div>

      {/* SVG Light Curve */}
      <div className="mt-2.5 rounded-lg border border-line bg-black/45 p-2">
        <svg viewBox="0 0 320 92" className="h-24 w-full overflow-visible" aria-label="Starlight brightness dip chart">
          <line x1="18" y1="24" x2="302" y2="24" stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />
          <line
            x1="18"
            y1={24 + visualDipPx}
            x2="302"
            y2={24 + visualDipPx}
            stroke="rgba(192,132,252,0.35)"
            strokeDasharray="2 3"
          />
          <polyline
            fill="none"
            stroke="#c084fc"
            strokeWidth="2.2"
            points={samplePoints}
          />
          <text x="22" y="16" fill="#9ca3af" fontSize="9" fontFamily="monospace">
            100.00% Baseline Starlight
          </text>
          <text x="118" y={Math.min(86, 38 + visualDipPx)} fill="#e9d5ff" fontSize="9.5" fontFamily="monospace">
            Transit Dip: −{dipPercent < 0.05 ? dipPercent.toFixed(4) : dipPercent.toFixed(2)}%
          </text>
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px]">
        <div className="rounded-lg border border-line bg-black/30 px-2.5 py-1.5">
          <div className="text-[10px] text-muted">Planet Radius</div>
          <div className="font-bold text-ink">{target.planetRadiusEarth.toFixed(2)} R⊕</div>
        </div>
        <div className="rounded-lg border border-line bg-black/30 px-2.5 py-1.5">
          <div className="text-[10px] text-muted">Star Radius</div>
          <div className="font-bold text-ink">{target.starRadiusSun.toFixed(3)} R☉</div>
        </div>
        <div className="rounded-lg border border-line bg-black/30 px-2.5 py-1.5">
          <div className="text-[10px] text-muted">Brightness Dip</div>
          <div className="font-bold text-purple-300">
            {dipPercent < 0.05 ? `${dipPercent.toFixed(4)}%` : `${dipPercent.toFixed(2)}%`}
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted">{target.summary}</p>
      <p className="mt-1.5 rounded border border-amber-400/35 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] text-amber-200">
        Note: Artist&apos;s impression from measured size and orbit — telescopes measure this brightness dip and orbital period, not a direct surface image.
      </p>
    </div>
  );
}
