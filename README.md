# Space Mission Design Game: TRAJECTORY: Pathways Beyond

Team project for the **NASA Space Apps Challenge 2026: "Space Mission Design Game"**.

A 3D web game where players, as astronaut candidates of a fictional space agency, design a spacecraft, choose an
orbit and rocket, launch, and fly missions to the Moon, Mars, Jupiter and beyond, learning how every engineering
trade-off shapes the mission's success.

> Independent student project. Not affiliated with or endorsed by NASA.

## Start here

| If you want to… | Read |
|---|---|
| Pick up the work (agent or teammate) | **[HANDOFF.md](HANDOFF.md)**: status, next steps, decisions, open questions |
| Work on it with an AI coding agent | **[AGENTS.md](AGENTS.md)**: rules and commands for any agent (Claude reads it through `CLAUDE.md`) |
| Know what the challenge requires | [game-design-docs/03-requirements-checklist.md](game-design-docs/03-requirements-checklist.md) |
| See the build plan | [implementation-plan/README.md](implementation-plan/README.md) |
| Run the game | [trajectory/README.md](trajectory/README.md) |

## Folders

```
AGENTS.md             rules for AI coding agents (CLAUDE.md imports it)
HANDOFF.md            status, decisions, open questions (update every session)
game-design-docs/     challenge text, resources, requirements checklist, design guidance
implementation-plan/  story, architecture, physics, and one spec per build phase (P01–P11)
trajectory/           the game: Next.js + TypeScript + Tailwind + Three.js (React Three Fiber)
```

## Quick start

```bash
cd trajectory
npm install
npm run dev     # open http://localhost:3000 and press PLAY
```

## Current status

Phases 01–05 are done: foundation, game rules and physics engine, astronaut recruitment and training, 3D pathway map with mission briefings, and the 3D spacecraft assembly bay with the Engineering Review Board (213 unit tests, 10 Playwright browser tests). Next: Phase 06 (launch vehicle, launch and orbit).
See [HANDOFF.md](HANDOFF.md) for details.
