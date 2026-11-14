# Phase 06 · Trajectory, Launch Vehicle, Launch and Orbit Insertion

> **Goal:** choose the **trajectory/orbit option** and the **launch vehicle**, pass the **GO/NO-GO** compatibility check, then experience a **3D launch cutscene with interactive beats** ending in the **orbit-insertion physics challenge** (centripetal force / orbital speed).
> **Player-facing result:** trajectory choice → rocket lineup → GO/NO-GO → rollout → countdown → liftoff → max-Q → stage separation → orbit insertion challenge → in orbit.
> **Depends on:** P05 · **Challenge items:** **M5, M6, M9, M10**, R6, R7, **T1, T2**.

---

## 1. Story beats
- **Trajectory room:** the holo-table shows the transfer options for the chapter (for example, Ch 3: "Launch in the window, ~259-day Hohmann transfer" vs "Launch now: +40% Δv"; Ch 4: "Direct" vs "via Earth flyby"). Orbit options for the Ch 1 / 5b targets (LEO altitude, Sun–Earth L2).
- **Rocket lineup** on the pad: Light, Medium, Heavy (and Super-heavy for crewed Mars). The GLBs stand at relative heights.
- **GO/NO-GO poll:** each role (crew + engineers) reports "GO" or "NO-GO" with a reason. This is the challenge's compatibility check made dramatic.
- **CS-04 Rollout → CS-05 Launch:** countdown, ignition, liftoff, max-Q, MECO, stage separation, fairing separation, orbit.

## 2. Scope

**Must**
- **Trajectory/orbit options (M6, R6):** ≥ 2 per chapter, with plain-language effects (Δv required, travel time, eclipses, comms, observation quality). The choice feeds the P02 totals.
- **Launch vehicles (M5, R7):** capacity per target, max g-load, cost, TWR with the spacecraft.
- **GO/NO-GO (M9):** mass ≤ capacity to the target, TWR ≥ 1.2, budget, structure ≥ max g, (crewed) abort system present. Each line shows ✓/⚠/✗ + the reason + a fix hint. NO-GO → back to Assembly or the Rocket choice.
- **3D launch** (T1): the player's chosen rocket + spacecraft in the fairing. Countdown, liftoff with exhaust and smoke, ascent camera follow, sky gradient to black, stage separation (detach the mesh and let it fall), Earth curvature.
- **Interactive beats (T2):**
  1. **Ignition timing:** press at T-0 for a "clean ignition" bonus (small Δv saving).
  2. **Max-Q throttle:** hold to throttle down when the dynamic-pressure meter goes red. If the structure rating is weak and the player fails, a structural warning appears (from the ERB-9 margin).
  3. **Orbit insertion physics challenge** (02 §C): choose the insertion speed / identify the centripetal force. The result affects the Δv margin and the orbit.
- **Telemetry overlay:** T+, altitude, velocity, acceleration (g), Δv used vs remaining.

**Should**
- Weather or "range" delay event (wait = time/cost vs launch = risk) on Engineer+ difficulty.
- Launch abort branch for crewed missions if TWR or structure checks were "warn" and an event fires (the crew is safe thanks to the abort system, but the mission fails → teaches why abort systems matter).

**Could**
- First-person "cockpit" camera toggle for crewed launches.

## 3. 3D and visuals
- **Assets:** `launch_pad.glb` (tower, flame trench, baked), `rocket_light/medium/heavy/superheavy.glb` with separable `stage1`, `stage2`, `fairing_left/right` nodes, `crawler.glb` (rollout, optional).
- **Effects:** exhaust (additive cone + noise shader + point light flicker), smoke (instanced billboards growing and fading), shock diamonds (optional), heat shimmer (optional post-process), sky (drei `<Sky>` blended to a star HDRI with altitude), Earth limb (the Planet component at large radius + atmosphere).
- **Camera rails:** pad orbit (rollout) → low-angle liftoff → chase → wide separation → orbit view.
- **Physics in visuals:** ascent driven by a simple 1D model (thrust − drag − weight) from P02, so a heavier payload visibly climbs slower.

## 4. UI
- Trajectory cards (Δv, time, pros/cons), a rocket comparison table, the GO/NO-GO panel, the countdown HUD, the max-Q meter, the Physics Console (insertion), the telemetry panel.

