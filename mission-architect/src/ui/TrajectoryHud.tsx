'use client';

import { useMemo } from 'react';

import {
  createMission,
  getLaunchVehicle,
  getPathway,
  missionDays,
  physics,
  reviewDesign,
  summarizeDesign,
} from '@/game';
import { fmt, kms, ms, years } from '@/game/sim/format';
import type { PathwayId, TrajectoryOption } from '@/game/types';
import { useGame } from '@/hooks/useGame';

import { Button } from './Button';
import { ResourcePanel } from './ResourcePanel';

const LAUNCH_WINDOW_NOTES: Readonly<Record<string, { window: string; riskLevel: 'Low' | 'Moderate' | 'High' }>> = {
  leo_400: { window: 'Daily launch window (28.5°–51.6° inclination)', riskLevel: 'Low' },
  leo_550: { window: 'Daily launch window · Higher altitude orbital plane', riskLevel: 'Moderate' },
  moon_orbit: { window: 'Monthly nodal window · Low-altitude polar insertion', riskLevel: 'Moderate' },
  moon_free_return: { window: 'Bi-weekly translunar window · Passive Earth return', riskLevel: 'Low' },
  mars_hohmann: { window: '26-month synodic window · Minimum-energy Hohmann ellipse', riskLevel: 'Moderate' },
  mars_fast: { window: 'Immediate / off-optimum window (+40% Δv high-energy arc)', riskLevel: 'High' },
  jupiter_direct: { window: '13-month synodic window · Direct Hohmann to 5.2 AU', riskLevel: 'Moderate' },
  jupiter_ega: { window: '24-month Earth Gravity-Assist (EGA) slingshot window', riskLevel: 'Low' },
  interstellar_jupiter: { window: '12-year Jupiter alignment window · Oberth + gravity assist', riskLevel: 'Moderate' },
  interstellar_direct: { window: 'Annual solar-escape window · No planetary flyby', riskLevel: 'High' },
  exo_direct: { window: 'Monthly anti-sunward L2 transfer window', riskLevel: 'Low' },
  exo_lunar: { window: '28-day lunar phasing loop to Sun–Earth L2', riskLevel: 'Low' },
};

function marsHohmannDays(): number {
  const rEarth = physics.AU;
  const rMars = 1.524 * physics.AU;
  return Math.round(physics.hohmannTransferTime(rEarth, rMars, physics.BODIES.sun.gm) / physics.SECONDS_PER_DAY);
}

interface EvaluatedTrajectory {
  option: TrajectoryOption;
  context: ReturnType<typeof createMission>;
  summary: ReturnType<typeof summarizeDesign>;
  review: ReturnType<typeof reviewDesign>;
  totalDays: number;
  dvMargin: number;
  windowInfo: { window: string; riskLevel: 'Low' | 'Moderate' | 'High' };
}

/**
 * TRAJECTORY phase UI: Holographic trajectory comparison cards, physics breakdown,
 * feasibility status, and live mission resource panel.
 */
