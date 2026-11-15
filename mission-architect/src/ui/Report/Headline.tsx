'use client';

import type { MissionPatch as Patch } from '@/game/core/patch';
import type { MissionContext, MissionScore } from '@/game';
import { reportViewStore, useReportView } from '@/scenes/Report/OutcomeCutscene';
import { MissionPatch } from '@/ui/MissionPatch';

interface HeadlineProps {
  mission: MissionContext;
  score: MissionScore;
  patch: Patch;
  designHash: string;
  onOpenDecisionLog: () => void;
}

const OUTCOME_STYLE: Record<
  MissionScore['outcome'],
  { label: string; badgeClass: string; subtitle: string }
> = {
  success: {
    label: 'MISSION SUCCESS',
    badgeClass: 'border-ok/60 bg-ok/15 text-ok',
    subtitle: 'All primary contract requirements verified in flight.',
  },
  partial: {
    label: 'PARTIAL SUCCESS',
    badgeClass: 'border-warn/60 bg-warn/15 text-warn',
    subtitle: 'At least 50% of the science goal achieved; next pathway unlocked.',
  },
  failure: {
    label: 'MISSION FAILURE · ENGINEERING LESSON',
    badgeClass: 'border-danger/60 bg-danger/15 text-danger',
    subtitle: "Let's inspect the flight telemetry and find out why.",
  },
};

const GRADE_COLOUR: Record<MissionScore['grade'], string> = {
  S: 'border-ok text-ok bg-ok/15',
  A: 'border-accent text-accent bg-accent/15',
  B: 'border-sky-400 text-sky-300 bg-sky-500/15',
  C: 'border-warn text-warn bg-warn/15',
  F: 'border-danger text-danger bg-danger/15',
};

export function Headline({
  mission,
  score,
  patch,
  designHash,
  onOpenDecisionLog,
}: HeadlineProps) {
  const exploded = useReportView((state) => state.exploded);
  const selectedTarget = useReportView((state) => state.selectedTarget);
  const style = OUTCOME_STYLE[score.outcome];

  return (
    <header
      aria-label="Mission Report Headline"
      className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-panel/95 p-4 backdrop-blur lg:flex-row lg:items-center lg:px-6"
    >
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <MissionPatch patch={patch} size={68} label="Crew mission patch" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
              Step 7 · Post-Mission Debrief &amp; Report
            </p>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider ${style.badgeClass}`}>
              {style.label}
            </span>
            <span className="rounded-full border border-line bg-space/70 px-2 py-0.5 font-mono text-[11px] text-muted">
              Build {designHash}
            </span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-ink sm:text-2xl">
            Flight Complete — Mission Evaluation &amp; Debrief: {mission.pathway.name}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {mission.pathway.destination} · {mission.trajectory.name} · {style.subtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* 3D Showcase & Cutscene Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => reportViewStore.getState().setPlayingCutscene(true)}
            className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
          >
            🎬 Watch Outcome Cutscene
          </button>
          <button
            type="button"
            aria-pressed={exploded}
            onClick={() => reportViewStore.getState().toggleExploded()}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              exploded
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-line bg-space/60 text-muted hover:border-accent/50 hover:text-ink'
            }`}
          >
            🔧 Exploded 3D: {exploded ? 'ON' : 'OFF'}
          </button>
          {selectedTarget && (
            <button
              type="button"
              onClick={() => reportViewStore.getState().selectTarget(null)}
              className="rounded-lg border border-line bg-space/60 px-2.5 py-1.5 text-xs text-muted transition hover:text-ink"
            >
              ✕ Clear 3D Highlight ({selectedTarget})
            </button>
          )}
          <button
            type="button"
            onClick={onOpenDecisionLog}
            className="rounded-lg border border-line bg-space/60 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent"
          >
            📋 Decision Log
          </button>
        </div>

        {/* Score, Grade & Stars */}
        <div className="flex items-center gap-3 rounded-xl border border-line bg-space/80 px-3.5 py-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Total Score</p>
            <p className="font-mono text-2xl font-bold text-ink" data-testid="report-total-score">
              {score.total}
              <span className="text-xs font-normal text-muted">/100</span>
            </p>
          </div>
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 text-xl font-black ${GRADE_COLOUR[score.grade]}`}
            aria-label={`Mission grade ${score.grade}`}
          >
            {score.grade}
          </div>
          <div className="text-right" aria-label={`${score.stars} of 3 stars earned`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Stars</p>
            <p className="text-lg tracking-widest text-amber-400">
              {[1, 2, 3].map((idx) => (
                <span key={idx} className={idx <= score.stars ? 'text-amber-400' : 'text-line'}>
                  ★
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
