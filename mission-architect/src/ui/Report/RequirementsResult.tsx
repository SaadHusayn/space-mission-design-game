'use client';

import type { RequirementResult } from '@/game';

interface RequirementsResultProps {
  requirements: readonly RequirementResult[];
}

export function RequirementsResult({ requirements }: RequirementsResultProps) {
  const metCount = requirements.filter((r) => r.met).length;

  return (
    <section
      aria-label="Mission Contract Requirements"
      className="rounded-2xl border border-line bg-panel/90 p-4 backdrop-blur"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Contract Verification
          </p>
          <h3 className="text-base font-bold text-ink">Mission Requirements Checklist</h3>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold ${
            metCount === requirements.length
              ? 'border-ok/60 bg-ok/15 text-ok'
              : 'border-warn/60 bg-warn/15 text-warn'
          }`}
        >
          {metCount} / {requirements.length} Met
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {requirements.map((req) => (
          <li
            key={req.id}
            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${
              req.met
                ? 'border-ok/35 bg-ok/10 text-ink'
                : 'border-danger/45 bg-danger/10 text-ink'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  req.met ? 'bg-ok/25 text-ok' : 'bg-danger/25 text-danger'
                }`}
                aria-hidden
              >
                {req.met ? '✓' : '✗'}
              </span>
              <div>
                <p className="font-semibold text-ink">{req.label}</p>
                <p className="text-[11px] text-muted">Target: {req.target}</p>
              </div>
            </div>
            <span
              className={`font-mono text-xs font-bold ${
                req.met ? 'text-ok' : 'text-danger'
              }`}
            >
              {req.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
