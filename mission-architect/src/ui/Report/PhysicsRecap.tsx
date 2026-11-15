'use client';

import type { PhysicsRecapItem } from '@/game';

interface PhysicsRecapProps {
  items: readonly PhysicsRecapItem[];
}

const STATUS_STYLE: Record<
  PhysicsRecapItem['status'],
  { label: string; badgeClass: string }
> = {
  correct: {
    label: '✓ Correct',
    badgeClass: 'border-ok/50 bg-ok/15 text-ok',
  },
  'trade-off': {
    label: '⚖ Trade-Off Decision',
    badgeClass: 'border-accent/50 bg-accent/15 text-accent',
  },
  incorrect: {
    label: '✗ Needs Review',
    badgeClass: 'border-warn/50 bg-warn/15 text-warn',
  },
  not_taken: {
    label: 'Auto-Verified',
    badgeClass: 'border-line bg-space/70 text-muted',
  },
};

export function PhysicsRecap({ items }: PhysicsRecapProps) {
  return (
    <section
      aria-label="Physics Mastery Recap"
      className="rounded-2xl border border-line bg-panel/90 p-4 backdrop-blur"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Equations in Action
          </p>
          <h3 className="text-base font-bold text-ink">Physics Challenges Recap</h3>
        </div>
        <span className="text-[11px] text-muted">
          {items.length} pathway physics scenarios
        </span>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => {
          const st = STATUS_STYLE[item.status];
          return (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-line bg-space/65 p-3 text-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink">{item.title}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${st.badgeClass}`}
                  >
                    {st.label}
                  </span>
                </div>
                <p className="mt-1 rounded bg-panel/80 px-2 py-1 font-mono text-[11px] text-accent">
                  Formula: {item.formula}
                </p>
                <div className="mt-2 space-y-1 text-[11px]">
                  <p className="text-muted">
                    <span className="font-semibold text-ink">Your answer:</span>{' '}
                    {item.playerAnswer}
                  </p>
                  {item.status !== 'correct' && item.status !== 'trade-off' && (
                    <p className="text-ok">
                      <span className="font-semibold">Correct value:</span>{' '}
                      {item.correctAnswer}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-2 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-muted">
                {item.explanation}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
