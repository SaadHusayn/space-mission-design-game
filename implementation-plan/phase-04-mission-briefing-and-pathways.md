# Phase 04 · Mission Briefing and Pathways

> **Goal:** the crew picks a **pathway** (chapter) on a 3D star map, receives a **briefing** in mission control, and accepts an **objective with explicit requirements**. This defines what success means before any design work.
> **Player-facing result:** Chapter Select (3D star map) → briefing cutscene → objective and requirements screen → "Start design".
> **Depends on:** P03 · **Challenge items:** M2 (objective + requirements first), M6 (destination part), M12, R9 (scenarios/difficulty), R14 (critical resources).

---

## 1. Story beats
- **Chapter Select:** a 3D **pathway map**. The Sun at the centre, the Earth, Moon, Mars and Jupiter on compressed orbits, a dashed line out to the **heliopause**, and beyond it a faint **TRAPPIST-1** marker ("observed, not visited"). Locked pathways show a padlock and their unlock condition.
- **CS-03 Briefing:** Director Hale at the holo-table. A 3D hologram of the target world (Moon, Mars, Jupiter…). One or two lines: the science question, the budget, the special danger ("Jupiter's radiation belts will fry unprotected electronics").
- **Objective screen:** the objective name, goal sentence, crewed/robotic flag, **requirements** list, **critical resources ★**, budget, required lifetime, "Real physics you'll face" teaser icons (gravity assist, radiation, comms delay…).

## 2. Pathway content (data in `pathways.json`)

| Chapter | Pathway | Crew | Example objective | Requirements (examples) | Critical ★ |
|---|---|---|---|---|---|
| Ch 1 | Low Earth Orbit | Crewed | Orbital test flight + Earth imaging | Crew module · Earth camera · 3-day flight · safe return | Mass, Power |
| Ch 2 | Moon | Crewed | Map water ice at the lunar poles | Radar or multispectral imager · Δv for TLI + LOI (+ landing optional) · 14-day mission | Mass (Δv), Power |
| Ch 3 | Mars | Crewed | Study the atmosphere from Mars orbit | Atmospheric spectrometer · life support for the full cruise · crew health plan (spin or exercise) · radiation protection | Mass, Life support, Comms |
| Ch 4 | Jupiter | Robotic | Study Jupiter's atmosphere and magnetosphere | Radiation vault · power at 5.2 AU (huge arrays or RTG) · magnetometer + camera · autonomy | Power, Radiation, Comms |
| Ch 5a | Interstellar Probe | Robotic | Cross the heliopause (~120 AU) | RTG · Jupiter gravity assist · plasma/magnetic instruments · ≥ 20-year design life | Power (decay), Comms, Δv |
| Ch 5b | Exoplanet Observatory (Sun–Earth L2) | Robotic | Detect Earth-sized planets around other stars | Transit photometer/telescope · stable pointing · high downlink | Data, Comms, Pointing |

Difficulty modifies the budget (Cadet +30% / Flight Director −20%), hint levels and event frequency.

## 3. Scope

**Must**
- A 3D pathway map with selectable pathways, lock states, and hover info (distance, travel time, crewed/robotic).
- A briefing cutscene per chapter (it can share one template: holo-table + a target-world model + dialogue lines).
- The objective/requirements screen stored as the **mission contract** in the state (used by the ERB, scoring and report).
- "Start design" → ASSEMBLY state.

**Should**
- A **"Why this destination is hard"** card per pathway (1–2 physics facts from 02 with real numbers, for example "One-way radio delay at Jupiter: 33–54 min").
- Requirements rendered as a checklist that stays visible (collapsible) through assembly and launch.

**Could**
- A Sandbox entry on the map (no budget, all parts) unlocked after Ch 1 (N4).

## 4. 3D and visuals
- **Assets:** `mission_control.glb` (baked), `holo_table.glb` + a hologram shader (scanlines, Fresnel, additive cyan), planet textures (Moon, Mars, Jupiter with bands, Sun), the heliosphere bubble (a transparent shader sphere), a TRAPPIST-1 marker.
- **Map technique:** compressed (log) distances; orbits as `Line2` (drei `<Line>`); planet sizes exaggerated; labels with troika `<Text>`; the camera uses `<CameraControls>` with smooth `setLookAt` transitions on selection.

