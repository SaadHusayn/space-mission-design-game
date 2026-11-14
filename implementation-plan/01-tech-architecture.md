# 01 · Tech Architecture

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js** (App Router) + **TypeScript** (strict) | The game runs on one client route (`/play`). Marketing/credits pages are static. |
| Styling / UI | **Tailwind CSS** | HUD, menus, dialogs. Optional: shadcn/ui (Radix) for accessible dialogs and tooltips, `lucide-react` icons. |
| 3D | **three** + **@react-three/fiber (R3F)** + **@react-three/drei** | R3F v9 pairs with React 19 (v8 with React 18). Match the Next.js React version. |
| Post-processing | **@react-three/postprocessing** | Bloom (engines, stars), vignette, tone mapping. Keep it light. |
| State | **zustand** (+ `immer` middleware) | One game store. The logic layer stays pure TypeScript. |
| Animation | **GSAP** (timelines for cutscenes/camera) and **motion** (Framer Motion) for UI | Alternatively, **Theatre.js** (`@theatre/core`, `@theatre/r3f`) for authoring cutscene keyframes visually. |
| Audio | **howler.js** (music/SFX) or drei `PositionalAudio` | Music and SFX buses with volume sliders. |
| Validation | **zod** | Validate all JSON data at load time. |
| Debug | **leva** (tweak panel, dev only), **r3f-perf** (FPS/draw calls) | Strip from production. |
| Testing | **Vitest** (logic and physics unit tests), **Playwright** (smoke e2e) | Physics must be unit-tested. |
| Multiplayer (P11, optional) | **PartyKit** / **Socket.IO** / **Colyseus** | Hot-seat first (P08). |
| Hosting | **Vercel** (or Netlify) | A public link for judges (T3). |

Install the latest stable versions at project start. Check R3F ↔ React ↔ Next compatibility before upgrading anything mid-project.

---

## 2. Folder structure

```
mission-game/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx, page.tsx           # landing (static)
│  │  ├─ play/page.tsx                  # mounts <GameRoot/> (client only)
│  │  └─ credits/page.tsx
│  ├─ game/
│  │  ├─ core/        store.ts · machine.ts (scene/phase state machine) · rng.ts (seeded) · save.ts
│  │  ├─ types/       parts.ts · mission.ts · challenge.ts · events.ts · story.ts
│  │  ├─ data/        *.json (parts, launchVehicles, pathways, challenges, events, dialogue) + schemas.ts (zod)
│  │  ├─ physics/     constants.ts · rocket.ts · orbit.ts · gravityAssist.ts · power.ts · comms.ts
│  │  │               thermal.ts · radiation.ts · lifeSupport.ts · artificialGravity.ts · transit.ts  (+ *.test.ts)
│  │  ├─ sim/         design.ts (resource totals) · review.ts (ERB) · journey.ts · events.ts · scoring.ts · why.ts
│  │  └─ challenges/  generator.ts (builds options from the player's craft) · evaluate.ts
│  ├─ scenes/         Recruitment/ · MissionControl/ · Hangar/ · LaunchPad/ · Launch/ · SolarSystem/
│  │                  Moon/ · Mars/ · Jupiter/ · DeepSpace/ · Exoplanet/ · Report/
│  ├─ three/          Planet.tsx · Atmosphere.tsx · Rings.tsx · Starfield.tsx · Sun.tsx · Spacecraft.tsx
│  │                  PartSocket.tsx · Rocket.tsx · Exhaust.tsx · Trajectory.tsx · CameraRig.tsx
│  ├─ cutscenes/      CutscenePlayer.tsx · Subtitles.tsx · rails.ts · scripts/CS-*.ts
│  ├─ ui/             HUD/ · ResourceBar.tsx · Stepper.tsx · DialogueBox.tsx · ChoiceCard.tsx · PhysicsConsole.tsx
│  │                  GoNoGoPanel.tsx · ReviewBoard.tsx · Report/ · Settings.tsx · Loader.tsx
│  └─ audio/          sound.ts · cues.ts
├─ public/
│  ├─ models/         *.glb (Draco/Meshopt-compressed)
│  ├─ textures/       *.ktx2 (planets, PBR sets), *.webp (UI)
│  ├─ hdri/           *.hdr / *.exr (env maps, 1–2K)
│  └─ audio/          *.ogg / *.mp3
├─ tests/e2e/
├─ CREDITS.md
└─ README.md (+ filled challenge self-check)
```

