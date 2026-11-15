'use client';

import { useMemo } from 'react';

import { computeCollaborationMetrics, fmt, type DecisionLogEntry, type EventLog } from '@/game';
import { ROLES, type CrewMember, type RoleId } from '@/game/core/crew';

export interface DecisionLogProps {
  crew: readonly CrewMember[];
  decisionLog: readonly DecisionLogEntry[];
  events?: readonly EventLog[];
  onClose?: () => void;
}

/**
 * Displays the complete mission decision log (`who · role · proposal · votes · outcome`)
 * and live collaboration metrics (consensus rate, role participation, MVP).
 */
export function DecisionLog({ crew, decisionLog, events = [], onClose }: DecisionLogProps) {
  const metrics = useMemo(
    () => computeCollaborationMetrics(crew, decisionLog, events),
    [crew, decisionLog, events],
  );

  return (
    <div
      className="hud-enter pointer-events-auto space-y-3 rounded-2xl border border-line bg-panel/95 p-4 shadow-xl backdrop-blur"
      role="region"
      aria-label="Mission Decision Log and Collaboration Metrics"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-2.5">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Crew Collaboration &amp; Decision Log
          </p>
          <h3 className="text-base font-bold text-ink">
            {decisionLog.length} Logged Decisions · Collaboration Score {Math.round(metrics.overallScore * 100)}%
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-black/40 px-3 py-1 font-mono text-xs font-semibold text-muted hover:border-accent hover:text-ink"
          >
            Close Log
          </button>
        )}
      </div>

      {/* Collaboration Metrics Summary Strip */}
      <div className="grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-black/35 p-2.5">
          <div className="text-[10px] uppercase text-muted">Consensus Rate</div>
          <div className="mt-0.5 text-sm font-bold text-ok">
            {fmt(metrics.consensusRate * 100, 0)}%
          </div>
        </div>
        <div className="rounded-xl border border-line bg-black/35 p-2.5">
          <div className="text-[10px] uppercase text-muted">Crew Participation</div>
          <div className={`mt-0.5 text-sm font-bold ${metrics.noPassengers ? 'text-ok' : 'text-warn'}`}>
            {fmt(metrics.participationRate * 100, 0)}% {metrics.noPassengers ? '(All Active)' : ''}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-black/35 p-2.5">
          <div className="text-[10px] uppercase text-muted">Event Response Quality</div>
          <div className="mt-0.5 text-sm font-bold text-accent">
            {fmt(metrics.eventQuality * 100, 0)}%
          </div>
        </div>
        <div className="rounded-xl border border-line bg-black/35 p-2.5">
          <div className="text-[10px] uppercase text-muted">Lead Contributor</div>
          <div className="mt-0.5 truncate text-sm font-bold text-ink">
            {metrics.mvp.callSign} ({ROLES[metrics.mvp.role].short})
          </div>
        </div>
      </div>

      {/* Role Contribution Badges */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-[10px] uppercase text-muted">Role Activity:</span>
        {(Object.keys(ROLES) as RoleId[]).map((roleId) => {
          const role = ROLES[roleId];
          const count = metrics.roleContributions[roleId] ?? 0;
          return (
            <span
              key={roleId}
              className="rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold"
              style={{
                borderColor: `${role.colour}66`,
                color: role.colour,
                backgroundColor: `${role.colour}15`,
              }}
            >
              {role.short}: {count}
            </span>
          );
        })}
      </div>

      {/* Scrollable Log Entries */}
      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
        {decisionLog.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">No decisions recorded yet.</p>
        ) : (
          [...decisionLog].reverse().map((entry) => {
            const role = ROLES[entry.actor as RoleId];
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-line bg-black/35 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted">#{entry.id}</span>
                    {role && (
                      <span
                        className="rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold"
                        style={{ borderColor: role.colour, color: role.colour }}
                      >
                        {role.short}
                      </span>
                    )}
                    {entry.proposerCallSign && (
                      <span className="font-semibold text-ink">{entry.proposerCallSign}</span>
                    )}
                    <span className="font-bold text-ink">
                      {entry.kind.toUpperCase()}: {entry.partName || entry.slotId || 'Change'}
                    </span>
                  </div>

                  {entry.voteSummary && (
                    <span className="rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
                      Vote: {entry.voteSummary.outcome.replace('_', ' ')} ({entry.voteSummary.votes.length} votes)
                    </span>
                  )}
                </div>

                {entry.voteSummary && entry.voteSummary.votes.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5 font-mono text-[10px] text-muted">
                    {entry.voteSummary.votes.map((v) => (
                      <span key={v.memberId} className="rounded bg-white/5 px-1.5 py-0.5">
                        {v.callSign} → <strong className="text-ink">{v.choice}</strong>
                        {v.reaction ? ` "${v.reaction}"` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {entry.outcomeText && (
                  <p className="mt-1 text-[11px] text-ink/85">{entry.outcomeText}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
