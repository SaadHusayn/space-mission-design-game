'use client';

import type { ErbVsRealityRow } from '@/game';
import { reportViewStore, useReportView } from '@/scenes/Report/OutcomeCutscene';

interface ErbVsRealityProps {
  rows: readonly ErbVsRealityRow[];
}

const VERDICT_BADGE: Record<
  ErbVsRealityRow['verdict'],
  { label: string; badgeClass: string }
> = {
  matched: {
    label: '✓ Held in Flight',
    badgeClass: 'border-ok/50 bg-ok/15 text-ok',
  },
  tight_margin: {
    label: '⚠ Tight Margin',
    badgeClass: 'border-warn/50 bg-warn/15 text-warn',
  },
  exceeded_limit: {
    label: '✗ Limit Exceeded',
    badgeClass: 'border-danger/50 bg-danger/15 text-danger',
  },
};

export function ErbVsReality({ rows }: ErbVsRealityProps) {
  const selectedTarget = useReportView((state) => state.selectedTarget);

  return (
    <section
      aria-label="ERB Predictions vs Flight Reality"
      className="rounded-2xl border border-line bg-panel/90 p-4 backdrop-blur"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Engineering Margins Lesson
          </p>
          <h3 className="text-base font-bold text-ink">
            ERB Prediction vs. Flight Reality
          </h3>
        </div>
        <span className="text-[11px] text-muted">
          Pre-flight review checks compared against actual flight telemetry
        </span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
              <th className="py-2 pr-3 font-semibold">Check</th>
              <th className="py-2 px-3 font-semibold">ERB Predicted</th>
              <th className="py-2 px-3 font-semibold">Actual in Flight</th>
              <th className="py-2 px-3 font-semibold">Outcome</th>
              <th className="py-2 pl-3 font-semibold">Engineering Takeaway</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rows.map((row) => {
              const verdict = VERDICT_BADGE[row.verdict];
              const isSelected = Boolean(row.targetSlot && selectedTarget === row.targetSlot);

              return (
                <tr
                  key={row.id}
                  onClick={() => {
                    if (row.targetSlot) {
                      reportViewStore.getState().selectTarget(isSelected ? null : row.targetSlot);
                    }
                  }}
                  className={`cursor-pointer transition hover:bg-space/60 ${
                    isSelected ? 'bg-accent/15' : ''
                  }`}
                >
                  <td className="py-2.5 pr-3 font-semibold text-ink">
                    <span className="mr-1.5 rounded bg-space/80 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                      {row.checkId}
                    </span>
                    {row.title}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-muted">
                    {row.predicted}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-ink">
                    {row.actual}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold ${verdict.badgeClass}`}
                    >
                      {verdict.label}
                    </span>
                  </td>
                  <td className="py-2.5 pl-3 text-[11px] leading-relaxed text-muted">
                    {row.lesson}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
