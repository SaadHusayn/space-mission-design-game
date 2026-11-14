'use client';

import { useMemo } from 'react';

import { emptyDesign, reviewDesign, type CheckStatus, type Discipline, type ReviewCheck } from '@/game';
import { SPEAKERS } from '@/game/data/story';
import type { Design, MissionContext } from '@/game/types';
import { useGame } from '@/hooks/useGame';
import { useCurrentMission } from '@/scenes/Briefing/BriefingScenes';
import { assemblyStore, type AssemblyTarget } from '@/scenes/Hangar/assemblyStore';

import { Button } from './Button';
import { SLOT_LABELS } from './SlotList';

const STATUS_META: Readonly<Record<CheckStatus, { icon: string; label: string; badge: string; border: string }>> = {
  pass: {
    icon: '✓',
    label: 'PASS',
    badge: 'bg-ok/15 text-ok border-ok/40',
    border: 'border-line bg-black/25',
  },
  warn: {
    icon: '⚠',
    label: 'WARN',
    badge: 'bg-warn/15 text-warn border-warn/40',
    border: 'border-warn/50 bg-warn/5',
  },
  fail: {
    icon: '✗',
    label: 'FAIL',
    badge: 'bg-danger/15 text-danger border-danger/40',
    border: 'border-danger/60 bg-danger/10',
  },
  pending: {
    icon: '⋯',
    label: 'PENDING ROCKET',
    badge: 'bg-white/10 text-muted border-white/20',
    border: 'border-line/60 bg-black/15',
  },
};

const DISCIPLINE_NAMES: Readonly<Record<Discipline, string>> = {
  systems: 'Systems Engineering',
  structures: 'Structures & Mass',
  propulsion: 'Propulsion & Δv',
  power: 'Power & Energy Storage',
  communications: 'Communications & Autonomy',
  thermal: 'Thermal Control',
  radiation: 'Radiation Protection',
  crew: 'Crew Systems & Safety',
  science: 'Science & Objectives',
  budget: 'Program Budget',
};

/** Maps an ERB check to the specific assembly slot that needs attention. */
export function targetSlotForCheck(check: ReviewCheck, design: Design, mission: MissionContext): AssemblyTarget {
  switch (check.id) {
    case 'ERB-0': {
      if (!design.busId) return 'bus';
      if (!design.slots.power) return 'power';
      if (!design.slots.battery && (design.slots.power !== 'rtg' || mission.env.eclipseHours > 0)) return 'battery';
      if (!design.slots.computer) return 'computer';
      if (!design.slots.adcs) return 'adcs';
      if (!design.slots.comms) return 'comms';
      if (!design.slots.thermal) return 'thermal';
      if (!design.slots.propulsion && mission.env.deltaV > 0) return 'propulsion';
      if (design.instrumentIds.length === 0) return 'instruments';
      if (mission.pathway.crewed && !design.slots.lifeSupport) return 'lifeSupport';
      if (mission.pathway.returnEntrySpeed !== null && !design.slots.heatShield) return 'heatShield';
      return 'bus';
    }
    case 'ERB-1':
    case 'ERB-1L':
    case 'ERB-9':
    case 'ERB-10':
      return 'bus';
    case 'ERB-2':
    case 'ERB-3':
      return 'propulsion';
    case 'ERB-4':
      return 'power';
    case 'ERB-5':
      return 'battery';
    case 'ERB-6':
      return 'comms';
    case 'ERB-6A':
    case 'ERB-14':
      return 'computer';
    case 'ERB-7':
      return 'thermal';
    case 'ERB-8':
    case 'ERB-8C':
      return 'radiation';
    case 'ERB-10S':
      return 'lifeSupport';
    case 'ERB-10H':
      return 'heatShield';
    case 'ERB-11':
      return 'habitat';
    case 'ERB-12':
    case 'ERB-12S':
      return 'instruments';
    case 'ERB-12P':
      return 'adcs';
    case 'ERB-13':
      return 'bus';
    default:
      return 'bus';
  }
}

