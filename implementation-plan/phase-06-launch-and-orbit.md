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
- [ ] ≥ 2 trajectory/orbit options per chapter with visible effects on the totals (M6).
- [ ] ≥ 3 rockets. Mass/target compatibility and budget are checked with reasons (M5/M9).
- [ ] An overweight design gets **NO-GO with the reason and a fix**. A good design gets GO.
- [ ] The launch is fully 3D with stage separation and a camera follow (T1). It's skippable after the first view.
- [ ] The interactive beats work and affect the results (Δv margin, structure warning).
- [ ] The orbit-insertion challenge shows the explanation for every option, and the consequence is applied (02 §C).
- [ ] The launch scene runs ≥ 50–60 fps (particles scale with the quality setting).

## 7. Risks and tips
- The exhaust and smoke can kill performance. Cap the particle counts and use instancing.
- Keep the ascent model simple. It's for feel and lessons, not trajectory accuracy.
