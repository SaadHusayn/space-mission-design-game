# Phase 02 · Core Logic and Physics Engine

> **Goal:** all game rules as **pure, tested TypeScript**: data types and JSON, physics functions, design totals, the ERB review, the journey simulation, events, scoring and "why" generation. Later phases only connect UI and 3D to this.
> **Player-facing result:** none (a dev test page `/play?debug=sim` can print results).
> **Depends on:** P01 · **Challenge items:** foundations of M7, M8, M9, M10, M11.

---

## 1. Scope

**Must**
- **Types** (`src/game/types/`): `Part`, `PartCategory`, `Instrument`, `LaunchVehicle`, `Pathway`, `Chapter`, `CrewMember`, `Role`, `Design`, `ReviewResult`, `JourneyState`, `GameEvent`, `PhysicsChallenge`, `DecisionLogEntry`, `MissionResult`.
- **Data JSON** + **zod schemas** (`src/game/data/`):
  - `parts.json`: buses (S/M/L + crew module), solar arrays (S/M/L), RTG, batteries, computers (basic / standard / autonomous rad-hard), attitude control, antennas (UHF / S / X / Ka), propulsion stages (fuel mass, Isp), radiation vault, thermal (radiators/heaters), life support (storage / recycler), spin habitat (arm length options), heat shield (optional).
  - `instruments.json`: cameras, spectrometers, radar, magnetometer, telescope, transit photometer. Each has mass, power, cost, data/day, science value, pathway fit.
  - `launchVehicles.json`: Light / Medium / Heavy (+ Super-heavy for crewed Mars), with thrust, mass, max g, cost, and capacity per pathway target.
  - `pathways.json`: LEO, Moon, Mars, Jupiter, Interstellar Probe, Exoplanet Observatory, each with distance(s), Δv required, eclipse duration, radiation class, light delay, crewed flag, budget, required instruments/lifetime, critical resources.
  - `challenges.json` (metadata) + `challenges/*.ts` (generators).
  - `events.json`: solar storm, micrometeoroid hit, wheel failure, ground outage, radiation upset, conjunction blackout, crew illness (crewed), bonus discovery, launch weather delay.
  - `dialogue/*.json`: lines per cutscene/briefing (filled in P03/P04).
- **Physics module** (`src/game/physics/`), one file per topic in [02-physics-and-challenges.md](02-physics-and-challenges.md): `twr`, `deltaV`, `orbitalSpeed`, `centripetalForce`, `escapeVelocity`, `turnAngle`/`gravityAssistDv`, `solarPowerAt`, `rtgPower`, `lightDelay`, `downlinkRate`, `hohmannTime`, `spinRpm`/`spinAccel`, `lifeSupportMass`, `radiationDose`, `transitDepth`.
- **Design totals** (`sim/design.ts`): mass, power load/generation (at the destination), cost (parts + launch + ops), data, downlink, lifetime, Δv, TWR, science potential.
- **ERB** (`sim/review.ts`): checks ERB-1…12 → `{ id, status: pass|warn|fail, value, limit, explanation, fixHint }[]` + overall grade.
- **Journey simulation** (`sim/journey.ts`): segments (launch → transfer → checkpoints → arrival → operations), a tick-based resource model (power/battery/data/health/radiation), checkpoint tests (02 §4), and deterministic results with a seeded RNG.
- **Challenge engine** (`challenges/generator.ts`, `evaluate.ts`): builds the options from the context, applies consequences, returns the explanation.
- **Scoring + "why"** (`sim/scoring.ts`, `sim/why.ts`): see P09 for the weights. Generate the why bullets from the decision log and results.

**Should**
- A **balance test**: for each pathway, at least **2 different designs** pass the ERB and complete the mission (R5), as automated tests.
- A `simulateMission(design, choices, seed)` CLI script for quick balancing.

## 2. Files to create
```
src/game/types/*.ts
src/game/data/{parts,instruments,launchVehicles,pathways,events}.json · schemas.ts · loadData.ts
src/game/physics/{constants,rocket,orbit,gravityAssist,power,comms,transfer,artificialGravity,lifeSupport,radiation,transit}.ts (+ .test.ts)
src/game/sim/{design,review,journey,events,scoring,why}.ts (+ .test.ts)
src/game/challenges/{generator,evaluate}.ts · challenges/defs/*.ts
scripts/simulate.ts
```

## 3. Tasks
1. Write the types first, then the zod schemas, then the JSON with starter values (keep the rules of thumb in `game-design-docs/06`).
2. Implement the physics functions. Unit-test **every worked example in 02** (for example, `orbitalSpeed(LEO400) ≈ 7672 m/s ± 1`, `spinRpm(3.73, 85) ≈ 2.0`, `gravityAssistDv(6000, 5 R_J) ≈ 10.9 km/s`, `transitDepth(Earth, TRAPPIST-1) ≈ 0.0059`).
3. Implement design totals + ERB with tests for pass, warn and fail cases.
4. Implement the journey sim + events with seeded determinism tests (same seed → same result).
5. Implement the challenge generator for topics A, C, F, G, H, I, N first (the core story beats). Add the rest later.
6. Implement scoring + why (simple version). P09 expands it.
7. Balance: write 2 passing designs per pathway as fixtures, and make the tests prove they pass.

