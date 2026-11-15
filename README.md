# Mission Architect: Pathways to the Stars

**NASA Space Apps Challenge 2026** — Selected Challenge: **[Space Mission Design Game](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/)**  
**Team:** **The Astranauts** — Saad Hussain, Asfand Ahmed, Syed Farhan Ali, Uzair Ibrahim, Danish Ahmed, Atif Ali Khan

An interactive 3D web game where players join the fictional **Orbital Exploration Agency** as astronaut candidates: define mission objectives, assemble a modular 3D spacecraft with the Engineering Review Board, select a launch vehicle and trajectory, fly real-physics missions across six destinations, handle in-flight anomalies, and review a physics-driven Mission Report explaining why the mission succeeded or failed.

> Independent student project. Not affiliated with or endorsed by NASA. No NASA logos or branding are used. Physics is simplified for interactive learning.

---

## Quick Start (Clone & Play)

Requires **Node.js 22.12+** (or newer).

```bash
git clone https://github.com/SaadHusayn/space-mission-design-game.git
cd space-mission-design-game/mission-architect
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** and click **PLAY** (or go directly to `/play`).

### Useful URLs & Verification Commands

- `/play?unlock=all` — Unlock all 6 mission pathways immediately
- `/credits` — In-game data sources, team roster, and SI disclosure

```bash
cd mission-architect
npm run lint        # ESLint
npm run typecheck   # TypeScript (--noEmit)
npm test            # Vitest physics & simulation unit tests
npm run test:e2e    # Production build + Playwright browser tests
```

---

## Key Features

- **6 Unlockable Pathways:** Low Earth Orbit, Moon, Mars, Jupiter, Interstellar Probe, and Exoplanet Telescope (L2), with 3 difficulty presets (*Cadet*, *Engineer*, *Flight Director*).
- **3D Spacecraft Assembly & Engineering Review Board (ERB):** Snap together modular `.glb` spacecraft parts (buses, power systems, antennas, propulsion, instruments) while balancing mass, power, delta-v, communications, data, and budget.
- **3D Launch & Solar System Flight:** Choose from 4 launch vehicles, clear the GO/NO-GO poll, launch from a 3D pad, and navigate live telemetry, time controls, and interactive physics challenges.
- **Solo & Crew Hot-Seat Play:** Play solo or cooperatively with up to 4 crew roles (*Commander*, *Propulsion*, *Power & Thermal*, *Science & Comms*) with role-based proposals, voting, and tie-breaks.
- **Mission Report & Replayability:** Physics-verified outcome breakdown, *"Another way to win"* hints, ERB vs. Reality comparison, local leaderboards, and JSON/`MA1` share-code export/import.
- **Procedural Audio & Accessibility:** Real-time Web Audio synthesizer (`src/audio/soundEngine.ts`) with music/SFX ducking, live audio captions, large-text mode, high-contrast mode, and reduced motion.

---

## Space Agency Data & Resources

Physics models, destination environments, and mission reference cards draw on public data from:
- **NASA** — *Eyes on the Solar System*, *Deep Space Network (DSN)* link/antenna concepts, *JPL Horizons / Mission Design*, *NASA Exoplanet Archive*, and *NSSDC Planetary Fact Sheets*.
- **Space Agency Partners & Open Assets** — ESA & JAXA public mission references, and Solar System Scope planetary textures (CC BY 4.0).

See **[mission-architect/CREDITS.md](mission-architect/CREDITS.md)** and the in-game **`/credits`** page for full citations.

---

## Use of Super Intelligence (SI) Disclosure

In compliance with the NASA Space Apps Challenge 2026 SI policy, all SI tool usage is documented in **[SI-DISCLOSURE.md](SI-DISCLOSURE.md)**, **[mission-architect/CREDITS.md](mission-architect/CREDITS.md)**, **`/credits`**, package/HTML metadata (`mission-architect/package.json`, `mission-architect/src/app/layout.tsx`), and module comments (`mission-architect/src/game/index.ts`, `mission-architect/src/audio/soundEngine.ts`).

- **Code & Data:** SI coding tools assisted in TypeScript/React/R3F scaffolding, JSON dataset structuring, and test authoring; all physics and mission parameters were verified by Team **The Astranauts**.
- **Audio:** `mission-architect/src/audio/soundEngine.ts` uses SI-assisted procedural Web Audio synthesis (zero external audio files).
- **Images & Videos:** No SI-generated images, videos, or NASA branding are used.

---

## Repository Layout

| Path | Purpose |
|---|---|
| **[mission-architect/](mission-architect/README.md)** | Main Next.js 16 + TypeScript + Tailwind + Three.js (`@react-three/fiber`) game app |
| **[SI-DISCLOSURE.md](SI-DISCLOSURE.md)** | NASA Space Apps 2026 Use of Super Intelligence (SI) disclosure |
| **[HANDOFF.md](HANDOFF.md)** | Project status, architectural decisions, and session handoff notes |
| **[game-design-docs/](game-design-docs/03-requirements-checklist.md)** | Challenge requirements checklist and design guidance |
| **[implementation-plan/](implementation-plan/README.md)** | Story, architecture, verified physics specs, and phase plans |
| **[AGENTS.md](AGENTS.md)** | Guidelines for AI coding agents working in this repository |
