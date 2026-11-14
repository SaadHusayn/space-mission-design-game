# 05 · 3D and "Interesting" Requirements

> Team rules **T1 (the game must be 3D)** and **T2 (the game must be interesting)** are **mandatory**, just like the challenge requirements.
> But remember the priority: **the challenge's core loop (M items) comes first.** 3D and fun make that loop shine. They never replace it.

---

## Part 1: 3D requirements

### 1.1 Minimum 3D bar (every build must have this)

| # | 3D scene | Must have | Checklist link |
|---|---|---|---|
| 3D-1 | **Spacecraft assembly bay** | A real 3D spacecraft model built from separate part meshes. Parts appear or attach when chosen. The camera can **orbit and zoom** around the craft. Changing a part changes the model visibly. | M3, M4, T1 |
| 3D-2 | **Launch** | A 3D rocket on a pad → liftoff → climb (camera follows) → stage separation. The rocket matches the chosen vehicle. | M5, M10, T1 |
| 3D-3 | **Orbit / trajectory view** | 3D Earth (+ Moon, and others as needed). The chosen orbit or path is drawn as a 3D line. The spacecraft moves along it. The camera can orbit and zoom. | M6, M10, T1 |

Menus, HUD, cards and the report can be 2D overlays on top of (or beside) the 3D view. **A game made only of 2D screens fails T1.**

### 1.2 Great 3D bar (aim for this)

- An Earth with a day/night terminator, clouds and an atmosphere glow. The Moon and Mars with textures.
- Solar panels **unfold** with animation. The antenna rotates toward Earth. The instrument points at its target.
- Rocket exhaust particles, smoke at liftoff, a stage that falls away, the sky fading from blue to black.
- A **trajectory map** showing all mission pathways (LEO, Moon, Mars, L2) with the player's path glowing.
- A deep-space scene with a **galaxy** (particles) for the observatory mission.
- On-station views: an Earth-imaging scan line, a telescope beam, data packets flying back to Earth, a ground-station dish on Earth lighting up during a pass.
- **Visual consequence feedback:** an overweight craft makes the rocket strain (slower, shaking). Low power dims the spacecraft's lights. A solar storm brings an orange glow, particles and screen shake.
- Optional: a WebXR / VR view of the trajectory (resource R8, the 2023 VR challenge).

### 1.3 Camera and controls

| Context | Controls |
|---|---|
| Assembly bay / orbit view | Left-drag = orbit · Wheel / pinch = zoom · Right-drag = pan · Double-click a part = focus |
| Launch | Auto camera (cinematic) + optional key for the "perfect ignition" mini-game |
| Flight | Auto-follow spacecraft · Toggle "map" / "spacecraft" view · Time controls ⏸ ▶ ⏩ |
| Everywhere | Keyboard + mouse **and** touch (tablet) if possible · **Esc** = pause/menu |

Smoothly animate camera moves (ease in/out, 0.5–1.5 s). Never jump-cut the 3D camera during gameplay unless it's a deliberate scene change.

### 1.4 Art direction

- **Style:** your choice (each version has its own flavour). Low-poly, stylized or simple PBR are all fine. **Readable beats realistic.**
- **Suggested palette** (optional; each version may choose its own): space `#02040a`, cyan `#5ce1ff`, amber `#ffb547`, green `#4cf0a0`, red `#ff5a6a`, violet `#b48cff`. Gold foil for the spacecraft body, blue solar cells, white rockets.
- **UI:** glass panels (navy, slightly transparent, 1px cyan border, 12–18px radius). Monospace numbers for telemetry.
- **Scale honesty:** distances are compressed for gameplay. Show a small note, "Distances not to scale".

### 1.5 Performance and compatibility targets

| Target | Value |
|---|---|
| Frame rate | **60 fps** on a mid-range laptop. Never below **30 fps**. |
| First load | < 20 s on normal broadband (compress textures, lazy-load scenes). |
| Browsers (web builds) | Latest Chrome, Edge, Firefox. Safari if possible. |
| Graphics settings | Low / High toggle (shadows, particle count, texture size). |
| Download builds | A Windows build at minimum, with a one-paragraph run guide. |

### 1.6 Technology options (pick one; any is fine if it meets T1–T3)