## 4. Acceptance criteria
- [ ] `npm test`: all physics examples from 02 pass within tolerance. Coverage of `src/game/**` ≥ 80%.
- [ ] All JSON validates against the zod schemas at startup (an invalid file throws a clear error).
- [ ] For each pathway, ≥ 2 fixture designs pass ERB and finish the simulated mission. ≥ 1 intentionally bad design fails with the expected reason.
- [ ] `simulateMission` is deterministic for a given seed.
- [ ] No React or Three imports under `src/game/**` (an ESLint rule `no-restricted-imports`).

## 5. Risks and tips
- Keep the physics **simple and explainable**. Don't port GMAT. Accuracy only needs to support the lessons.
- Store real values in SI, game-balance multipliers separately (`balance.ts`), so balancing never corrupts the physics.
- Document every simplification in code comments plus an in-game "Simplified model" note.

---

## 6. Build notes (P02 as built)

**Status: built and checked.** 148 unit tests pass; lint, typecheck and production build are clean.

| Acceptance criterion | Result |
|---|---|
| All physics examples from 02 pass within tolerance | ✅ 34 tests in `src/game/physics/physics.test.ts`, one per worked example |
| JSON validates against zod schemas at load, with clear errors | ✅ `data/loadData.ts` + cross-checks (unique ids, required instrument types exist, crew seats exist). Broken-data tests in `loadData.test.ts` |
| ≥ 2 fixture designs per pathway pass ERB and finish the mission; bad designs fail for the expected reason | ✅ 12 winning designs (2 per pathway, both trajectories used) fly successfully over 6 seeds × 3 difficulties. 17 bad-design review cases + 8 flight-failure cases fail for the right reason |
| `simulateMission` deterministic for a seed | ✅ `runJourney(input)` with the same seed and choices gives an identical state |
| No React/Three imports under `src/game/**` | ✅ ESLint `no-restricted-imports` rule |
| Coverage ≥ 80% | 🟡 Not measured (`@vitest/coverage-v8` not installed). Every module has tests |

### What exists (`trajectory/src/game/`)

| Module | Contents |
|---|---|
| `physics/` | Rocket equation, TWR, orbital/escape speed, centripetal force, Hohmann time, capture Δv, gravity assist, inverse-square sunlight, RTG decay, light delay, downlink rate, spin gravity + comfort, life-support mass, radiation dose, transit depth |
| `data/` | 44 parts in 12 categories, 9 instruments, 4 launch vehicles, 6 pathways × 2 trajectories. zod schemas, loader |
| `sim/mission.ts` | Mission context (pathway + trajectory + difficulty → environment, budget) |
| `sim/design.ts` | Design totals: mass, Δv, power at destination, eclipse battery, data vs downlink, cost, radiation, design life, crew health, spin gravity, science |
| `sim/review.ts` | Engineering Review Board: 20 checks (ERB-0 … ERB-14), pass/warn/fail/pending, explanation + fix hint, grade, GO |
| `sim/journey.ts` + `events.ts` | Day-by-day flight: launch, insertion, deep cold, flybys, power (incl. survival mode), data storage and downlink, radiation, crew health, supplies, re-entry. 9 random events with trade-off choices. `startJourney` / `advanceJourney` / `resolveEvent` / `runJourney` |
| `sim/scoring.ts` | Contract (requirements), 6 weighted components from phase-09, outcome, grade, stars |
| `sim/why.ts` | 3–6 "why" bullets tied to player decisions and physics |
| `sim/fixtures/designs.ts` | Reference winning designs (tests + future hints) |
| `challenges/` | 9 physics challenge generators built from the player's own numbers (misconception distractors, explanations, consequences), mapped to pathways |
| `index.ts` | Public API: UI code imports from `@/game` |

### Decisions and differences from the plan

- **ERB runs before the rocket is chosen** (the plan's phase order). Rocket-dependent checks are `pending` and become real at GO/NO-GO (`reviewDesign(design, mission, vehicle)`).
- **All parts are available at every difficulty.** Difficulty changes budget (Cadet ×1.3, Director ×0.8), event frequency and (later) hints. Locking advanced parts would block the crewed chapters.
- Added a **"Nuclear thermal engine (concept)"** part: no realistic chemical design can do the fast Mars transfer.
- **Event durations scale** with the mission phase (5%, min 1 day, max the event's own length), so a 10-day storm can't erase a 5-day mission.
- **Survival mode:** when power runs short, the spacecraft turns off instruments and cuts its radio by 80% before draining the battery.
- A battery isn't required with an RTG and no eclipses (like Voyager).
- Crew radiation limit 1,000 mSv per mission; crew health loses 0.07 points per weightless day, reduced by exercise (60%) or spin (100% if comfortable).
- Balance values were tuned so both trajectories of every pathway have a winning design. Run the balance report:
  `BALANCE=1 npx vitest run src/game/sim/balance.debug.test.ts --reporter=verbose`
