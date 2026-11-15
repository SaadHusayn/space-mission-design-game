/**
 * Role ownership and proposals for local hot-seat team play (up to 4 players).
 *
 * Each spacecraft subsystem and mission decision belongs to one of the four
 * roles (Commander, Engineer, Science, Comms). In team mode (2–4 players):
 * - Small decisions inside a player's own role area apply immediately.
 * - Cross-role changes, changes costing > 10% of the mission budget, changes
 *   crossing a hard resource limit, and all flight events go to a team vote.
 */
import { gameData } from '../data/loadData';
import type { DesignSummary } from '../sim/design';
import { getEventCatalogueEntry, getNegotiationEvent, type EventOption } from '../sim/events';
import type { PendingEvent } from '../sim/journey';
import type { DecisionDelta, Design, MissionContext, SlotId } from '../types';
import { ROLES, holderOf, type CrewMember, type RoleId } from './crew';
import type { DesignChange } from './designActions';

export type ProposalKind = 'design' | 'trajectory' | 'vehicle' | 'go_no_go' | 'event' | 'negotiation';

export type ProposalReason =
  | 'role_ownership'
  | 'budget_threshold'
  | 'limit_crossed'
  | 'major_milestone'
  | 'flight_event'
  | 'negotiation';

export interface ProposalOption {
  id: string;
  label: string;
  description: string;
  championedBy?: RoleId;
}

export interface Proposal {
  id: string;
  kind: ProposalKind;
  title: string;
  summary: string;
  proposerId: string;
  proposerCallSign: string;
  proposerRole: RoleId;
  ownerRole: RoleId;
  reasonRequired: ProposalReason;
  deltas: Partial<Record<DecisionDelta, number>>;
  designChange?: DesignChange;
  eventId?: string;
  options: ProposalOption[];
  defaultOptionId: string;
  timerSeconds?: number;
  roleStances?: Readonly<Record<RoleId, { optionId: string; stance: string }>>;
}

export const SLOT_OWNER_ROLE: Readonly<
  Record<SlotId | 'bus' | 'instruments' | 'fuelMass' | 'supplyDays' | 'spinArmLength', RoleId>
> = {
  bus: 'engineer',
  power: 'engineer',
  battery: 'engineer',
  adcs: 'engineer',
  propulsion: 'engineer',
  thermal: 'engineer',
  radiation: 'engineer',
  lifeSupport: 'engineer',
  habitat: 'engineer',
  heatShield: 'engineer',
  instruments: 'science',
  computer: 'comms',
  comms: 'comms',
  supplyDays: 'comms',
  fuelMass: 'engineer',
  spinArmLength: 'engineer',
};

export function ownerRoleForChange(change: DesignChange): RoleId {
  switch (change.kind) {
    case 'bus':
      return SLOT_OWNER_ROLE.bus;
    case 'equip':
    case 'unequip':
      return SLOT_OWNER_ROLE[change.slot];
    case 'addInstrument':
    case 'removeInstrument':
      return SLOT_OWNER_ROLE.instruments;
    case 'option':
      return SLOT_OWNER_ROLE[change.key];
  }
}

export function memberOwnsRole(member: CrewMember | undefined, role: RoleId): boolean {
  if (!member) return false;
  return member.roles.includes(role);
}

export function computeDecisionDeltas(
  before: DesignSummary,
  after: DesignSummary,
): Partial<Record<DecisionDelta, number>> {
  const deltas: Partial<Record<DecisionDelta, number>> = {};
  const record = (key: DecisionDelta, value: number) => {
    if (Math.abs(value) > 1e-9) deltas[key] = Math.round(value * 1000) / 1000;
  };
  record('mass', after.wetMass - before.wetMass);
  record('cost', after.totalCost - before.totalCost);
  record('power', after.powerLoad - before.powerLoad);
  record('data', after.dataPerDay - before.dataPerDay);
  record('deltaV', after.deltaV - before.deltaV);
  record('science', after.science - before.science);
  return deltas;
}

export function describeDesignChange(design: Design | null, change: DesignChange): { title: string; partName: string } {
  const nameOf = (id: string | null) => (id ? (gameData.partById.get(id)?.name ?? id) : 'None');
  switch (change.kind) {
    case 'bus': {
      const partName = nameOf(change.partId);
      return { title: `Select Bus: ${partName}`, partName };
    }
    case 'equip': {
      const partName = nameOf(change.partId);
      return { title: `Equip ${partName} (${change.slot})`, partName };
    }
    case 'unequip': {
      const prev = design?.slots[change.slot] ?? null;
      const partName = nameOf(prev);
      return { title: `Remove ${partName} (${change.slot})`, partName };
    }
    case 'addInstrument': {
      const partName = nameOf(change.partId);
      return { title: `Add Instrument: ${partName}`, partName };
    }
    case 'removeInstrument': {
      const partName = nameOf(change.partId);
      return { title: `Remove Instrument: ${partName}`, partName };
    }
    case 'option': {
      const labels: Record<'fuelMass' | 'supplyDays' | 'spinArmLength', string> = {
        fuelMass: `Set Propellant Load to ${change.value} kg`,
        supplyDays: `Set Crew Supplies to ${change.value} days`,
        spinArmLength: `Set Spin Habitat Arm to ${change.value} m`,
      };
      return { title: labels[change.key], partName: labels[change.key] };
    }
  }
}

/**
 * Determines whether a design edit in assembly requires a team vote.
 * Solo mode (1 player) never requires a vote for assembly edits.
 */
