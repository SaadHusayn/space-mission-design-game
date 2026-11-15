# Phase 07 · Journeys and Physics Scenarios (the pathways)

> **Goal:** fly the mission. A 3D Solar System travel view with a **mission timeline**, **hazard checkpoints** where the **built spacecraft is tested** against real conditions, **physics challenges** that change the outcome, and **arrival + science operations** at each destination: Moon, Mars, Jupiter, the heliopause and exoplanets.
> **Player-facing result:** transfer burn cutscene → cruise with time controls and a live dashboard → checkpoint scenarios → arrival cutscene → science operations → mission end.
> **Depends on:** P06 · **Challenge items:** **M10, M12**, R10 (live dashboard), R11 (partly; P08 completes it), **T1, T2**.

---

## 1. Shared journey framework (build first)
- **Journey timeline:** segments from P02 `sim/journey.ts`: `departure → cruise (n checkpoints) → arrival/insertion → operations → end`.
- **Time controls:** ⏸ / ▶ / ⏩ (×10, ×100, ×1000). Auto-pause at checkpoints and events.
- **Live mission dashboard (R10):** mission day · distance from Earth/Sun · power load vs generation (with the inverse square shown) · battery % · data stored / downlinked · one-way light delay · radiation dose vs tolerance · crew health & consumables (crewed) · Δv remaining.
- **Checkpoint system:** each checkpoint = a **test of the design** (stats vs environment) + an optional **physics challenge or decision** (02 §4) → a consequence → a log entry → an explanation.
- **3D views:** (1) the **System map** (compressed scale, trajectory line, moving spacecraft icon), (2) the **Spacecraft close-up** (the actual assembled GLB with deployed arrays, attitude turning toward the Sun/Earth, an antenna beam during downlink), (3) **Destination scenes**. Toggle with a button. Cinematic transitions between them.

## 2. Pathway scenarios

### Ch 1: Low Earth Orbit (crewed)
- **Checkpoints:** orbit insertion done (P06) → **eclipse passes** (battery test, load-shedding choice) → Earth imaging passes (data vs downlink during short ground contacts) → **deorbit/re-entry** (heat shield present? burn timing).
- **Physics:** centripetal force and orbital speed (C), eclipses and batteries, comms windows.
- **Visuals:** Earth day/night with city lights, terminator crossings, ground-station cones lighting up, an aurora (optional), a re-entry plasma glow.

### Ch 2: Moon (crewed)
- **Checkpoints:** TLI burn (Δv check) → 3-day coast → **lunar orbit insertion** (Δv check, challenge: lunar orbit speed ≈ 1.63 km/s) → polar mapping (radar/imager science) → optional **landing** (TWR in lunar gravity, the weight-on-Moon challenge E) → return.
- **Visuals:** a textured Moon with a normal map, a polar shadowed-crater highlight overlay for ice detections, Earthrise.

### Ch 3: Mars (crewed, long-duration)
- **Checkpoints:** launch window (J) → **artificial gravity** setup (F: spin rpm challenge; comfort vs mass) → **life support** check over ~259 days (K) → **solar particle event** (radiation shelter decision, L) → comms delay growing to 3–22 min (I) → **Mars orbit insertion** (Δv) → atmospheric science operations.
- **Visuals:** the spin habitat rotating at the chosen rpm (the visual speed matches!), a crew health bar, Mars with a thin atmosphere shell and dust haze, Phobos/Deimos (small), a sun that visibly shrinks.

### Ch 4: Jupiter (robotic; crew in mission control)
- **Checkpoints:** (optional) Earth flyby → cruise (power drops with 1/d²: watch the solar output fall to 3.7%) → **Jupiter gravity assist / orbit insertion** (G: the flyby altitude trade-off vs the radiation vault) → **radiation belts** (dose vs vault; instrument degradation) → **light-delay autonomy** event (I) → science orbits (magnetometer, camera).
- **Visuals:** a banded Jupiter (animated band drift via UV offset), the Great Red Spot, the Galilean moons, radiation belts as a translucent torus with a dose heatmap, the trajectory bending visibly with the flyby altitude.

