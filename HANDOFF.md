# HANDOFF: TRAJECTORY: Pathways Beyond

> **Read this first if you are a new agent or teammate picking up the project.**
> Last updated: 2026-11-14 · Current phase: **P02 done → next: P03 (Recruitment, crew & training)**

---

## 1. What this project is

A 3D web game for the **NASA Space Apps Challenge 2026: "Space Mission Design Game"**. Players are astronaut
candidates recruited by a **fictional** agency (Orbital Exploration Agency). They design a spacecraft with
engineers, pick an orbit/trajectory and rocket, launch, and fly to the Moon, Mars, Jupiter and beyond. Physics
hazards test the design. A report explains why the mission succeeded or failed.

**Hard rules (from the team):**
1. **THE PROJECT MUST FULFILL THE REQUIREMENTS OF THE CHALLENGE.** Checklist: `game-design-docs/03-requirements-checklist.md` (all M and T items mandatory).
2. The game must be **3D** (Three.js) and **interesting**.
3. Stack: **Next.js + TypeScript + Tailwind + Three.js (React Three Fiber + drei)**, GLB models.
4. Stay inside the challenge scope. No NASA logos or implied endorsement.

## 2. Where things are

| Path | What |
|---|---|
| `README.md` | Project overview and folder map |
| `HANDOFF.md` | This file: status, next steps, decisions, open questions |
| `challenge-details.md` | Older copy of the challenge text (superseded by `game-design-docs/01`) |
| `game-design-docs/` | Requirements: official challenge text (01), resources (02), **requirements checklist (03)**, design guidance (04–10) |
| `implementation-plan/` | **The build plan.** `README.md` = roadmap. `00` story/scope, `01` architecture, `02` physics + verified numbers, `phase-01…11` per-phase specs |
| `trajectory/` | **The game code** (Next.js app). Its own `README.md` explains commands and layout |

## 3. Status by phase

| Phase | Status | Notes |
|---|---|---|
| P01 Foundation | ✅ Done | Title scene (3D Earth), scene switch, loader, settings, asset pipeline, CI file. Build notes at the end of `implementation-plan/phase-01-foundation.md` |
| P02 Core logic & physics | ✅ Done | 148 tests. Build notes at the end of `implementation-plan/phase-02-core-logic-and-physics-engine.md` |
| P03 Recruitment, crew & training | 🟡 Code done, verification in progress | Cutscenes, crew setup, training, graduation. See §4 |
| P04–P11 | ⏳ Not started | Specs in `implementation-plan/phase-*.md` |

## 4. Current phase progress (update as you go)

**P03** (`implementation-plan/phase-03-recruitment-crew-training.md`): code written and passing lint/types/171 tests/build. Remaining: browser walkthrough + screenshots, build notes, mark done.

P03 files: `src/game/core/{crew,prologue,patch}.ts` (+ tests), `src/game/data/story.ts`, `src/cutscenes/*` (timeline, scripts CS-00..02, director, overlay), `src/sets/*` (3D sets built from primitives), `src/scenes/{Prologue,Training,ChapterSelect}/*`, `src/ui/{CrewSetup,DialogueBox,PhysicsConsole,ResourcePanel,PatchMaker,MissionPatch,CrewBadge}.tsx`.

<details><summary>P02 checklist (done)</summary>


