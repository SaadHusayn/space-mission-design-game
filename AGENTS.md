# AGENTS.md: instructions for any AI coding agent

This file is for every AI agent (Claude, Codex, Cursor, Gemini, Copilot, …) working on this repository.
`CLAUDE.md` simply imports this file, so keep all rules **here**.

## Project in one paragraph

NASA Space Apps Challenge 2026, challenge **"Space Mission Design Game"**. We are building a **3D web game**:
astronaut candidates recruited by a **fictional** agency (Orbital Exploration Agency) design a spacecraft with
engineers, choose an orbit and rocket, launch, and fly missions (Earth orbit, Moon, Mars, Jupiter, interstellar
probe, exoplanet telescope). Real physics tests every design choice, and the mission report explains why it
succeeded or failed. Working title: *TRAJECTORY: Pathways Beyond* (a rename is pending, see `HANDOFF.md` §7).

## Start here (in this order)

1. **`HANDOFF.md`**: current status, the exact next step, all decisions made (§6), open questions (§7). **Always read it first.**
2. **`implementation-plan/README.md`**: phase roadmap, then the spec of the next phase (`implementation-plan/phase-XX-*.md`).
3. **`game-design-docs/03-requirements-checklist.md`**: challenge requirements. All Mandatory (M) and Team (T) items must be met.
4. **`trajectory/README.md`**: commands and code layout of the game.
5. Reference while building: `implementation-plan/00-scope-and-story.md` (story, scope), `01-tech-architecture.md` (architecture), `02-physics-and-challenges.md` (verified physics numbers).

## Repository layout

```
AGENTS.md / CLAUDE.md   agent instructions (this file is the source of truth)
HANDOFF.md              status, next steps, decisions, open questions: UPDATE EVERY SESSION
README.md               project overview
game-design-docs/       official challenge text, resources, requirements checklist, design guidance
implementation-plan/    story, architecture, physics, one spec per build phase (P01–P11)
trajectory/             the game: Next.js 16 + TypeScript + Tailwind + Three.js (React Three Fiber + drei)
.github/workflows/      CI (lint, typecheck, unit tests, build, Playwright)
```

## Non-negotiable rules (from the team)

1. **THE PROJECT MUST FULFIL THE REQUIREMENTS OF THE CHALLENGE.** The game must be **3D** and **interesting**.
2. Stay inside the challenge scope. **No NASA logos or implied NASA endorsement**: the agency and all characters are fictional.
3. **Build phase by phase** following `implementation-plan/`. A phase is done only when all its acceptance criteria pass; then append "Build notes" to that phase file (see phases 01–04 for the format).
4. **Browser testing uses Playwright** (team rule). Specs live in `trajectory/tests/e2e/`. Add or extend a spec for every phase, and look at the step screenshots in `trajectory/test-results/screens/`. Don't use ad-hoc browser scripts.
5. **3D assets are code-generated shapes**, made as good as possible (team decision). Blender GLB models may replace them later, so keep the conventions: metres, +Y up, mesh nodes `part_*`, attachment empties `socket_<slot>`.
6. **Log every decision you make on the team's behalf** in `HANDOFF.md` §6 (next number after the last one), add new open questions to §7, and tell the user about both at the end of each phase.
7. **Keep `README.md` and `HANDOFF.md` up to date** so another agent can take over at any time.
8. **Ask before outward-facing actions**: pushing to GitHub, deploying, creating accounts, installing system tools.

## Code rules

- `trajectory/src/game/**` is **pure TypeScript**: no React, Three.js or Next.js imports (ESLint enforces it). UI code imports game logic from `@/game` (`trajectory/src/game/index.ts`).
- **Next.js 16 has breaking changes** compared to older versions: read `trajectory/node_modules/next/dist/docs/` before using Next APIs (see `trajectory/AGENTS.md`). The game runs client-only on `/play` inside one persistent `<Canvas>`.
- Physics functions use **SI units**; convert only for display. Every worked number in `implementation-plan/02-physics-and-challenges.md` must stay covered by unit tests.
- Game data lives in `trajectory/src/game/data/*.json`, validated with zod. After changing balance values, run the balance report and keep two winning designs per pathway (`src/game/sim/fixtures/designs.ts`).
- Set scene background/fog with `trajectory/src/three/SceneBackground.tsx` (`<color attach="background">` inside a group does not work).
- Every external asset (texture, model, sound, font) goes in `trajectory/CREDITS.md` with its licence **before** it is used.
- Seeded randomness only (`src/game/core/rng.ts`); never `Math.random()` in game logic.

## Commands (run inside `trajectory/`)

```bash
npm install
npm run dev                 # http://localhost:3000 → PLAY (or /play)
npm run lint                # ESLint
npm run typecheck           # TypeScript
npm test                    # unit tests (Vitest)
npm run test:e2e            # build + Playwright browser tests (uses the installed Google Chrome)
BALANCE=1 npx vitest run src/game/sim/balance.debug.test.ts --reporter=verbose   # balance report
```

All four checks (`lint`, `typecheck`, `test`, `test:e2e`) must pass before a phase is reported as done.

URL options for `/play`: `?unlock=all` opens every chapter; `?debug` shows an FPS panel and exposes the 3D scene as `window.__game3d`.

## Environment notes

- Linux, Node 26, npm. Google Chrome is installed; Playwright runs with `channel: 'chrome'` (no browser download needed).
- The GitHub CLI (`gh`) is **not** installed and **no git remote** is configured yet: the team chose to skip pushing for now. Commit locally.
- Textures come from Solar System Scope (CC BY 4.0); import new ones with `npm run assets:textures -- <folder>`.

## Git

- One repository at the project root. Commit at the end of each phase (or logical step) with a clear conventional message (`feat:`, `fix:`, `test:`, `docs:`), explaining *why* in the body.
- Never commit `node_modules`, `.next`, `test-results`, `playwright-report` or `.env*` (already in `.gitignore`).

## End-of-session checklist

- [ ] Phase acceptance criteria checked; build notes added to the phase file
- [ ] `lint`, `typecheck`, `test`, `test:e2e` pass
- [ ] `HANDOFF.md` updated: status table, next step, new decisions (§6), new questions (§7)
- [ ] `README.md` / `trajectory/README.md` status updated
- [ ] Work committed
