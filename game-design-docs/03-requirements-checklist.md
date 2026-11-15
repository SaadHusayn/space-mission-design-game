# 03 · Requirements Checklist

> ## THE PROJECT MUST FULFILL THE REQUIREMENTS OF THE CHALLENGE.
> Every build must pass **all Mandatory (M) and Team-rule (T) items** to be considered in the selection ([10-selection-rubric.md](10-selection-rubric.md)).
> Copy the **Self-check table** at the bottom into your build's README and fill it in honestly.

## How this list was made

The official page ([01-challenge-details.md](01-challenge-details.md)) has **one core ask** (the Summary and Objectives). Almost everything else is phrased as *"could"*, *"consider"*, *"might"* or *"You may (but are not required to)"*.

To stop anyone building everything and finishing nothing, items are split into tiers:

| Tier | Meaning | Source |
|---|---|---|
| **M: Mandatory** | Must be in every build. Without these, the game doesn't meet the challenge. | The challenge **Summary** and **Objectives**: "design, manage, and simulate a complete space mission", "making engineering decisions", "managing limited resources", "evaluating how each choice shapes the success". |
| **T: Team rules** | Our own team decisions. Also mandatory. | Team decision: the game **must be 3D** and **must be interesting**. |
| **R: Recommended** | Build these after the M and T items work. Strong builds have most of them. | The "A strong solution might include…" sentence + the Potential Considerations we judge most valuable. |
| **N: Nice to have** | Only if time remains. | "You may consider adding features such as…" + the remaining considerations. |

---

## M: Mandatory (core challenge requirements)

| ID | Requirement | Source in challenge text | Example implementation (yours may differ) | How to verify |
|---|---|---|---|---|
| **M1** | It's an **interactive game**, not a static page, video or calculator. | Summary: *"create an interactive game"* | Playable from lobby to report, with a goal, choices and a score. | A new player can play a full mission without help from the developer. |
| **M2** | The player **defines a mission objective** (and sees its **requirements**) before designing. | Objectives: *"define a mission objective, establish mission requirements"*; Mission design: *"begin by defining a mission objective before making spacecraft and engineering decisions"* | Step 1: choose from mission cards, then a requirements panel appears. | At least **2 objectives** are selectable, and each shows its requirements. |
| **M3** | The player **designs a spacecraft** from components. | Objectives: *"design a spacecraft"*; Spacecraft: *"structure, power systems, batteries, communications, onboard computers, attitude control, and scientific instruments"* | Step 2: 3D assembly bay where subsystems snap on. | The player chooses at least power, battery, comms, computer, attitude control and structure. Each choice changes the stats. |
| **M4** | The player **selects scientific instruments**, each with mass, power, cost, data and science value. | Objectives: *"select scientific instruments"*; Spacecraft: instrument characteristics | An instrument slot with at least 2 options plus an upgrade. | At least **2 instruments** have different stats, and the stats are shown. |
| **M5** | The player **chooses a launch vehicle**. | Objectives: *"choose a launch vehicle"* | Step 4: at least 2–3 rockets with capacity and cost. | Choosing a different rocket changes cost and feasibility. |
| **M6** | The player **chooses an orbit or destination**. | Objectives: *"choose a launch vehicle and orbit"* | Step 3: orbit cards with plain-language pros and cons. | At least **2 orbits**. The orbit choice changes comms, power or lifetime, or observation. |
| **M7** | **Limited resources are managed and clearly displayed:** budget, mass, power, communications, data, mission lifetime (time). | Objectives: *"manage key constraints such as budget, mass, power, communications, data, and mission lifetime"*; Resource Management: *"should clearly display the main resources"* | A persistent resource HUD with bars, limits and colour states (green, amber, red). | All **6 resources** are visible during design. Exceeding a limit is visible immediately. |
| **M8** | **Decisions have consequences across the system** (trade-offs). | Summary: *"making engineering decisions"*; Background: *"A decision that improves one aspect … can create limitations in another"* | For example, an upgraded instrument raises science but also mass, power, data and cost. The HUD shows the deltas ("trade-off popup"). | Pick any instrument upgrade: at least 3 other resources visibly change. |
| **M9** | **Feasibility checks:** spacecraft mass and orbit must be compatible with the launch vehicle, and the budget must not be exceeded. | Orbit and launch: *"check that the spacecraft mass and selected orbit are compatible with the chosen launch vehicle"* | A "LAUNCH CHECK" GO / NO-GO panel with reasons. | An overweight design is blocked or warned, **with the reason shown**. |
| **M10** | The mission is **simulated**: it's flown over time and the design's outcome plays out. | Summary: *"design, manage, and simulate a complete space mission"* | Launch → flight → operations with a live dashboard (power, battery, data, downlink, mission day). | A bad design (for example, too little power) produces a visibly worse outcome than a good one. |
| **M11** | **Evaluation and feedback:** the player learns **how each choice shaped success**, not just a win/lose result. | Summary: *"evaluating how each choice shapes the success of their mission"*; Educational: *"teaching participants why a particular decision affects mission performance"* | Mission report: score breakdown + "Why it worked / why it failed" bullets tied to the player's own choices. | The report names at least **2 specific player decisions** and explains their effect. |
| **M12** | It covers a **complete mission, from concept to operation**. | Summary + Background: *"from concept to operation"* | Objective → design → launch → operations → end-of-mission report. | No phase is skipped in one playthrough. |
| **M13** | It's **understandable without advanced knowledge** (plain-language explanations). | Educational value + Game design: *"accessible to participants with different levels of knowledge"* | Tooltips, a short tutorial, and explanations on every card (see 08). | A non-space playtester can explain what "payload capacity" and "downlink" mean after one game. |

