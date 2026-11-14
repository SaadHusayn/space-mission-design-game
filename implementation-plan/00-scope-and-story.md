# 00 · Scope and Story Bible

---

## 1. Scope filter: the team's ideas vs the challenge

The challenge asks for *"an interactive game that allows participants to design, manage, and simulate a complete space mission while making engineering decisions, managing limited resources, and evaluating how each choice shapes the success of their mission."* Every idea was checked against that.

| Team idea | Decision | Why / how it fits the challenge |
|---|---|---|
| Astronauts are **nominated and recruited** for a space mission | ✅ **Kept** as the story frame | Becomes the lobby + role selection + tutorial (solo or team of up to 4, roles: R1, R2, M13). |
| Recruited **"by NASA"** | ⚠️ **Adjusted** → a **fictional agency** (working name: **"Orbital Exploration Agency (OEA)"**; rename freely). Credits can say "inspired by NASA mission design resources". | Using NASA's name or logo in the story can imply that NASA endorses the game. Space Apps resources state *"NASA does not endorse any non-U.S. Government entity"*, and the brand rules restrict agency logos. A fictional agency avoids this. |
| Crew **design the spacecraft with engineers** | ✅ **Kept** (core) | M3, M4, M7, M8. Engineers are NPC advisors (and team roles). |
| **Different pathways / missions** | ✅ **Kept** (core) | Pathways = mission objectives + destinations (M2, M6). |
| Worlds **outside the Solar System** "like in Interstellar" | ⚠️ **Adjusted** to be realistic and original | We **don't recreate the film's worlds**: that's copyrighted and not real science. Instead: (a) an **Interstellar Probe** mission to the heliopause (a real NASA-studied concept; uncrewed, decades long) and (b) an **Exoplanet Observatory** that discovers real worlds (TRAPPIST-1, Proxima Centauri b) by the **transit method**, shown as a data-driven 3D visualization. Crewed travel to other stars isn't possible with real technology, and the game teaches why. |
| **Jupiter's gravitational pull** as a difficulty | ✅ **Kept**: gravity-assist slingshot + radiation belts | A physics trade-off: a closer flyby gives a bigger velocity change but more radiation (02 §G). |
| "Calculate **centrifugal force** in simple options" | ✅ **Kept, physics-corrected** | In orbit, gravity supplies the **centripetal** force (F = mv²/r). **Centrifugal** effects appear correctly in **artificial gravity** for spinning crew habitats (a = ω²r) on the long Mars trip. Both become multiple-choice physics challenges with explanations. |
| More **physics-related missions** | ✅ **Kept** | A physics-challenge system (thrust-to-weight, rocket equation, orbital speed, inverse-square power and comms, light-time delay, gravity assist, life support, transit depth). |
| Spacecraft **checked in each scenario** | ✅ **Kept** (core) | Each journey hazard tests the built spacecraft's real stats (M8, M10). |
| **Evaluation based on assembly + physics techniques** | ✅ **Kept** (core) | The **Engineering Review Board (ERB)** scores the design on physics checks before launch. The flight score shows how it actually performed (M9, M11). |
| Cutscenes + 3D visuals + GLB environments | ✅ **Kept** | Story cutscenes (skippable), 3D scenes with PBR GLB models (T1, T2). |

**Crewed vs robotic (realism rule):** crewed missions go only to **LEO, the Moon and Mars**. **Jupiter and Beyond are robotic.** The astronauts operate those from mission control. The game explains why ("A crew can't survive Jupiter's radiation, and a trip there takes years").

---

## 2. Story overview

**Title:** *TRAJECTORY: Pathways Beyond*. Tagline: "Design it. Launch it. Prove it with physics."

**Premise:** The Orbital Exploration Agency opens a new astronaut class. The player (or up to 4 friends) is nominated, passes selection, trains, and joins the **Mission Design Center**. Here astronauts and engineers design spacecraft together. The class takes on increasingly ambitious pathways, each with real physics hazards. Every mission ends with a review: *did your engineering hold up, and why?*

**Theme:** *"Every mission is a trade-off. Physics doesn't negotiate. Engineers do."*

### Characters (all fictional; no real people)

| Character | Role in story | Gameplay function |
|---|---|---|
| **Player astronauts** (1–4) | Candidates → crew | Roles: Mission Commander/Planner, Flight Engineer, Science Specialist, Comms & Resources Officer |
| **Director Hale** | Agency mission director | Briefings, objectives, budgets, final evaluation |
| **Dr. Imani Okafor** | Chief propulsion & structures engineer | Assembly advisor: mass, rocket, Δv, structure |
| **Kenji Watanabe** | Power & thermal engineer | Power, batteries, solar vs RTG, thermal |
| **Dr. Lucía Ferreira** | Mission scientist | Instruments, science value, data |
| **CAPCOM "Echo"** | Mission control voice | Flight comms, events, countdowns |