- [x] `src/game/physics/*`: all formulas from `implementation-plan/02-physics-and-challenges.md`, **34 tests passing** against the doc's worked examples
- [x] `src/game/data/schemas.ts`: zod schemas for parts, launch vehicles, pathways, trajectories
- [x] `src/game/types/index.ts`: types derived from schemas + `Design`, `MissionContext`
- [x] `src/game/data/*.json` + `loadData.ts`: 44 parts, 9 instruments, 4 rockets, 6 pathways × 2 trajectories, validated + cross-checked
- [x] `src/game/sim/design.ts` + `mission.ts`: design totals (mass, Δv, power, data, cost, radiation, lifetime, crew health, science)
- [x] `src/game/sim/review.ts`: Engineering Review Board, 20 checks (ERB-0…14), each with explanation + fix hint
- [x] Balance: `sim/fixtures/designs.ts` has 2 winning designs per pathway (both trajectories used); 17 bad-design cases fail for the right reason. Debug report: `BALANCE=1 npx vitest run src/game/sim/balance.debug.test.ts --reporter=verbose`
- [x] `src/game/sim/journey.ts` + `events.ts`: day-by-day flight, survival mode, 9 events with trade-off choices, deterministic
- [x] `src/game/challenges/*`: 9 physics challenge generators (misconception distractors, explanations, consequences)
- [x] `src/game/sim/scoring.ts` + `why.ts`: contract, 6 weighted components, grade, stars, "why" bullets
- [x] `src/game/index.ts`: public API (`import … from '@/game'`)
- [x] Docs updated

</details>

### How the UI phases should use the game logic

```ts
import { createMission, reviewDesign, runJourney, startJourney, advanceJourney, resolveEvent,
         scoreMission, explainMission, challengesFor, getLaunchVehicle } from '@/game';

const mission = createMission('jupiter', 'jupiter_direct', 'engineer');
const review = reviewDesign(design, mission);                 // P05 assembly HUD + ERB screen (rocket checks 'pending')
const goNoGo = reviewDesign(design, mission, getLaunchVehicle('lv_heavy')); // P06 GO/NO-GO
let journey = startJourney({ design, mission, vehicle, seed }); // P07
journey = advanceJourney(journey, 30);                         // run 30 days (stops early for events)
if (journey.pending) journey = resolveEvent(journey, optionId); // P08 event modal / team vote
const score = scoreMission(journey, { physics: physicsMastery(results) }); // P09
const why = explainMission(journey, score);
```

## 5. How to verify the code

```bash
cd trajectory
npm install
npm run lint && npm run typecheck && npm test && npm run build
npm run dev   # http://localhost:3000/play
```

## 6. Decisions made on the team's behalf (please review)

These were not specified by the team. Each one can be changed.

