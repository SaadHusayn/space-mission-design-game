# Phase 09 · Evaluation, Mission Report and Replay

> **Goal:** close the loop. Evaluate the mission on **design quality (ERB physics review)**, **actual flight performance**, **physics mastery** and **teamwork**. Explain **why** it succeeded or failed using the player's own decisions. Let players **redesign and re-fly**, save, compare and rank.
> **Player-facing result:** outcome cutscene → mission report with a score breakdown, "why" analysis, requirement checklist, ERB vs flight comparison, crew awards → Redesign & Re-fly / Next chapter.
> **Depends on:** P07 (P08 for collaboration) · **Challenge items:** **M11, R3, R4, R5, R12**, N1, N2, N7.

---

## 1. Scoring model (`sim/scoring.ts`)

| Component | Weight | How it's measured |
|---|---|---|
| **Mission objectives** | 30% | Share of the contract requirements met (from P04) |
| **Science return** | 20% | Science delivered ÷ target (data actually downlinked, uptime, lifetime) |
| **Engineering design (ERB)** | 15% | ERB grades: physics checks passed, healthy margins (5–25% best; oversized = wasteful) |
| **Resource efficiency** | 15% | Budget, mass, power and Δv margins at the end of the mission |
| **Physics mastery** | 10% | Physics challenges: correct or smart choices, hint usage (Cadet hints don't penalise) |
| **Crew collaboration / decisions** | 10% | Team: consensus, contribution, good calls · Solo: event-decision quality |

- **Result:** SUCCESS (all requirements met) · PARTIAL (science ≥ 50% of target) · FAILURE.
- **Grade:** S ≥ 95 · A ≥ 85 · B ≥ 70 · C ≥ 55 · F < 55.
- **Stars per chapter** (1–3) unlock the next chapter at ≥ 1 star (or PARTIAL).

## 2. Mission report screen

1. **Headline:** result + grade + a mission patch (from P03) + the mission name.
2. **Score breakdown** bars (animated count-up).
3. **Requirements checklist:** each contract item ✓/✗ with a value.
4. **"Why" analysis (M11):** 3–6 bullets generated from the decision log + sim, **always naming a player decision and its physical effect**, for example:
   - "Your Ka-band antenna kept up with 65 Gb/day even at 5.2 AU. Data loss: 0%."
   - "At Jupiter, sunlight is 3.7% of Earth's. Your 10 kW arrays gave only 370 W, so instruments ran 40% of the time."
   - "Flying at 5 R_J instead of 20 R_J gained ≈ 2.3 km/s more velocity change, but the radiation dose exceeded your vault rating, and the camera degraded on day 41."
   - "The 85 m spin arm at 2 rpm gave Mars-like 0.38 g. The crew arrived healthy."
5. **ERB vs Reality:** a table of what the review predicted vs what happened (teaches margins).
6. **Physics recap:** each challenge faced, the player's answer, the correct reasoning (formula + number).
7. **Crew awards** (team): "Best call", "Budget hawk", "Science hero". These are light-hearted.
8. **"Another way to win" hint** (R5: no single perfect solution), for example "A lighter RTG design also passes. Try it!".
9. **Real missions like yours** (N7): Juno (Jupiter, solar + vault), Voyager / Interstellar Probe concept (heliopause), JWST (L2), Artemis (Moon), MAVEN (Mars atmosphere). These are facts only, with links on the credits page.
10. **Buttons:** **Redesign & Re-fly** (loads the same design into assembly) · Try another trajectory · Next chapter · Save design · Share/export · Leaderboard.

## 3. Persistence, comparison and leaderboards
- **Save/load** designs and results in `localStorage` (versioned schema). **Export/import** as JSON (or a shareable URL-encoded string) (N2).
- **Compare** two runs side by side (score components, key design differences).
- **Leaderboard** (N1): local per chapter by default. Optional online board (simple API route + KV/DB) storing only the call-sign, score and design hash. No personal data.

## 4. 3D and visuals
- **CS-08 Outcome:** success: the spacecraft in operation at the destination with data streams, then the crew in mission control celebrating. Failure: a calm, constructive tone ("Let's find out why") with a slow camera around the craft and the failing subsystem highlighted in red.
- The report background: a slowly rotating 3D model of **the player's own spacecraft** (from the design), which can be clicked to highlight the parts mentioned in the "why" bullets.

## 5. Files to create
```
src/game/sim/{scoring,why,compare}.ts (expand + tests) · src/game/core/save.ts
src/scenes/Report/{ReportScene,OutcomeCutscene}.tsx · src/cutscenes/scripts/CS-08-outcome.ts
src/ui/Report/{Headline,ScoreBars,RequirementsResult,WhyList,ErbVsReality,PhysicsRecap,CrewAwards,RealMissionCard,ReportActions}.tsx
src/ui/{Leaderboard,CompareRuns,ExportDesign}.tsx
src/app/api/leaderboard/route.ts (optional)
```

## 6. Acceptance criteria
- [x] Every mission ends in a report showing the score breakdown, the requirement results and **≥ 3 "why" bullets that reference specific player decisions** (M11).
- [x] Redesign & Re-fly returns to assembly with the previous design loaded. Re-flying with a change produces a measurably different result (R4).
- [x] Two different designs can both reach SUCCESS on the same pathway (R5 check, matching the P02 fixtures).
- [x] Save, load and export/import of designs work across browser reloads.
- [x] The local leaderboard works per chapter.
- [x] Testers can name one decision and its effect after reading the report (education check).

## 7. Risks and tips
- "Why" generation is template-based. Pick the top contributors by impact (the largest score deltas) so the bullets stay relevant.
- Never blame players. Phrase failures as engineering lessons.

---

## Build notes (Phase 09)

- **Scoring, ERB vs. Reality, Physics Recap & Crew Awards (`src/game/sim/scoring.ts`)**:
  - Expanded `scoring.ts` with `computeDecisionsScore` (blending in-flight event choices with `computeCollaborationMetrics` when in multi-player or voted sessions), `buildScoreExtras`, `buildErbVsReality` (comparing ERB predictions against actual flight telemetry across Δv, power, downlink, electronics radiation, crew health, science, and budget), `buildPhysicsRecap` (pairing each pathway physics challenge with its formula, player answer, and explanation), and `buildCrewAwards` (`Best Call`, `Budget Hawk`, `Science Hero`, `Systems Guardian`).
- **3D-Linked "Why" Analysis, Alternate Solutions & Real Missions (`src/game/sim/why.ts`)**:
  - Added `targetSlot` (`decisionToTargetSlot`) to every `WhyBullet` so clicking a bullet or clicking the 3D spacecraft highlights the corresponding subsystem socket.
  - Added Jupiter perijove (`flybyRadii`: 2, 5, 20 $R_J$) and team vote (`decisionLog`) bullets, `anotherWayToWin` (R5 hint with 1-click load of the alternate winning fixture), and `realMissionsForPathway` (N7 cards for ISS/Landsat, Artemis/LRO, MAVEN, Juno, Voyager 1 & 2, and JWST/TESS).
- **Persistence, Share Codes, Leaderboards & Side-by-Side Run Comparison (`src/game/core/save.ts`, `src/game/sim/compare.ts`)**:
  - Implemented versioned `localStorage` persistence for saved designs (`mission-architect:saved-designs`) and completed mission runs (`mission-architect:saved-runs`), deterministic FNV-1a build hashes (`computeDesignHash`), Zod-validated JSON and `MA1:...` base64url export/import (`exportDesignBundle`, `importDesignBundle`), per-chapter leaderboards (`getChapterLeaderboard`), and side-by-side run comparison (`compareRuns`).
  - Added `redesignAndRefly`, `tryAnotherTrajectory`, and `loadDesignForRefly` to `src/game/core/store.ts`, plus automatic star/progress and leaderboard recording in `finishJourney`.
- **3D Report Showcase, CS-08 Cutscene & Report UI (`src/scenes/Report/`, `src/cutscenes/scripts/CS-08-outcome.ts`, `src/ui/Report/`, `src/ui/{Leaderboard,CompareRuns,ExportDesign}.tsx`)**:
  - Created `CS-08-outcome.ts`, `OutcomeCutscene.tsx`, and `ReportScene.tsx` rendering the player's own 3D spacecraft rotating in space with telemetry data streams on success or a pulsing red `<AlarmLight />` fault beacon on the failing subsystem on failure.
  - Built `Headline`, `ScoreBars`, `RequirementsResult`, `WhyList`, `ErbVsReality`, `PhysicsRecap`, `CrewAwards`, `RealMissionCard`, `ReportActions`, `ReportHud`, `Leaderboard`, `CompareRuns`, and `ExportDesign`.
- **Verification**:
  - Added unit tests in `src/game/sim/report.test.ts` (18 test files, 234 unit tests passing) and Playwright E2E spec `tests/e2e/report.spec.ts` (15 E2E tests passing across desktop and mobile).
