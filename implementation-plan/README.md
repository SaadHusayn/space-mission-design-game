# Implementation Plan: TRAJECTORY: Pathways Beyond (3D, Three.js)

> **Code:** [`../mission-architect/`](../mission-architect/README.md) · **Status:** P01–P05 built (build notes at the end of each phase file). Next: P06. See [`../HANDOFF.md`](../HANDOFF.md).

> **Story:** *Astronaut candidates are nominated and recruited by a space agency. They design their spacecraft side by side with engineers, then fly it on different mission pathways: Earth orbit, the Moon, Mars, Jupiter, and to the edge of the Solar System and the worlds beyond it. Real physics hazards test every design choice. The crew is evaluated on how well their physics-based engineering holds up.*
>
> **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Three.js via React Three Fiber + drei, with GLB models (PBR texture mapping).
>
> **Non-negotiable:** THE PROJECT MUST FULFILL THE REQUIREMENTS OF THE CHALLENGE. Every phase lists the checklist IDs it covers ([../game-design-docs/03-requirements-checklist.md](../game-design-docs/03-requirements-checklist.md)). The game must be **3D** and **interesting**.

---

## How to use this folder

1. Read **00 → 02** once (story, architecture, physics). These are the reference docs.
2. Implement **phase by phase** (P01 → P10, plus optional P11). Each phase file has goals, tasks, files, acceptance criteria and challenge mapping.
3. A phase is **done** only when all of its acceptance criteria pass **and** the game still runs end to end.
4. After each phase, update the self-check table in `game-design-docs/03` for the items it covers.

## Reference docs

| File | What |
|---|---|
| [00-scope-and-story.md](00-scope-and-story.md) | Story bible, chapters, characters, pathways, cutscene list, **scope filter** (what was kept, adjusted or cut to stay within the challenge and realistic) |
| [01-tech-architecture.md](01-tech-architecture.md) | Stack, libraries, folder structure, game state machine, rendering, **GLB/texture-mapping asset pipeline**, performance budgets |
| [02-physics-and-challenges.md](02-physics-and-challenges.md) | Every physics formula used, **verified example values**, the physics-challenge format, the Engineering Review checks |

## Phase roadmap

| Phase | Name | Player-facing result | Main challenge items | Depends on |
|---|---|---|---|---|
| **P01** | [Foundation](phase-01-foundation.md) | Project runs, 3D canvas, scene manager, loading screen, deploy link | T3 | none |
| **P02** | [Core logic & physics engine](phase-02-core-logic-and-physics-engine.md) | (no UI) Tested data, physics, resource math, simulation | M7–M10 foundations | P01 |
| **P03** | [Recruitment, crew & training](phase-03-recruitment-crew-training.md) | Intro cutscene, astronaut nomination, roles, solo/team (up to 4), training tutorial | M1, M13, R1, R2, R13 | P01, P02 |
| **P04** | [Mission briefing & pathways](phase-04-mission-briefing-and-pathways.md) | Mission control briefing, choose a pathway/objective, see requirements | M2, M6 (destination), R9, R14 | P03 |
| **P05** | [Spacecraft assembly & Engineering Review](phase-05-spacecraft-assembly-and-review.md) | 3D hangar, GLB parts snap to sockets, live resources, physics design tools, ERB evaluation | M3, M4, M7, M8, T1 | P02, P04 |
| **P06** | [Launch vehicle, launch & orbit](phase-06-launch-and-orbit.md) | Rocket choice, GO/NO-GO, 3D launch cutscene + interactive moments, orbit insertion challenge | M5, M6, M9, M10, T1 | P05 |
| **P07** | [Journeys & physics scenarios](phase-07-journeys-and-physics-scenarios.md) | 3D Solar System travel, Moon / Mars / Jupiter / Beyond pathways, hazards tested against the design | M10, M12, R10, T1, T2 | P06 |
| **P08** | [Events, crew decisions & team play](phase-08-events-and-team-decisions.md) | Random events, team votes, negotiation, hot-seat multiplayer | R1, R2, R11, N6 | P07 |
| **P09** | [Evaluation, mission report & replay](phase-09-evaluation-report-replay.md) | Score, ERB + flight results, "why" analysis, leaderboard, redesign & re-fly | M11, R3, R4, R5, R12, N1, N2 | P07 (P08) |
| **P10** | [Polish, audio, accessibility & release](phase-10-polish-audio-release.md) | Music/SFX, post-processing, performance, accessibility, credits, submission | T2, T3, T4 | all |
| **P11** | [Online multiplayer (optional)](phase-11-online-multiplayer-optional.md) | Up to 4 players on separate devices | N10 | P08 |

**Milestone "Playable"** = P01–P07 + simple report (part of P09). The full challenge loop works.
**Milestone "Submission"** = P01–P10. P11 only if time allows.

## Definition of Done (every phase)

- [ ] All acceptance criteria in the phase file pass
- [ ] `npm run lint`, `npm run typecheck` and `npm test` are green
- [ ] Full playthrough still works (no dead ends, no console errors)
- [ ] 60 fps target / ≥30 fps on a mid-range laptop in the new scenes
- [ ] New assets are compressed (GLB Draco/Meshopt, KTX2 textures) and logged in `CREDITS.md`
- [ ] The challenge checklist items for the phase are updated
