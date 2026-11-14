# 09 · Build Guide (for each team member)

> Each member builds **one complete, independent version** of the game. Then we compare them ([10-selection-rubric.md](10-selection-rubric.md)).
> **Your version should have its own flavour** (theme, art style, mechanics twists). The shared parts are only the **skeleton** in [04-game-concept.md](04-game-concept.md) and the **requirements** in [03-requirements-checklist.md](03-requirements-checklist.md).

---

## 1. Priority ladder (build in this order)

```
1. CORE LOOP (Mandatory M1–M13), playable end to end with placeholder visuals
2. 3D MINIMUM (T1): assembly bay, launch, orbit view in real 3D
3. FUN PASS (T2): feedback, sound, tension, events, juice
4. RECOMMENDED (R1–R14): team mode, scoring, difficulty, re-fly…
5. NICE TO HAVE (N1–N10): only if 1–4 are solid
```

**Never start step N+1 while step N is broken.** A finished simple game beats an unfinished ambitious one.

---

## 2. MVP definition (the "must exist by the halfway point" version)

A player can, in one session:

- [ ] Choose solo mode and 1 of **≥2 objectives**, and see its requirements
- [ ] Build a spacecraft from **≥6 subsystem slots** with **≥2 options each**, and choose **≥2 instruments** (M3, M4)
- [ ] See **all 6 resources** update live with limits (M7)
- [ ] Choose **≥2 orbits** and **≥2 launch vehicles**, and get a **GO/NO-GO** check with reasons (M5, M6, M9)
- [ ] Watch a **3D launch** and a **3D orbit/trajectory** view (T1)
- [ ] Have the mission **simulated** over time with a dashboard (M10)
- [ ] Get a **report** with a score + **≥2 "why" bullets** tied to their choices (M11)
- [ ] Press **Redesign & re-fly** (R4)

## 3. Suggested milestones (adapt to the hackathon schedule)

| Phase | Share of time | Goal | Exit test |
|---|---|---|---|
| **A. Setup** | ~5% | Repo, engine, deploy pipeline (a "hello 3D world" online) | The public link shows a rotating 3D Earth |
| **B. Data + logic** | ~20% | JSON data ([06](06-game-systems-and-data.md)), resource math, checks, simulation as pure functions | Unit tests pass for mass/power/budget/checks |
| **C. Core loop UI** | ~20% | All phases connected with simple UI | The MVP checklist §2 is complete (simple visuals OK) |
| **D. 3D scenes** | ~20% | Assembly bay, launch, orbit/trajectory | T1 passes |
| **E. Fun + education** | ~15% | Events, sound, juice, tooltips, why-report, tutorial | T2 playtest with 1 outside person |
| **F. Team mode + extras** | ~10% | Hot-seat roles + votes, difficulty, leaderboard… | R items ticked |
| **G. Polish + deliver** | ~10% | Bug fixes, performance, checklist, demo video | Deliverables §7 ready |

---

## 4. Recommended architecture (engine-agnostic)

```
┌──────────────┐   actions    ┌──────────────────────┐   state    ┌───────────────────┐
│ Input / UI    │ ───────────▶ │ Game logic (pure)     │ ─────────▶ │ Renderers          │
│ (HUD, menus,  │              │ - design rules        │            │ - 3D scenes        │
│  votes, net)  │ ◀─────────── │ - feasibility checks  │            │ - 2D HUD / panels  │
└──────────────┘   events      │ - flight simulation   │            │ - audio            │
                               │ - scoring + "why"     │            └───────────────────┘
                               └──────────┬───────────┘
                                          │ reads
                                   ┌──────▼──────┐
                                   │ data/*.json │  parts, instruments, orbits, rockets, objectives, events, text
                                   └─────────────┘
```

- **Game logic = pure functions** `(state, action) → newState`. This makes it easy to test, replay, save/load, and network (team mode).
- **Data-driven:** all numbers and texts live in JSON. Balance without touching code.
- **Deterministic simulation:** a seeded random generator, so the same design + seed gives the same result (fair leaderboards, reproducible bugs).
- **Decision log** in state. The report and collaboration score read it.

### Suggested repo layout (web example)

```
my-version/
├─ README.md              ← how to run + filled self-check table (from 03)
├─ CREDITS.md             ← every asset/resource + licence
├─ data/                  ← parts.json, orbits.json, rockets.json, objectives.json, events.json, text.json
├─ src/
│  ├─ logic/              ← resources.ts, checks.ts, simulate.ts, score.ts, why.ts   (no rendering code)
│  ├─ scenes/             ← AssemblyBay, Launch, OrbitView, FlightMap (3D)
│  ├─ ui/                 ← HUD, cards, report, lobby, tutorial
│  ├─ net/                ← hotseat.ts / online.ts (optional)
│  └─ audio/
├─ public/assets/         ← models, textures, sounds (licence-checked)
└─ tests/                 ← logic unit tests
```

---

## 5. Freedom zones: make your version unique

Each version **must** keep the skeleton and pass the checklist. Everything below is yours to decide:

| Area | Ideas (pick, mix, or invent your own) |
|---|---|
| **Theme / framing** | Space agency HQ · startup building its first satellite · school space club · sci-fi academy · retro 1960s mission control |
| **Art style** | Realistic PBR · low-poly toy · blueprint/holographic · cel-shaded · retro-futuristic |
| **Spacecraft building** | Slot-based menu · drag-and-drop parts in 3D · grid/tetris placement with physical size · card-based "deck" of parts |
| **Flight phase** | Real-time dashboard · turn-based "mission months" · tactical event cards · manual pointing mini-game |
| **Launch** | Cinematic only · timing mini-game · throttle control through max-Q |
| **Team mechanic** | Voting · secret role goals · budget auction between roles · timed negotiation |
| **Progression** | Campaign of missions · CML maturity levels · unlockable parts · achievements |
| **Scenarios** | Your own objectives (asteroid survey, space weather monitor, comet flyby…) **as long as they stay space missions with the same trade-offs** |
| **Name** | Your own game title |

Write a short **"Flavour statement"** (3–5 sentences) at the top of your build's README: what makes your version special.

---

## 6. Quality bar

- **No crashes** in a full playthrough. No dead ends (every NO-GO says how to fix it).
- **60 fps target** / 30 fps minimum on a normal laptop. Loads in < 20 s.
- Numbers are rounded and units are consistent. The text has no typos.
- Works with mouse + keyboard. Touch is a bonus.
- The settings menu has: volume, graphics quality, reduced motion.
- "Simplified model for learning" and "Distances not to scale" notes are visible somewhere.

---

## 7. Deliverables for the internal selection

Each member submits:

1. **Playable build:** a public link (preferred) or a download + run instructions.
2. **Source repo** with README (how to run, flavour statement, **filled self-check table from [03](03-requirements-checklist.md)**).
3. **`CREDITS.md`** listing all assets, libraries and resources with licences.
4. **2-minute gameplay recording** (screen capture of one full mission).
5. **Known issues list** (honest).

Submit by the internal deadline agreed by the team, leaving time to polish the chosen version for the official Space Apps submission.
