# Phase 01 · Foundation

> **Goal:** a deployable Next.js + TypeScript + Tailwind + R3F project with a persistent 3D canvas, a scene/state machine, a loading screen, the asset pipeline and CI. Nothing game-specific yet, but every later phase plugs into this.
> **Player-facing result:** open the public link → loader → title screen with a rotating 3D Earth and a "New Mission" button.
> **Depends on:** none · **Challenge items:** T3 (runs from a link), groundwork for T1.

---

## 1. Scope

**Must**
- Next.js App Router project, TypeScript strict, Tailwind, ESLint/Prettier, path alias `@/`.
- `/play` route mounting a **client-only** `<GameRoot/>` (`'use client'` + `next/dynamic` with `ssr: false` for the Canvas).
- **One persistent `<Canvas>`** + a scene switcher driven by the store (`machine.ts` states: `BOOT`, `TITLE`, placeholders for the rest).
- zustand store skeleton with `phase`, `settings` (volume, quality, reducedMotion) and `localStorage` persistence of settings.
- `<Loader/>` using drei `useProgress`. Suspense boundaries per scene.
- Title scene: 3D Earth (day texture + clouds + atmosphere shell), starfield background, slow camera drift.
- HUD layer (DOM over canvas) with a pointer-events strategy.
- GLB pipeline proof: one test GLB compressed with glTF-Transform, loaded via `useGLTF`, and one KTX2 texture via `useKTX2`.
- Deployment to Vercel (preview per PR, production on `main`).
- CI (GitHub Actions): install → lint → typecheck → test → build.

**Should**
- `r3f-perf` + `leva` behind `?debug` in the URL.
- A settings modal (volume placeholders, quality Low/High, reduced motion).
- Error boundary with a friendly "WebGL not supported" fallback.

**Could**
- A PWA manifest and icons.

---

## 2. 3D and visuals
- `three/Planet.tsx` (reusable): props `textures {map, normalMap, roughnessMap, emissiveMap?, clouds?}`, `radius`, `rotationSpeed`, `atmosphereColor`.
- `three/Atmosphere.tsx`: an inverted Fresnel shell (additive blending, back-side).
- `three/Starfield.tsx`: instanced points (seeded) or an HDRI background.
- Lighting: a directional "sun" + a low ambient. ACES tone mapping.

## 3. Files to create
```
src/app/layout.tsx · src/app/page.tsx · src/app/play/page.tsx
src/components/GameRoot.tsx            # Canvas + SceneSwitch + HUD layer
src/game/core/store.ts · machine.ts · rng.ts
src/scenes/Title/TitleScene.tsx
src/three/Planet.tsx · Atmosphere.tsx · Starfield.tsx · CameraRig.tsx
src/ui/Loader.tsx · Settings.tsx · TitleMenu.tsx
scripts/optimize-assets.mjs            # wraps gltf-transform for public/models/*
.github/workflows/ci.yml · CREDITS.md · README.md
```

## 4. Tasks
1. `npx create-next-app@latest mission-game --ts --tailwind --eslint --app --src-dir`
2. Install: `three @react-three/fiber @react-three/drei @react-three/postprocessing zustand immer zod gsap motion howler` + dev: `@types/three vitest @vitest/coverage-v8 playwright leva r3f-perf @gltf-transform/cli`
3. Check R3F ↔ React versions (R3F v9 ↔ React 19).
4. Build `GameRoot` with Canvas + `SceneSwitch` (a switch on `store.phase`) + `<Html>`-free DOM HUD.
5. Implement the title scene + Planet/Atmosphere/Starfield.
6. Add the asset script: `gltf-transform optimize` (meshopt + KTX2, 2K max).
7. Set up the Vercel project + CI workflow.
8. Write the README run instructions.

## 5. Acceptance criteria
- [ ] `npm run dev` shows the loader → title with a rotating Earth (clouds and atmosphere visible).
- [ ] The production build deploys. The public URL works on Chrome, Edge and Firefox.
- [ ] Switching `store.phase` swaps scenes **without recreating the canvas** (verify with the WebGL context ID or no flicker).
- [ ] The test GLB and KTX2 texture load with compression decoders working.
- [ ] CI is green (lint, typecheck, test, build).
- [ ] The title scene runs ≥ 60 fps on a dev laptop and ≥ 30 fps with the Low quality setting on integrated graphics.

## 6. Risks and tips
- **SSR errors** (`window is not defined`): keep all Three code under client components loaded with `ssr: false`.
- **Draco/KTX2 decoder paths:** drei `useGLTF` uses CDN decoders by default. For offline reliability, copy the decoders into `/public` and point to them.
- Keep `src/game/**` free of React and Three from day one.

---

## 7. Build notes (P01 as built)

**Status: built and checked.** App folder: `trajectory/`.

| Acceptance criterion | Result |
|---|---|
| Loader → title with rotating Earth (clouds, atmosphere) | ✅ Checked in headless Chrome (desktop 1600×900 and phone 420×860) |
| Scene swap without recreating the canvas | ✅ Same `<canvas>` element before and after TITLE → preview scene |
| Compressed GLB loads | ✅ `probe_placeholder.glb`, Meshopt, 33 KB → 17 KB, 7 sockets kept |
| KTX2 texture loads | ❌ Not done: needs the KTX-Software `ktx` tool, which isn't installed. Textures are WebP for now. |
| CI green | 🟡 Workflow written (`.github/workflows/ci.yml`). Lint, typecheck, 18 tests and build pass locally. Not yet run on GitHub (no remote). |
| Production deploy, public URL | ❌ Not done: needs the team's Vercel account (`npx vercel`). |
| ≥ 60 fps | ✅ 60 fps (vsync cap) at High quality in both scenes on the dev machine's GPU. Integrated-GPU Low-quality target not measured. |
| Chrome, Edge, Firefox | 🟡 Chrome only so far. |

**Differences from the plan**
- Installed only what P01 uses (`three`, R3F, drei, zustand, immer, zod, Vitest, glTF Transform, sharp). `postprocessing`, `gsap`, `motion`, `howler`, `leva`, `r3f-perf` and Playwright get added in the phase that first needs them. `?debug` shows drei's `<Stats/>` instead of r3f-perf.
- Settings has graphics quality and reduced motion. Volume sliders come with audio in P10.
- `src/game/core/store.ts` uses `zustand/vanilla`, so `src/game/**` stays free of React. React reads it through `src/hooks/useGame.ts`. ESLint enforces the rule.
- The stand-in for all later phases is a model-preview scene (orbit and zoom around the placeholder probe).
- `prune()` in glTF Transform deletes empty nodes by default, which would remove the `socket_*` attachment points. The optimiser uses `prune({ keepLeaves: true })` and prints the sockets it finds.
- React Three Fiber logs one `THREE.Clock is deprecated` warning with three r187. It comes from the library, not our code, and is harmless.