### Ch 5a: Interstellar Probe (robotic)
- **Checkpoints:** Jupiter assist (reuse G) → decades-long cruise (**time-lapse ×1000**, RTG power decay H, comms rate falling with 1/d², I) → the **termination shock** and **heliopause (~120 AU)** crossing → measurements of the interstellar medium.
- **Teaching beat:** a distance ladder: heliopause 120 AU (~17 yr at 7 AU/yr) vs Proxima Centauri 268,000 AU (~74,000 yr at Voyager speed), N. This is *why* we look with telescopes.
- **Visuals:** the heliosphere bubble from outside (shader), the Sun as a bright star, a probe GLB with a long boom and RTG, a "Voyager 1 crossed here" marker (an educational fact).

### Ch 5b: Exoplanet Observatory (robotic, Sun–Earth L2)
- **Checkpoints:** cruise to L2 (~1.5 million km) → sunshield/thermal check → pointing stability (attitude-control test) → **transit survey** mini-game: watch a star's light curve and spot the dips. **Transit-depth challenge** (N: choose the star type).
- **Worlds beyond the Solar System:** after detection, a **3D artist's-impression system view** built from real parameters (TRAPPIST-1: 7 Earth-sized planets around a small red star; Proxima Centauri b). Labelled "artist's impression from measured size and orbit".
- **Visuals:** an L2 halo orbit line, a telescope with a sunshield, a light-curve chart (dataviz), a red-dwarf star shader, planets with procedural textures.

## 3. Scope summary

**Must**
- The journey framework (timeline, time controls, dashboard, checkpoints, 3 views).
- **Ch 1, Ch 2, Ch 4** fully playable (LEO, Moon, Jupiter: covers crewed + robotic + gravity assist).
- Each checkpoint tests the built design and explains the result.

**Should**
- **Ch 3 Mars** (artificial gravity, life support) and **Ch 5b Exoplanet**.

**Could**
- **Ch 5a Interstellar Probe** (it reuses many systems; mostly content + a heliosphere shader).

## 4. Files to create
```
src/scenes/SolarSystem/{SystemMap,TrajectoryLine,SpacecraftIcon,TimeControls}.tsx
src/scenes/{LEO,Moon,Mars,Jupiter,DeepSpace,Exoplanet}/*Scene.tsx
src/three/{SpinHabitat,RadiationBelts,Heliosphere,RedDwarf,ProceduralPlanet,DownlinkBeam,ReentryGlow}.tsx
src/ui/{MissionDashboard,CheckpointCard,LightCurveChart,DistanceLadder}.tsx
src/cutscenes/scripts/{CS-06-transfer,CS-07-arrival-*}.ts
src/game/sim/checkpoints/*.ts (+ tests)
public/textures/{earth_night,earth_clouds,moon_normal,mars_normal,jupiter_bands}.ktx2 · public/models/{probe,telescope}.glb
```

## 5. Acceptance criteria
- [x] Each implemented pathway can be flown from departure to the end of operations, with ≥ 3 checkpoints that test the design (M10).
- [x] The **same pathway gives different outcomes for different designs** (for example, no radiation vault → instruments degrade at Jupiter; a small array → power crisis at Mars).
- [x] The dashboard updates live and the values match the P02 sim.
- [x] The Jupiter flyby altitude visibly changes the trajectory bend **and** the radiation dose. The explanation states the trade-off.
- [x] The spin habitat's visual rotation matches the chosen rpm. The crew comfort result follows 02 §F.
- [x] Light delay is shown and used (autonomy events).
- [x] Exoplanet worlds are labelled as artist's impressions from real parameters.
- [x] All scenes ≥ 30 fps on Low quality.

## 6. Risks and tips
- **Scope risk:** this is the largest phase. Ship the framework + Ch 1 first, then add pathways one by one (each a mini-release).
- Reuse: Planet, Atmosphere, Trajectory and Spacecraft components across all scenes.
- Use floating-origin or per-scene scaling to avoid float jitter at large distances.

---

## Build notes (Phase 07)