export function TrajectoryHud() {
  const missionState = useGame((state) => state.mission);
  const design = useGame((state) => state.design);
  const vehicleId = useGame((state) => state.vehicleId);
  const difficulty = useGame((state) => state.profile.difficulty);
  const selectTrajectory = useGame((state) => state.selectTrajectory);
  const proceedToLaunchVehicle = useGame((state) => state.proceedToLaunchVehicle);
  const goTo = useGame((state) => state.goTo);

  const pathwayId: PathwayId = missionState?.pathwayId ?? 'leo';
  const pathway = useMemo(() => getPathway(pathwayId), [pathwayId]);
  const selectedId = missionState?.trajectoryId ?? pathway.trajectories[0]?.id ?? '';
  const vehicle = useMemo(() => (vehicleId ? getLaunchVehicle(vehicleId) : null), [vehicleId]);

  const evaluated = useMemo<EvaluatedTrajectory[]>(() => {
    if (!design) return [];
    return pathway.trajectories.map((option) => {
      const context = createMission(pathway, option.id, difficulty);
      const summary = summarizeDesign(design, context, vehicle);
      const review = reviewDesign(design, context, vehicle);
      const totalDays = missionDays(context.env);
      const dvMargin = Math.round(summary.deltaV - context.env.deltaV);
      const windowInfo = LAUNCH_WINDOW_NOTES[option.id] ?? {
        window: 'Standard launch window',
        riskLevel: 'Moderate',
      };
      return { option, context, summary, review, totalDays, dvMargin, windowInfo };
    });
  }, [design, pathway, difficulty, vehicle]);

  if (!design || evaluated.length === 0) return null;

  const active = evaluated.find((item) => item.option.id === selectedId) ?? evaluated[0];
  const alternate = evaluated.find((item) => item.option.id !== active.option.id);
  const hohmannDays = pathwayId === 'mars' ? marsHohmannDays() : null;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
      {/* Top header */}
      <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel px-5 py-3.5 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Step 2 · Trajectory Design Room · Chapter {pathway.chapter}
          </p>
          <h1 className="mt-0.5 text-xl font-bold text-ink sm:text-2xl">
            {pathway.name}: Flight Path &amp; Transfer Selection
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-accent">
            Spacecraft Δv: {kms(active.summary.deltaV)} ({ms(active.summary.deltaV)})
          </span>
          <span className="rounded-full border border-line bg-black/30 px-3 py-1 text-ink">
            Wet mass: {fmt(active.summary.wetMass)} kg
          </span>
        </div>
      </header>

      {/* Main content: Trajectory cards + Live ResourcePanel */}
      <div className="my-3 grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-12">
        {/* Trajectory option cards */}
        <div className="pointer-events-auto flex flex-col gap-4 lg:col-span-8">
          {pathwayId === 'mars' && hohmannDays !== null && (
            <div className="rounded-xl border border-accent/40 bg-black/45 px-4 py-2.5 text-xs text-ink/90 backdrop-blur">
              <span className="font-bold uppercase tracking-[0.14em] text-accent">Orbital Mechanics Note: </span>
              Kepler&apos;s Third Law gives a minimum-energy Hohmann transfer from Earth (1.00 AU) to Mars (1.524 AU) an
              analytical half-period of <span className="font-mono font-semibold text-ink">{hohmannDays} days</span>{' '}
              outbound. Launching outside the Hohmann minimum-energy profile cuts transit to 180 days but requires ~40%
              more spacecraft Δv.
            </div>
          )}
          {pathwayId === 'jupiter' && (
            <div className="rounded-xl border border-accent/40 bg-black/45 px-4 py-2.5 text-xs text-ink/90 backdrop-blur">
              <span className="font-bold uppercase tracking-[0.14em] text-accent">Gravity Assist Note: </span>
              An Earth Gravity-Assist (EGA) loop adds 350 days of inner-solar-system cruise, but steals orbital momentum
              from Earth so your launch vehicle can lift <span className="font-mono font-semibold text-ok">+15%</span>{' '}
              more mass toward Jupiter.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {evaluated.map((item) => {
              const isSelected = item.option.id === active.option.id;
              const failingChecks = item.review.checks.filter((c) => c.status === 'fail');
              const riskTone =
                item.windowInfo.riskLevel === 'Low'
                  ? 'text-ok border-ok/40 bg-ok/10'
                  : item.windowInfo.riskLevel === 'Moderate'
                    ? 'text-warn border-warn/40 bg-warn/10'
                    : 'text-danger border-danger/40 bg-danger/10';

              return (
                <div
                  key={item.option.id}
                  data-testid={`trajectory-card-${item.option.id}`}
                  onClick={() => selectTrajectory(item.option.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectTrajectory(item.option.id);
                    }
                  }}
                  aria-pressed={isSelected}
                  className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-5 text-left transition backdrop-blur ${
                    isSelected
                      ? 'border-accent bg-panel shadow-[0_0_28px_rgba(92,225,255,0.18)]'
                      : 'border-line bg-panel/80 hover:border-accent/60'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.14em] ${
                          isSelected ? 'bg-accent text-space' : 'border border-line text-muted'
                        }`}
                      >
                        {isSelected ? 'Selected Trajectory' : 'Trajectory Option'}
                      </span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${riskTone}`}>
                        Risk: {item.windowInfo.riskLevel}
                      </span>
                    </div>

                    <h2 className="mt-2.5 text-lg font-bold text-ink">{item.option.name}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{item.option.summary}</p>
                    <p className="mt-2 rounded-lg bg-black/30 px-3 py-1.5 font-mono text-xs text-accent">
                      Window: {item.windowInfo.window}
                    </p>

                    {/* Key calculated metrics */}
                    <dl className="mt-3 grid grid-cols-2 gap-2.5 rounded-xl border border-line/70 bg-black/25 p-3 text-xs">
                      <div>
                        <dt className="uppercase tracking-[0.12em] text-muted">Required Δv</dt>
                        <dd className="mt-0.5 font-mono text-sm font-bold text-ink">
                          {kms(item.context.env.deltaV)}{' '}
                          <span className="text-xs font-normal text-muted">({ms(item.context.env.deltaV)})</span>
                        </dd>
                        <dd
                          className={`mt-0.5 font-mono text-xs font-semibold ${
                            item.dvMargin >= 0 ? 'text-ok' : 'text-danger'
                          }`}
                        >
                          {item.dvMargin >= 0
                            ? `+${fmt(item.dvMargin)} m/s margin`
                            : `−${fmt(Math.abs(item.dvMargin))} m/s deficit`}
                        </dd>
                      </div>

                      <div>
                        <dt className="uppercase tracking-[0.12em] text-muted">Travel &amp; Mission Time</dt>
                        <dd className="mt-0.5 font-mono text-sm font-bold text-ink">
                          {fmt(item.totalDays)} days{' '}
                          <span className="text-xs font-normal text-muted">
                            ({years(item.totalDays / physics.DAYS_PER_YEAR)})
                          </span>
                        </dd>
                        <dd className="mt-0.5 font-mono text-xs text-muted">
                          Out {fmt(item.context.env.cruiseDays)}d · Ops {fmt(item.context.env.operationsDays)}d
                          {item.context.env.returnDays > 0 ? ` · Ret ${fmt(item.context.env.returnDays)}d` : ''}
                        </dd>
                      </div>

                      <div>
                        <dt className="uppercase tracking-[0.12em] text-muted">Injection Target</dt>
                        <dd className="mt-0.5 font-mono text-xs font-semibold text-ink">
                          {item.context.env.launchTarget} · Capacity ×{fmt(item.context.env.launchCapacityFactor, 2)}
                        </dd>
                      </div>

                      <div>
                        <dt className="uppercase tracking-[0.12em] text-muted">Radiation &amp; Environment</dt>
                        <dd className="mt-0.5 font-mono text-xs text-ink">
                          {fmt(item.summary.electronicsDose, 1)} krad
                          {pathway.crewed ? ` · ${fmt(item.summary.crewDose)} mSv` : ''}
                        </dd>
                      </div>
                    </dl>

                    {/* Pros & Cons */}
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      <ul className="space-y-1">
                        {item.option.pros.map((pro) => (
                          <li key={pro} className="flex items-start gap-1.5 text-ok">
                            <span aria-hidden>+</span>
                            <span className="text-ink/90">{pro}</span>
                          </li>
                        ))}
                      </ul>
                      <ul className="space-y-1">
                        {item.option.cons.map((con) => (
                          <li key={con} className="flex items-start gap-1.5 text-warn">
                            <span aria-hidden>−</span>
                            <span className="text-ink/90">{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Feasibility footer */}
                  <div className="mt-4 border-t border-line/70 pt-3">
                    {item.review.passable ? (
                      <div className="flex items-center justify-between text-xs font-semibold text-ok">
                        <span>✓ Feasible with current spacecraft design</span>
                        {!isSelected && <span className="underline">Select</span>}
                      </div>
                    ) : (
                      <div className="text-xs text-danger">
                        <p className="font-bold">
                          ✗ Spacecraft shortfall ({failingChecks.map((c) => c.title).join(', ')})
                        </p>
                        <p className="mt-0.5 text-muted">
                          {failingChecks[0]?.fixHint || 'Return to Hangar to adjust propellant or equipment.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Live ResourcePanel */}
        <div className="pointer-events-auto lg:col-span-4">
          <ResourcePanel
            summary={active.summary}
            mission={active.context}
            before={alternate?.summary}
            title={`Trajectory Impact · ${active.option.name}`}
          />
        </div>
      </div>

      {/* Bottom navigation bar */}
      <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel px-5 py-3.5 backdrop-blur">
        <Button variant="secondary" onClick={() => goTo('ASSEMBLY')}>
          ← BACK TO HANGAR
        </Button>

        <div className="flex flex-wrap items-center gap-4">
          {!active.review.passable && (
            <p className="text-xs font-semibold text-danger" role="status">
              Selected trajectory exceeds spacecraft capability ({active.review.checks.find((c) => c.status === 'fail')?.title}).
              Switch trajectory or return to Hangar.
            </p>
          )}
          <Button
            disabled={!active.review.passable}
            onClick={() => proceedToLaunchVehicle()}
          >
            CHOOSE LAUNCH VEHICLE →
          </Button>
        </div>
      </footer>
    </div>
  );
}