## 5. Files to create
```
src/scenes/MissionControl/{PathwayMap,BriefingScene}.tsx
src/three/{Heliosphere,HologramMaterial,OrbitLine}.tsx
src/ui/{PathwayCard,ObjectivePanel,RequirementsChecklist,WhyHardCard}.tsx
src/cutscenes/scripts/CS-03-briefing.ts
src/game/data/dialogue/briefings.json
public/models/{mission_control,holo_table}.glb · public/textures/{moon,mars,jupiter,sun}_*.ktx2
```

## 6. Acceptance criteria
- [ ] The pathway map shows all 6 pathways, with Ch 1 unlocked and the others locked with their conditions.
- [ ] Selecting a pathway → a briefing plays (skippable) → the objective screen shows the requirements, budget, lifetime, critical ★ and crewed/robotic flag.
- [ ] The mission contract is saved in the store and visible during assembly.
- [ ] A non-space tester can say what they must achieve after reading the objective screen (the M2/M13 check).
- [ ] Map performance ≥ 60 fps on the dev laptop.

## 7. Risks and tips
- Don't overload the map. Show the details only on hover/selection.
- Distances aren't to scale. Show a "Not to scale" note and real numbers in text.

---

## 8. Build notes (P04 as built)

**Status: built and checked.** 183 unit tests and 8 Playwright browser tests pass (desktop + phone); lint, typecheck and production build are clean.

| Acceptance criterion | Result |
|---|---|
| Pathway map shows all 6 pathways; Ch 1 unlocked, others locked with their condition | ✅ 3D map + chapter list; locked chapters say which chapter to earn a star on |
| Selecting a pathway → skippable briefing → objective screen with requirements, budget, lifetime, critical ★, crewed/robotic | ✅ Per-pathway briefing cutscene (Director Hale + engineers, hologram of the destination) → mission contract screen |
| Mission contract saved and visible during assembly | 🟡 Saved in the store (`mission`); showing it during assembly is P05's job |
| A non-space tester can say what they must achieve | 🟡 Needs a human playtest |
| Map ≥ 60 fps | ✅ ~60 fps on the dev machine |

### Built
- Logic: `game/core/progress.ts` (unlock chain, best results, sanitising), `game/sim/requirements.ts` (mission contract, plain-language durations and travel times), briefing lines in `game/data/story.ts`, `distanceText` on every pathway, store actions `selectPathway`, `openObjective`, `acceptMission`, `backToMap`, `recordMissionResult`.
- 3D: `scenes/PathwayMap/` (Sun, Earth, Moon, Mars, Jupiter, L2, routes, heliosphere bubble, TRAPPIST-1 marker, camera that flies to the chosen pathway), `sets/BriefingSet.tsx` (mission-control holo-table with a hologram per destination), new `three/Sun.tsx`, `SimplePlanet.tsx`, `Heliosphere.tsx`, `SceneBackground.tsx`.
- Screens: pathway details panel + chapter list, briefing cutscene (built per pathway by `cutscenes/briefing.ts`), objective screen.
- Tests: `src/game/core/progress.test.ts`, `src/cutscenes/briefing.test.ts`, `tests/e2e/pathways.spec.ts`.

### Decisions and differences from the plan
- **Unlock chain:** Moon after Earth orbit, Mars after Moon, Jupiter after Mars; both "Beyond" chapters after Jupiter. One star (a partial success) is enough.
- **`?unlock=all`** in the URL opens every chapter (testing and demos). **`?debug`** shows an FPS panel and exposes the 3D scene as `window.__game3d` for debugging.
- Added a **chapter list** next to the 3D map: easier on phones and with a keyboard, and works when labels overlap.
- Moon, Mars, Jupiter and Sun textures from Solar System Scope (CC BY 4.0), credited.
- Not done (plan "Could"): Sandbox entry on the map.

### Bug fixed along the way
`<color attach="background">` / `<fog attach="fog">` inside a group attach to the group, not the scene, so every set's background and fog had silently never applied. All sets now use `three/SceneBackground.tsx`, which sets and resets the scene's background and fog explicitly.