export function ReviewBoard() {
  const mission = useCurrentMission();
  const design = useGame((state) => state.design);
  const goTo = useGame((state) => state.goTo);
  const proceedFromErb = useGame((state) => state.proceedFromErb);

  const activeDesign = useMemo(() => design ?? emptyDesign(), [design]);
  const review = useMemo(
    () => (mission ? reviewDesign(activeDesign, mission) : null),
    [activeDesign, mission],
  );

  if (!mission || !review) return null;

  const hale = SPEAKERS.hale;
  const jumpToSlot = (target: AssemblyTarget) => {
    assemblyStore.getState().selectTarget(target);
    goTo('ASSEMBLY');
  };

  return (
    <div className="absolute inset-0 overflow-y-auto p-3 sm:p-6">
      <article
        className="hud-enter pointer-events-auto mx-auto max-w-5xl rounded-2xl border border-line bg-panel p-5 backdrop-blur sm:p-7"
        aria-labelledby="erb-title"
      >
        {/* Header & Grade Banner */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Step 2B · Engineering Review Board · {mission.pathway.name}
            </p>
            <h2 id="erb-title" className="mt-1 text-3xl font-bold text-ink">
              Engineering Review Board (ERB)
            </h2>
            <p className="mt-1 text-sm text-muted">
              Every discipline evaluates your spacecraft with real physics before trajectory &amp; launch vehicle selection.
            </p>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-line bg-black/30 px-5 py-3">
            <div className="text-center">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-muted">Grade</span>
              <span
                className={`text-3xl font-black ${
                  review.passable ? 'text-ok' : 'text-danger'
                }`}
              >
                {review.grade}
              </span>
            </div>
            <div className="h-9 w-px bg-line" />
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-muted">Verdict</span>
              <span
                className={`text-lg font-extrabold tracking-wider ${
                  review.passable ? 'text-ok' : 'text-danger'
                }`}
              >
                {review.passable ? '✓ GO FOR TRAJECTORY' : '✗ NO-GO · FIX REQUIRED'}
              </span>
              <p className="font-mono text-xs text-muted">
                {review.counts.pass} pass · {review.counts.warn} warn · {review.counts.fail} fail · {review.counts.pending} pending
              </p>
            </div>
          </div>
        </div>

        {/* Director Hale statement */}
        <div className="mt-4 flex items-start gap-3.5 rounded-xl border border-line bg-black/25 p-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold"
            style={{ borderColor: hale.colour, color: hale.colour }}
            aria-hidden
          >
            {hale.initials}
          </span>
          <div>
            <p className="text-sm font-bold" style={{ color: hale.colour }}>
              {hale.name} <span className="font-normal text-muted">· {hale.title}</span>
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-ink">
              {review.passable
                ? review.counts.warn > 0
                  ? 'Your spacecraft passes all mandatory engineering checks, though some margins are tight. You are cleared to select your trajectory and launch vehicle.'
                  : 'Exemplary engineering. Every subsystem meets its physics margins with room to spare. Proceed to trajectory selection.'
                : `We have ${review.counts.fail} mandatory check failure${review.counts.fail === 1 ? '' : 's'}. Review the failing disciplines below and jump back to the assembly bay to fix them.`}
            </p>
          </div>
        </div>

        {/* Checks List */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2" role="list" aria-label="Engineering Review checks">
          {review.checks.map((check) => {
            const meta = STATUS_META[check.status];
            const target = targetSlotForCheck(check, activeDesign, mission);
            const showFix = check.status === 'fail' || check.status === 'warn';

            return (
              <div
                key={check.id}
                role="listitem"
                className={`flex flex-col justify-between rounded-xl border p-4 ${meta.border}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                        {check.id} · {DISCIPLINE_NAMES[check.discipline]}
                      </span>
                      <h3 className="text-base font-bold text-ink">{check.title}</h3>
                    </div>
                    <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-xs font-bold ${meta.badge}`}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-black/30 px-3 py-1.5 font-mono text-xs">
                    <span>
                      <strong className="text-muted">Design:</strong>{' '}
                      <span className="text-ink">{check.value}</span>
                    </span>
                    <span>
                      <strong className="text-muted">Limit:</strong>{' '}
                      <span className="text-ink">{check.limit}</span>
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-ink/90">{check.explanation}</p>
                </div>

                {showFix && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2.5">
                    <p className="text-xs font-medium text-warn">
                      <strong>Fix:</strong> {check.fixHint}
                    </p>
                    <button
                      type="button"
                      onClick={() => jumpToSlot(target)}
                      className="shrink-0 rounded-lg border border-accent bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink transition hover:bg-accent/30"
                    >
                      Fix {SLOT_LABELS[target]} ▸
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <Button variant="secondary" onClick={() => goTo('ASSEMBLY')}>
            BACK TO ASSEMBLY
          </Button>
          <Button
            disabled={!review.passable}
            onClick={() => proceedFromErb()}
          >
            PROCEED TO TRAJECTORY
          </Button>
        </div>
      </article>
    </div>
  );
}
