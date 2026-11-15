'use client';

import { useEffect, useMemo, useRef } from 'react';

import { soundEngine } from '@/audio/soundEngine';
import {
  ASCENT_DURATION_S,
  CLEAN_IGNITION_WINDOW_S,
  COUNTDOWN_START_S,
  createMission,
  getLaunchVehicle,
  insertionChallengeFor,
  summarizeDesign,
  toLaunchResult,
} from '@/game';
import { fmt, kms, ms } from '@/game/sim/format';
import { useGame } from '@/hooks/useGame';
import { launchStore, useLaunch } from '@/scenes/Launch/launchStore';

import { Button } from './Button';
import { PhysicsConsole } from './PhysicsConsole';

function formatMissionClock(t: number): string {
  const sign = t < 0 ? 'T−' : 'T+';
  const abs = Math.abs(Math.round(t));
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  return `${sign}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const STAGE_SEQUENCE = [
  { id: 'stage1', label: 'Stage 1' },
  { id: 'maxQ', label: 'Max-Q' },
  { id: 'meco', label: 'MECO' },
  { id: 'stage2', label: 'Stage 2' },
  { id: 'fairing_sep', label: 'Fairing Sep' },
  { id: 'orbit', label: 'Orbit' },
] as const;

/**
 * LAUNCH phase 2D HUD: Live ascent telemetry, Ignition timing control,
 * Max-Q throttle-down control, Orbit Insertion Physics Console, and Orbit summary.
 */
export function LaunchHud() {
  const missionState = useGame((state) => state.mission);
  const design = useGame((state) => state.design);
  const vehicleId = useGame((state) => state.vehicleId);
  const difficulty = useGame((state) => state.profile.difficulty);
  const recordChallengeResult = useGame((state) => state.recordChallengeResult);
  const completeLaunch = useGame((state) => state.completeLaunch);

  const ascent = useLaunch((s) => s.ascent);
  const timeScale = useLaunch((s) => s.timeScale);
  const lastCountdownSec = useRef<number | null>(null);
  const lastStage = useRef<string | null>(null);

  useEffect(() => {
    if (!ascent) return;
    if (ascent.t < 0) {
      const sec = Math.ceil(ascent.t);
      if (sec >= -3 && sec <= -1 && sec !== lastCountdownSec.current) {
        lastCountdownSec.current = sec;
        soundEngine.playSfx('countdown');
      }
    } else if (lastCountdownSec.current !== 0) {
      lastCountdownSec.current = 0;
      soundEngine.playSfx('countdownFinal');
    }
    if (ascent.stage !== lastStage.current) {
      if (ascent.stage === 'stage2' || ascent.stage === 'fairing_sep') {
        soundEngine.playSfx('stageSep');
      }
      lastStage.current = ascent.stage;
    }
  }, [ascent]);

  const { mission, vehicle, summary, challenge } = useMemo(() => {
    if (!missionState || !design) {
      return { mission: null, vehicle: null, summary: null, challenge: null };
    }
    const m = createMission(missionState.pathwayId, missionState.trajectoryId ?? undefined, difficulty);
    const v = getLaunchVehicle(vehicleId ?? 'lv_medium');
    const s = summarizeDesign(design, m, v);
    const c = insertionChallengeFor({ mission: m, vehicle: v, summary: s });
    return { mission: m, vehicle: v, summary: s, challenge: c };
  }, [missionState, design, vehicleId, difficulty]);

  if (!mission || !vehicle || !summary || !challenge || !ascent) return null;

  const isInCleanWindow = ascent.t >= -CLEAN_IGNITION_WINDOW_S && ascent.t <= 0.4;
  const countdownProgress =
    ascent.t < 0 ? Math.min(1, Math.max(0, (ascent.t - COUNTDOWN_START_S) / Math.abs(COUNTDOWN_START_S))) : 1;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Telemetry Bar */}
      <header
        className="pointer-events-auto rounded-2xl border border-line bg-panel px-5 py-3.5 backdrop-blur"
        role="region"
        aria-label="Launch telemetry"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-accent/50 bg-black/40 px-3.5 py-1.5 font-mono text-lg font-bold text-accent">
              {formatMissionClock(ascent.t)}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                {vehicle.name} · {mission.pathway.name}
              </p>
              <h1 className="text-lg font-bold text-ink sm:text-xl" data-testid="launch-stage-label">
                Stage: {ascent.stageLabel}
              </h1>
            </div>
          </div>

          {/* Live Telemetry Readouts */}
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1 font-mono text-xs sm:grid-cols-5">
            <div>
              <dt className="uppercase text-muted">Altitude</dt>
              <dd className="text-sm font-bold text-ink" data-testid="telemetry-altitude">
                {fmt(ascent.altitudeM / 1000, 1)} km
              </dd>
            </div>
            <div>
              <dt className="uppercase text-muted">Velocity</dt>
              <dd className="text-sm font-bold text-ink" data-testid="telemetry-velocity">
                {kms(ascent.velocityMs)}
              </dd>
            </div>
            <div>
              <dt className="uppercase text-muted">Accel</dt>
              <dd className="text-sm font-bold text-ink" data-testid="telemetry-accel">
                {fmt(ascent.accelerationG, 2)} g
              </dd>
            </div>
            <div>
              <dt className="uppercase text-muted">Dyn Press (q)</dt>
              <dd
                className={`text-sm font-bold ${
                  ascent.maxQRatio >= 0.7 && !ascent.maxQHandled ? 'text-warn' : 'text-ink'
                }`}
              >
                {fmt(ascent.dynamicPressurePa / 1000, 1)} kPa
              </dd>
            </div>
            <div>
              <dt className="uppercase text-muted">Δv Margin</dt>
              <dd
                className={`text-sm font-bold ${ascent.deltaVMargin >= 0 ? 'text-ok' : 'text-danger'}`}
                data-testid="telemetry-dv-margin"
              >
                {ascent.deltaVMargin >= 0 ? '+' : ''}
                {ms(ascent.deltaVMargin)}
              </dd>
            </div>
          </dl>

          {/* Time Warp & Skip Controls */}
          {ascent.stage !== 'insertion' && ascent.stage !== 'orbit' && (
            <div className="flex items-center gap-2 text-xs">
              {([1, 2, 4] as const).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => launchStore.getState().setTimeScale(scale)}
                  className={`rounded-lg border px-2.5 py-1 font-mono font-bold transition ${
                    timeScale === scale
                      ? 'border-accent bg-accent text-space'
                      : 'border-line bg-black/30 text-muted hover:border-accent/60 hover:text-ink'
                  }`}
                >
                  {scale}×
                </button>
              ))}
              <button
                type="button"
                data-testid="skip-to-insertion-btn"
                onClick={() => launchStore.getState().skipToOrbitInsertion()}
                className="rounded-lg border border-line bg-black/35 px-3 py-1 font-semibold uppercase tracking-[0.12em] text-muted transition hover:border-accent hover:text-ink"
              >
                Skip to Insertion ▸
              </button>
            </div>
          )}
        </div>

        {/* Stage Progression Timeline Bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-2.5 text-xs">
          {STAGE_SEQUENCE.map((item, idx) => {
            const reached =
              (item.id === 'stage1' && ascent.t >= 0) ||
              (item.id === 'maxQ' && ascent.t >= 26) ||
              (item.id === 'meco' && ascent.t >= 62) ||
              (item.id === 'stage2' && ascent.t >= 78) ||
              (item.id === 'fairing_sep' && ascent.t >= 115) ||
              (item.id === 'orbit' && ascent.stage === 'orbit');
            const active =
              ascent.stage === item.id ||
              (item.id === 'orbit' && ascent.stage === 'insertion');
            return (
              <div key={item.id} className="flex items-center gap-2">
                {idx > 0 && <span className="text-muted/50">→</span>}
                <span
                  className={`rounded-full px-2.5 py-0.5 font-semibold ${
                    active
                      ? 'bg-accent text-space'
                      : reached
                        ? 'border border-ok/40 bg-ok/15 text-ok'
                        : 'border border-line/60 text-muted'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      {/* Center Interactive Overlay: Orbit Insertion Challenge OR Orbit Confirmed Summary */}
      <div className="my-3 flex flex-1 items-center justify-center overflow-y-auto">
        {ascent.stage === 'insertion' && (
          <div className="w-full max-w-2xl">
            <PhysicsConsole
              challenge={challenge}
              difficulty={difficulty}
              onDone={(res) => {
                recordChallengeResult(res);
                launchStore.getState().finishInsertion(res);
              }}
            />
          </div>
        )}

        {ascent.stage === 'orbit' && (
          <div
            data-testid="orbit-achieved-panel"
            className="hud-enter pointer-events-auto w-full max-w-xl rounded-2xl border border-ok/60 bg-panel p-6 backdrop-blur"
          >
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-ok">
              ✓ Orbit Insertion Confirmed · SECO
            </p>
            <h2 className="mt-1 text-2xl font-bold text-ink">
              {mission.pathway.name} Spacecraft in Stable Orbit
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Upper stage cutoff complete at {fmt(ascent.altitudeM / 1000)} km altitude and{' '}
              {kms(ascent.velocityMs)}. Payload fairing separated cleanly and spacecraft systems are on internal power.
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-line bg-black/30 p-4 font-mono text-xs">
              <div>
                <dt className="uppercase text-muted">Ignition Timing</dt>
                <dd className={ascent.ignitionStatus === 'clean' ? 'mt-0.5 font-bold text-ok' : 'mt-0.5 font-bold text-ink'}>
                  {ascent.ignitionStatus === 'clean'
                    ? '✓ Clean T-0 (+25 m/s Δv)'
                    : 'Nominal Liftoff (+0 m/s)'}
                </dd>
              </div>
              <div>
                <dt className="uppercase text-muted">Max-Q Aerodynamics</dt>
                <dd className={ascent.structuralWarning ? 'mt-0.5 font-bold text-warn' : 'mt-0.5 font-bold text-ok'}>
                  {ascent.maxQHandled
                    ? `✓ Throttled (${fmt(ascent.peakDynamicPressurePa / 1000, 1)} kPa)`
                    : ascent.structuralWarning
                      ? '⚠ Unthrottled (−35 m/s Δv)'
                      : `Nominal (${fmt(ascent.peakDynamicPressurePa / 1000, 1)} kPa)`}
                </dd>
              </div>
              <div>
                <dt className="uppercase text-muted">Orbit Physics Check</dt>
                <dd
                  className={
                    ascent.insertionResult?.correct === false
                      ? 'mt-0.5 font-bold text-warn'
                      : 'mt-0.5 font-bold text-ok'
                  }
                >
                  {ascent.insertionResult?.correct === false
                    ? 'Correction Burn (−40 m/s Δv)'
                    : '✓ Precision Insertion'}
                </dd>
              </div>
              <div>
                <dt className="uppercase text-muted">Final Δv Margin</dt>
                <dd className={`mt-0.5 font-bold ${ascent.deltaVMargin >= 0 ? 'text-ok' : 'text-danger'}`}>
                  {ascent.deltaVMargin >= 0 ? '+' : ''}
                  {ms(ascent.deltaVMargin)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex justify-end">
              <Button
                onClick={() => completeLaunch(toLaunchResult(ascent, vehicle.id))}
              >
                PROCEED TO MISSION JOURNEY →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Interactive Ascent Controls (Ignition Timing & Max-Q Throttle) */}
      {ascent.stage !== 'insertion' && ascent.stage !== 'orbit' && (
        <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel px-5 py-3.5 backdrop-blur">
          {/* Beat 1: Terminal Countdown Ignition Timing */}
          {ascent.stage === 'countdown' ? (
            <div className="flex flex-1 flex-wrap items-center justify-between gap-4">
              <div className="min-w-[240px] flex-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="uppercase tracking-[0.16em] text-accent">
                    Terminal Countdown · Press Ignite in Green T-0 Window for +25 m/s Δv Bonus
                  </span>
                  <span className="font-mono text-ink">{formatMissionClock(ascent.t)}</span>
                </div>
                <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
                  {/* Optimal T-0 window zone (last 16% of bar) */}
                  <div className="absolute inset-y-0 right-0 w-[18%] bg-ok/35" />
                  <div
                    className={`h-full transition-all duration-100 ${isInCleanWindow ? 'bg-ok' : 'bg-accent'}`}
                    style={{ width: `${countdownProgress * 100}%` }}
                  />
                </div>
              </div>
              <Button
                onClick={() => launchStore.getState().ignite()}
              >
                IGNITE MAIN ENGINE (T-0)
              </Button>
            </div>
          ) : (
            /* Post-liftoff interactive controls: Max-Q Throttle + Live Flight Events */
            <div className="flex flex-1 flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span
                  className={`rounded-full border px-3 py-1 font-semibold ${
                    ascent.ignitionStatus === 'clean'
                      ? 'border-ok/50 bg-ok/15 text-ok'
                      : 'border-line bg-black/30 text-ink'
                  }`}
                >
                  {ascent.ignitionStatus === 'clean'
                    ? '✓ Clean Ignition (+25 m/s Δv)'
                    : 'Nominal Liftoff'}
                </span>

                {ascent.stage1Separated && (
                  <span className="rounded-full border border-accent/50 bg-accent/15 px-3 py-1 font-semibold text-accent">
                    ✓ Stage 1 Separated · Upper Stage Burn
                  </span>
                )}

                {ascent.fairingSeparated && (
                  <span className="rounded-full border border-ok/50 bg-ok/15 px-3 py-1 font-semibold text-ok">
                    ✓ Fairing Separated (&gt;80 km) · Spacecraft Exposed
                  </span>
                )}

                {ascent.warningMessage && (
                  <span className="rounded-full border border-warn/50 bg-warn/15 px-3 py-1 font-semibold text-warn">
                    {ascent.warningMessage}
                  </span>
                )}
              </div>

              {/* Beat 2: Max-Q Dynamic Pressure Control */}
              {ascent.inMaxQWindow && (
                <div className="flex items-center gap-3">
                  <div className="w-40">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.12em]">
                      <span className={ascent.maxQHandled ? 'text-ok' : 'text-warn'}>
                        {ascent.maxQHandled ? 'Throttled (72%)' : 'Max-Q Load'}
                      </span>
                      <span className="font-mono text-ink">
                        {fmt(ascent.dynamicPressurePa / 1000, 1)} kPa
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full transition-all ${
                          ascent.maxQHandled
                            ? 'bg-ok'
                            : ascent.maxQRatio >= 0.7
                              ? 'bg-danger'
                              : 'bg-warn'
                        }`}
                        style={{ width: `${Math.min(100, ascent.maxQRatio * 100)}%` }}
                      />
                    </div>
                  </div>
                  <Button
                    disabled={ascent.maxQHandled}
                    onClick={() => launchStore.getState().throttleDownMaxQ()}
                  >
                    {ascent.maxQHandled ? '✓ MAX-Q THROTTLED' : 'THROTTLE DOWN (MAX-Q)'}
                  </Button>
                </div>
              )}

              {/* Ascent progress bar toward Orbit Insertion */}
              {!ascent.inMaxQWindow && (
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="font-mono">
                    Orbital Velocity Target: {kms(ascent.velocityMs)} / {kms(ascent.targetSpeedMs)}
                  </span>
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${Math.min(100, (ascent.t / ASCENT_DURATION_S) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </footer>
      )}
    </div>
  );
}
