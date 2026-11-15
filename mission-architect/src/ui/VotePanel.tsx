'use client';

import { useState } from 'react';

import { REACTION_CHIPS, type DecisionDelta, type VoteSession } from '@/game';
import { AVATAR_COLOURS, ROLES, holderOf, type RoleId } from '@/game/core/crew';

import { HotseatHandoff } from './HotseatHandoff';

const DELTA_LABELS: Record<DecisionDelta, { label: string; unit: string }> = {
  mass: { label: 'Mass', unit: 'kg' },
  cost: { label: 'Cost', unit: '$M' },
  power: { label: 'Power Load', unit: 'W' },
  data: { label: 'Data Rate', unit: 'Gb/d' },
  deltaV: { label: 'Δv', unit: 'm/s' },
  science: { label: 'Science', unit: 'pts' },
};

export interface VotePanelProps {
  session: VoteSession;
  onAcknowledgeHandoff: () => void;
  onToggleHandoffMode: (useHandoff: boolean) => void;
  onCastVote: (memberId: string, optionId: string, reaction?: string) => void;
  onBreakTie: (optionId: string) => void;
  onCancel?: () => void;
}

/**
 * Interactive team vote panel with role-coloured avatars dropping onto option cards,
 * reaction chips, pass-the-device handoff curtain, and Mission Commander tie-break.
 */
