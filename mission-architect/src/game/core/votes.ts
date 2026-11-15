/**
 * Hot-seat team voting, Commander tie-breaking, negotiation timeouts, and
 * collaboration scoring (Phase 08).
 */
import type { EventLog } from '../sim/journey';
import type { DecisionLogEntry } from '../types';
import { ROLE_IDS, ROLES, holderOf, type CrewMember, type RoleId } from './crew';
import type { Proposal } from './proposals';

export const REACTION_CHIPS = [
  'Too heavy!',
  'Need power!',
  'Over budget!',
  'For science!',
  'Protect the crew!',
  'Safe margins!',
] as const;

export type ReactionChip = (typeof REACTION_CHIPS)[number];

export interface MemberVote {
  memberId: string;
  callSign: string;
  avatar: number;
  roles: RoleId[];
  optionId: string;
  reaction?: string;
}

export type VoteOutcome = 'approved' | 'rejected' | 'tie_broken' | 'timeout_default';

export interface VoteResolution {
  outcome: VoteOutcome;
  winningOptionId: string;
  winningOptionLabel: string;
  consensus: boolean;
  tieBrokenByCommander: boolean;
  timedOut: boolean;
  tally: Record<string, number>;
  summaryText: string;
}

export interface VoteSession {
  proposal: Proposal;
  crew: CrewMember[];
  currentVoterIndex: number;
  /** Whether the pass-the-device handoff curtain is shown before the current voter's controls. */
  handoffPending: boolean;
  /** Whether hot-seat pass-the-device handoff screens are enabled between voters. */
  useHandoff: boolean;
  votes: MemberVote[];
  tiedOptionIds: string[];
  status: 'voting' | 'tie_break' | 'resolved';
  resolution: VoteResolution | null;
}

export interface CollaborationMetrics {
  /** Share of votes resolved without tie-break or timeout (0..1). */
  consensusRate: number;
  /** Share of crew members who contributed at least one decision or vote (0..1). */
  participationRate: number;
  /** True when every crew member contributed at least once ("no passengers"). */
  noPassengers: boolean;
  /** Quality of flight event responses (0..1). */
  eventQuality: number;
  /** Penalty from timed-out negotiations (0..0.3). */
  negotiationPenalty: number;
  /** Combined collaboration & decision score (0..1) for Phase 09 scoring. */
  overallScore: number;
  /** Total decisions + votes logged per role. */
  roleContributions: Record<RoleId, number>;
  /** Light-hearted MVP summary for the mission report. */
  mvp: {
    role: RoleId;
    callSign: string;
    reason: string;
  };
}

export function startVoteSession(
  proposal: Proposal,
  crew: readonly CrewMember[],
  useHandoff = false,
): VoteSession {
  const cleanCrew = crew.map((member) => ({ ...member, roles: [...member.roles] }));
  return {
    proposal,
    crew: cleanCrew,
    currentVoterIndex: 0,
    handoffPending: useHandoff && cleanCrew.length > 1,
    useHandoff,
    votes: [],
    tiedOptionIds: [],
    status: 'voting',
    resolution: null,
  };
}

export function setVoteHandoffMode(session: VoteSession, useHandoff: boolean): VoteSession {
  return {
    ...session,
    useHandoff,
    handoffPending: useHandoff && session.status === 'voting' && session.crew.length > 1,
  };
}

export function acknowledgeHandoff(session: VoteSession): VoteSession {
  if (!session.handoffPending) return session;
  return {
    ...session,
    handoffPending: false,
  };
}

function buildTally(proposal: Proposal, votes: readonly MemberVote[]): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const opt of proposal.options) {
    tally[opt.id] = 0;
  }
  for (const vote of votes) {
    tally[vote.optionId] = (tally[vote.optionId] ?? 0) + 1;
  }
  return tally;
}

function optionLabelOf(proposal: Proposal, optionId: string): string {
  return proposal.options.find((o) => o.id === optionId)?.label ?? optionId;
}

