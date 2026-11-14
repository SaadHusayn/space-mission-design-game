# Phase 03 · Recruitment, Crew and Training (Prologue)

> **Goal:** the story opening. Astronaut candidates are **nominated and recruited** by the (fictional) Orbital Exploration Agency, form a crew (solo or up to 4), choose roles, and complete a short **training tutorial** that teaches the controls and the first physics idea.
> **Player-facing result:** New Game → intro cutscene → nomination → crew setup → training → chapter select.
> **Depends on:** P01, P02 · **Challenge items:** M1, M13, R1 (local team setup), R2 (roles), R9 (difficulty), R13 (tutorial).

---

## 1. Story beats
1. **CS-00 Intro:** a night launch pad → Earth from orbit → title. "Every mission starts with a question."
2. **CS-01 Nomination:** a holo-message from Director Hale: *"You have been nominated to the OEA astronaut class."*
3. **Candidate file:** each player enters a call-sign, picks an avatar (preset 3D busts or portraits; no personal data) and a **role**.
4. **CS-02 Selection montage:** short training shots (centrifuge, simulator, neutral-buoyancy pool) as 3D vignettes or 2.5D parallax panels.
5. **Training (tutorial, playable):** in the **Mission Design Center** hangar, the crew meets the engineers (Dr. Okafor, Kenji, Dr. Ferreira) and learns to:
   - orbit, zoom and pan the camera, and select a part
   - read the resource HUD (mass, power, budget, data, comms, time)
   - answer the first physics challenge, **thrust-to-weight (02 §A)**: "Can this test rocket lift off?", with the explanation
6. **Graduation:** a badge/patch is awarded → **Chapter Select** (the star map of pathways; only Ch 1 unlocked).

## 2. Scope

**Must**
- Crew setup: **Solo** (one player holds all roles) or **Team 2–4** (local hot-seat). Roles: Mission Commander/Planner · Flight Engineer · Science Specialist · Comms & Resources Officer (merged if < 4 players).
- Difficulty select: **Cadet / Engineer / Flight Director** (stored in the profile; P02 data uses it).
- A skippable intro and nomination cutscene (hold to skip). A subtitle/dialogue system.
- A tutorial that can't soft-lock, that's skippable for returning players, and that can be replayed from the menu.

**Should**
- 3D crew avatars (low-poly GLB with 3–4 colour variants) standing in the hangar.
- The "Mission Patch" generator (pick shape, colour and symbol) is used later in the report. It's cheap, fun and personal.

**Could**
- A selection "aptitude" mini-quiz (3 quick physics questions) that sets Cadet/Engineer as a recommendation.

## 3. 3D and visuals
- **Assets:** `hangar.glb` (baked lighting, interior), `crew_avatar.glb` (variants via material colour), `engineer_npc_*.glb` (simple idle animations), `holo_table.glb`.
- **Techniques:** baked AO/lightmap on the hangar; an HDRI for reflections; emissive strips with bloom; dust particles; hover outlines on interactables.
- **Cutscene tech:** `CutscenePlayer` + camera rails ([01](01-tech-architecture.md) §6).

## 4. UI
- Dialogue box (portrait, name, text, next/skip), a subtitles toggle.
- Candidate file form (call-sign, avatar, role) per player, hot-seat "Pass to Player 2" screens.
- Tutorial coach marks (arrow + highlight + 1 sentence).
- Physics Console v1 (used for the TWR challenge): givens, formula card, 3–4 options, explanation panel.

