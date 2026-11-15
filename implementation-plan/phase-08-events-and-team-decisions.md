# Phase 08 · Events, Crew Decisions and Team Play (hot-seat)

> **Goal:** make the journey tense and social. **Random and scripted events** create trade-off decisions. In team mode (**up to 4 players, one device**), roles **propose, vote and negotiate**. Collaboration affects the result.
> **Player-facing result:** event cards interrupt the flight → the crew decides (solo: advisors; team: vote) → consequences + explanation. Design decisions in team mode go through role ownership and approvals.
> **Depends on:** P07 · **Challenge items:** **R1, R2, R11**, N6, part of R3 (collaboration score).

---

## 1. Event catalogue (data: `events.json`, seeded RNG from P02)

| Event | Where | Effect | Choices (each a trade-off) | Mitigated by design |
|---|---|---|---|---|
| ☀️ Solar particle event / storm | All (worse beyond Earth) | Power −30%, radiation dose ↑ | Safe mode (lose science) / keep operating (risk) / crew to the shelter (crewed) | Battery size, radiation vault, storm shelter |
| 💥 Micrometeoroid hit | Cruise | An array or antenna is damaged | Re-point / reroute power / accept | Margins, redundancy |
| ⚙️ Reaction wheel failure | Any | Pointing ×0.7 | Switch to thrusters (uses fuel) / accept | Precision ADCS (redundant) |
| 📡 Ground station outage | Any | No downlink for N days | Store data (overflow risk) / pause instruments | Storage, high-rate antenna |
| 🌗 Solar conjunction blackout | Mars, Jupiter | No contact for ~2 weeks | Pre-program (needs autonomy) / hold position | Autonomous computer |
| 🧠 Radiation upset (bit flip) | Jupiter, deep space | Computer reboot | n/a / reboot timing | Rad-hard computer |
| 🤒 Crew illness / bone-loss warning | Crewed Mars | Crew health ↓ | Change the spin rpm / exercise / medical kit | Spin habitat, medical kit |
| 🌦 Launch weather delay | Pad | Before launch | Wait (cost/time) / launch (risk) | n/a |
| 🌟 Bonus discovery | High-science designs | Science +15% | Extend the mission (cost, wear) / end as planned | Science value, lifetime margin |

Difficulty sets the frequency and severity (Cadet: 0–1 mild · Engineer: 1–2 · Flight Director: 2–4 harsh). **Every event outcome comes with a "why" explanation tied to the design.**

## 2. Team mode (local hot-seat, up to 4)

- **Role ownership** (from P05): each slot and decision type belongs to a role. Others can **propose**.
- **Proposal → vote flow:** a proposal appears as PENDING with its deltas → each player approves or objects on their turn (pass-the-device screen, or simultaneous voting on a shared screen) → majority applies it; on a tie, the Commander decides.
- **Big decisions require a vote:** anything crossing a limit, > 10% of the budget, the pathway/trajectory/rocket, the GO/NO-GO, and all flight events.
- **Negotiation events (N6):** scripted dilemmas where roles have competing goals (for example, "Budget cut 10%": Science wants instruments, Engineer wants margin, Comms wants downlink). A 30–60 s timer. The default is the Commander's pick, with a small collaboration penalty.
- **Solo mode:** the same events. NPC engineers give **advisor opinions** ("Kenji: Safe mode, the battery won't last."). The player decides.

## 3. Collaboration and decision scoring (feeds P09)
- Consensus rate, every role contributing (no passengers), event response quality ("good call" when a choice protected the mission), negotiation outcomes.
- The decision log records `who · role · proposal · votes · outcome`.

## 4. 3D and visuals
- Event presentation: alarm lighting in the spacecraft close-up (a red pulse), particle storms (solar), a sparks/debris burst (micrometeoroid), a comms beam cut-off visual, the crew avatars in mission control reacting (simple animations).
- Vote UI with role-coloured avatars dropping onto the options.

