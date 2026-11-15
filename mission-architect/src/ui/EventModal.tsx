'use client';

import { useMemo } from 'react';

import {
  advisorsForEvent,
  evaluateEventMitigations,
  fmt,
  getEventCatalogueEntry,
  getNegotiationEvent,
  journeyEventContext,
  type JourneyState,
} from '@/game';
import { ROLES, type CrewMember } from '@/game/core/crew';
import type { LastEventResolution } from '@/game/core/store';
import type { VoteSession } from '@/game/core/votes';

import { AdvisorBubble } from './AdvisorBubble';
import { Button } from './Button';
import { NegotiationTimer } from './NegotiationTimer';
import { VotePanel } from './VotePanel';

export interface EventModalProps {
  journey: JourneyState;
  crew: readonly CrewMember[];
  activeVote: VoteSession | null;
  lastResolution: LastEventResolution | null;
  onChooseOption: (optionId: string) => void;
  onStartTeamVote: (useHandoff?: boolean) => void;
  onAcknowledgeHandoff: () => void;
  onToggleHandoffMode: (useHandoff: boolean) => void;
  onCastVote: (memberId: string, optionId: string, reaction?: string) => void;
  onBreakTie: (optionId: string) => void;
  onExpireTimer: () => void;
  onDismissResolution: () => void;
}

/**
 * Rich in-flight event and negotiation modal (Phase 08).
 * Shows design mitigation checks, NPC engineer advisor bubbles (Solo & Team),
 * timed negotiation countdowns (N6), team voting with role-coloured avatars,
 * and post-decision "why" explanations tied to the spacecraft's built hardware.
 */