| # | Decision | Why | Where to change |
|---|---|---|---|
| D1 | Game title **"TRAJECTORY: Pathways Beyond"**, tagline "Design it. Launch it. Prove it with physics." | Team asked for a good, relevant name | `trajectory/src/app/layout.tsx`, `src/ui/TitleMenu.tsx`, `src/app/page.tsx`, docs |
| D2 | Fictional agency **"Orbital Exploration Agency (OEA)"**; fictional characters (Director Hale, Dr. Okafor, Kenji Watanabe, Dr. Ferreira, CAPCOM "Echo") | Avoid implying NASA endorsement (team approved the agency) | `implementation-plan/00-scope-and-story.md` |
| D3 | Crewed missions only to LEO, Moon, Mars; Jupiter and beyond are robotic | Realism (radiation, travel time) | 00-scope-and-story §1 |
| D4 | "Interstellar worlds" became a real **Interstellar Probe** (heliopause) and an **Exoplanet Observatory** (TRAPPIST-1, Proxima b as labelled artist's impressions) | Realism + avoid copying the film | 00-scope-and-story §1 |
| D5 | "Centrifugal force" taught as **centripetal force in orbit** and **centrifugal effect in spin habitats** | Physics correctness | 02-physics §C, §F |
| D6 | App lives in **`trajectory/`** inside this project; Next.js **16.4** (latest at scaffold time) with the scaffold's `cacheComponents` setting kept | Team said "in this project" | — |
| D7 | Earth textures from **Solar System Scope (CC BY 4.0)**; placeholder spacecraft GLB **generated in code** until Blender models exist | No 3D artist assets yet | `trajectory/CREDITS.md`, `scripts/` |
| D8 | **WebP** textures instead of KTX2 | KTX-Software `ktx` tool not installed | `scripts/optimize-assets.mjs` |
| D9 | Libraries installed per phase (not all up front) | Smaller, cleaner project | `implementation-plan/phase-01-foundation.md` §7 |
| D10 | **One git repository at the project root** (docs + game). The scaffold's separate `trajectory/.git` (one auto-generated commit) was moved out to a backup, not deleted. CI lives at `.github/workflows/ci.yml` and runs inside `trajectory/` | Team asked for a git repo for the whole project | `.github/workflows/ci.yml` |
| D11 | Engineering Review runs **before** the rocket is chosen (plan order). Rocket-dependent checks (launch capacity, liftoff TWR, g-load, launch cost) show as **"pending"** and are re-checked at GO/NO-GO | Plan's phase order put ERB before rocket choice | `src/game/sim/review.ts` |
| D12 | All game numbers (part masses, costs, budgets, dose rates) are **simplified, illustrative values**, tuned so ≥ 2 designs can win each pathway | Challenge wants trade-offs, not engineering accuracy | `src/game/data/*.json` |
| D13 | Crewed Mars uses a single **"super-heavy lifter with orbital refuelling (concept)"** launch | Real crewed Mars plans need several launches; one launch keeps the game simple | `src/game/data/launchVehicles.json` |
| D15 | **All parts are available at every difficulty.** Difficulty changes budget (Cadet +30%, Flight Director −20%), hints and event frequency; each part shows its tier (simple/standard/advanced) | Crewed chapters need standard/advanced vehicles, so locking tiers would block chapters | `src/game/sim/mission.ts` |
| D16 | Added **"Nuclear thermal engine (concept)"** so the fast Mars transfer is possible; chemical engines can't do it with a realistic mass | Keeps the fast-vs-efficient trade-off real | `data/parts.json` |
| D17 | A battery isn't required when the power source is an RTG and there are no eclipses (like Voyager) | Realism | `sim/review.ts` ERB-0 |
| D18 | Event effects **scale with mission length** (5% of the phase, min 1 day) | A 10-day storm would erase a 5-day mission | `sim/journey.ts` `EVENT_DURATION_SHARE` |
| D19 | **Survival mode**: when power is short, instruments go off and the radio drops to 20% before the battery drains | Matches how real spacecraft protect themselves | `sim/journey.ts` `SURVIVAL_COMMS_CUT` |
| D20 | Scoring weights from phase-09 (objectives 30, science 20, engineering 15, efficiency 15, physics 10, decisions 10); a component that doesn't apply is left out and the rest re-weighted | Plan | `sim/scoring.ts` |
| D21 | Physics challenge mistakes are never game over: they cost a little Δv, science or crew health, and always explain the right reasoning | Challenge text: teach *why* | `challenges/generator.ts` |
| D14 | Crew radiation limit in game = **1,000 mSv per mission** | Based on space-agency career limits of about 0.6–1 Sv; keeps Mars possible with shielding | `src/game/sim/review.ts` |

## 7. Open questions for the team

1. Keep the title **TRAJECTORY: Pathways Beyond**? (D1)
2. **Deadline / hackathon dates?** Decides how many chapters ship (plan says Ch 1, 2, 4 are Must; Ch 3, 5b Should; Ch 5a Could).
3. **Vercel account** for the public link (needed for T3). Run `npx vercel` in `trajectory/`.
4. Who makes the **real 3D models** in Blender? Conventions are in `trajectory/README.md` (metres, +Y up, `part_*`, `socket_*`).
5. **GitHub remote URL** for pushing (the repo is committed locally; `gh` CLI isn't installed and there's no stored GitHub credential).
6. Team mode: is **local hot-seat** enough, or is online multiplayer (P11) required?

## 8. Rules for agents continuing this work

- Read `implementation-plan/README.md` and the current phase file before coding.
- `trajectory/src/game/**` must stay **pure TypeScript** (no React/Three/Next). ESLint enforces it.
- Next.js here is **16.x with breaking changes**: read `trajectory/node_modules/next/dist/docs/` before using Next APIs (see `trajectory/AGENTS.md`).
- Physics: SI units in functions; convert only in the UI. Every worked number in `implementation-plan/02` must stay covered by tests.
- Every external asset goes into `trajectory/CREDITS.md` with its licence **before** use.
- Update **this file** (§3, §4, §6, §7) at the end of every work session.