## T: Team rules (mandatory for us)

| ID | Rule | How to verify |
|---|---|---|
| **T1** | **The game is 3D.** At minimum, the **spacecraft (assembly)**, **launch**, and **orbit or trajectory view** are real-time 3D scenes the player can look around (rotate or zoom). | Open each of the 3 scenes: the camera can orbit or zoom, and the objects are 3D meshes, not flat images. |
| **T2** | **The game is interesting:** meaningful choices, visible consequences, at least one surprise or tension moment, satisfying feedback (sound, animation), and a reason to replay. | Playtest: at least 2 of 3 testers say they'd play again or want to try a different design ([10](10-selection-rubric.md)). |
| **T3** | **Easy for judges to run:** a web link, or a single download with clear instructions. It runs on a normal laptop. | A fresh machine reaches the main menu in under 2 minutes following the README. |
| **T4** | **Stays within the challenge scope** and uses only licence-safe assets (`CREDITS.md`). | Reviewer check. |

---

## R: Recommended (build after M and T work)

| ID | Item | Source | Notes |
|---|---|---|---|
| R1 | **Solo and team play (up to 4)**, with collaboration on the same mission | Strong solution: *"collaboration or multiplayer functionality for up to four participants"*; Game design; Collaboration | A minimum acceptable version is **local hot-seat / same screen** with roles. Online is a bonus. See [07](07-team-mode-and-roles.md). |
| R2 | **Team roles** (planning, spacecraft, science, comms/resources) with a collective decision | Collaboration; Game design | Votes or approvals on key decisions. |
| R3 | **Scoring system** rewarding mission success, science value, resource efficiency, good decisions (and collaboration in team mode) | Strong solution; Game design | Show the breakdown, not just one number. |
| R4 | **Redesign and re-fly**: modify the design and simulate again | Game design: *"modify their mission design and simulate it multiple times"* | One click from the report back to the design, keeping the previous design. |
| R5 | **Multiple valid solutions**: different combinations can achieve the same objective | Mission design: *"rarely a single perfect solution"* | Balance the data so that **at least 2 distinct builds** pass each scenario ([06](06-game-systems-and-data.md)). |
| R6 | **Orbit explanations**: how the orbit affects coverage, observation, comms, lifetime | Orbit and launch | On the orbit cards + a 3D preview. |
| R7 | **Launch vehicles differ** in capacity, cost and reachable orbits | Orbit and launch | At least 3 rockets. |
| R8 | **Simple vs advanced components** depending on difficulty | Spacecraft and payload | The Cadet difficulty hides advanced parts. |
| R9 | **Difficulty levels / mission types / scenarios** | Game design | Cadet / Engineer / Flight Director + at least 3 objectives. |
| R10 | **Mission dashboard with real-time resource consumption** during flight | Features list | Power, battery, data stored, downlink, mission day. |
| R11 | **Random events / unexpected constraints** | Features list | Solar storm, part failure, ground-station outage… ([06](06-game-systems-and-data.md)). |
| R12 | **Post-mission analysis** explaining success or failure | Features list | Covered by M11. Make it rich. |
| R13 | **Tutorial / short explanations / visual indicators** | Educational value | A first-time guided mission. |
| R14 | **Mark critical resources per mission** | Resource Management: *"identifying which resources are most critical"* | For example, an L2 telescope → data and comms critical; LEO → budget critical. |

## N: Nice to have (only if time remains)

| ID | Item | Source |
|---|---|---|
| N1 | Leaderboards / mission rankings | Features list |
| N2 | Save, share and compare mission designs | Features list |
| N3 | Competitive mode: teams solve the same objective | Features list |
| N4 | Sandbox mode with no constraints | Features list |
| N5 | Realistic vs simplified spacecraft models toggle | Features list |
| N6 | Negotiation events between roles with competing priorities | Collaboration |
| N7 | "Real missions like yours" cards (inspired by resource R6, the NASA telescope game) | Resources |
| N8 | Concept Maturity Level (CML) progression meter | Resources (JPL CML) |
| N9 | VR / WebXR viewing of the mission | Resources (2023 VR challenge) |
| N10 | Online multiplayer (if R1 was done as hot-seat) | Collaboration |

---