/** Casts a crew member's vote and advances or resolves the session. */
export function castVote(
  session: VoteSession,
  memberId: string,
  optionId: string,
  reaction?: string,
): VoteSession {
  if (session.status !== 'voting') return session;
  const member = session.crew.find((m) => m.id === memberId);
  if (!member) throw new Error(`Unknown crew member "${memberId}"`);
  if (!session.proposal.options.some((opt) => opt.id === optionId)) {
    throw new Error(`Unknown option "${optionId}" for proposal "${session.proposal.id}"`);
  }

  const filtered = session.votes.filter((v) => v.memberId !== memberId);
  const votes: MemberVote[] = [
    ...filtered,
    {
      memberId: member.id,
      callSign: member.callSign || `Astronaut ${member.id.toUpperCase()}`,
      avatar: member.avatar,
      roles: [...member.roles],
      optionId,
      reaction,
    },
  ];

  // Check if any crew member still needs to vote
  const nextVoterIndex = session.crew.findIndex((m) => !votes.some((v) => v.memberId === m.id));
  if (nextVoterIndex !== -1) {
    return {
      ...session,
      votes,
      currentVoterIndex: nextVoterIndex,
      handoffPending: session.useHandoff && session.crew.length > 1,
    };
  }

  // All crew members have voted: tally the result
  const tally = buildTally(session.proposal, votes);
  const maxCount = Math.max(0, ...Object.values(tally));
  const leaders = session.proposal.options
    .filter((opt) => (tally[opt.id] ?? 0) === maxCount)
    .map((opt) => opt.id);

  if (leaders.length === 1) {
    const winningOptionId = leaders[0];
    const winningOptionLabel = optionLabelOf(session.proposal, winningOptionId);
    const isRejectedDesign = session.proposal.kind === 'design' && winningOptionId === 'object';
    const outcome: VoteOutcome = isRejectedDesign ? 'rejected' : 'approved';
    const consensus = maxCount === session.crew.length || maxCount / session.crew.length >= 0.75;

    return {
      ...session,
      votes,
      currentVoterIndex: session.crew.length - 1,
      handoffPending: false,
      tiedOptionIds: [],
      status: 'resolved',
      resolution: {
        outcome,
        winningOptionId,
        winningOptionLabel,
        consensus,
        tieBrokenByCommander: false,
        timedOut: false,
        tally,
        summaryText: consensus
          ? `Team consensus (${maxCount}/${session.crew.length}): ${winningOptionLabel}.`
          : `Majority vote (${maxCount}/${session.crew.length}): ${winningOptionLabel}.`,
      },
    };
  }

  // Tie! Mission Commander breaks the tie.
  return {
    ...session,
    votes,
    currentVoterIndex: session.crew.length - 1,
    handoffPending: false,
    tiedOptionIds: leaders,
    status: 'tie_break',
    resolution: null,
  };
}

/** Mission Commander breaks a tied vote. */
export function resolveCommanderTieBreak(session: VoteSession, optionId: string): VoteSession {
  if (session.status !== 'tie_break') return session;
  const allowed = session.tiedOptionIds.length > 0 ? session.tiedOptionIds : session.proposal.options.map((o) => o.id);
  if (!allowed.includes(optionId)) {
    throw new Error(`Option "${optionId}" is not among the tied options`);
  }

  const commander = holderOf(session.crew, 'commander') ?? session.crew[0];
  const commanderName = commander?.callSign || 'Mission Commander';
  const winningOptionLabel = optionLabelOf(session.proposal, optionId);
  const tally = buildTally(session.proposal, session.votes);

  return {
    ...session,
    status: 'resolved',
    handoffPending: false,
    resolution: {
      outcome: session.proposal.kind === 'design' && optionId === 'object' ? 'rejected' : 'tie_broken',
      winningOptionId: optionId,
      winningOptionLabel,
      consensus: false,
      tieBrokenByCommander: true,
      timedOut: false,
      tally,
      summaryText: `Tie broken by ${commanderName} (CDR): ${winningOptionLabel}.`,
    },
  };
}

/** Resolves a timed negotiation when the countdown expires, applying the Commander's default with a small collaboration penalty. */
export function resolveNegotiationTimeout(session: VoteSession): VoteSession {
  if (session.status === 'resolved') return session;
  const fallbackId = session.proposal.defaultOptionId || session.proposal.options[0]?.id || 'approve';
  const winningOptionLabel = optionLabelOf(session.proposal, fallbackId);
  const tally = buildTally(session.proposal, session.votes);

  return {
    ...session,
    status: 'resolved',
    handoffPending: false,
    resolution: {
      outcome: 'timeout_default',
      winningOptionId: fallbackId,
      winningOptionLabel,
      consensus: false,
      tieBrokenByCommander: true,
      timedOut: true,
      tally,
      summaryText: `Timer expired — Commander default applied (${winningOptionLabel}) with a minor collaboration penalty.`,
    },
  };
}