export function requiresTeamVote(params: {
  crew: readonly CrewMember[];
  activeMemberId: string;
  change: DesignChange;
  before: DesignSummary;
  after: DesignSummary;
  mission: MissionContext;
}): { required: boolean; reason: ProposalReason | null; ownerRole: RoleId } {
  const { crew, activeMemberId, change, before, after, mission } = params;
  const ownerRole = ownerRoleForChange(change);

  if (crew.length <= 1) {
    return { required: false, reason: null, ownerRole };
  }

  const activeMember = crew.find((m) => m.id === activeMemberId) ?? crew[0];

  // 1. Role ownership check: proposing a change in another player's domain
  if (!memberOwnsRole(activeMember, ownerRole)) {
    return { required: true, reason: 'role_ownership', ownerRole };
  }

  // 2. Hard limit crossed (budget, bus max mass, or power deficit)
  const busMax = after.resolved.bus?.maxMass ?? Infinity;
  const crossedMass = after.wetMass > busMax && before.wetMass <= (before.resolved.bus?.maxMass ?? Infinity);
  const crossedBudget = after.totalCost > mission.budget && before.totalCost <= mission.budget;
  const crossedPower =
    Boolean(after.resolved.power) &&
    after.powerLoad > after.powerAvailable &&
    before.powerLoad <= before.powerAvailable;

  if (crossedMass || crossedBudget || crossedPower) {
    return { required: true, reason: 'limit_crossed', ownerRole };
  }

  // 3. Single decision exceeds 10% of mission budget
  const costDelta = after.totalCost - before.totalCost;
  if (costDelta > mission.budget * 0.1) {
    return { required: true, reason: 'budget_threshold', ownerRole };
  }

  return { required: false, reason: null, ownerRole };
}

const REASON_LABELS: Readonly<Record<ProposalReason, string>> = {
  role_ownership: 'Cross-role proposal (requires role owner & team approval)',
  budget_threshold: 'Major expenditure (> 10% of mission budget)',
  limit_crossed: 'Crosses a spacecraft or mission limit',
  major_milestone: 'Major mission milestone decision',
  flight_event: 'In-flight anomaly requires crew decision',
  negotiation: 'Competing role priorities — timed team negotiation',
};

export function createDesignProposal(params: {
  id: string;
  crew: readonly CrewMember[];
  activeMemberId: string;
  change: DesignChange;
  design: Design | null;
  before: DesignSummary;
  after: DesignSummary;
  reason: ProposalReason;
}): Proposal {
  const { id, crew, activeMemberId, change, design, before, after, reason } = params;
  const proposer = crew.find((m) => m.id === activeMemberId) ?? crew[0];
  const ownerRole = ownerRoleForChange(change);
  const proposerRole = proposer?.roles[0] ?? 'commander';
  const { title } = describeDesignChange(design, change);
  const deltas = computeDecisionDeltas(before, after);
  const ownerHolder = holderOf(crew, ownerRole);

  return {
    id,
    kind: 'design',
    title,
    summary: `${proposer?.callSign || 'Astronaut'} (${ROLES[proposerRole].short}) proposes "${title}" in ${ROLES[ownerRole].name}'s domain (${ownerHolder?.callSign || ROLES[ownerRole].short}). Reason: ${REASON_LABELS[reason]}.`,
    proposerId: proposer?.id ?? 'p1',
    proposerCallSign: proposer?.callSign || 'Player 1',
    proposerRole,
    ownerRole,
    reasonRequired: reason,
    deltas,
    designChange: change,
    options: [
      {
        id: 'approve',
        label: '👍 Approve Change',
        description: `Apply "${title}" to the spacecraft assembly.`,
        championedBy: proposerRole,
      },
      {
        id: 'object',
        label: '👎 Object & Keep Current',
        description: 'Reject this proposal and keep the current configuration.',
        championedBy: ownerRole !== proposerRole ? ownerRole : undefined,
      },
    ],
    defaultOptionId: 'approve',
  };
}

export function createEventProposal(params: {
  id: string;
  crew: readonly CrewMember[];
  pending: PendingEvent;
}): Proposal {
  const { id, crew, pending } = params;
  const cat = getEventCatalogueEntry(pending.eventId);
  const neg = getNegotiationEvent(pending.eventId);
  const ownerRole: RoleId = cat?.ownerRole ?? 'commander';
  const ownerMember = holderOf(crew, ownerRole) ?? crew[0];
  const isNegotiation = Boolean(neg || cat?.kind === 'negotiation');

  const options: ProposalOption[] = pending.options.map((opt: EventOption) => ({
    id: opt.id,
    label: opt.label,
    description: opt.description,
    championedBy: opt.championedBy,
  }));

  return {
    id,
    kind: isNegotiation ? 'negotiation' : 'event',
    title: pending.title,
    summary: pending.description,
    proposerId: ownerMember?.id ?? 'p1',
    proposerCallSign: ownerMember?.callSign || ROLES[ownerRole].short,
    proposerRole: ownerRole,
    ownerRole,
    reasonRequired: isNegotiation ? 'negotiation' : 'flight_event',
    deltas: {},
    eventId: pending.eventId,
    options,
    defaultOptionId: neg?.commanderDefaultOptionId ?? options[0]?.id ?? 'safe_mode',
    timerSeconds: neg?.timerSeconds,
    roleStances: neg?.roleStances,
  };
}
