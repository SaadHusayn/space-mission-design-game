# Phase 10 · Polish, Audio, Accessibility, Performance and Release

> **Goal:** turn the playable game into a **submission-ready**, polished experience: sound, visual polish, performance, accessibility, onboarding, credits, compliance checks and the final Space Apps submission materials.
> **Depends on:** all previous phases · **Challenge items:** **T2, T3, T4**, final verification of **all M items**.

---

## 1. Audio
- **Music:** ambient space pads in menus and cruise, rising tension for launch and events, a resolving theme for success. Use royalty-free / CC0 / licensed tracks, or compose your own. Log them in `CREDITS.md`.
- **SFX:** UI ticks, part snap/clunk, a hangar ambience, the countdown beeps, an ignition roar plus a low-frequency rumble, stage-separation pops, an alarm, the downlink chirp, the success fanfare.
- **Mixing:** music/SFX/voice buses, a ducking music bus under alarms, volume sliders, a mute toggle. Spatial audio only where it helps (the launch pad).

## 2. Visual polish
- Post-processing: bloom (engines, stars, emissives), subtle vignette, tone mapping. A Low-quality profile disables the heavy effects.
- Consistent UI style (tokens from [01](01-tech-architecture.md) §7), micro-animations (motion), number count-ups, smooth camera easing everywhere.
- Loading screens with tips/facts ("A rocket's Δv depends on how much of its mass is fuel").
- Title, menus, settings, credits and pause menu all finished.

## 3. Performance pass
- Profile with `r3f-perf` + Chrome Performance. Hit the budgets in [01](01-tech-architecture.md) §8.
- Merge static meshes, use instancing for repeats, dispose unused scene assets on scene exit, lazy-load chapter assets, and compress any remaining textures to KTX2.
- Adaptive quality: drei `<PerformanceMonitor>` lowers the dpr and effects automatically when fps drops.

## 4. Accessibility
- Colour is never the only signal (icons ✓ ⚠ ✗ + text).
- Text ≥ 16 px. High-contrast panels. Optional large-text mode.
- Subtitles for all dialogue, a reduced-motion mode (less shake, no camera rolls), remappable or simple controls, a keyboard-navigable UI, ARIA labels on dialogs and buttons.
- Difficulty and hints help beginners (Cadet).

## 5. Onboarding and learning extras
- A first-run tutorial (P03), plus contextual coach marks the first time each new system appears.
- A **"Mission Notebook"**: collected concept cards (Δv, inverse square, centripetal force, gravity assist, transit…) with the formula + a 1-line explanation + the real example values from [02](02-physics-and-challenges.md).
- A **Learn more** page: official challenge resources (game-design-docs/02) and real missions referenced.

## 6. Compliance and quality gate (before submission)
- [ ] Fill in the **self-check table** in `game-design-docs/03-requirements-checklist.md`. **All M and T items must be ✅** (THE PROJECT MUST FULFILL THE REQUIREMENTS OF THE CHALLENGE).
- [ ] `CREDITS.md` complete: every model, texture, HDRI, sound, font and library with its licence. NASA resources credited. **No NASA insignia/agency logos used as branding.** The fictional agency name is used in the story.
- [ ] "Simplified model for learning", "Distances not to scale" and "Artist's impression" labels are present where needed.
- [ ] Full playthrough of every shipped chapter on Chrome, Edge and Firefox, laptop and desktop. No console errors.
- [ ] Playtest with ≥ 3 people (≥ 1 non-space). Fix the top confusion points (protocol in `game-design-docs/10-selection-rubric.md` step 3).
- [ ] Lighthouse: performance acceptable, accessibility ≥ 90 on the non-canvas pages.
- [ ] Check the official Space Apps rules, dates, judging criteria and submission requirements on spaceappschallenge.org.

## 7. Release and submission materials
- Production deploy on Vercel. Stable public URL. A README with how to play, controls, the tech stack, the team, credits, and the filled challenge checklist.
- A **demo video** (gameplay capture of a full mission, ≤ the Space Apps limit), screenshots, and a short project description mapping features to the challenge objectives.
- Tag the release (`v1.0-submission`).

## 8. Acceptance criteria
- [ ] All the gates in §6 are checked.
- [ ] Average fps ≥ 50 on the target laptop across all scenes (High), ≥ 30 on Low with an integrated GPU.
- [ ] The first load reaches the title in ≤ 10 s on normal broadband.
- [ ] Playtesters rate "fun / would play again" ≥ 4/5 on average (T2).
- [ ] The submission package is complete.