## 5. Logic and data
- `dialogue/prologue.json` (lines + speaker + optional camera shot ID).
- `crew` in the store: `{ id, callSign, avatar, roles[] }[]`, `mode: 'solo'|'hotseat'|'online'`.
- Decision log entries begin here (tutorial choices aren't scored).

## 6. Files to create
```
src/scenes/Recruitment/{RecruitmentScene,TrainingScene}.tsx
src/cutscenes/scripts/{CS-00,CS-01,CS-02}.ts · CutscenePlayer.tsx · Subtitles.tsx · rails.ts
src/ui/{DialogueBox,CrewSetup,RoleCard,HotseatHandoff,CoachMark,PhysicsConsole,PatchMaker}.tsx
src/game/data/dialogue/prologue.json
public/models/{hangar,crew_avatar,engineer_npc,holo_table}.glb
```

## 7. Acceptance criteria
- [ ] New game → the intro and nomination cutscenes play and are skippable.
- [ ] Solo and 2–4 player hot-seat setups both work. Roles are assigned and merged correctly for < 4 players.
- [ ] Difficulty is selectable and persisted.
- [ ] Tutorial: a first-time tester completes it in ≤ 5 minutes without help. It teaches the camera, HUD and the TWR challenge with an explanation.
- [ ] Graduation → Chapter Select with Ch 1 unlocked.
- [ ] All text is readable (≥ 16 px), and dialogue is keyboard-advanceable.

## 8. Risks and tips
- Keep cutscenes short. Players want to play. Use 3D vignettes rather than full character animation (no lip-sync).
- The agency, logo and characters are **fictional** ([00](00-scope-and-story.md) §1).

---

## 9. Build notes (P03 as built)

**Status: built and checked.** 171 unit tests, lint, typecheck and production build pass. A scripted headless-Chrome run plays the whole prologue (title → intro → nomination → crew setup → selection montage → all 7 training steps → graduation → Mission Control → reload → Continue) with no errors, at about 60 fps.

| Acceptance criterion | Result |
|---|---|
| New game → intro and nomination cutscenes play and are skippable | ✅ Next (button / Enter / →) and Skip (button / hold Esc or Space) both work |
| Solo and 2–4 player hot-seat setups; roles merged for < 4 | ✅ Role merging unit-tested for 1–4; 2-player setup checked in the browser. Duplicate call-signs are blocked |
| Difficulty selectable and persisted | ✅ Saved with the profile in local storage |
| Tutorial teaches camera, HUD and the TWR challenge with explanation | ✅ 7 steps: drag, zoom, click a part, swap a solar array (live resource deltas), trade-off, TWR physics question, graduation |
| First-time tester finishes in ≤ 5 minutes | 🟡 Not measured: needs a human playtest |
| Graduation → Chapter Select | ✅ Placeholder Mission Control screen until P04 |
| Text ≥ 16 px; dialogue keyboard-advanceable | ✅ Cutscenes by keyboard; training buttons reachable by Tab + Enter |

### Built

- Logic (pure, tested): `game/core/crew.ts` (roles, merging, call-sign validation), `prologue.ts`, `patch.ts`; profile + prologue in `store.ts` (saved and sanitised on load); `game/data/story.ts` (fictional characters, difficulty texts).
- Cutscene engine: `cutscenes/timeline.ts` (pure, tested), `scripts.ts` (CS-00 intro, CS-01 nomination, CS-02 selection montage), `CutsceneDirector.tsx` (camera moves, set switching), `CutsceneOverlay.tsx` (letterbox, subtitles with speaker, next/skip).
- 3D sets (`sets/`): astronaut and engineer figures, Mission Design Center hangar with holo-table, night launch pad, Earth orbit, hologram transmission, centrifuge, simulator cockpit, neutral-buoyancy pool.
- Screens: crew setup with difficulty, training HUD, physics console, resource panel (reused in P05), mission patch maker, graduation, Mission Control placeholder. The title menu shows Continue and Training after graduation.

### Decisions and differences from the plan

- **3D sets are built from simple shapes in code**, not baked Blender GLBs: no artist models exist yet. They can be swapped for GLBs later without touching the logic.
- **Cutscenes can always be skipped**, not only after the first viewing (better for repeat players and testers).
- Camera animation uses the project's own tested timeline maths instead of GSAP/Theatre.js (one less dependency).
- **Hot-seat setup happens on one shared screen.** "Pass the device" hand-off screens come with team voting in P08.
- The training resource demo uses the robotic telescope reference design (simpler to explain than a crewed capsule).
- Engineers are stylised figures without faces; there's no voice-over (subtitles only).
- Not done (plan "Could"): the selection aptitude quiz.