Write dialogue short (1–2 lines per bubble), friendly and educational.

---

## 3. Chapters and pathways

| Chapter | Pathway | Crew | Objective (example) | Key physics challenges | Unlock |
|---|---|---|---|---|---|
| **Prologue** | Recruitment & training | — | Pass selection, learn the controls | Intro: weight vs mass, thrust-to-weight | start |
| **Ch 1: First Light** | **Low Earth Orbit** | Crewed | Orbital test flight + Earth observation | TWR, orbital speed, **centripetal force**, eclipses & batteries | Prologue |
| **Ch 2: Return to the Moon** | **Lunar orbit / landing** | Crewed | Map water ice at the poles | Rocket equation (Δv), lunar orbit speed, 1.3 s comms delay | Ch 1 |
| **Ch 3: The Long Road** | **Mars** | Crewed | Reach Mars orbit, study the atmosphere | Launch window (Hohmann ~259 days), **artificial gravity (centrifugal)**, life support mass, solar power at 43%, 3–22 min comms delay | Ch 2 |
| **Ch 4: The Giant** | **Jupiter system** | Robotic (crew in mission control) | Study Jupiter / icy moons | **Gravity assist** trade-off, radiation vault, solar power at 3.7% (huge arrays or RTG), 33–54 min delay | Ch 3 |
| **Ch 5: Beyond** | **(a) Interstellar Probe**: to the heliopause (~120 AU) · **(b) Exoplanet Observatory** at Sun–Earth L2 | Robotic | (a) Leave the Sun's bubble · (b) Find Earth-sized worlds around other stars | RTG decay, Jupiter assist, travel time vs distance (why we can't fly crews to stars), **transit depth** (Rp/Rs)² | Ch 4 |
| **Sandbox** *(optional)* | Any | Any | Free design | — | after Ch 1 |

Players may replay any unlocked chapter to improve their score (R4). Difficulty (Cadet / Engineer / Flight Director) scales budgets, hints and events (R9).

---

## 4. Mission loop inside every chapter (the challenge skeleton)

```
Cutscene briefing → 1 Objective & requirements → 2 Spacecraft assembly (with engineers) → ERB physics review
→ 3 Orbit/trajectory choice → 4 Launch vehicle + GO/NO-GO → Launch (3D) → 5 Journey with hazard scenarios
(physics challenges + events + crew decisions) → 6 Mission report & evaluation → Redesign & re-fly / next chapter
```

This keeps every mission **"from concept to operation"** (M12).

---

## 5. Cutscene list (all skippable after the first viewing, each ≤ 20–40 s)

| ID | When | Content (shot list) |
|---|---|---|
| CS-00 Intro | New game | Night launch pad → Earth from orbit → title. Narration: "Every mission starts with a question." |
| CS-01 Nomination | Prologue | A letter or holo-message: "You have been nominated to the OEA astronaut class." Crew portraits slide in (player-chosen avatars). |
| CS-02 Selection | Prologue | A montage of training (centrifuge, simulator, neutral-buoyancy pool) using simple 3D sets or 2.5D panels. |
| CS-03 Briefing | Each chapter | Mission control: Director Hale over a 3D holo-table showing the target world. |
| CS-04 Rollout | Before launch | The rocket rolls out to the pad. The camera orbits the rocket (it's the player's chosen GLB). |
| CS-05 Launch | Launch | Ignition, liftoff, max-Q, stage separation, fairing separation, orbit. Interactive beats (P06). |
| CS-06 Transfer burn | Journey start | Engine burn, the trajectory line sweeps out, the Earth shrinks. |
| CS-07 Arrival | Per pathway | Orbit insertion around the Moon / Mars / Jupiter, or the "heliopause crossing" or "first transit detected" for Beyond. |
| CS-08 Outcome | Report | Success: ceremony, data images. Failure: calm and constructive ("Let's find out why"). |
| CS-09 Epilogue | After Ch 5 | The class looks at an exoplanet light curve: "We can't go there yet. But we can see it." |

Cutscene tech is in [01-tech-architecture.md](01-tech-architecture.md) §6.

---

## 6. Tone and realism rules

- Physics is **real but simplified**, and the game says so ("Simplified model for learning"). Numbers are rounded.
- **No fake science:** no warp drives, wormholes or crewed interstellar flight. Speculative ideas only appear as *"mission concepts"*, clearly labelled.
- Failures are **explained, never punished harshly**. The re-fly loop is quick.
- All characters, agency names and logos are **fictional**. Real missions may be mentioned as educational facts (Voyager, Juno, JWST, …).
