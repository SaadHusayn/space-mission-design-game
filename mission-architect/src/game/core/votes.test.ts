import { describe, expect, it } from 'vitest';

import { getLaunchVehicle } from '../data/loadData';
import { summarizeDesign } from '../sim/design';
import {
  EVENTS,
   EVENT_CATALOGUE,
  NEGOTIATION_EVENTS,
  advisorsForEvent,
  evaluateEventMitigations,
  getEvent,
} from '../sim/events';
import { WINNING_DESIGNS } from '../sim/fixtures/designs';
import { journeyEventContext, startJourney } from '../sim/journey';
import { createMission } from '../sim/mission';
import { emptyDesign } from '../types';
import { createCrew } from './crew';
import { createDesignProposal, createEventProposal, requiresTeamVote } from './proposals';
import { createGameStore } from './store';
import {
  acknowledgeHandoff,
  castVote,
  computeCollaborationMetrics,
  resolveCommanderTieBreak,
  resolveNegotiationTimeout,
  startVoteSession,
} from './votes';

describe('Phase 08: event catalogue, mitigations, and advisor opinions', () => {
  it('provides at least 9 flight events and 3 negotiation dilemmas with ≥ 2 choices each', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(9);
    expect(NEGOTIATION_EVENTS.length).toBeGreaterThanOrEqual(3);
    expect(EVENT_CATALOGUE.length).toBeGreaterThanOrEqual(12);

    const fixture = WINNING_DESIGNS.find((d) => d.name.startsWith('Mars A'))!;
    const mission = createMission(fixture.pathway, fixture.trajectory, 'engineer');
    const vehicle = getLaunchVehicle(fixture.vehicle);
    const journey = startJourney({ design: fixture.design, mission, vehicle, seed: 1 });
    const ctx = journeyEventContext(journey);

    for (const ev of [...EVENTS, ...NEGOTIATION_EVENTS]) {
      const options = ev.options(ctx);
      expect(options.length, ev.id).toBeGreaterThanOrEqual(2);
      for (const opt of options) {
        const res = ev.resolve(ctx, opt.id);
        expect(res.outcome.length, `${ev.id}:${opt.id}`).toBeGreaterThan(15);
      }
      const advisors = advisorsForEvent(ev.id, ctx);
      expect(advisors.length, `advisors for ${ev.id}`).toBeGreaterThanOrEqual(2);
      const mitigations = evaluateEventMitigations(ev.id, ctx);
      expect(mitigations.length, `mitigations for ${ev.id}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('evaluates design mitigations based on the built spacecraft', () => {
    const fixture = WINNING_DESIGNS.find((d) => d.name.startsWith('Jupiter A'))!;
    const mission = createMission(fixture.pathway, fixture.trajectory, 'engineer');
    const vehicle = getLaunchVehicle(fixture.vehicle);

    const goodJourney = startJourney({ design: fixture.design, mission, vehicle, seed: 1 });
    const goodMitigations = evaluateEventMitigations('radiation_upset', journeyEventContext(goodJourney));
    expect(goodMitigations[0]?.mitigated).toBe(true);

    const unshielded = structuredClone(fixture.design);
    unshielded.slots.computer = 'computer_basic';
    unshielded.slots.radiation = null;
    const weakJourney = startJourney({ design: unshielded, mission, vehicle, seed: 1 });
    const weakMitigations = evaluateEventMitigations('radiation_upset', journeyEventContext(weakJourney));
    expect(weakMitigations[0]?.mitigated).toBe(false);

    const stormEvent = getEvent('solar_storm');
    expect(stormEvent.id).toBe('solar_storm');
  });
});

describe('Phase 08: role ownership and proposals (2, 3, and 4 players)', () => {
  it('never requires a vote in solo mode, and enforces role ownership + budget thresholds in team mode', () => {
    const mission = createMission('leo', 'leo_400', 'engineer');
    const baseDesign = emptyDesign();
    baseDesign.busId = 'capsule_crew';
    const before = summarizeDesign(baseDesign, mission);

    // Small power change (< 10% of LEO budget)
    const nextDesign = structuredClone(baseDesign);
    nextDesign.slots.power = 'solar_small';
    const afterSmall = summarizeDesign(nextDesign, mission);

    const soloCrew = createCrew(1, ['Solo']);
    expect(
      requiresTeamVote({
        crew: soloCrew,
        activeMemberId: 'p1',
        change: { kind: 'equip', slot: 'power', partId: 'solar_small' },
        before,
        after: afterSmall,
        mission,
      }).required,
    ).toBe(false);

    const team4 = createCrew(4, ['Vega', 'Torque', 'Nova', 'Pulse']);
    // p1 is Commander (does not own power, which belongs to Engineer p2)
    const crossRoleCheck = requiresTeamVote({
      crew: team4,
      activeMemberId: 'p1',
      change: { kind: 'equip', slot: 'power', partId: 'solar_small' },
      before,
      after: afterSmall,
      mission,
    });
    expect(crossRoleCheck.required).toBe(true);
    expect(crossRoleCheck.reason).toBe('role_ownership');

    // p2 is Engineer (owns power, and small solar <= 10% threshold) -> no vote required!
    const ownRoleSmallCheck = requiresTeamVote({
      crew: team4,
      activeMemberId: 'p2',
      change: { kind: 'equip', slot: 'power', partId: 'solar_small' },
      before,
      after: afterSmall,
      mission,
    });
    expect(ownRoleSmallCheck.required).toBe(false);

    // Expensive power change (> 10% of LEO budget): solar_habitat or rtg
    const expensiveDesign = structuredClone(baseDesign);
    expensiveDesign.slots.power = 'rtg';
    const afterExpensive = summarizeDesign(expensiveDesign, mission);
    const budgetCheck = requiresTeamVote({
      crew: team4,
      activeMemberId: 'p2',
      change: { kind: 'equip', slot: 'power', partId: 'rtg' },
      before,
      after: afterExpensive,
      mission,
    });
    expect(budgetCheck.required).toBe(true);
    expect(budgetCheck.reason).toBe('budget_threshold');
  });

  it('resolves votes for 2, 3, and 4 players with majority rule and Commander tie-breaks', () => {
    const mission = createMission('leo', 'leo_400', 'engineer');
    const design = emptyDesign();
    const before = summarizeDesign(design, mission);
    const nextDesign = structuredClone(design);
    nextDesign.busId = 'capsule_crew';
    const after = summarizeDesign(nextDesign, mission);

    // 2 players: 1-1 tie -> Commander tie-break
    const crew2 = createCrew(2, ['Commander Alpha', 'Engineer Beta']);
    const proposal2 = createDesignProposal({
      id: 'prop-1',
      crew: crew2,
      activeMemberId: 'p1',
      change: { kind: 'bus', partId: 'capsule_crew' },
      design,
      before,
      after,
      reason: 'role_ownership',
    });

    let session2 = startVoteSession(proposal2, crew2, true);
    expect(session2.handoffPending).toBe(true);
    session2 = acknowledgeHandoff(session2);
    expect(session2.handoffPending).toBe(false);

    session2 = castVote(session2, 'p1', 'approve', 'For science!');
    expect(session2.status).toBe('voting');
    expect(session2.currentVoterIndex).toBe(1);
    expect(session2.handoffPending).toBe(true);
    session2 = acknowledgeHandoff(session2);

    session2 = castVote(session2, 'p2', 'object', 'Too heavy!');
    expect(session2.status).toBe('tie_break');
    expect(session2.tiedOptionIds).toEqual(['approve', 'object']);

    session2 = resolveCommanderTieBreak(session2, 'approve');
    expect(session2.status).toBe('resolved');
    expect(session2.resolution?.outcome).toBe('tie_broken');
    expect(session2.resolution?.tieBrokenByCommander).toBe(true);
    expect(session2.resolution?.winningOptionId).toBe('approve');

    // 3 players: 2-1 majority approval
    const crew3 = createCrew(3, ['CDR One', 'ENG Two', 'SCI Three']);
    let session3 = startVoteSession(proposal2, crew3, false);
    session3 = castVote(session3, 'p1', 'approve');
    session3 = castVote(session3, 'p2', 'object');
    session3 = castVote(session3, 'p3', 'approve');
    expect(session3.status).toBe('resolved');
    expect(session3.resolution?.outcome).toBe('approved');
    expect(session3.resolution?.winningOptionId).toBe('approve');

    // 4 players: unanimous consensus
    const crew4 = createCrew(4, ['P1', 'P2', 'P3', 'P4']);
    let session4 = startVoteSession(proposal2, crew4, false);
    for (const m of crew4) {
      session4 = castVote(session4, m.id, 'approve');
    }
    expect(session4.status).toBe('resolved');
    expect(session4.resolution?.consensus).toBe(true);
  });

  it('applies Commander default with penalty when a negotiation timer expires', () => {
    const crew = createCrew(3, ['CDR', 'ENG', 'SCI']);
    const proposal = createEventProposal({
      id: 'neg-1',
      crew,
      pending: {
        eventId: 'neg_budget_cut',
        day: 12,
        title: 'Agency Reserve Squeeze (−10% Contingency)',
        description: 'Competing priorities.',
        options: getEvent('neg_budget_cut').options({} as never),
      },
    });
    const session = startVoteSession(proposal, crew, false);
    const timedOut = resolveNegotiationTimeout(session);
    expect(timedOut.status).toBe('resolved');
    expect(timedOut.resolution?.outcome).toBe('timeout_default');
    expect(timedOut.resolution?.timedOut).toBe(true);
    expect(timedOut.resolution?.winningOptionId).toBe('balanced_trim');
  });
});

describe('Phase 08: store integration and collaboration scoring', () => {
  it('tracks proposals, votes, negotiations, and collaboration metrics in gameStore', () => {
    const store = createGameStore();
    store.getState().setCrew(createCrew(2, ['Vega', 'Torque']));
    store.getState().goTo('TITLE');
    store.getState().goTo('CHAPTER_SELECT');
    store.getState().selectPathway('leo', true);
    store.getState().openObjective();
    store.getState().acceptMission();

    // Active crew index is 0 (Vega: commander + science). Proposing a bus (owned by engineer) triggers a vote!
    const result = store.getState().proposeDesignChange({ kind: 'bus', partId: 'capsule_crew' });
    expect(result).toBe('proposed');
    expect(store.getState().activeVote).not.toBeNull();

    store.getState().submitMemberVote('p1', 'approve', 'Safe margins!');
    store.getState().submitMemberVote('p2', 'approve', 'Safe margins!');
    expect(store.getState().activeVote).toBeNull();
    expect(store.getState().design?.busId).toBe('capsule_crew');
    expect(store.getState().decisionLog.at(-1)?.voteSummary?.outcome).toBe('approved');

    // Load a complete LEO winning design, launch, and test negotiation + event voting
    const leoFixture = WINNING_DESIGNS.find((d) => d.name.startsWith('LEO A'))!;
    store.setState({
      design: structuredClone(leoFixture.design),
      vehicleId: leoFixture.vehicle,
      phase: 'JOURNEY',
    });
    store.getState().beginJourney(1);
    expect(store.getState().journey).not.toBeNull();

    // Trigger a scripted negotiation dilemma
    const startedNeg = store.getState().startNegotiation('neg_budget_cut');
    expect(startedNeg).toBe(true);
    expect(store.getState().journey?.pending?.eventId).toBe('neg_budget_cut');
    expect(store.getState().activeVote?.proposal.kind).toBe('negotiation');

    // Cast tied votes (p1 picks protect_science, p2 picks protect_margins) -> Commander tie-break
    store.getState().submitMemberVote('p1', 'protect_science');
    store.getState().submitMemberVote('p2', 'protect_margins');
    expect(store.getState().activeVote?.status).toBe('tie_break');

    store.getState().breakVoteTie('protect_science');
    expect(store.getState().activeVote).toBeNull();
    expect(store.getState().journey?.pending).toBeNull();
    expect(store.getState().lastEventResolution?.optionId).toBe('protect_science');

    const metrics = computeCollaborationMetrics(
      store.getState().profile.crew,
      store.getState().decisionLog,
      store.getState().journey?.events ?? [],
    );
    expect(metrics.participationRate).toBe(1);
    expect(metrics.noPassengers).toBe(true);
    expect(metrics.overallScore).toBeGreaterThan(0.6);
  });
});
