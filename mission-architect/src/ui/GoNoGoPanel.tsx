'use client';

import { useMemo } from 'react';

import {
  createMission,
  getLaunchVehicle,
  reviewDesign,
  summarizeDesign,
  type CheckStatus,
  type ReviewCheck,
} from '@/game';
import { SPEAKERS, type SpeakerId } from '@/game/data/story';
import { fmt, kg } from '@/game/sim/format';
import { useGame } from '@/hooks/useGame';

import { Button } from './Button';

const ROCKET_CHECK_IDS = new Set(['ERB-1L', 'ERB-3', 'ERB-9', 'ERB-13']);

interface PollStation {
  id: string;
  station: string;
  speakerId: SpeakerId;
  checkIds: readonly string[];
}

const POLL_STATIONS: readonly PollStation[] = [
  {
    id: 'booster',
    station: 'BOOSTER & PROPULSION',
    speakerId: 'okafor',
    checkIds: ['ERB-1L', 'ERB-3', 'ERB-9', 'ERB-1B', 'ERB-2'],
  },
  {
    id: 'power',
    station: 'POWER, THERMAL & ENTRY',
    speakerId: 'kenji',
    checkIds: ['ERB-4', 'ERB-5', 'ERB-10', 'ERB-12'],
  },
  {
    id: 'comms',
    station: 'GUIDANCE, COMMS & DATA',
    speakerId: 'echo',
    checkIds: ['ERB-6', 'ERB-7', 'ERB-8'],
  },
  {
    id: 'science',
    station: 'PAYLOAD & CREW SYSTEMS',
    speakerId: 'ferreira',
    checkIds: ['ERB-0', 'ERB-11'],
  },
  {
    id: 'director',
    station: 'FLIGHT DIRECTOR & BUDGET',
    speakerId: 'hale',
    checkIds: ['ERB-13'],
  },
];

function badgeForStatus(status: CheckStatus): { label: string; className: string } {
  switch (status) {
    case 'pass':
      return { label: 'GO', className: 'border-ok/50 bg-ok/15 text-ok' };
    case 'warn':
      return { label: 'GO (ADVISORY)', className: 'border-warn/50 bg-warn/15 text-warn' };
    case 'fail':
      return { label: 'NO-GO', className: 'border-danger/60 bg-danger/15 text-danger' };
    case 'pending':
      return { label: 'PENDING', className: 'border-line bg-white/10 text-muted' };
  }
}

/**
 * GO_NO_GO phase UI: Final launch readiness poll re-evaluating all ERB checks
 * with the selected launch vehicle (resolving ERB-1L, ERB-3, ERB-9, ERB-13 per D11).
 */
