'use client';

import { useEffect, useState } from 'react';

export interface NegotiationTimerProps {
  totalSeconds: number;
  defaultOptionLabel: string;
  onExpire: () => void;
}

/**
 * Countdown timer for scripted team negotiation dilemmas (N6).
 * If time runs out before consensus, the Commander's default option applies
 * with a small collaboration penalty.
 */
export function NegotiationTimer({
  totalSeconds,
  defaultOptionLabel,
  onExpire,
}: NegotiationTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const id = window.setTimeout(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [remaining, paused, onExpire]);

  const pct = Math.max(0, Math.min(100, (remaining / Math.max(1, totalSeconds)) * 100));
  const urgent = remaining <= 12;

  return (
    <div
      className={`rounded-xl border px-3.5 py-2.5 font-mono text-xs ${
        urgent ? 'border-bad/60 bg-bad/15' : 'border-warn/50 bg-warn/10'
      }`}
      role="timer"
      aria-label="Negotiation countdown timer"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`font-bold ${urgent ? 'text-bad' : 'text-warn'}`}>
            ⏱ Negotiation Window: {remaining}s
          </span>
          <span className="text-[11px] text-muted">
            (Timeout default: <strong className="text-ink">{defaultOptionLabel}</strong>)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="rounded border border-line bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-ink hover:border-accent"
          >
            {paused ? '▶ Resume Timer' : '⏸ Pause Timer'}
          </button>
          <button
            type="button"
            onClick={onExpire}
            className="rounded border border-warn/50 bg-warn/20 px-2 py-0.5 text-[10px] font-semibold text-warn hover:bg-warn/30"
          >
            Apply Commander Default
          </button>
        </div>
      </div>

      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
        <div
          className={`h-full transition-all ${urgent ? 'bg-bad' : 'bg-warn'}`}
          style={{ width: `${Math.round(pct)}%` }}
        />
      </div>
    </div>
  );
}