**Rule:** `src/game/**` has **no React and no Three imports**. It's pure TypeScript, testable in Node, and reusable for multiplayer.

---

## 3. Game state machine

One persistent `<Canvas>` for the whole game. Scenes swap **inside** it, which avoids WebGL context loss and reloading on route change.

```
BOOT → TITLE → PROLOGUE(CS-00..02, recruitment, training)
     → CHAPTER_SELECT
     → BRIEFING(CS-03) → OBJECTIVE → ASSEMBLY → ERB_REVIEW → TRAJECTORY → LAUNCH_VEHICLE → GO_NO_GO
     → ROLLOUT(CS-04) → LAUNCH(CS-05) → JOURNEY(segments: transfer → hazard checkpoints → arrival)
     → OPERATIONS (science collection + events) → REPORT(CS-08) → {REDESIGN → ASSEMBLY | NEXT_CHAPTER | MENU}
```

- `machine.ts` exports the states, allowed transitions and guards (for example, `GO_NO_GO → ROLLOUT` only if the checks pass).
- The store holds: `profile`, `crew[]`, `difficulty`, `chapterId`, `design` (selected parts), `trajectory`, `launchVehicle`, `journeyState`, `decisionLog[]`, `results`.
- **Autosave** to `localStorage` at each state transition (P09 adds export/share).

---

## 4. Rendering setup

- `<Canvas>` with `dpr={[1, 2]}`, `gl={{ antialias: true }}`, ACES filmic tone mapping, sRGB output, shadows only in the hangar and on the launch pad.
- `<Suspense>` + drei `useProgress` → a custom `<Loader/>`. Preload the next scene's assets during dialogue or cutscenes (`useGLTF.preload`, `useKTX2`).
- **Scale strategy for space:** never use real metres for interplanetary distances (float precision). Each scene has its own scale. Use **logarithmic/compressed distances** on the solar-system map and show the real values in the UI. `camera.near`/`far` are set per scene.
- **Starfield:** an instanced points shader, or a background cubemap/HDRI (Milky Way panorama).
- **Planets:** a sphere + PBR material: day `map`, `normalMap`/`bumpMap`, `roughnessMap` (oceans shiny), `emissiveMap` (night lights masked by the sun direction in an `onBeforeCompile` or custom shader), a separate **cloud sphere** (alpha map, slightly larger, slower rotation), and an **atmosphere** shell (Fresnel rim shader, additive). Saturn/Jupiter-style banding comes from textures. Rings use a ring geometry with an alpha texture.
- **Sun:** an emissive sphere + bloom + a lens flare (drei or a custom sprite).

---

## 5. GLB asset pipeline ("GLB mapping techniques")

### 5.1 Modelling and texture mapping (Blender)
1. Model at **real-world scale in metres** (spacecraft parts and rockets). Apply transforms.
2. **UV unwrap** every mesh. Use texture **atlases** per asset to reduce materials.
3. **PBR textures** (glTF metallic-roughness): `baseColor`, `normal` (OpenGL, +Y), `ORM` packed (R = AO, G = roughness, B = metalness), `emissive` (engine glow, lights).
4. **Bake** AO (and optionally lighting) for static props (hangar, launch tower) → realistic look at low cost.
5. **Sockets for assembly:** add **empty objects** named `socket_<slot>` (for example `socket_power_left`, `socket_antenna`, `socket_instrument_1`) on the bus model. Parts have an origin at their mounting point. Code snaps parts to sockets.
6. Animations (solar-panel deploy, antenna unfold, landing legs, fairing split) as glTF **actions**, named clearly (`deploy`, `open`).
7. Name nodes predictably (`part_body`, `part_nozzle`). Code uses names for highlighting and damage effects.

### 5.2 Export and compression
- Export **glTF Binary (.glb)**, +Y up, with only the selected objects.
- Optimise with **glTF-Transform**: `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress ktx2` (or Draco). Resize textures to 2K max (4K only for the Earth hero texture).
- Generate typed React components with **gltfjsx**: `npx gltfjsx public/models/bus.glb --transform --types -o src/three/models/Bus.tsx`.
- Load with `useGLTF('/models/bus.glb')` (drei sets up the Draco/Meshopt decoders) and `useKTX2` for standalone textures.

