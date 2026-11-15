'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  duration,
  fmt,
  gbPerDay,
  journeyChallengeSchedule,
  kms,
  liveTelemetry,
  summarizeDesign,
  watts,
} from '@/game';
import { AVATAR_COLOURS, ROLES } from '@/game/core/crew';
import { useGame } from '@/hooks/useGame';
import {
  journeyViewStore,
  useJourneyView,
  type JourneyViewMode,
  type TimeScale,
} from '@/scenes/Journey/journeyViewStore';

import { Button } from './Button';
import { DecisionLog } from './DecisionLog';
import { DistanceLadder } from './DistanceLadder';
import { EventModal } from './EventModal';
import { LightCurveChart } from './LightCurveChart';
import { PhysicsConsole } from './PhysicsConsole';

const END_REASON_LABELS: Record<string, { title: string; tone: 'ok' | 'bad' }> = {
  complete: { title: 'Mission Complete — All Flight Phases Finished', tone: 'ok' },
  launch_failure: { title: 'Mission Lost — Launch Failure', tone: 'bad' },
  insertion_failure: { title: 'Mission Lost — Orbit Insertion Failure (Insufficient Δv)', tone: 'bad' },
  power_failure: { title: 'Mission Lost — Spacecraft Power Blackout', tone: 'bad' },
  radiation: { title: 'Mission Lost — Avionics Radiation Failure', tone: 'bad' },
  lifetime: { title: 'Mission Ended — Component Design Lifetime Exceeded', tone: 'bad' },
  supplies: { title: 'Mission Aborted — Crew Supplies Exhausted', tone: 'bad' },
  reentry_failure: { title: 'Mission Lost — Heat Shield Failure on Re-entry', tone: 'bad' },
};

