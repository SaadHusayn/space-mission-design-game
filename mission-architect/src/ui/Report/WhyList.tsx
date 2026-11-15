'use client';

import type { AnotherWayHint, WhyBullet } from '@/game';
import { reportViewStore, useReportView } from '@/scenes/Report/OutcomeCutscene';

interface WhyListProps {
  bullets: readonly WhyBullet[];
  anotherWay: AnotherWayHint | null;
  onLoadAnotherWay: (hint: AnotherWayHint) => void;
}

const TONE_BADGE: Record<WhyBullet['tone'], { icon: string; border: string; badge: string }> = {
  good: {
    icon: '✓',
    border: 'border-ok/40 bg-ok/10 hover:border-ok/70',
    badge: 'bg-ok/20 text-ok',
  },
  bad: {
    icon: '!',
    border: 'border-danger/45 bg-danger/10 hover:border-danger/80',
    badge: 'bg-danger/20 text-danger',
  },
  info: {
    icon: 'i',
    border: 'border-accent/35 bg-space/75 hover:border-accent/70',
    badge: 'bg-accent/20 text-accent',
  },
};

export function WhyList({ bullets, anotherWay, onLoadAnotherWay }: WhyListProps) {
  const selectedTarget = useReportView((state) => state.selectedTarget);

  return (
    <section
      aria-label="Why It Worked or Failed Analysis"
      className="rounded-2xl border border-line bg-panel/90 p-4 backdrop-blur"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Cause &amp; Effect Debrief (M11 · R12)
          </p>
          <h3 className="text-base font-bold text-ink">
            Why Your Mission Ended This Way
          </h3>
        </div>
        <span className="text-[11px] text-muted">
          Click a bullet to highlight that subsystem on your 3D spacecraft
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {bullets.map((bullet, idx) => {
          const style = TONE_BADGE[bullet.tone];
          const slot = bullet.targetSlot ?? null;
          const isSelected = Boolean(slot && selectedTarget === slot);

          return (
            <li key={`${bullet.decision}-${idx}`}>
              <button
                type="button"
                onClick={() => {
                  if (slot) {
                    reportViewStore.getState().selectTarget(isSelected ? null : slot);
                  }
                }}
                className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition ${
                  isSelected ? 'ring-2 ring-accent border-accent bg-accent/15' : style.border
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.badge}`}
                    aria-hidden
                  >
                    {style.icon}
                  </span>
                  <p className="text-xs leading-relaxed text-ink">{bullet.text}</p>
                </div>
                {slot && (
                  <span className="shrink-0 rounded-md border border-line bg-space/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                    {isSelected ? `3D: ${slot} ★` : `3D: ${slot}`}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {anotherWay && (
        <section
          aria-label="Another Way to Win Hint"
          className="mt-3.5 flex flex-col justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3 sm:flex-row sm:items-center"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
              💡 Multiple Valid Solutions (R5) · {anotherWay.headline}
            </p>
            <p className="mt-0.5 text-xs text-ink">{anotherWay.description}</p>
          </div>
          <button
            type="button"
            onClick={() => onLoadAnotherWay(anotherWay)}
            className="shrink-0 rounded-lg border border-accent bg-accent/20 px-3 py-1.5 text-xs font-bold text-accent transition hover:bg-accent hover:text-space"
          >
            Load Alternate Build &amp; Re-fly →
          </button>
        </section>
      )}
    </section>
  );
}