## 5. Files to create
```
src/scenes/LaunchPad/{TrajectoryRoom,RocketLineup,GoNoGoScene}.tsx
src/scenes/Launch/{LaunchScene,AscentModel,StageSeparation,Exhaust,Smoke,SkyBlend}.tsx
src/cutscenes/scripts/{CS-04-rollout,CS-05-launch}.ts
src/ui/{TrajectoryCard,RocketCompare,GoNoGoPanel,Countdown,MaxQMeter,Telemetry}.tsx
src/game/sim/ascent.ts (+ test)
public/models/{launch_pad,rocket_*}.glb
```

## 6. Acceptance criteria
- [x] ≥ 2 trajectory/orbit options per chapter with visible effects on the totals (M6).
- [x] ≥ 3 rockets. Mass/target compatibility and budget are checked with reasons (M5/M9).
- [x] An overweight design gets **NO-GO with the reason and a fix**. A good design gets GO.
- [x] The launch is fully 3D with stage separation and a camera follow (T1). It's skippable after the first view.
- [x] The interactive beats work and affect the results (Δv margin, structure warning).
- [x] The orbit-insertion challenge shows the explanation for every option, and the consequence is applied (02 §C).
- [x] The launch scene runs ≥ 50–60 fps (particles scale with the quality setting).

## 7. Risks and tips
- The exhaust and smoke can kill performance. Cap the particle counts and use instancing.
- Keep the ascent model simple. It's for feel and lessons, not trajectory accuracy.

---

## 8. Build notes (2026-11-15)

- **1D Ascent Physics (`src/game/sim/ascent.ts` + `ascent.test.ts`):** Pure TypeScript 1D launch ascent model using SI units (`atmosphericDensity`, `dynamicPressure`, `targetParkingAltitude`, `targetOrbitalSpeed`, `createAscent`, `triggerIgnition`, `engageMaxQThrottle`, `stepAscent`, `skipToInsertion`, `completeInsertion`, `toLaunchResult`, `insertionChallengeFor`).
- **Store Integration (`src/game/core/store.ts` + `store.test.ts`):** Added `vehicleId`, `launchResult`, and `challengeResults` state plus `selectTrajectory`, `proceedToLaunchVehicle`, `selectLaunchVehicle`, `proceedToGoNoGo`, `confirmGoForLaunch` (gated on `reviewDesign(design, mission, vehicle).go`), `startLaunch`, `recordChallengeResult`, and `completeLaunch`.
- **Trajectory Design Room (`src/scenes/LaunchPad/TrajectoryScene.tsx` + `src/ui/TrajectoryHud.tsx`):** 3D holographic orbital transfer visualization inside the shared `<Canvas>` paired with interactive trajectory comparison cards (required $\Delta v$, travel time, Hohmann 259-day analytical note for Mars, Earth-flyby capacity note for Jupiter, radiation, pros/cons, and real-time ERB feasibility check).
- **Launch Vehicle Lineup & Selection (`src/three/RocketModel.tsx`, `src/scenes/LaunchPad/RocketLineupScene.tsx`, `src/ui/RocketSelectHud.tsx`):** 3D pad lineup of all 4 rockets (`lv_light`, `lv_medium`, `lv_heavy`, `lv_superheavy`) standing at relative heights (`24 m`, `48 m`, `64 m`, `92 m`) with separable Stage 1, Stage 2, and split payload fairing halves enclosing the player's 3D `Spacecraft`, plus compatibility cards (`ERB-1L` payload capacity, `ERB-3` liftoff TWR, `ERB-9` max G-load, `ERB-13` budget) and an optional Liftoff TWR `PhysicsConsole`.
- **GO / NO-GO Review (`src/ui/GoNoGoPanel.tsx`):** Resolves all rocket-dependent ERB checks (`ERB-1L`, `ERB-3`, `ERB-9`, `ERB-13`) per D11, displays the 5-station Mission Control poll, lists blocking NO-GO failures and actionable fixes, and gates progression to `ROLLOUT` on `review.go === true`.
- **Rollout & Interactive 3D Launch (`src/cutscenes/rollout.ts`, `src/scenes/Launch/launchStore.ts`, `src/scenes/Launch/LaunchScene.tsx`, `src/ui/LaunchHud.tsx`):** Plays the `CS-04` rollout cutscene (`ROLLOUT` → `LAUNCH`), followed by the interactive 3D launch sequence (T-0 ignition timing bonus, Max-Q dynamic pressure throttle-down, Stage 1 separation, Fairing separation above 80 km, curved Earth horizon limb, and the Orbit Insertion `PhysicsConsole` challenge) transitioning into `JOURNEY`.
- **Verification:** 222 unit tests passing (`npm test`) and 11 Playwright E2E browser tests passing (`tests/e2e/launch.spec.ts`), with step screenshots captured in `mission-architect/test-results/screens/desktop-p06-*.png`.