export function VotePanel({
  session,
  onAcknowledgeHandoff,
  onToggleHandoffMode,
  onCastVote,
  onBreakTie,
  onCancel,
}: VotePanelProps) {
  const [selectedReaction, setSelectedReaction] = useState<string | undefined>(undefined);
  const { proposal, crew, currentVoterIndex, handoffPending, useHandoff, votes, status, tiedOptionIds } = session;

  const currentVoter = crew[currentVoterIndex] ?? crew[0];
  const currentPrimaryRole = ROLES[currentVoter?.roles[0] ?? 'commander'];
  const commander = holderOf(crew, 'commander') ?? crew[0];

  const deltaEntries = Object.entries(proposal.deltas).filter(
    ([, val]) => typeof val === 'number' && Math.abs(val) > 1e-6,
  ) as [DecisionDelta, number][];

  if (handoffPending && currentVoter && status === 'voting') {
    return (
      <HotseatHandoff
        member={currentVoter}
        voterIndex={currentVoterIndex}
        totalVoters={crew.length}
        proposalTitle={proposal.title}
        onReady={onAcknowledgeHandoff}
        onDisableHandoff={() => onToggleHandoffMode(false)}
      />
    );
  }

  return (
    <div
      className="space-y-3 rounded-2xl border border-accent/50 bg-panel/95 p-4 shadow-xl backdrop-blur"
      role="region"
      aria-label={`Team Vote: ${proposal.title}`}
    >
      {/* Top Banner: Proposal Header + Handoff Mode Toggle */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line/70 pb-2.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-accent/50 bg-accent/20 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
              Team Vote · {votes.length}/{crew.length} Cast
            </span>
            <span
              className="rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold"
              style={{
                borderColor: ROLES[proposal.ownerRole].colour,
                color: ROLES[proposal.ownerRole].colour,
                backgroundColor: `${ROLES[proposal.ownerRole].colour}15`,
              }}
            >
              Lead Desk: {ROLES[proposal.ownerRole].name}
            </span>
          </div>
          <h4 className="mt-1 text-base font-bold text-ink">{proposal.title}</h4>
          <p className="mt-0.5 text-xs text-muted">{proposal.summary}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleHandoffMode(!useHandoff)}
            className="rounded-lg border border-line bg-black/40 px-2.5 py-1 font-mono text-[10px] text-muted transition hover:border-accent hover:text-ink"
          >
            {useHandoff ? '🔒 Pass-the-Device Curtain: ON' : '🖥 Shared Screen Mode'}
          </button>
          {onCancel && proposal.kind === 'design' && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-line bg-black/40 px-2.5 py-1 font-mono text-[10px] text-muted hover:border-bad hover:text-bad"
            >
              Withdraw Proposal
            </button>
          )}
        </div>
      </div>

      {/* Resource Deltas (for Design Proposals) */}
      {deltaEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-black/30 px-3 py-2 font-mono text-xs">
          <span className="text-[10px] uppercase text-muted">Proposed Deltas:</span>
          {deltaEntries.map(([key, val]) => {
            const meta = DELTA_LABELS[key];
            const sign = val > 0 ? '+' : '';
            return (
              <span
                key={key}
                className="rounded border border-line bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-ink"
              >
                {meta.label}: {sign}
                {Math.round(val * 10) / 10} {meta.unit}
              </span>
            );
          })}
        </div>
      )}

      {/* Competing Role Stances (for Negotiation Dilemmas) */}
      {proposal.roleStances && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {(Object.entries(proposal.roleStances) as [RoleId, { optionId: string; stance: string }][]).map(
            ([roleId, item]) => {
              const role = ROLES[roleId];
              return (
                <div
                  key={roleId}
                  className="rounded-xl border px-3 py-1.5 text-xs"
                  style={{
                    borderColor: `${role.colour}55`,
                    backgroundColor: `${role.colour}12`,
                  }}
                >
                  <span className="font-mono text-[10px] font-bold uppercase" style={{ color: role.colour }}>
                    {role.short} · {role.name}:
                  </span>{' '}
                  <span className="text-ink/90">{item.stance}</span>
                </div>
              );
            },
          )}
        </div>
      )}

      {/* Current Voter Banner & Reaction Chips */}
      {status === 'voting' && currentVoter && (
        <div
          className="rounded-xl border px-3.5 py-2.5"
          style={{
            borderColor: currentPrimaryRole.colour,
            backgroundColor: `${currentPrimaryRole.colour}16`,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold text-space"
                style={{
                  backgroundColor: AVATAR_COLOURS[currentVoter.avatar % AVATAR_COLOURS.length],
                  borderColor: currentPrimaryRole.colour,
                }}
                aria-hidden
              >
                {(currentVoter.callSign || currentVoter.id).slice(0, 2).toUpperCase()}
              </span>
              <span className="text-xs font-bold text-ink">
                Now Voting: {currentVoter.callSign || `Astronaut ${currentVoterIndex + 1}`}
              </span>
              <div className="flex gap-1">
                {currentVoter.roles.map((r) => (
                  <span
                    key={r}
                    className="rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold"
                    style={{ borderColor: ROLES[r].colour, color: ROLES[r].colour }}
                  >
                    {ROLES[r].short}
                  </span>
                ))}
              </div>
            </div>

            {/* Crew Roster Progress Dots */}
            <div className="flex items-center gap-1.5">
              {crew.map((member, idx) => {
                const voted = votes.some((v) => v.memberId === member.id);
                const isCurrent = idx === currentVoterIndex;
                const roleCol = ROLES[member.roles[0] ?? 'commander'].colour;
                return (
                  <span
                    key={member.id}
                    className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                      isCurrent ? 'font-bold text-ink shadow' : voted ? 'text-ok' : 'text-muted'
                    }`}
                    style={{
                      borderColor: isCurrent ? roleCol : voted ? '#4cf0a0' : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    {member.callSign || member.id.toUpperCase()} {voted ? '✓' : isCurrent ? '●' : '○'}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Quick Reaction Chips */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase text-muted">Reaction chip:</span>
            {REACTION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                aria-pressed={selectedReaction === chip}
                onClick={() => setSelectedReaction(selectedReaction === chip ? undefined : chip)}
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition ${
                  selectedReaction === chip
                    ? 'border-accent bg-accent/25 font-bold text-ink'
                    : 'border-line bg-black/35 text-muted hover:border-accent/50 hover:text-ink'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Option Cards with Dropped Role-Coloured Avatars */}
      {status === 'voting' && currentVoter && (
        <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Vote Options">
          {proposal.options.map((opt) => {
            const optionVotes = votes.filter((v) => v.optionId === opt.id);
            const championRole = opt.championedBy ? ROLES[opt.championedBy] : null;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onCastVote(currentVoter.id, opt.id, selectedReaction);
                  setSelectedReaction(undefined);
                }}
                className="flex flex-col justify-between rounded-xl border border-line bg-black/45 p-3.5 text-left transition hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{opt.label}</span>
                    {championRole && (
                      <span
                        className="rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold"
                        style={{ borderColor: championRole.colour, color: championRole.colour }}
                      >
                        {championRole.short} Pick
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">{opt.description}</p>
                </div>

                {/* Role-coloured avatars dropped onto this option */}
                {optionVotes.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-2">
                    {optionVotes.map((v) => {
                      const roleColor = ROLES[v.roles[0] ?? 'commander'].colour;
                      return (
                        <span
                          key={v.memberId}
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold text-ink shadow-sm"
                          style={{
                            borderColor: roleColor,
                            backgroundColor: `${roleColor}28`,
                          }}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: AVATAR_COLOURS[v.avatar % AVATAR_COLOURS.length] }}
                          />
                          {v.callSign}
                          {v.reaction ? ` · "${v.reaction}"` : ''}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Mission Commander Tie-Break Panel */}
      {status === 'tie_break' && (
        <div
          className="rounded-xl border-2 p-4"
          style={{
            borderColor: ROLES.commander.colour,
            backgroundColor: `${ROLES.commander.colour}18`,
          }}
          role="region"
          aria-label="Mission Commander Tie-Break"
        >
          <p className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: ROLES.commander.colour }}>
            ⚖ Vote Tied — Mission Commander Tie-Break ({commander?.callSign || 'CDR'})
          </p>
          <p className="mt-1 text-xs text-ink/90">
            The crew is evenly split. As Mission Commander, choose the tie-breaking course of action:
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {proposal.options
              .filter((opt) => tiedOptionIds.length === 0 || tiedOptionIds.includes(opt.id))
              .map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onBreakTie(opt.id)}
                  className="rounded-xl border border-accent bg-black/50 p-3 text-left transition hover:bg-accent/25"
                >
                  <div className="font-bold text-ink">CDR Tie-Break: {opt.label}</div>
                  <div className="mt-0.5 text-xs text-muted">{opt.description}</div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