const GOOD_EVENT_OPTIONS = new Set([
  'safe_mode',
  'shelter',
  'reroute',
  'repoint',
  'spare',
  'thrusters',
  'pause',
  'preprogram',
  'reboot',
  'rest',
  'medkit',
  'wait',
  'extend',
  'balanced_trim',
  'protect_science',
  'protect_margins',
  ' trim_dsn',
  'split_window',
  'compressed_burst',
]);

/** Computes collaboration and decision-quality metrics for solo and team play (feeds Phase 09). */
export function computeCollaborationMetrics(
  crew: readonly CrewMember[],
  decisionLog: readonly DecisionLogEntry[],
  events: readonly EventLog[] = [],
): CollaborationMetrics {
  const roleContributions: Record<RoleId, number> = {
    commander: 0,
    engineer: 0,
    science: 0,
    comms: 0,
  };

  const memberActivity = new Map<string, number>();
  for (const member of crew) {
    memberActivity.set(member.id, 0);
  }

  let totalVotes = 0;
  let consensusVotes = 0;
  let timeouts = 0;

  for (const entry of decisionLog) {
    if (ROLE_IDS.includes(entry.actor as RoleId)) {
      roleContributions[entry.actor as RoleId] += 1;
    }
    const actorHolder = ROLE_IDS.includes(entry.actor as RoleId)
      ? holderOf(crew, entry.actor as RoleId)
      : undefined;
    if (actorHolder) {
      memberActivity.set(actorHolder.id, (memberActivity.get(actorHolder.id) ?? 0) + 1);
    }

    if (entry.voteSummary) {
      totalVotes += 1;
      if (entry.voteSummary.consensus || entry.voteSummary.outcome === 'approved') {
        consensusVotes += entry.voteSummary.consensus ? 1 : 0.85;
      } else if (entry.voteSummary.outcome === 'tie_broken') {
        consensusVotes += 0.7;
      }
      if (entry.voteSummary.outcome === 'timeout_default') {
        timeouts += 1;
      }
      for (const v of entry.voteSummary.votes) {
        memberActivity.set(v.memberId, (memberActivity.get(v.memberId) ?? 0) + 1);
        for (const r of v.roles) {
          if (ROLE_IDS.includes(r as RoleId)) {
            roleContributions[r as RoleId] += 1;
          }
        }
      }
    }
  }

  const activeMembers = [...memberActivity.values()].filter((count) => count > 0).length;
  const participationRate = crew.length > 0 ? activeMembers / crew.length : 1;
  const noPassengers = participationRate === 1;
  const consensusRate = totalVotes > 0 ? Math.min(1, consensusVotes / totalVotes) : 1;

  // Event response quality
  let eventQuality = 1;
  if (events.length > 0) {
    let good = 0;
    for (const ev of events) {
      if (GOOD_EVENT_OPTIONS.has(ev.optionId)) {
        good += 1;
      } else if (/still made|shrugged|followed up|perfectly|protected|restored|saved/i.test(ev.outcome)) {
        good += 1;
      } else if (ev.optionId === 'store' || ev.optionId === 'hold' || ev.optionId === 'end') {
        good += 0.8;
      } else {
        good += 0.35;
      }
    }
    eventQuality = good / events.length;
  }

  const negotiationPenalty = Math.min(0.3, timeouts * 0.15);

  const rawOverall =
    crew.length > 1
      ? 0.35 * consensusRate + 0.25 * participationRate + 0.4 * eventQuality - negotiationPenalty
      : eventQuality - negotiationPenalty;
  const overallScore = Math.max(0, Math.min(1, rawOverall));

  // Pick MVP role
  let topRole: RoleId = 'engineer';
  let topCount = -1;
  for (const roleId of ROLE_IDS) {
    if (roleContributions[roleId] > topCount) {
      topCount = roleContributions[roleId];
      topRole = roleId;
    }
  }
  const mvpHolder = holderOf(crew, topRole) ?? crew[0];
  const mvpReasons: Record<RoleId, string> = {
    commander: 'Steered mission strategy, trajectory selection, and critical tie-breaks.',
    engineer: 'Balanced spacecraft mass, power margins, and propulsion through every hazard.',
    science: 'Maximised instrument payload return and protected key observations.',
    comms: 'Kept deep-space downlink, flight autonomy, and mission budget on track.',
  };

  return {
    consensusRate,
    participationRate,
    noPassengers,
    eventQuality,
    negotiationPenalty,
    overallScore,
    roleContributions,
    mvp: {
      role: topRole,
      callSign: mvpHolder?.callSign || ROLES[topRole].name,
      reason: mvpReasons[topRole],
    },
  };
}
