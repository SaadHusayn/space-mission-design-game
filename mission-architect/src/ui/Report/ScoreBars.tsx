'use client';

import { useEffect, useState } from 'react';

import type { ScoreComponent } from '@/game';
import { useGame } from '@/hooks/useGame';

interface ScoreBarsProps {
  components: readonly ScoreComponent[];
  total: number;
}

export function ScoreBars({ components, total }: ScoreBarsProps) {
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const [animated, setAnimated] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setTimeout(() => setAnimated(true), 60);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  return (
    <section
      aria-label="Score Breakdown"
      className="rounded-2xl border border-line bg-panel/90 p-4 backdrop-blur"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Weighted Evaluation (R3)
          </p>
          <h3 className="text-base font-bold text-ink">Score Breakdown</h3>
        </div>
        <span className="rounded-lg border border-line bg-space/70 px-2.5 py-1 font-mono text-xs font-bold text-ink">
          Overall: {total} / 100
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        {components.map((comp) => {
          const applicable = comp.score !== null;
          const pct = applicable ? Math.round((comp.score ?? 0) * 100) : 0;
          const barWidth = animated || reducedMotion ? `${pct}%` : '0%';
          const barColor =
            !applicable
              ? 'bg-muted/30'
              : pct >= 85
                ? 'bg-ok'
                : pct >= 65
                  ? 'bg-accent'
                  : pct >= 45
                    ? 'bg-warn'
                    : 'bg-danger';

          return (
            <div key={comp.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">
                  {comp.label}{' '}
                  <span className="font-mono text-[11px] font-normal text-muted">
                    ({comp.weight}% weight)
                  </span>
                </span>
                <span className="font-mono font-bold text-ink">
                  {applicable ? `${pct}%` : 'N/A (re-weighted)'}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-space/90">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                  style={{ width: barWidth }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
