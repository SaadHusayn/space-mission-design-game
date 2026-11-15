# Use of Super Intelligence (SI) Disclosure

**Project:** Mission Architect: Pathways to the Stars  
**Team:** The Astranauts (Saad Hussain, Asfand Ahmed, Syed Farhan Ali, Uzair Ibrahim, Danish Ahmed, Atif Ali Khan)  
**Challenge:** NASA Space Apps Challenge 2026 — *Space Mission Design Game*

In accordance with the NASA Space Apps Challenge 2026 **Use of Super Intelligence (SI)** policy, this document records where and how SI tools were utilized across the project's code, data, audio, and visual assets.

## 1. Code & Data

- **Where SI was used:**
  - TypeScript simulation engine (`mission-architect/src/game/`), including orbital/rocket physics helpers, Engineering Review Board checks, and mission telemetry logic.
  - Next.js / React Three Fiber 3D scenes and responsive UI components (`mission-architect/src/components/`, `mission-architect/src/three/`, `mission-architect/src/app/`).
  - Structured mission, spacecraft part, launch vehicle, and challenge datasets (`mission-architect/src/game/data/*.json`), validated with Zod schemas.
  - Automated unit and Playwright end-to-end test suites (`mission-architect/src/game/**/*.test.ts`, `mission-architect/tests/e2e/`).
- **How SI was used & verified:**
  - SI coding assistants were used to accelerate TypeScript scaffolding, UI implementation, refactoring, and test authoring.
  - All orbital mechanics, delta-v budgets, inverse-square solar irradiance, communications link budgets, and mission parameters were cross-checked by the team against public NASA, ESA, and JAXA mission documentation and verified with automated Vitest physics tests, ESLint, TypeScript typechecking, and Playwright browser tests.
- **Metadata & in-code acknowledgements:**
  - `mission-architect/package.json` (`siDisclosure` field)
  - `mission-architect/src/app/layout.tsx` (`metadata.other['si-disclosure']`)
  - `mission-architect/src/game/index.ts` (module JSDoc header)
  - `mission-architect/CREDITS.md` and the in-game `/credits` page (`mission-architect/src/app/credits/page.tsx`)

## 2. Audio

- **Where SI was used:**
  - `mission-architect/src/audio/soundEngine.ts` — Procedural Web Audio API synthesizer generating adaptive ambient music modes (`menu`, `cruise`, `tension`, `success`, `failure`) and mission SFX (`tick`, `snap`, `countdown`, `countdownFinal`, `ignition`, `stageSep`, `alarm`, `downlink`, `fanfare`).
- **How SI was used:**
  - SI tools assisted in designing and tuning the Web Audio oscillator, filter, envelope, and gain-ducking synthesis code. No external or pre-recorded copyrighted audio files are used; all audio is synthesized client-side in real time and acknowledged in `soundEngine.ts` comments, `CREDITS.md`, and `/credits`.

## 3. Images, Videos & Branding

- **No SI-generated images or videos:** Every 3D model (`.glb` spacecraft, rockets, and environment assets in `mission-architect/public/models/`), planetary texture (Solar System Scope, CC BY 4.0), and gameplay screenshot in this repository was created by the team or sourced from credited open-license assets.
- **No NASA branding:** The game uses a purely fictional agency (*Orbital Exploration Agency*) and contains no NASA logos, flags, mission patches, or implied NASA endorsement.