### 5.3 Environment and atmosphere
- Image-based lighting: drei `<Environment files="/hdri/hangar_2k.hdr" />` in the hangar. In space, use a dark HDRI or a custom env plus a strong directional "sun" light.
- **Interactive and real-feeling:** hover outlines (postprocessing `Outline` or drei `<Outlines/>`), clickable sockets (raycasting), camera `<CameraControls/>` with limits, subtle idle motion (floating dust in the hangar, blinking lights, rotating radar).
- **LOD** with drei `<Detailed/>` for planets and the station. **Instancing** for asteroids and debris.

### 5.4 Asset list (minimum)

| Asset | Type | Source idea |
|---|---|---|
| Spacecraft bus (3 sizes) + parts (solar S/M/L, battery, computer, attitude control, antennas, instruments, RTG, radiation vault, crew module, spin habitat, heat shield, propulsion stage) | GLB | Model in Blender (simple, stylised PBR), or adapt free/CC models |
| Rockets: Light / Medium / Heavy (stages separable) | GLB | Blender |
| Hangar / Mission Design Center interior | GLB (baked) | Blender, or a CC0 kit (Kenney / Quaternius sci-fi kits) + baking |
| Launch pad + tower | GLB | Blender / CC0 kit |
| Mission control room | GLB | CC0 kit |
| Planets: Earth (day, night, clouds, normal), Moon, Mars, Jupiter, (Saturn), Sun | Textures (KTX2) | Planet texture packs under CC BY 4.0 (credit them) and NASA imagery (follow NASA media guidelines) |
| Real spacecraft for "real missions like yours" cards (optional) | GLB | **NASA 3D Resources** (many GLB models). Check the usage guidelines. |
| Milky Way background, hangar HDRI | HDR / EXR | ESO/NASA panoramas (check the licence), **Poly Haven** HDRIs (CC0) |

Log every external asset in `CREDITS.md` (name, author, licence, URL). **No NASA insignia or agency logos as branding.**

---

## 6. Cutscene system

- **Data-driven scripts** (`cutscenes/scripts/CS-05.ts`): a list of shots `{ duration, camera: {path | from→to}, lookAt, actions: [...], subtitle, sfx, music }`.
- **Camera rails:** `THREE.CatmullRomCurve3` + GSAP timeline progress → `camera.position = curve.getPointAt(t)`.
- **Actions:** play a GLB animation, toggle the exhaust, separate a stage (detach the mesh, apply velocity), fade the overlay, spawn particles.
- **Subtitles + dialogue box** with the speaker portrait. Every line has text (no voice required; TTS or voice is optional).
- **Skippable** (hold `Esc`/`Space` for 1 s) and **interactive beats** (QTE-style prompts in the launch) pause or branch the timeline.
- Optional: author camera moves visually with **Theatre.js**, then export the JSON state.

---

## 7. UI architecture

- The HUD is DOM (Tailwind) overlaid on the canvas: `pointer-events-none` container + `pointer-events-auto` on panels.
- 3D-anchored labels use drei `<Html>`, sparingly (they're expensive). For many labels, use `<Text>` (troika).
- Design tokens in `tailwind.config` / CSS variables: background `#02040a`, panel `rgba(8,18,38,.8)`, cyan `#5ce1ff`, amber `#ffb547`, green `#4cf0a0`, red `#ff5a6a`, violet `#b48cff` (suggested).
- Accessible components: focus rings, keyboard navigation, ARIA on dialogs, reduced-motion support.

---

## 8. Performance budgets

| Item | Budget |
|---|---|
| Frame rate | 60 fps target, ≥ 30 fps minimum (mid-range laptop, integrated GPU) |
| Initial download (to the title screen) | ≤ 15 MB |
| Per-scene assets | ≤ 10 MB (compressed). Lazy-load per chapter. |
| Draw calls per frame | ≤ 300 (merge static meshes, instance repeats) |
| Textures | 2K default, 4K only for hero Earth. KTX2 everywhere. |
| Shadows | Hangar + launch pad only, 1 directional light, 2K map |
| Quality setting | Low / High: toggles shadows, bloom, particle count, dpr |

---

## 9. Conventions

- TypeScript `strict`, ESLint + Prettier, absolute imports `@/…`.
- Physics functions take **SI units** and return SI units. Convert only in the UI (`formatKm`, `formatKmS`).
- Every number shown in the UI is rounded to sensible precision.
- Seeded RNG (`rng.ts`) for events. Store the seed in the mission state so results are reproducible.
- Commit per feature. Keep each phase on a branch (`phase/05-assembly`), merging to `main` when its DoD passes.
