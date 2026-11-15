# HANDOFF: TRAJECTORY: Pathways Beyond

> **Read this first if you are a new agent or teammate picking up the project.**
> Last updated: 2026-11-15 · Current phase: **P07 done → next: P08 (Events, crew decisions & team play)**

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
| P03 Recruitment, crew & training | ✅ Done | Cutscenes, crew setup, 7-step training, graduation. Build notes at the end of `implementation-plan/phase-03-recruitment-crew-training.md` |
| P04 Mission briefing & pathways | ✅ Done | 3D pathway map, per-pathway briefing, mission contract screen. Build notes at the end of `implementation-plan/phase-04-mission-briefing-and-pathways.md` |
| P05 Spacecraft assembly & Engineering Review | ✅ Done | 3D hangar assembly bay, procedural `part_*` meshes on `socket_*` empties, live Resource HUD, Trade-Off popup, Physics Calculator, ERB screen with slot-fix jump & gating. Build notes at the end of `implementation-plan/phase-05-spacecraft-assembly-and-review.md` |
| P06 Launch vehicle, launch & orbit | ✅ Done | 3D trajectory design room, 4-rocket pad lineup, GO/NO-GO review poll (resolving D11 rocket checks), CS-04 rollout cutscene, interactive 3D launch ascent (`ascent.ts`: ignition timing, Max-Q throttle-down, stage & fairing separation), and orbit insertion physics challenge. Build notes at the end of `implementation-plan/phase-06-launch-and-orbit.md` |
| P07 Journeys & physics scenarios | ✅ Done | 3D Solar System travel (`System Map`, `Spacecraft Close-Up`, and 6 pathway `Destination Views`: LEO, Moon, Mars, Jupiter, Interstellar Heliopause, and L2 + TRAPPIST-1 artist's impression), live telemetry dashboard (R10), time controls (`1×`–`1000×` + `Next Checkpoint`), in-flight physics challenges (`PhysicsConsole`), `LightCurveChart`, `DistanceLadder`, and checkpoint verification log. Build notes at the end of `implementation-plan/phase-07-journeys-and-physics-scenarios.md` |
| P08–P11 | ⏳ Not started | Specs in `implementation-plan/phase-*.md` |

## 4. Current phase progress (update as you go)

**Next up: P08** (`implementation-plan/phase-08-events-and-team-decisions.md`): expand in-flight events with role-based crew advisories, team voting / hot-seat pass-the-device decision cards, and commander tie-breaks during `JOURNEY` and `OPERATIONS`.

P07 files: `src/game/sim/journey.ts` (`liveTelemetry`, `journeyChallengeSchedule`, `nextJourneyMilestoneDay`, `applyChallengeToJourney`), `src/scenes/Journey/{journeyViewStore,JourneyScene}.ts(x)`, `src/ui/{JourneyHud,LightCurveChart,DistanceLadder}.tsx`, `tests/e2e/journey.spec.ts`.

P06 files: `src/game/sim/ascent.ts` (+ tests), `src/cutscenes/rollout.ts`, `src/three/RocketModel.tsx`, `src/scenes/LaunchPad/{TrajectoryScene,RocketLineupScene}.tsx`, `src/scenes/Launch/{launchStore,LaunchScene}.ts(x)`, `src/ui/{TrajectoryHud,RocketSelectHud,GoNoGoPanel,LaunchHud}.tsx`, `tests/e2e/launch.spec.ts`.

P05 files: `src/game/core/designActions.ts` (+ tests), `src/game/sim/compat.ts` (+ tests), `src/scenes/Hangar/{HangarScene,assemblyStore,assembly.test}.ts(x)`, `src/three/Spacecraft.tsx`, `src/ui/{AssemblyHud,SlotList,PartBrowser,PartCard,TradeOffPopup,EngineerBark,DesignCalculator,ReviewBoard}.tsx`, `tests/e2e/assembly.spec.ts`.

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

**Browser testing uses Playwright** (team rule): specs in `trajectory/tests/e2e/`, step screenshots in `trajectory/test-results/screens/`. Add a spec for every new phase.

```bash
cd trajectory
npm install
npm run lint && npm run typecheck && npm test && npm run test:e2e
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
| D22 | **3D sets, figures, parts and rockets are built from code-generated shapes**, as good as possible. ✅ Confirmed by the team; Blender GLBs may replace them later (keep `part_*` / `socket_*` conventions) | No artist models | `src/sets/` |
| D23 | **Cutscenes are always skippable**; camera moves use the project's own timeline maths, not GSAP | Repeat players and testers; one less dependency | `src/cutscenes/` |
| D24 | **Hot-seat crew setup on one shared screen**; pass-the-device screens come with voting in P08 | Simpler first version | `src/ui/CrewSetup.tsx` |
| D25 | **Pushing to GitHub skipped for now** (team's choice). Commits are local only | No `gh` CLI or stored GitHub login | — |
| D26 | **Browser tests use Playwright** with the installed Google Chrome (team rule) | Team request | `trajectory/playwright.config.ts`, `tests/e2e/` |
| D27 | Chapter unlock chain: LEO → Moon → Mars → Jupiter → both Beyond chapters; one star unlocks the next | Plan order | `src/game/core/progress.ts` |
| D28 | `?unlock=all` opens every chapter; `?debug` shows FPS and exposes `window.__game3d` | Testing and demos | `scenes/PathwayMap/mapStore.ts`, `components/GameRoot.tsx` |
| D29 | A chapter list sits next to the 3D map (phones, keyboard, overlapping labels) | Usability | `scenes/PathwayMap/PathwayHud.tsx` |
| D14 | Crew radiation limit in game = **1,000 mSv per mission** | Based on space-agency career limits of about 0.6–1 Sv; keeps Mars possible with shielding | `src/game/sim/review.ts` |
| D30 | **Procedural 3D spacecraft assembly (`Spacecraft.tsx`)** builds each bus, power source, battery, computer, ADCS, antenna, propulsion stage, radiation shield, thermal system, life support, habitat, heat shield and instrument from Three.js primitives attached to `socket_*` empties, with an **Exploded View** toggle that offsets parts outward along their socket vectors | Matches D22 (code-generated 3D shapes) and keeps `part_*` / `socket_*` conventions ready for future GLB drop-ins | `src/three/Spacecraft.tsx` |
| D31 | **Windows Playwright WebGL2 compatibility**: `--use-angle=gl` is only passed on Linux; Windows uses its native Direct3D 11 ANGLE backend so headless/automated Chrome always initializes WebGL 2 | `--use-angle=gl` disabled WebGL 2 context creation on Windows Chrome | `mission-architect/playwright.config.ts` |
| D32 | **1D Launch Ascent Simulation (`src/game/sim/ascent.ts`)** models exponential atmospheric density $\rho(h) = \rho_0 e^{-h/H}$, dynamic pressure $q = \frac{1}{2}\rho(h)v^2$, gravity turn altitude/velocity profiles to target parking orbit, T-0 clean ignition bonus ($+25\text{ m/s}$ $\Delta v$), Max-Q throttle-down ($72\%$ throttle vs. $-35\text{ m/s}$ structural attitude-control penalty on tight-margin buses), and Orbit Insertion physics challenge (`orbitSpeed`/`centripetal`/`rocketEquation`) | Keeps launch physics deterministic, pure TypeScript, and fast (~14s at 1× or instant via Skip/4×) while tying every interactive beat to real mission $\Delta v$ margins | `src/game/sim/ascent.ts`, `src/scenes/Launch/LaunchScene.tsx`, `src/ui/LaunchHud.tsx` |
| D33 | **Unified 3D Journey Scene & Milestone Stepping (`JourneyScene.tsx`, `JourneyHud.tsx`, `journey.ts`)** provides 3 toggleable 3D camera views (`System Map`, `Spacecraft Close-Up`, `Destination View` + `Exoplanet System 3D Artist's Impression`) across all 6 chapters, paired with `1×`/`10×`/`100×`/`1000×` time controls and a `NEXT CHECKPOINT ⏭` milestone stepper that automatically pauses at checkpoints, scheduled pathway physics challenges (`PhysicsConsole`), and in-flight events | Makes both 5-day LEO missions and 33-year interstellar missions smoothly playable and deterministic without dead ends | `src/game/sim/journey.ts`, `src/scenes/Journey/JourneyScene.tsx`, `src/ui/JourneyHud.tsx` |

## 7. Open questions for the team

1. **Game title: the team wants a new, more relevant name** (TRAJECTORY felt odd). Candidates to offer: *Mission Architect: Pathways to the Stars* (recommended), *Launch Window*, *Astro Architects*, *Mission Forge*. Also: rename the `trajectory/` folder and the `trajectory:settings` save key to match? (D1)
2. **Deadline / hackathon dates?** Decides how many chapters ship (plan says Ch 1, 2, 4 are Must; Ch 3, 5b Should; Ch 5a Could).
3. **Vercel account** for the public link (needed for T3). Run `npx vercel` in `trajectory/`.
4. Who makes the **real 3D models** in Blender? Conventions are in `trajectory/README.md` (metres, +Y up, `part_*`, `socket_*`).
5. **GitHub remote URL** for pushing (the repo is committed locally; `gh` CLI isn't installed and there's no stored GitHub credential).
6. Team mode: is **local hot-seat** enough, or is online multiplayer (P11) required?

## 8. Rules for agents continuing this work

Full rules and commands: **[AGENTS.md](AGENTS.md)** (works for any AI tool; `CLAUDE.md` imports it). Summary:

- Read `implementation-plan/README.md` and the current phase file before coding.
- `trajectory/src/game/**` must stay **pure TypeScript** (no React/Three/Next). ESLint enforces it.
- Next.js here is **16.x with breaking changes**: read `trajectory/node_modules/next/dist/docs/` before using Next APIs (see `trajectory/AGENTS.md`).
- Physics: SI units in functions; convert only in the UI. Every worked number in `implementation-plan/02` must stay covered by tests.
- Every external asset goes into `trajectory/CREDITS.md` with its licence **before** use.
- Update **this file** (§3, §4, §6, §7) at the end of every work session.
