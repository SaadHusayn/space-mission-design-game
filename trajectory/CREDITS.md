# Credits and licences

TRAJECTORY: Pathways Beyond is an independent student project made for the NASA Space Apps Challenge 2026
("Space Mission Design Game"). It is **not affiliated with or endorsed by NASA** or any other space agency.
The Orbital Exploration Agency and all characters are fictional. No agency logos are used.

Every external asset must be listed here **before** it is committed.

## Textures

| File(s) in `public/textures/` | Source | Author | Licence | Changes |
|---|---|---|---|---|
| `earth_day.webp`, `earth_night.webp`, `earth_clouds.webp`, `earth_normal.webp`, `earth_specular.webp`, `milky_way.webp` | https://www.solarsystemscope.com/textures/ (2K set) | Solar System Scope | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Resized to 2048×1024, converted to WebP; clouds and specular converted to greyscale (`scripts/import-textures.mjs`) |

## 3D models

| File | Source | Licence |
|---|---|---|
| `public/models/probe_placeholder.glb` | Generated in code by `scripts/build-placeholder-models.mjs` (TRAJECTORY team) | Original work |

## Fonts

| Font | Source | Licence |
|---|---|---|
| Geist, Geist Mono | Vercel, loaded with `next/font/google` | SIL Open Font License 1.1 |

## Libraries

Next.js, React, TypeScript, Tailwind CSS, three.js, React Three Fiber, drei, zustand, immer, zod, glTF Transform,
meshoptimizer, sharp, Vitest. See `package.json` for versions; each is under its own open-source licence (mostly MIT).

## Challenge resources that shaped the design

Listed on the in-game Credits page (`/credits`) and in `../game-design-docs/02-challenge-resources.md`.
