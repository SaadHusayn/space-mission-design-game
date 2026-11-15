# Credits and licences

Mission Architect: Pathways to the Stars is an independent student project made for the NASA Space Apps Challenge 2026
("Space Mission Design Game"). It is **not affiliated with or endorsed by NASA** or any other space agency.
The Orbital Exploration Agency and all characters are fictional. No agency logos are used.

Every external asset must be listed here **before** it is committed.

## Textures

| File(s) in `public/textures/` | Source | Author | Licence | Changes |
|---|---|---|---|---|
| `earth_day.webp`, `earth_night.webp`, `earth_clouds.webp`, `earth_normal.webp`, `earth_specular.webp`, `milky_way.webp`, `moon.webp`, `mars.webp`, `jupiter.webp`, `sun.webp` | https://www.solarsystemscope.com/textures/ (2K set) | Solar System Scope | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Resized to 2048×1024, converted to WebP; clouds and specular converted to greyscale (`scripts/import-textures.mjs`) |

## 3D models

| File | Source | Licence |
|---|---|---|
| `public/models/probe_placeholder.glb` | Generated in code by `scripts/build-placeholder-models.mjs` (Mission Architect team) | Original work |
| `public/models/rocket_*.glb` (`Atlas 6`, `Space Shuttle`, `Saturn V`, `Starship`), `sun.glb`, `moon.glb`, `mars.glb`, `exoplanet.glb`, `probe_iss.glb`, `probe_lro.glb`, `probe_mro.glb`, `probe_juno.glb`, `probe_voyager.glb`, `probe_jwst.glb`, `dsn_dish.glb` | [NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources) via local `Space_Universe_Collection` | NASA media usage policy (non-commercial educational use; no NASA endorsement implied) |

## Audio

| Source | Author | Licence | Notes |
|---|---|---|---|
| Procedural ambient space pads & mission SFX (`src/audio/soundEngine.ts`) | Mission Architect team | Original work | Synthesized in real time via Web Audio API; zero external audio files |

## Fonts

| Font | Source | Licence |
|---|---|---|
| Geist, Geist Mono | Vercel, loaded with `next/font/google` | SIL Open Font License 1.1 |

## Libraries

Next.js, React, TypeScript, Tailwind CSS, three.js, React Three Fiber, drei, zustand, immer, zod, glTF Transform,
meshoptimizer, sharp, Vitest. See `package.json` for versions; each is under its own open-source licence (mostly MIT).

## Challenge resources that shaped the design

Listed on the in-game Credits page (`/credits`) and in `../game-design-docs/02-challenge-resources.md`.