- **Pure-TypeScript Journey Telemetry & Scenario Scheduling (`src/game/sim/journey.ts`, `src/game/core/store.ts`):**
  - Added `liveTelemetry(state)` computing real-time telemetry snapshots directly from `JourneyState` and `summarizeDesign`: flight phase (`Departure`, `Deep-Space Cruise`, `Arrival & Insertion`, `Science Operations`, `Earth Return Transit`, `Atmospheric Re-entry`, `Mission Complete`), Sun & Earth distances (AU), $1/d^2$ sunlight percentage (`sunlightFraction`), live power available vs. load, Survival Mode status (`SURVIVAL_COMMS_CUT`), battery charge %, live downlink rate (`downlinkRateMbps`, `dataPerDayGb`), one-way light delay (`lightDelaySeconds`), electronics & crew radiation doses, remaining $\Delta v$, and spin-habitat RPM / acceleration.
  - Added `journeyChallengeSchedule(state)`, `nextJourneyMilestoneDay(state, completedChallengeIds)`, and `applyChallengeToJourney(state, challengeId, result)` scheduling pathway-specific physics challenges (`centripetal`, `rocketEquation`, `artificialGravity`, `sunlight`, `gravityAssist`, `signalDelay`, `transit`) at mission milestones and applying their consequences (`electronicsDose`, `crewHealth`, `scienceFactor`, and Jupiter perijove `flybyRadii`: `2 R_J`, `5 R_J`, or `20 R_J`) to the flight state.
  - Extended `GameState` in `src/game/core/store.ts` with `journey`, `completedChallengeIds`, `flybyRadii`, and actions `beginJourney`, `stepJourney`, `stepToNextMilestone`, `chooseEventOption`, `completeJourneyChallenge`, and `finishJourney` (automatically transitioning `JOURNEY` → `OPERATIONS` upon arrival and `OPERATIONS`/`JOURNEY` → `REPORT` on completion).
- **3D Journey & Destination Scenes (`src/scenes/Journey/journeyViewStore.ts`, `src/scenes/Journey/JourneyScene.tsx`):**
  - Built inside the persistent `<Canvas>` with toggleable camera views (`System Map`, `Spacecraft Close-Up`, `Destination View`, plus `Exoplanet System (3D)` for Ch 5b):
    - **System Map View:** 3D heliocentric map with Sun, Earth, destination bodies, transfer trajectory curve (with dynamic Jupiter gravity-assist bend for `2/5/20 R_J`), and live spacecraft marker.
    - **Spacecraft Close-Up View:** The player's assembled 3D `Spacecraft` rotating at the chosen spin-habitat RPM ($\omega = 2\pi \cdot \text{RPM} / 60$), with pulsed cyan downlink beam and re-entry plasma wake (`ReentryPlasmaShell`).
    - **All 6 Pathway Destination Views:** Ch 1 LEO (textured Earth with night lights, clouds, atmosphere, terminator orbit, and re-entry glow), Ch 2 Moon (textured Moon with polar shadowed-crater water-ice highlight rings and Earthrise), Ch 3 Mars (textured Mars with orange atmosphere rim, Phobos & Deimos markers, and rotating spin habitat), Ch 4 Jupiter (textured Jupiter, Io/Europa/Ganymede, glowing synchrotron radiation-belt torus, and bent perijove trajectory arc), Ch 5a Interstellar (3D `Heliosphere` bubble, distant Sun star, and `"Voyager 1 crossed here (121 AU)"` marker), and Ch 5b Exoplanet (Sun–Earth L2 halo orbit + 3D TRAPPIST-1 7-planet red-dwarf system explicitly labelled *"Artist's impression from measured size and orbit"*).
- **Live Mission Dashboard, Checkpoints & Pathway Widgets (`src/ui/JourneyHud.tsx`, `src/ui/LightCurveChart.tsx`, `src/ui/DistanceLadder.tsx`):**
  - Built `JourneyHud` with timeline progress bar, Pause / `1×` / `10×` / `100×` / `1000×` time controls, `NEXT CHECKPOINT ⏭` button, 3D camera view switcher, Live Telemetry Dashboard (R10), interactive `PhysicsConsole` challenges, pending anomaly event cards, and Checkpoint & Flight Log.
  - Built `LightCurveChart` for Ch 5b plotting starlight flux dips $\Delta F / F = (R_p / R_\star)^2$ across TRAPPIST-1e, TRAPPIST-1b, Proxima Centauri b, and an Earth-Sun analogue.
  - Built `DistanceLadder` for Ch 5a comparing Moon, Earth, Mars, Jupiter, Heliopause (`120 AU`, ~17–33 yr), and Proxima Centauri (`268,000 AU`, ~74,000 yr).
- **Verification:**
  - Added unit tests in `src/game/core/store.test.ts` (223 unit tests passing across 16 test files) and Playwright E2E spec `tests/e2e/journey.spec.ts` (13 E2E tests passing).