export function GoNoGoPanel() {
  const missionState = useGame((state) => state.mission);
  const design = useGame((state) => state.design);
  const vehicleId = useGame((state) => state.vehicleId);
  const difficulty = useGame((state) => state.profile.difficulty);
  const confirmGoForLaunch = useGame((state) => state.confirmGoForLaunch);
  const goTo = useGame((state) => state.goTo);

  const mission = useMemo(
    () => (missionState ? createMission(missionState.pathwayId, missionState.trajectoryId ?? undefined, difficulty) : null),
    [missionState, difficulty],
  );
  const vehicle = useMemo(() => (vehicleId ? getLaunchVehicle(vehicleId) : null), [vehicleId]);

  const { summary, review } = useMemo(() => {
    if (!mission || !design || !vehicle) return { summary: null, review: null };
    return {
      summary: summarizeDesign(design, mission, vehicle),
      review: reviewDesign(design, mission, vehicle),
    };
  }, [mission, design, vehicle]);

  if (!mission || !design || !vehicle || !summary || !review) return null;

  const checkById = new Map<string, ReviewCheck>(review.checks.map((c) => [c.id, c]));
  const rocketChecks = review.checks.filter((c) => ROCKET_CHECK_IDS.has(c.id));
  const failures = review.checks.filter((c) => c.status === 'fail');
  const warnings = review.checks.filter((c) => c.status === 'warn');

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
      {/* Header */}
      <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel px-5 py-3.5 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Step 4 · Launch Readiness Poll · GO / NO-GO Review
          </p>
          <h1 className="mt-0.5 text-xl font-bold text-ink sm:text-2xl">
            {mission.pathway.name} · {vehicle.name} · {mission.trajectory.name}
          </h1>
        </div>
        <div
          data-testid="go-no-go-verdict"
          className={`rounded-full border px-4 py-1.5 text-sm font-bold uppercase tracking-[0.16em] ${
            review.go
              ? 'border-ok bg-ok/15 text-ok'
              : 'border-danger bg-danger/15 text-danger'
          }`}
        >
          {review.go ? 'ALL STATIONS GO FOR LAUNCH' : `HOLD — NO-GO (${failures.length} FAILURE${failures.length === 1 ? '' : 'S'})`}
        </div>
      </header>

      {/* Main Content */}
      <div className="my-3 grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-12">
        {/* Left 7 cols: Resolved Rocket ERB Checks + Flight Control Poll */}
        <div className="pointer-events-auto flex flex-col gap-4 lg:col-span-7">
          {/* Resolved Rocket-Dependent Checks (ERB-1L, ERB-3, ERB-9, ERB-13) */}
          <section
            className="rounded-2xl border border-line bg-panel p-4 backdrop-blur"
            aria-label="Launch vehicle engineering checks"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Launch Vehicle Integration Checks (D11 Resolved)
              </p>
              <span className="font-mono text-xs text-muted">
                {vehicle.name} · Liftoff Mass {kg(vehicle.liftoffMass + summary.wetMass)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rocketChecks.map((check) => {
                const badge = badgeForStatus(check.status);
                return (
                  <div
                    key={check.id}
                    data-testid={`gonogo-check-${check.id}`}
                    className={`rounded-xl border p-3 ${
                      check.status === 'fail'
                        ? 'border-danger/60 bg-danger/10'
                        : check.status === 'warn'
                          ? 'border-warn/50 bg-warn/10'
                          : 'border-line/80 bg-black/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-accent">{check.id}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-ink">{check.title}</h3>
                    <p className="mt-0.5 font-mono text-xs text-ink/90">
                      {check.value} <span className="text-muted">(Req: {check.limit})</span>
                    </p>
                    <p className="mt-1 text-xs leading-snug text-muted">{check.explanation}</p>
                    {check.fixHint && (
                      <p className="mt-1.5 rounded bg-black/35 px-2 py-1 text-xs font-semibold text-warn">
                        Fix: {check.fixHint}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Station-by-Station Flight Director Poll */}
          <section
            className="rounded-2xl border border-line bg-panel p-4 backdrop-blur"
            aria-label="Flight control station poll"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Mission Control Station Poll
            </p>
            <ul className="mt-3 space-y-2.5">
              {POLL_STATIONS.map((station) => {
                const speaker = SPEAKERS[station.speakerId];
                const stationChecks = station.checkIds
                  .map((id) => checkById.get(id))
                  .filter((c): c is ReviewCheck => c !== undefined);
                const hasFail = stationChecks.some((c) => c.status === 'fail');
                const hasWarn = stationChecks.some((c) => c.status === 'warn');
                const stationStatus: CheckStatus = hasFail ? 'fail' : hasWarn ? 'warn' : 'pass';
                const badge = badgeForStatus(stationStatus);

                return (
                  <li
                    key={station.id}
                    data-testid={`poll-station-${station.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/70 bg-black/25 px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold"
                        style={{ borderColor: speaker.colour, color: speaker.colour }}
                        aria-hidden
                      >
                        {speaker.initials}
                      </span>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink">
                          {station.station}{' '}
                          <span className="font-normal text-muted">· {speaker.name}</span>
                        </p>
                        <p className="text-xs text-muted">
                          {stationChecks
                            .map((c) => `${c.id} ${c.status === 'fail' ? '✗' : c.status === 'warn' ? '⚠' : '✓'}`)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Right 5 cols: Failures, Warnings, Actionable Fixes & Complete Checklist */}
        <div className="pointer-events-auto flex flex-col gap-4 lg:col-span-5">
          {failures.length > 0 && (
            <section
              className="rounded-2xl border border-danger/60 bg-danger/10 p-4 backdrop-blur"
              aria-label="Blocking NO-GO failures"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-danger">
                Blocking NO-GO Failures ({failures.length})
              </p>
              <ul className="mt-2.5 space-y-2.5 text-xs">
                {failures.map((fail) => (
                  <li key={fail.id} className="rounded-xl border border-danger/40 bg-black/35 p-3">
                    <p className="font-bold text-ink">
                      {fail.id} · {fail.title}: <span className="font-mono text-danger">{fail.value}</span>
                    </p>
                    <p className="mt-1 text-muted">{fail.explanation}</p>
                    {fail.fixHint && (
                      <p className="mt-1.5 font-semibold text-warn">Actionable Fix: {fail.fixHint}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {warnings.length > 0 && (
            <section
              className="rounded-2xl border border-warn/50 bg-warn/10 p-4 backdrop-blur"
              aria-label="Engineering advisories"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-warn">
                Engineering Advisories ({warnings.length})
              </p>
              <ul className="mt-2.5 space-y-2 text-xs">
                {warnings.map((warn) => (
                  <li key={warn.id} className="rounded-xl border border-warn/30 bg-black/30 p-2.5">
                    <p className="font-bold text-ink">
                      {warn.id} · {warn.title}: <span className="font-mono text-warn">{warn.value}</span>
                    </p>
                    {warn.fixHint && <p className="mt-0.5 text-muted">{warn.fixHint}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Full 15-check summary table */}
          <section className="rounded-2xl border border-line bg-panel p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Complete Verification Matrix ({review.counts.pass} Pass · {review.counts.warn} Warn · {review.counts.fail} Fail)
              </p>
            </div>
            <div className="mt-2.5 max-h-60 space-y-1.5 overflow-y-auto pr-1 text-xs">
              {review.checks.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line/50 bg-black/20 px-2.5 py-1.5"
                >
                  <span className="font-semibold text-ink">
                    <span className="font-mono text-muted">{c.id}</span> · {c.title}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      c.status === 'pass'
                        ? 'text-ok'
                        : c.status === 'warn'
                          ? 'text-warn'
                          : 'text-danger'
                    }`}
                  >
                    {c.status === 'pass' ? 'GO' : c.status === 'warn' ? `WARN (${fmt(summary.liftoffTwr ?? 0, 2)})` : 'NO-GO'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Footer Navigation */}
      <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel px-5 py-3.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => goTo('LAUNCH_VEHICLE')}>
            ← CHANGE LAUNCH VEHICLE
          </Button>
          <Button variant="secondary" onClick={() => goTo('ASSEMBLY')}>
            ← RETURN TO HANGAR
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {!review.go && (
            <p className="text-xs font-semibold text-danger" role="status">
              Launch hold: resolve {failures.map((f) => f.id).join(', ')} by selecting a compatible rocket or modifying the spacecraft.
            </p>
          )}
          <Button
            disabled={!review.go}
            onClick={() => confirmGoForLaunch()}
          >
            ROLL OUT TO LAUNCH PAD →
          </Button>
        </div>
      </footer>
    </div>
  );
}