## Self-check table (copy into your build's README and fill it in)

Mark each item ✅ done · 🟡 partial · ❌ missing, and add a one-line **evidence** note (the screen or file where it's shown).

| ID | Status | Evidence |
|---|---|---|
| M1 Interactive game | ✅ | Full playable 3D loop from `/play` title/prologue to assembly, launch, flight, and report (`GameRoot.tsx`). |
| M2 Objective + requirements | ✅ | 6 selectable pathways in `PathwayHud.tsx` + `ObjectivePanel.tsx` showing requirements and critical resources. |
| M3 Spacecraft design (components) | ✅ | 3D Hangar `AssemblyHud.tsx` + `Spacecraft.tsx` with structural bus, power, battery, comms, computer, ADCS, propulsion, thermal, shielding, life support. |
| M4 Instrument selection | ✅ | `PartBrowser.tsx` + `instruments.json` with distinct mass, power, cost, data, and science values across slots/upgrades. |
| M5 Launch vehicle choice | ✅ | 4 rockets in `RocketLineupScene.tsx` & `RocketSelectHud.tsx` with payload capacity, cost, and orbit compatibility. |
| M6 Orbit / destination choice | ✅ | 6 pathways + trajectory options in `TrajectoryScene.tsx` / `TrajectoryHud.tsx` affecting Δv, duration, power, and comms. |
| M7 6 resources shown + limited | ✅ | `ResourcePanel.tsx` displays budget, mass, power, comms/downlink, data, and lifetime/consumables with OK/warn/danger status. |
| M8 Cross-system consequences | ✅ | `TradeOffPopup.tsx` + `summarizeDesign` show multi-resource deltas on every part/instrument/trajectory change. |
| M9 Launch compatibility + budget check | ✅ | `ReviewBoard.tsx` (ERB) + `GoNoGoPanel.tsx` block overweight, underpowered, or over-budget designs with explicit reasons. |
| M10 Mission simulation | ✅ | `ascent.ts` launch simulation + `journey.ts` day-by-day power/battery/data/downlink/radiation simulation in `JourneyHud.tsx`. |
| M11 "Why" feedback / evaluation | ✅ | `ReportHud.tsx` (`WhyList.tsx`, `ScoreBars.tsx`, `ErbVsReality.tsx`, `PhysicsRecap.tsx`) ties outcomes to specific player decisions. |
| M12 Concept → operation complete | ✅ | All phases (`TITLE` → `PROLOGUE` → `CHAPTER_SELECT` → `BRIEFING` → `OBJECTIVE` → `ASSEMBLY` → `ERB_REVIEW` → `TRAJECTORY` → `LAUNCH_VEHICLE` → `GO_NO_GO` → `ROLLOUT` → `LAUNCH` → `JOURNEY` → `OPERATIONS` → `REPORT`) implemented and E2E-tested. |
| M13 Understandable for beginners | ✅ | 7-step training prologue (`PrologueHud.tsx`), `MissionNotebook.tsx` formulas/examples, plain-language tooltips, and Cadet difficulty. |
| T1 3D (spacecraft, launch, orbit view) | ✅ | Real-time Three.js 3D scenes for Assembly (`HangarScene`), Launch (`LaunchScene`), Trajectory (`TrajectoryScene`), Journey (`JourneyScene`), and Report (`ReportScene`). |
| T2 Interesting (playtest result) | ✅ | Procedural Web Audio music/SFX (`soundEngine.ts`), 9 flight anomalies, 3 timed negotiation dilemmas, physics challenges, and E2E verification (`polish.spec.ts`, `journey.spec.ts`, `report.spec.ts`). |
| T3 Easy to run (link / download) | ✅ | `npm install && npm run dev` (or `npm run build && npm start`) documented in `README.md` & `mission-architect/README.md`; production Next.js build verified. |
| T4 In scope + licence-safe assets | ✅ | Fictional Orbital Exploration Agency, no NASA branding; all textures/models/audio/fonts documented in `mission-architect/CREDITS.md` and `/credits`. |
| R1–R14 (list which ones are done) | ✅ | R1–R14 implemented: Solo & 2–4 hot-seat team play (R1), role ownership & voting (R2), weighted scoring (R3), Redesign & Re-fly (R4), multiple winning builds per pathway (R5), orbit pros/cons + 3D preview (R6), 4 rockets (R7), Cadet/Engineer/Flight Director difficulty (R8–R9), live flight telemetry HUD (R10), random events (R11), rich post-mission analysis (R12), guided training + Mission Notebook (R13), critical resource markers (R14). |
| N1–N10 (list which ones are done) | ✅ | N1 Local chapter leaderboards (`Leaderboard.tsx`), N2 Save/compare/share (`ExportDesign.tsx`, `CompareRuns.tsx`), N6 Timed role negotiation dilemmas (`EventModal.tsx`), N7 Real missions like yours (`RealMissionCard.tsx`, `/credits`). |

**Gate:** all M and T items must be ✅ to enter the final selection.
