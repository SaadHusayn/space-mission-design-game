# TRAJECTORY: Pathways Beyond

A 3D space mission design game for the **NASA Space Apps Challenge 2026** ("Space Mission Design Game").

Astronaut candidates are recruited by the (fictional) Orbital Exploration Agency. They design a spacecraft with
the engineers, choose an orbit and a rocket, launch, and fly to the Moon, Mars, Jupiter and beyond. Real physics
tests every design choice, and the mission report explains why the mission succeeded or failed.

> Independent student project. Not affiliated with or endorsed by NASA. Physics is simplified for learning.

## Status

**Phases 01 and 02 are built.** The full plan is in [`../implementation-plan/`](../implementation-plan/README.md).

| Phase | State |
|---|---|
| P01 Foundation: project, 3D canvas, scene switching, loader, title screen, asset pipeline, CI | ✅ built |
| P02 Core logic and physics engine: physics, data, design totals, Engineering Review, flight simulation, events, scoring, physics challenges (148 tests) | ✅ built |
| P03 Recruitment, crew and training | next |
| P04–P11 | planned |

## Run it

Needs Node.js 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:3000  → press PLAY (or open /play)
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint (also blocks React/Three imports inside `src/game`) |
| `npm run typecheck` | TypeScript, no output |
| `npm test` | Unit tests (Vitest) |
| `BALANCE=1 npx vitest run src/game/sim/balance.debug.test.ts --reporter=verbose` | Balance report for the reference designs |
| `npm run assets:models` | Regenerate the placeholder GLB and optimise every model in `assets-src/models` |
| `npm run assets:textures -- <folder>` | Convert downloaded source textures into `public/textures` |

Add `?debug` to the `/play` URL for an FPS panel.

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · three.js with React Three Fiber and drei · zustand · Vitest.

## Project layout

```
src/
  app/            routes: / (landing), /play (the game), /credits
  components/     GameClient (client-only loader), GameRoot (canvas + HUD), error boundary
  game/           PURE TypeScript game rules: no React, no Three (enforced by ESLint). Import from '@/game'
    core/         machine.ts (phases), store.ts (state), rng.ts (seeded random)
    physics/      formulas (rocket equation, orbits, gravity assist, inverse square, spin gravity …)
    data/         parts, instruments, rockets, pathways (JSON) + zod schemas + loader
    sim/          design totals, Engineering Review, flight simulation, events, scoring, "why" bullets
    challenges/   physics multiple-choice challenges built from the player's own numbers
  hooks/          useGame: React binding for the store
  scenes/         one folder per 3D scene (Title, ModelPreview, …)
  three/          reusable 3D parts: Planet, Atmosphere, Starfield, SunLight, CameraRig
  ui/             2D interface drawn over the canvas
scripts/          asset pipeline
assets-src/       source models before optimisation
public/           optimised models and textures served to the browser
```

### How it fits together

- **One canvas for the whole game.** `GameRoot` keeps a single `<Canvas>`; `SceneSwitch` picks the scene from
  the current phase. Scenes never recreate the WebGL context.
- **Phases** are defined in `src/game/core/machine.ts` with the allowed transitions. `store.goTo(phase)` refuses
  anything else, so steps like the engineering review can't be skipped.
- **Settings** (graphics quality, reduced motion) are saved in the browser's local storage.

## 3D model conventions (for Blender work)

- Real-world scale in **metres**, **+Y up**, transforms applied.
- Mesh nodes are named `part_*`.
- Attachment points are **empty objects** named `socket_<slot>` (for example `socket_power_left`,
  `socket_antenna`, `socket_instrument_1`). Code snaps parts onto them.
- Put the exported `.glb` in `assets-src/models/` and run `npm run assets:models`. It removes unused data,
  compresses geometry with Meshopt, converts textures to WebP (2K max), **keeps the socket empties**, and prints
  the sockets it found.

KTX2 texture compression needs the separate KTX-Software `ktx` tool, which isn't set up yet. WebP is used for now.

## Deploy

The app is a standard Next.js project. To get a public link on Vercel:

```bash
npx vercel        # first time: links the project to your Vercel account
npx vercel --prod
```

CI (`../.github/workflows/ci.yml`, at the repository root) runs lint, typecheck, tests and the build on every push and pull request.

## Credits

See [CREDITS.md](CREDITS.md). Every external asset must be listed there with its licence.