## 5. Files to create
```
src/game/sim/events.ts (expand) · src/game/core/proposals.ts · src/game/core/votes.ts (+ tests)
src/ui/{EventModal,VotePanel,HotseatHandoff,AdvisorBubble,NegotiationTimer,DecisionLog}.tsx
src/three/{AlarmLight,StormParticles,ImpactBurst}.tsx
src/game/data/events.json (complete) · dialogue/advisors.json
```

## 6. Acceptance criteria
- [x] ≥ 6 event types are implemented with ≥ 2 choices each. Each choice has a different consequence and an explanation.
- [x] Event outcomes depend on the built design (the mitigation column works).
- [x] Hot-seat team play works for 2, 3 and 4 players. Role ownership, proposals and votes work, and tie-breaks go to the Commander.
- [x] Solo play gets advisor opinions on every event.
- [x] The same seed + the same choices → the same outcome (determinism).
- [x] The decision log captures every vote and event decision.

## 7. Risks and tips
- Don't flood players with events. Cap them per mission and space them out.
- Hot-seat UX: make it obvious whose turn it is (a big role colour + name banner).

---

## Build notes (Phase 08 completed)

- **Expanded Event Catalogue & Advisor Dialogue (`src/game/data/events.json`, `src/game/data/advisors.json`, `src/game/data/dialogue/advisors.json`, `src/game/sim/events.ts`)**:
  - Validated 12 catalogue events (9 random/scripted flight anomalies + 3 scripted team negotiation dilemmas `neg_budget_cut`, `neg_bonus_target`, `neg_bandwidth_clash` with competing role stances and 45s countdown timers) and NPC advisor recommendations (`Dr. Imani Okafor`, `Kenji Watanabe`, `Dr. Lucía Ferreira`, `CAPCOM "Echo"`, `Director Hale`).
  - Added `evaluateEventMitigations(eventId, ctx)` and `advisorsForEvent(eventId, ctx)` so every event shows how the player's built spacecraft hardware mitigates or is vulnerable to the hazard, paired with engineering advisor bubbles.
- **Hot-Seat Role Ownership, Proposals, Voting & Collaboration Scoring (`src/game/core/proposals.ts`, `src/game/core/votes.ts`, `src/game/core/votes.test.ts`, `src/game/core/store.ts`)**:
  - Implemented `requiresTeamVote`, `createDesignProposal`, `createEventProposal`, `startVoteSession`, `acknowledgeHandoff`, `castVote`, `resolveCommanderTieBreak`, `resolveNegotiationTimeout`, and `computeCollaborationMetrics` supporting 1, 2, 3, and 4 players.
  - Integrated `activeCrewIndex`, `activeVote`, `lastEventResolution`, `proposeDesignChange`, `startEventVote`, `startNegotiation`, `submitMemberVote`, `breakVoteTie`, and `expireNegotiationTimer` into `gameStore`, recording every proposal, vote, reaction chip, tie-break, and event outcome in `decisionLog`.
- **3D Event Visuals & UI Components (`src/three/{AlarmLight,StormParticles,ImpactBurst}.tsx`, `src/ui/{EventModal,VotePanel,HotseatHandoff,AdvisorBubble,NegotiationTimer,DecisionLog}.tsx`)**:
  - Built 3D `AlarmLight` (pulsing red beacon ring), `StormParticles` (solar ion stream), `ImpactBurst` (micrometeoroid debris burst), and comms blackout link indicator in `JourneyScene.tsx`, plus Mission Control crew status reaction badges in `JourneyHud.tsx`.
  - Built `EventModal`, `VotePanel` (with role-coloured crew avatars dropping onto option cards and quick reaction chips), `HotseatHandoff` (pass-the-device curtain), `AdvisorBubble`, `NegotiationTimer`, and `DecisionLog`, wired into `AssemblyHud.tsx` and `JourneyHud.tsx`.
- **Verification**:
  - 17 unit test files passing (229 unit tests passing, 1 skipped).
  - Playwright E2E test added in `tests/e2e/events-team.spec.ts` covering hot-seat role proposals, pass-the-device handoff, Commander tie-break, in-flight negotiation dilemmas, advisor bubbles, and the decision log.