export function JourneyHud() {
  const [decisionLogOpen, setDecisionLogOpen] = useState(false);

  const journey = useGame((state) => state.journey);
  const crew = useGame((state) => state.profile.crew);
  const difficulty = useGame((state) => state.profile.difficulty);
  const decisionLog = useGame((state) => state.decisionLog);
  const activeVote = useGame((state) => state.activeVote);
  const lastEventResolution = useGame((state) => state.lastEventResolution);
  const completedChallengeIds = useGame((state) => state.completedChallengeIds);

  const beginJourney = useGame((state) => state.beginJourney);
  const stepJourney = useGame((state) => state.stepJourney);
  const stepToNextMilestone = useGame((state) => state.stepToNextMilestone);
  const chooseEventOption = useGame((state) => state.chooseEventOption);
  const startEventVote = useGame((state) => state.startEventVote);
  const startNegotiation = useGame((state) => state.startNegotiation);
  const setVoteHandoff = useGame((state) => state.setVoteHandoff);
  const acknowledgeVoteHandoff = useGame((state) => state.acknowledgeVoteHandoff);
  const submitMemberVote = useGame((state) => state.submitMemberVote);
  const breakVoteTie = useGame((state) => state.breakVoteTie);
  const expireNegotiationTimer = useGame((state) => state.expireNegotiationTimer);
  const dismissEventResolution = useGame((state) => state.dismissEventResolution);
  const completeJourneyChallenge = useGame((state) => state.completeJourneyChallenge);
  const finishJourney = useGame((state) => state.finishJourney);

  const viewMode = useJourneyView((state) => state.viewMode);
  const timeScale = useJourneyView((state) => state.timeScale);

  // Ensure journey is initialized if entering JOURNEY directly
  useEffect(() => {
    if (!journey) {
      beginJourney(1);
    }
  }, [journey, beginJourney]);

  const pathwayId = journey?.input.mission.pathway.id;
  useEffect(() => {
    journeyViewStore.getState().reset('destination');
  }, [pathwayId]);

  const telemetry = useMemo(() => (journey ? liveTelemetry(journey) : null), [journey]);
  const summary = useMemo(
    () =>
      journey
        ? summarizeDesign(journey.input.design, journey.input.mission, journey.input.vehicle)
        : null,
    [journey],
  );

  const schedule = useMemo(() => (journey ? journeyChallengeSchedule(journey) : []), [journey]);
  const activeChallenge = useMemo(() => {
    if (!journey || journey.ended || journey.pending) return null;
    const due = schedule.find(
      (item) => item.day <= journey.day && !completedChallengeIds.includes(item.challenge.id),
    );
    return due?.challenge ?? null;
  }, [journey, schedule, completedChallengeIds]);

  // Pause automatic playback when an event, challenge, or mission end occurs
  const pausedForPrompt = Boolean(!journey || journey.ended || journey.pending || activeChallenge);

  useEffect(() => {
    if (pausedForPrompt && timeScale !== 0) {
      journeyViewStore.getState().setTimeScale(0);
    }
  }, [pausedForPrompt, timeScale]);

  useEffect(() => {
    if (pausedForPrompt || timeScale === 0 || !journey) return;
    const intervalMs = timeScale === 1 ? 350 : timeScale === 10 ? 180 : 120;
    const daysPerTick =
      timeScale === 1
        ? 1
        : timeScale === 10
          ? Math.max(1, Math.ceil(journey.totalDays / 120))
          : timeScale === 100
            ? Math.max(2, Math.ceil(journey.totalDays / 35))
            : Math.max(5, Math.ceil(journey.totalDays / 10));

    const timer = window.setInterval(() => {
      stepJourney(daysPerTick);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [pausedForPrompt, timeScale, journey, stepJourney]);

  if (!journey || !telemetry || !summary) return null;

  const { mission } = journey.input;
  const { pathway } = mission;
  const sciencePct = Math.min(100, Math.round((journey.science / Math.max(1, pathway.scienceTarget)) * 100));
  const endInfo = journey.endReason ? END_REASON_LABELS[journey.endReason] : null;

  const viewOptions: { id: JourneyViewMode; label: string }[] = [
    { id: 'system', label: 'System Map' },
    { id: 'spacecraft', label: 'Spacecraft Close-Up' },
    { id: 'destination', label: 'Destination View' },
    ...(pathway.id === 'exoplanet'
      ? [{ id: 'exoplanet_artist' as const, label: 'Exoplanet System (3D)' }]
      : []),
  ];

  const speedOptions: { scale: TimeScale; label: string }[] = [
    { scale: 0, label: '⏸ Pause' },
    { scale: 1, label: '▶ 1×' },
    { scale: 10, label: '⏩ 10×' },
    { scale: 100, label: '⏩ 100×' },
    { scale: 1000, label: '⏩ 1000×' },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between overflow-y-auto p-3 sm:p-5">
      {/* Top Timeline & Controls Bar */}
      <header className="pointer-events-auto flex flex-col gap-2.5 rounded-2xl border border-line bg-panel/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Chapter {pathway.chapter} · {pathway.name}
              </span>
              <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 font-mono text-xs font-bold text-accent">
                {telemetry.phaseLabel}
              </span>
              {telemetry.survivalMode && !journey.ended && (
                <span className="rounded-full border border-bad/60 bg-bad/20 px-2.5 py-0.5 font-mono text-xs font-bold text-bad">
                  ⚠ SURVIVAL MODE (INSTRUMENTS OFF)
                </span>
              )}
              {journey.pending && (
                <span className="rounded-full border border-warn/60 bg-warn/20 px-2.5 py-0.5 font-mono text-xs font-bold text-warn">
                  ⚡ ACTIVE ALERT: {journey.pending.title.toUpperCase()}
                </span>
              )}
            </div>
            <h1 className="mt-0.5 text-lg font-bold text-ink sm:text-xl">
              Mission Flight &amp; Operations — {pathway.destination}
            </h1>
          </div>

          {/* 3D Camera View Switcher + Log & Dilemma Actions */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="3D Camera View">
            {viewOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={viewMode === opt.id}
                onClick={() => journeyViewStore.getState().setViewMode(opt.id)}
                className={`rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold transition ${
                  viewMode === opt.id
                    ? 'border-accent bg-accent/25 text-ink shadow'
                    : 'border-line bg-black/35 text-muted hover:border-accent/50 hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {!journey.ended && !journey.pending && (
              <button
                type="button"
                onClick={() => startNegotiation()}
                className="rounded-xl border border-warn/50 bg-warn/15 px-3 py-1.5 font-mono text-xs font-semibold text-warn transition hover:bg-warn/25"
              >
                ⚖ Team Dilemma
              </button>
            )}
            <button
              type="button"
              aria-expanded={decisionLogOpen}
              onClick={() => setDecisionLogOpen((open) => !open)}
              className={`rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold transition ${
                decisionLogOpen
                  ? 'border-accent bg-accent/25 text-ink'
                  : 'border-line bg-black/35 text-muted hover:border-accent/50 hover:text-ink'
              }`}
            >
              📋 Log ({decisionLog.length})
            </button>
          </div>
        </div>

        {/* Timeline progress bar & Time controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-2">
          <div className="min-w-[220px] flex-1">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-ink">
                Day {fmt(Math.min(journey.day, journey.totalDays))} / {fmt(journey.totalDays)}
              </span>
              <span className="text-muted">
                Cruise {fmt(journey.cruiseEnd)}d · Ops {fmt(journey.operationsEnd - journey.cruiseEnd)}d
                {journey.totalDays > journey.operationsEnd
                  ? ` · Return ${fmt(journey.totalDays - journey.operationsEnd)}d`
                  : ''}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/50">
              <div
                className={`h-full transition-all ${
                  journey.ended && journey.endReason !== 'complete' ? 'bg-bad' : 'bg-accent'
                }`}
                style={{ width: `${Math.round(telemetry.progress * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Time Controls">
            {speedOptions.map((item) => (
              <button
                key={item.scale}
                type="button"
                disabled={pausedForPrompt && item.scale !== 0}
                aria-pressed={timeScale === item.scale}
                onClick={() => journeyViewStore.getState().setTimeScale(item.scale)}
                className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition disabled:opacity-40 ${
                  timeScale === item.scale
                    ? 'border-accent bg-accent/25 text-ink'
                    : 'border-line bg-black/30 text-muted hover:border-accent/50 hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
            {!journey.ended && (
              <Button
                variant="secondary"
                disabled={pausedForPrompt}
                onClick={() => stepToNextMilestone()}
              >
                NEXT CHECKPOINT ⏭
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Grid: Left Live Telemetry Dashboard + Right Scenarios/Events/Checkpoints */}
      <div className="my-2 grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        {/* Left Column: Live Mission Telemetry Dashboard (R10) + Mission Control Crew Status */}
        <aside
          className="pointer-events-auto space-y-2.5 rounded-2xl border border-line bg-panel/95 p-4 shadow-lg backdrop-blur lg:col-span-5"
          aria-label="Live Mission Dashboard"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Live Telemetry Dashboard
            </h2>
            <span className="font-mono text-xs text-muted">
              {telemetry.sunDistanceAU < 0.1
                ? `${fmt(telemetry.sunDistanceAU, 3)} AU from Sun`
                : `${fmt(telemetry.sunDistanceAU, 2)} AU from Sun`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-3">
            {/* Power */}
            <div className="rounded-xl border border-line bg-black/35 p-2.5">
              <div className="text-[10px] uppercase text-muted">
                Power ({telemetry.powerSource === 'rtg' ? 'RTG' : `${fmt(telemetry.sunlightPercent, telemetry.sunlightPercent < 1 ? 2 : 0)}% Sun`})
              </div>
              <div
                className={`mt-0.5 text-sm font-bold ${
                  telemetry.survivalMode ? 'text-bad' : 'text-ok'
                }`}
              >
                {watts(telemetry.powerAvailable)} / {watts(telemetry.powerLoad)}
              </div>
              <div className="mt-0.5 text-[10px] text-muted">
                {telemetry.instrumentsOn ? 'Instruments ON' : telemetry.survivalMode ? 'Survival Mode' : 'Cruise Standby'}
              </div>
            </div>

            {/* Battery */}
            <div className="rounded-xl border border-line bg-black/35 p-2.5">
              <div className="text-[10px] uppercase text-muted">Battery Charge</div>
              <div
                className={`mt-0.5 text-sm font-bold ${
                  telemetry.batteryPercent < 25 ? 'text-warn' : 'text-ink'
                }`}
              >
                {fmt(telemetry.batteryPercent, 0)}%
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
                <div
                  className={`h-full ${telemetry.batteryPercent < 25 ? 'bg-warn' : 'bg-ok'}`}
                  style={{ width: `${Math.round(telemetry.batteryPercent)}%` }}
                />
              </div>
            </div>

            {/* Light Delay */}
            <div className="rounded-xl border border-line bg-black/35 p-2.5">
              <div className="text-[10px] uppercase text-muted">One-Way Light Delay</div>
              <div className="mt-0.5 text-sm font-bold text-accent">
                {duration(telemetry.signalDelaySeconds)}
              </div>
              <div className="mt-0.5 text-[10px] text-muted">
                {summary.resolved.computer?.autonomy ? 'Autonomous AI Ready' : 'Ground Control Mode'}
              </div>
            </div>

            {/* Science Return */}
            <div className="rounded-xl border border-line bg-black/35 p-2.5">
              <div className="text-[10px] uppercase text-muted">Science Return</div>
              <div className="mt-0.5 text-sm font-bold text-ok">
                {fmt(journey.science, 0)} / {pathway.scienceTarget} pts
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
                <div className="h-full bg-ok" style={{ width: `${sciencePct}%` }} />
              </div>
            </div>

            {/* Data & Downlink */}
            <div className="rounded-xl border border-line bg-black/35 p-2.5">
              <div className="text-[10px] uppercase text-muted">Downlink Rate</div>
              <div className="mt-0.5 text-sm font-bold text-ink">
                {gbPerDay(telemetry.downlinkRateGbPerDay)}
              </div>
              <div className="mt-0.5 text-[10px] text-muted">
                Sent {fmt(journey.dataSentGb, 1)} Gb · Buf {fmt(journey.dataStoredGb, 1)}/{fmt(telemetry.storageCapacityGb)} Gb
              </div>
            </div>

            {/* Delta-v & Radiation */}
            <div className="rounded-xl border border-line bg-black/35 p-2.5">
              <div className="text-[10px] uppercase text-muted">Δv &amp; Rad Dose</div>
              <div className="mt-0.5 text-sm font-bold text-ink">
                {kms(telemetry.deltaVRemaining)} left
              </div>
              <div className="mt-0.5 text-[10px] text-muted">
                Dose: {fmt(journey.electronicsDose, 1)}/{fmt(telemetry.radToleranceKrad)} krad
              </div>
            </div>
          </div>

          {/* Crew Status Row (Crewed Missions Only) */}
          {pathway.crewed && journey.crewHealth !== null && (
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-accent/30 bg-accent/5 p-2.5 font-mono text-xs">
              <div>
                <div className="text-[10px] uppercase text-muted">Crew Health</div>
                <div
                  className={`font-bold ${
                    journey.crewHealth >= 65 ? 'text-ok' : 'text-bad'
                  }`}
                >
                  {fmt(journey.crewHealth, 0)} / 100
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted">Crew Dose</div>
                <div
                  className={`font-bold ${
                    journey.crewDose <= 1000 ? 'text-ink' : 'text-bad'
                  }`}
                >
                  {fmt(journey.crewDose, 0)} / 1,000 mSv
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted">Supplies Left</div>
                <div
                  className={`font-bold ${
                    (journey.suppliesDays ?? 0) >= 0 ? 'text-ink' : 'text-bad'
                  }`}
                >
                  {fmt(Math.max(0, journey.suppliesDays ?? 0))} days
                </div>
              </div>
            </div>
          )}

          {/* Crew Avatars Reacting Strip (Phase 08 §4) */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-black/35 px-3 py-2 text-xs"
            aria-label="Mission Crew Status"
          >
            <span className="font-mono text-[10px] uppercase text-muted">
              {pathway.crewed ? 'Onboard Crew:' : 'Mission Control Desks:'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {crew.map((member) => {
                const roleCol = ROLES[member.roles[0] ?? 'commander'].colour;
                const alert = Boolean(journey.pending || telemetry.survivalMode);
                return (
                  <span
                    key={member.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold transition ${
                      alert ? 'animate-pulse border-warn text-warn' : 'text-ink'
                    }`}
                    style={{
                      borderColor: alert ? undefined : roleCol,
                      backgroundColor: `${roleCol}18`,
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: AVATAR_COLOURS[member.avatar % AVATAR_COLOURS.length] }}
                    />
                    {member.callSign || member.id.toUpperCase()}
                    <span className="text-[10px] text-muted">
                      ({member.roles.map((r) => ROLES[r].short).join('/')})
                    </span>
                    <span aria-hidden>{alert ? '⚡' : journey.ended && journey.endReason === 'complete' ? '🎉' : '🛰'}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Pathway-Specific Interactive Science Widgets */}
          {pathway.id === 'interstellar' && (
            <DistanceLadder currentSunAU={telemetry.sunDistanceAU} />
          )}
          {pathway.id === 'exoplanet' && (
            <LightCurveChart
              pointingQuality={journey.pointing}
              cooled={Boolean(summary.resolved.thermal?.cooling)}
            />
          )}
        </aside>

        {/* Right Column: Decision Log, Physics Challenges, In-Flight Events, Checkpoints & Completion */}
        <section className="pointer-events-auto space-y-3 lg:col-span-7">
          {/* Optional Decision Log Drawer */}
          {decisionLogOpen && (
            <DecisionLog
              crew={crew}
              decisionLog={decisionLog}
              events={journey.events}
              onClose={() => setDecisionLogOpen(false)}
            />
          )}

          {/* 1. Active Physics Scenario Console */}
          {activeChallenge && (
            <PhysicsConsole
              key={activeChallenge.id}
              challenge={activeChallenge}
              difficulty={difficulty}
              onDone={(result) => completeJourneyChallenge(activeChallenge.id, result)}
            />
          )}

          {/* 2. Pending In-Flight Event / Negotiation Modal & Post-Event Outcome Card */}
          <EventModal
            journey={journey}
            crew={crew}
            activeVote={activeVote}
            lastResolution={lastEventResolution}
            onChooseOption={(optId) => chooseEventOption(optId)}
            onStartTeamVote={(useHandoff) => startEventVote(useHandoff)}
            onAcknowledgeHandoff={() => acknowledgeVoteHandoff()}
            onToggleHandoffMode={(useHandoff) => setVoteHandoff(useHandoff)}
            onCastVote={(memberId, optId, reaction) => submitMemberVote(memberId, optId, reaction)}
            onBreakTie={(optId) => breakVoteTie(optId)}
            onExpireTimer={() => expireNegotiationTimer()}
            onDismissResolution={() => dismissEventResolution()}
          />

          {/* 3. Mission Ended Summary Card */}
          {journey.ended && (
            <div
              className={`hud-enter rounded-2xl border p-5 shadow-xl backdrop-blur ${
                journey.endReason === 'complete'
                  ? 'border-ok/60 bg-panel/95'
                  : 'border-bad/60 bg-panel/95'
              }`}
              role="region"
              aria-label="Flight Outcome Summary"
            >
              <p
                className={`font-mono text-xs font-bold uppercase tracking-[0.22em] ${
                  endInfo?.tone === 'ok' ? 'text-ok' : 'text-bad'
                }`}
              >
                {endInfo?.title ?? 'Flight Finished'}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-ink">
                {journey.endReason === 'complete'
                  ? `${pathway.destination} Mission Accomplished`
                  : 'Spacecraft Flight Terminated Early'}
              </h3>
              <p className="mt-2 text-sm text-muted">
                Flown {fmt(journey.day)} days · Science delivered: {fmt(journey.science, 0)} /{' '}
                {pathway.scienceTarget} pts · Checkpoints logged: {journey.checkpoints.length}
              </p>
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <Button onClick={() => finishJourney()}>PROCEED TO MISSION REPORT →</Button>
              </div>
            </div>
          )}

          {/* 4. Mission Checkpoints & Engineering Verification Log */}
          <div
            className="rounded-2xl border border-line bg-panel/95 p-4 shadow-lg backdrop-blur"
            role="region"
            aria-label="Mission Checkpoints"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Mission Checkpoints &amp; Flight Log
              </h3>
              <span className="font-mono text-xs text-muted">
                {journey.checkpoints.length} checkpoints · {journey.events.length} events
              </span>
            </div>

            <div className="mt-2.5 max-h-52 space-y-2 overflow-y-auto pr-1">
              {journey.checkpoints.map((cp, index) => (
                <div
                  key={`${cp.id}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-line bg-black/35 px-3 py-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted">Day {fmt(cp.day)}</span>
                      <span className="font-bold text-ink">{cp.title}</span>
                    </div>
                    <p className="mt-0.5 text-ink/85">{cp.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                      cp.status === 'pass'
                        ? 'border-ok/50 bg-ok/15 text-ok'
                        : cp.status === 'warn'
                          ? 'border-warn/50 bg-warn/15 text-warn'
                          : 'border-bad/50 bg-bad/15 text-bad'
                    }`}
                  >
                    {cp.status}
                  </span>
                </div>
              ))}

              {journey.events.map((ev, index) => (
                <div
                  key={`ev-${ev.eventId}-${index}`}
                  className="rounded-xl border border-accent/35 bg-accent/10 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="font-bold text-accent">
                      Event · Day {fmt(ev.day)}: {ev.title}
                    </span>
                    <span className="text-muted">Choice: {ev.optionLabel}</span>
                  </div>
                  <p className="mt-0.5 text-ink/90">{ev.outcome}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
