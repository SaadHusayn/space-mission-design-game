# Project rules for AI agents

Space Apps 2026 "Space Mission Design Game": a 3D web game. **Read `HANDOFF.md` first**: status, next phase, decisions (§6), open questions (§7).

## Where things are
- `HANDOFF.md`: current status and what to do next (update it at the end of every session)
- `implementation-plan/`: the build plan; one spec per phase (`phase-XX-*.md`) with build notes at the end of finished phases
- `game-design-docs/03-requirements-checklist.md`: challenge requirements; all Mandatory (M) and Team (T) items must be met
- `trajectory/`: the game (Next.js 16 + TypeScript + Tailwind + React Three Fiber). See `trajectory/README.md` for commands and layout

## Rules
1. **The project must fulfil the challenge requirements.** The game must be 3D and interesting. Stay inside the challenge scope; no NASA logos or implied endorsement (fictional agency and characters).
2. **Work phase by phase** from `implementation-plan/`. A phase is done only when its acceptance criteria pass, then add "Build notes" to its phase file.
3. **Browser testing uses Playwright** (`trajectory/tests/e2e/`, `npm run test:e2e`). Add or extend a spec for every phase and look at the screenshots in `trajectory/test-results/screens/`.
4. Before finishing: `npm run lint && npm run typecheck && npm test && npm run test:e2e` (in `trajectory/`).
5. `trajectory/src/game/**` is pure TypeScript (no React/Three/Next); UI imports game logic from `@/game`.
6. Next.js here has breaking changes: read `trajectory/node_modules/next/dist/docs/` before using Next APIs.
7. 3D assets are code-generated shapes (team decision); keep GLB conventions (`part_*`, `socket_*`) so Blender models can replace them later.
8. Every external asset goes in `trajectory/CREDITS.md` with its licence before use.
9. **Log every decision made on the team's behalf** in `HANDOFF.md` §6 and tell the user at the end of the phase. Ask before outward-facing actions (pushing, deploying).
10. Commit per phase with clear messages; git remote not set yet (pushing skipped by the team).