export function EventModal({
  journey,
  crew,
  activeVote,
  lastResolution,
  onChooseOption,
  onStartTeamVote,
  onAcknowledgeHandoff,
  onToggleHandoffMode,
  onCastVote,
  onBreakTie,
  onExpireTimer,
  onDismissResolution,
}: EventModalProps) {
  const pending = journey.pending;

  const eventCtx = useMemo(() => (pending ? journeyEventContext(journey) : null), [journey, pending]);
  const mitigations = useMemo(
    () => (pending && eventCtx ? evaluateEventMitigations(pending.eventId, eventCtx) : []),
    [pending, eventCtx],
  );
  const advisors = useMemo(
    () => (pending && eventCtx ? advisorsForEvent(pending.eventId, eventCtx) : []),
    [pending, eventCtx],
  );

  // If no event is pending right now, show the most recent Event Outcome & "Why" card if available
  if (!pending) {
    if (!lastResolution) return null;
    return (
      <div
        className="hud-enter rounded-2xl border border-accent/60 bg-panel/95 p-4 shadow-xl backdrop-blur"
        role="region"
        aria-label={`Event outcome: ${lastResolution.title}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent">
              ✓ Decision Logged · Day {fmt(lastResolution.day)}
            </p>
            <h3 className="mt-0.5 text-lg font-bold text-ink">
              {lastResolution.title} — {lastResolution.optionLabel}
            </h3>
          </div>
          <Button variant="secondary" onClick={onDismissResolution}>
            CONTINUE FLIGHT →
          </Button>
        </div>

        <p className="mt-2 rounded-xl border border-line bg-black/40 p-3 text-sm leading-relaxed text-ink">
          <strong className="text-accent">Why it happened: </strong>
          {lastResolution.outcome}
        </p>

        {lastResolution.voteSummary && (
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
            <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 font-bold text-accent">
              Vote Result: {lastResolution.voteSummary.outcome.replace('_', ' ').toUpperCase()}
            </span>
            {lastResolution.voteSummary.votes.map((v) => (
              <span key={v.memberId} className="rounded border border-line bg-black/30 px-2 py-0.5">
                {v.callSign}: <strong className="text-ink">{v.choice}</strong>
                {v.reaction ? ` ("${v.reaction}")` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  const cat = getEventCatalogueEntry(pending.eventId);
  const neg = getNegotiationEvent(pending.eventId);
  const isNegotiation = Boolean(neg || cat?.kind === 'negotiation');
  const ownerRole = ROLES[cat?.ownerRole ?? 'commander'];
  const isTeam = crew.length > 1;
  const defaultOptionLabel =
    pending.options.find((o) => o.id === neg?.commanderDefaultOptionId)?.label ??
    pending.options[0]?.label ??
    'Default';

  return (
    <div
      className={`hud-enter space-y-3 rounded-2xl border p-5 shadow-xl backdrop-blur ${
        isNegotiation ? 'border-accent/70 bg-panel/95' : 'border-warn/60 bg-panel/95'
      }`}
      role="region"
      aria-label={`In-flight event: ${pending.title}`}
    >
      {/* Event Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-mono text-xs font-bold uppercase tracking-[0.22em] ${
                isNegotiation ? 'text-accent' : 'text-warn'
              }`}
            >
              {cat?.icon ?? '⚠'} {isNegotiation ? 'Team Negotiation Dilemma' : 'In-Flight Anomaly'} · Day{' '}
              {fmt(pending.day)}
            </span>
            <span
              className="rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold"
              style={{
                borderColor: ownerRole.colour,
                color: ownerRole.colour,
                backgroundColor: `${ownerRole.colour}18`,
              }}
            >
              Lead: {ownerRole.short} ({ownerRole.name})
            </span>
          </div>
          <h3 className="mt-1 text-xl font-bold text-ink">{pending.title}</h3>
        </div>

        {isTeam && !activeVote && (
          <button
            type="button"
            onClick={() => onStartTeamVote(true)}
            className="rounded-xl border border-accent bg-accent/20 px-3 py-1.5 font-mono text-xs font-bold text-accent transition hover:bg-accent/30"
          >
            🗳 Open Pass-the-Device Vote
          </button>
        )}
      </div>

      <p className="text-sm leading-relaxed text-ink/90">{pending.description}</p>

      {/* Negotiation Countdown Timer (N6) */}
      {isNegotiation && neg && (
        <NegotiationTimer
          key={pending.eventId}
          totalSeconds={neg.timerSeconds}
          defaultOptionLabel={defaultOptionLabel}
          onExpire={onExpireTimer}
        />
      )}

      {/* Design Mitigation Check Strip */}
      {mitigations.length > 0 && (
        <div
          className="space-y-1.5 rounded-xl border border-line bg-black/35 p-3"
          aria-label="Spacecraft Design Mitigation Status"
        >
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            Your Spacecraft Hardware vs. This Hazard
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {mitigations.map((item) => (
              <div
                key={item.label}
                className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                  item.mitigated
                    ? 'border-ok/45 bg-ok/10 text-ink'
                    : 'border-warn/45 bg-warn/10 text-ink'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className={item.mitigated ? 'text-ok' : 'text-warn'}>
                    {item.mitigated ? '✓ Mitigated:' : '⚠ Unmitigated:'}
                  </span>
                  <span>{item.label}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NPC Engineer & Mission Control Advisor Opinions */}
      {advisors.length > 0 && (
        <div className="space-y-2" aria-label="Mission Control Advisor Recommendations">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            Mission Control &amp; Engineering Advisors
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {advisors.slice(0, 2).map((opinion) => (
              <AdvisorBubble
                key={`${opinion.speaker}-${opinion.recommendedOptionId}`}
                opinion={opinion}
                onSelectRecommendation={!isTeam ? (optId) => onChooseOption(optId) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Team Voting Panel (2–4 players) */}
      {isTeam && activeVote ? (
        <VotePanel
          session={activeVote}
          onAcknowledgeHandoff={onAcknowledgeHandoff}
          onToggleHandoffMode={onToggleHandoffMode}
          onCastVote={onCastVote}
          onBreakTie={onBreakTie}
        />
      ) : (
        /* Direct Option Choice Buttons (Solo mode, or quick-resolve in Team mode) */
        <div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-label="Event Choices">
          {pending.options.map((option) => {
            const champ = option.championedBy ? ROLES[option.championedBy] : null;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChooseOption(option.id)}
                className="rounded-xl border border-line bg-black/40 p-3.5 text-left transition hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{option.label}</span>
                  {champ && (
                    <span
                      className="rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold"
                      style={{ borderColor: champ.colour, color: champ.colour }}
                    >
                      {champ.short}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted">{option.description}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