| Option | Pros | Cons | Best for |
|---|---|---|---|
| **Three.js** (JS/TS) | Runs in any browser from a link, huge ecosystem, easy to host | You build the game structure yourself | Web devs |
| **React Three Fiber + drei** (React + Three.js) | React UI + 3D in one, fast HUD building | React knowledge needed | React devs (**recommended for web**) |
| **Babylon.js** | Full web engine, inspector, physics, GUI | Bigger bundle | Web devs who want an engine |
| **Unity** (WebGL export) | Strong editor, assets, animation | WebGL builds are heavy. Check the load time. | Unity devs |
| **Godot 4** (web export) | Free, light, good 2D/3D UI | Web export needs care (threads/SharedArrayBuffer) | Godot devs |
| **Unreal** | Best visuals | Heavy. Hard for judges to run. | Not recommended for a hackathon |

**Recommendation:** a **web build** (Three.js / R3F / Babylon) hosted on GitHub Pages, Netlify or Vercel. Judges can play from a link, which satisfies T3.

### 1.7 Asset sources (always check the licence and log it in `CREDITS.md`)

- **NASA 3D resources and image libraries:** spacecraft models, planet imagery. Follow NASA media usage guidelines. **No NASA logo as branding.**
- **NASA Visible Earth / Blue Marble:** Earth textures.
- Planet texture packs released under Creative Commons. Check whether the licence needs attribution.
- **Kenney.nl / Quaternius / Poly Pizza:** CC0 low-poly props.
- **Freesound.org / OpenGameArt:** sounds. Check each licence (CC0 preferred).
- Fonts: Google Fonts (OFL).

---

## Part 2: "Interesting" requirements (make it a game, not a form)

### 2.1 The fun checklist (each build should tick most of these)

| # | Fun ingredient | Example of how to do it |
|---|---|---|
| F1 | **Meaningful choices** | Every option is good for something and bad for something else. No option is strictly best. |
| F2 | **Immediate feedback** | Parts snap with sound and a flash. The HUD bars animate. Numbers tick up and down. Trade-off popups appear. |
| F3 | **Tension** | The GO/NO-GO check, the countdown, a battery dropping during a storm, a ground pass about to close. |
| F4 | **Surprise** | Random events (good and bad), and a "bonus discovery" event for high-science designs. |
| F5 | **Payoff** | The launch cinematic, the first image "captured" (for example, a galaxy or an Earth image appearing), the success fanfare. |
| F6 | **Mastery and replay** | A score + grade, a leaderboard, "beat your last score", harder difficulty, different objectives. |
| F7 | **Social** | Team roles, votes, debates, "blame" or "credit" moments in the report (light-hearted). |
| F8 | **Agency during flight** | The player still makes decisions while flying (events, safe mode, choosing observation targets, scheduling downlinks). It's **not just a cutscene**. |
| F9 | **Readable goals** | The objective and requirements are always visible. The player always knows what "winning" means. |
| F10 | **Short loops** | A redesign → re-fly loop takes under 5 minutes, so experimenting is cheap. |

### 2.2 Juice list (cheap tricks with a big impact)

- Sound: UI ticks, part-snap clunks, a countdown beep, a liftoff rumble, an alarm on events, a success chord.
- Motion: easing on every panel, number count-up animations, a camera shake on liftoff and events.
- Particles: rocket exhaust, smoke, solar-storm streaks, data packets.
- Celebration: confetti or glow on MISSION SUCCESS, grade stamp animation.
- Personality: short, fun flavour text ("Your spacecraft is now heavier than a small car.").

### 2.3 Anti-patterns (avoid)

- ❌ A **form with dropdowns** and a "Calculate" button → that's a calculator, not a game.
- ❌ A **quiz** (right/wrong answers). The challenge wants players to understand *why*, not just whether they were right.
- ❌ An **unskippable long cutscene**. Keep cinematics ≤ 10 s and skippable after the first time.
- ❌ **Walls of text**. Use 1–2 sentence tooltips and a "Learn more" link.
- ❌ **Fake precision** ("Mass: 1,135.274 kg"). Round the numbers.
- ❌ Only one valid solution (this breaks R5 and makes replay boring).

### 2.4 Accessibility (keeps it fun for everyone)

- Colour isn't the only signal: add icons ✓ ⚠ ✗ and text.
- Font size ≥ 16 px for body UI. High contrast on panels.
- Captions for any voice-over. Volume sliders (music / SFX).
- A reduced-motion option (less camera shake).
- Keyboard-navigable menus where possible.
